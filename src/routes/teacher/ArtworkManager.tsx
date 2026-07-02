import { useMemo, useState } from 'react';
import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import {
  addArtwork,
  removeArtwork,
  updateArtwork,
  sortByOrder,
  copySelectedArtworks,
} from '@/features/artwork/api';
import { setShowCommonTitles } from '@/features/session/api';
import { uploadImage, loadImageServerUrl, saveImageServerUrl } from '@/features/artwork/upload';
import { formatWon } from '@/utils/format';
import type { Artwork, Placement, SessionMeta } from '@/models';

const EOK = 100_000_000; // 1억 — 감정가는 억 단위로 입력/표시

interface RawSessionForImport {
  meta?: SessionMeta;
  artworks?: Record<string, Artwork>;
}

// 가져오기 패널에서 보여줄 작품 (출처 반 정보 포함)
interface SharedArtwork extends Artwork {
  _srcCode: string;
  _srcClassName?: string;
}

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';
const inputCls = 'rounded border bg-transparent px-2.5 py-1.5 text-sm outline-none';
const inputStyle = { borderColor: BORDER, color: '#ead9b8' };

type BrowseTab = 'common' | 'branch' | 'auction';
type DestType = 'common' | 'branch';

const TAB_LABELS: Record<BrowseTab, string> = {
  common: '공통감상',
  branch: '선택감상',
  auction: '경매대상',
};

export function ArtworkManager({ code }: { code: string }) {
  const artworks = sortByOrder(useRtdbList<Artwork>(paths.artworks(code)));
  const meta = useRtdbValue<SessionMeta>(paths.meta(code));
  const showTitles = meta?.showCommonTitles !== false;
  const [serverUrl, setServerUrl] = useState(loadImageServerUrl());
  const [editingServer, setEditingServer] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [urlInput, setUrlInput] = useState('');

  // 가져오기 패널 상태
  const [showImport, setShowImport] = useState(false);
  const [browseTab, setBrowseTab] = useState<BrowseTab>('common');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // "srcCode::id"
  const [dest, setDest] = useState<DestType>('common');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  // 모든 세션의 공유 작품을 하나의 배열로 합산
  const allSessions = useRtdbValue<Record<string, RawSessionForImport>>(paths.sessionsRoot());

  const allShared = useMemo<SharedArtwork[]>(() => {
    if (!allSessions) return [];
    const result: SharedArtwork[] = [];
    for (const [c, s] of Object.entries(allSessions)) {
      if (c === code) continue;
      if (!s.artworks) continue;
      for (const a of Object.values(s.artworks)) {
        if (a.isPrivate) continue;
        result.push({
          ...a,
          _srcCode: c,
          _srcClassName: s.meta?.className,
        });
      }
    }
    return sortByOrder(result);
  }, [allSessions, code]);

  const tabArtworks = useMemo<SharedArtwork[]>(() => {
    if (browseTab === 'common') return allShared.filter((a) => a.placement?.kind === 'common');
    if (browseTab === 'branch') return allShared.filter((a) => a.placement?.kind === 'branch');
    return allShared.filter((a) => a.forAuction); // auction
  }, [allShared, browseTab]);

  // 탭 카운트
  const counts: Record<BrowseTab, number> = useMemo(() => ({
    common: allShared.filter((a) => a.placement?.kind === 'common').length,
    branch: allShared.filter((a) => a.placement?.kind === 'branch').length,
    auction: allShared.filter((a) => a.forAuction).length,
  }), [allShared]);

  function makeKey(a: SharedArtwork) { return `${a._srcCode}::${a.id}`; }

  function toggleId(key: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    const keys = tabArtworks.map(makeKey);
    const allChecked = keys.every((k) => selectedIds.has(k));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  }

  async function importSelected() {
    if (selectedIds.size === 0) return;
    setImporting(true);
    setImportMsg('');
    try {
      // 선택된 작품을 원래 세션에서 찾아 배열로 구성
      const toImport: Artwork[] = [];
      for (const key of selectedIds) {
        const [srcCode, artId] = key.split('::');
        const a = allSessions?.[srcCode]?.artworks?.[artId];
        if (a) toImport.push(a);
      }
      const destPlacement: Placement =
        dest === 'common' ? { kind: 'common' } : { kind: 'branch', door: 0 };
      const n = await copySelectedArtworks(toImport, code, artworks.length, destPlacement);
      setImportMsg(`${n}점을 ${dest === 'common' ? '공통감상실' : '선택감상실'}로 가져왔어요 ✓`);
      setSelectedIds(new Set());
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '';
      if (/permission|PERMISSION_DENIED/i.test(msg)) {
        // 쓰기 권한 없음 — 이 세션을 만든 기기(브라우저)에서만 작품을 추가할 수 있음
        setImportMsg('가져오기 실패: 이 세션의 소유자(처음 만든 기기)에서만 작품을 추가할 수 있어요. 세션을 만든 브라우저에서 다시 시도해 주세요.');
      } else {
        setImportMsg(`가져오기 실패: ${msg || '알 수 없는 오류'} — 다시 시도해 주세요`);
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!serverUrl.trim()) { setError('먼저 이미지 서버 주소를 입력하세요'); return; }
    setError('');
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      setUploading(`${i + 1}/${list.length}`);
      try {
        const url = await uploadImage(serverUrl.trim(), list[i]);
        const title = list[i].name.replace(/\.[^.]+$/, '');
        await addArtwork(code, { imageUrl: url, title, source: '', appraisedValue: 0, commentary: '', placement: { kind: 'branch', door: 0 }, forAuction: true }, artworks.length + i);
      } catch {
        setError('일부 업로드 실패 — 서버 주소·실행 상태 확인');
      }
    }
    setUploading('');
  }

  async function addByUrl() {
    if (!urlInput.trim()) return;
    await addArtwork(code, { imageUrl: urlInput.trim(), title: '새 작품', source: '', appraisedValue: 0, commentary: '', placement: { kind: 'branch', door: 0 }, forAuction: true }, artworks.length);
    setUrlInput('');
  }

  // 탭 작품을 반별로 그룹화
  const tabGroups = useMemo<Array<{ srcCode: string; className?: string; artworks: SharedArtwork[] }>>(() => {
    const map = new Map<string, { srcCode: string; className?: string; artworks: SharedArtwork[] }>();
    for (const a of tabArtworks) {
      if (!map.has(a._srcCode)) {
        map.set(a._srcCode, { srcCode: a._srcCode, className: a._srcClassName, artworks: [] });
      }
      map.get(a._srcCode)!.artworks.push(a);
    }
    return Array.from(map.values());
  }, [tabArtworks]);

  function toggleGroup(groupArtworks: SharedArtwork[]) {
    const keys = groupArtworks.map(makeKey);
    const allChecked = keys.every((k) => selectedIds.has(k));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  }

  const tabAllChecked = tabArtworks.length > 0 && tabArtworks.every((a) => selectedIds.has(makeKey(a)));
  const totalSelected = selectedIds.size;

  return (
    <div className="w-full rounded-lg border p-5 text-left" style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: GOLD }}>작품 관리 ({artworks.length})</span>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: '#ead9b8' }}>
          <input type="checkbox" checked={showTitles} onChange={(e) => setShowCommonTitles(code, e.target.checked)} />
          공통 작품 이름 표시
        </label>
      </div>
      <div className="mb-3 text-[11px]" style={{ color: 'rgba(232,217,184,0.5)' }}>
        선택작품감상실 작품은 이름이 항상 가려집니다(그림만).
      </div>

      {/* 업로드 */}
      <div className="mb-3 flex flex-col gap-2 rounded border p-3" style={{ borderColor: 'rgba(196,167,90,0.15)' }}>
        {editingServer ? (
          <div className="flex gap-2">
            <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="이미지 서버 주소 (https://...ts.net)" className={`${inputCls} flex-1`} style={inputStyle} />
            <button onClick={() => { saveImageServerUrl(serverUrl); setEditingServer(false); }} className="rounded border px-3 text-sm" style={{ borderColor: GOLD, color: '#ead9b8' }}>저장</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs" style={{ color: 'rgba(232,217,184,0.7)' }}>이미지 서버: {serverUrl}</span>
            <button onClick={() => setEditingServer(true)} className="rounded border px-3 py-1 text-xs" style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}>수정</button>
          </div>
        )}
        <label className="cursor-pointer rounded-full border px-4 py-2 text-center text-sm" style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}>
          {uploading ? `업로드 중… (${uploading})` : '📤 사진 여러 장 일괄 업로드'}
          <input type="file" accept="image/*" multiple className="hidden" disabled={!!uploading} onChange={(e) => handleFiles(e.target.files)} />
        </label>
        <div className="flex gap-2">
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="또는 이미지 URL 붙여넣기" className={`${inputCls} flex-1`} style={inputStyle} />
          <button onClick={addByUrl} disabled={!urlInput.trim()} className="rounded border px-3 text-sm disabled:opacity-40" style={{ borderColor: GOLD, color: '#ead9b8' }}>추가</button>
        </div>
        {error && <div className="text-xs" style={{ color: 'rgba(224,160,160,0.9)' }}>{error}</div>}
        <div className="text-[11px]" style={{ color: 'rgba(232,217,184,0.5)' }}>업로드한 작품마다 아래에서 감정가·해설·배치를 입력하세요.</div>

        {/* 다른 반 작품 가져오기 */}
        <div className="mt-1 border-t pt-3" style={{ borderColor: 'rgba(196,167,90,0.12)' }}>
          <button
            onClick={() => { setShowImport((v) => !v); setImportMsg(''); }}
            className="flex w-full items-center justify-between text-[11px] font-medium"
            style={{ color: GOLD }}
          >
            <span>다른 반 작품 가져오기 {allShared.length > 0 ? `(${allShared.length}점 공유 중)` : ''}</span>
            <span>{showImport ? '▲' : '▼'}</span>
          </button>

          {showImport && (
            <div className="mt-2 flex flex-col gap-2">
              {allShared.length === 0 ? (
                <div className="py-3 text-center text-[11px]" style={{ color: 'rgba(232,217,184,0.4)' }}>
                  공유된 작품이 없어요 (다른 반이 없거나 모두 비공개)
                </div>
              ) : (
                <>
                  {/* 분류 탭 */}
                  <div className="flex gap-1">
                    {(Object.keys(TAB_LABELS) as BrowseTab[]).map((tab) => {
                      const active = browseTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setBrowseTab(tab)}
                          className="flex-1 rounded border py-1 text-xs"
                          style={{
                            borderColor: active ? GOLD : 'rgba(196,167,90,0.25)',
                            background: active ? 'rgba(196,167,90,0.2)' : 'transparent',
                            color: active ? '#ead9b8' : 'rgba(232,217,184,0.55)',
                          }}
                        >
                          {TAB_LABELS[tab]} ({counts[tab]})
                        </button>
                      );
                    })}
                  </div>

                  {/* 전체 선택 */}
                  {tabArtworks.length > 0 && (
                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-1.5 text-[11px]" style={{ color: 'rgba(232,217,184,0.7)' }}>
                        <input type="checkbox" checked={tabAllChecked} onChange={toggleAll} />
                        이 탭 전체 선택 ({tabArtworks.length}점)
                      </label>
                      {totalSelected > 0 && (
                        <span className="text-[11px]" style={{ color: GOLD }}>총 {totalSelected}점 선택됨</span>
                      )}
                    </div>
                  )}

                  {/* 작품 목록 — 반별 그룹 */}
                  {tabArtworks.length === 0 ? (
                    <div className="py-3 text-center text-[11px]" style={{ color: 'rgba(232,217,184,0.4)' }}>
                      이 분류에 공유된 작품이 없어요
                    </div>
                  ) : (
                    <div className="flex max-h-60 flex-col gap-3 overflow-y-auto pr-0.5">
                      {tabGroups.map((group) => {
                        const groupKeys = group.artworks.map(makeKey);
                        const groupAllChecked = groupKeys.length > 0 && groupKeys.every((k) => selectedIds.has(k));
                        return (
                          <div key={group.srcCode}>
                            <label className="mb-1 flex cursor-pointer items-center gap-1.5 border-b pb-1 text-[11px] font-semibold" style={{ borderColor: 'rgba(196,167,90,0.2)', color: GOLD }}>
                              <input type="checkbox" checked={groupAllChecked} onChange={() => toggleGroup(group.artworks)} />
                              {group.className || group.srcCode} ({group.artworks.length}점)
                            </label>
                            <div className="flex flex-col gap-1.5">
                              {group.artworks.map((a) => {
                                const key = makeKey(a);
                                const checked = selectedIds.has(key);
                                return (
                                  <label
                                    key={key}
                                    className="flex cursor-pointer items-center gap-2 rounded border p-2"
                                    style={{
                                      borderColor: checked ? 'rgba(196,167,90,0.5)' : 'rgba(196,167,90,0.15)',
                                      background: checked ? 'rgba(196,167,90,0.08)' : 'transparent',
                                    }}
                                  >
                                    <input type="checkbox" checked={checked} onChange={() => toggleId(key)} className="shrink-0" />
                                    {a.imageUrl && (
                                      <img src={a.imageUrl} alt={a.title} className="h-10 w-10 shrink-0 rounded object-cover" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-xs font-medium" style={{ color: '#ead9b8' }}>
                                        {a.title || '(제목 없음)'}
                                      </div>
                                      {a.appraisedValue ? (
                                        <div className="text-[10px]" style={{ color: 'rgba(232,217,184,0.5)' }}>
                                          {formatWon(a.appraisedValue)}
                                        </div>
                                      ) : null}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 가져올 위치 선택 + 가져오기 버튼 */}
                  {totalSelected > 0 && (
                    <div className="flex flex-col gap-2 rounded border p-3" style={{ borderColor: 'rgba(196,167,90,0.25)', background: 'rgba(196,167,90,0.06)' }}>
                      <div className="text-[11px] font-medium" style={{ color: GOLD }}>
                        선택한 {totalSelected}점을 어디에 넣을까요?
                      </div>
                      <div className="flex gap-3">
                        {(['common', 'branch'] as DestType[]).map((d) => (
                          <label key={d} className="flex cursor-pointer items-center gap-1.5 text-xs" style={{ color: dest === d ? '#ead9b8' : 'rgba(232,217,184,0.6)' }}>
                            <input type="radio" name="dest" value={d} checked={dest === d} onChange={() => setDest(d)} />
                            {d === 'common' ? '공통감상실 (수행평가)' : '선택감상실 (경매)'}
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={importSelected}
                        disabled={importing}
                        className="rounded-full border py-2 text-sm disabled:opacity-40"
                        style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.15)', color: '#ead9b8' }}
                      >
                        {importing ? '가져오는 중…' : `${totalSelected}점 가져오기 →`}
                      </button>
                    </div>
                  )}

                  {importMsg && (
                    <div className="text-[11px]" style={{ color: importMsg.includes('실패') ? 'rgba(224,160,160,0.9)' : '#8fce8f' }}>
                      {importMsg}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 작품 카드(편집) */}
      <div className="flex flex-col gap-2">
        {artworks.map((a) => (
          <ArtworkCard key={a.id} code={code} art={a} />
        ))}
      </div>
    </div>
  );
}

function ArtworkCard({ code, art }: { code: string; art: Artwork }) {
  const save = (patch: Partial<Artwork>) => updateArtwork(code, art.id, patch);
  return (
    <div className="flex gap-3 rounded border p-2" style={{ borderColor: 'rgba(196,167,90,0.15)' }}>
      {art.imageUrl && <img src={art.imageUrl} alt={art.title} className="h-20 w-20 shrink-0 rounded object-cover" />}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex gap-1.5">
          <input
            defaultValue={art.title}
            onBlur={(e) => save({ title: e.target.value.trim() })}
            placeholder="작품명"
            className={`${inputCls} flex-1`}
            style={inputStyle}
          />
          <input
            defaultValue={art.appraisedValue ? art.appraisedValue / EOK : ''}
            onBlur={(e) => save({ appraisedValue: Math.round((Number(e.target.value) || 0) * EOK) })}
            placeholder="감정가(억)"
            inputMode="decimal"
            className={`${inputCls} w-28`}
            style={inputStyle}
            title="억 단위로 입력 (예: 20 = 20억, 13.2 = 13억 2천만)"
          />
        </div>
        <textarea
          defaultValue={art.commentary}
          onBlur={(e) => save({ commentary: e.target.value.trim() })}
          placeholder="해설 (감정 발표 때 공개)"
          rows={2}
          className={`${inputCls} resize-none`}
          style={inputStyle}
        />
        <input
          defaultValue={art.source}
          onBlur={(e) => save({ source: e.target.value.trim() })}
          placeholder="출처 (발표 때 공개)"
          className={inputCls}
          style={inputStyle}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            defaultValue={art.placement?.kind === 'common' ? 'common' : 'branch'}
            onChange={(e) => {
              const kind = e.target.value as 'common' | 'branch';
              const placement: Placement = kind === 'common' ? { kind: 'common' } : { kind: 'branch', door: 0 };
              save({ placement, forAuction: kind === 'branch' });
            }}
            className={inputCls}
            style={{ ...inputStyle, background: '#1c120a' }}
          >
            <option value="common">공통작품감상실(수행평가)</option>
            <option value="branch">선택작품감상실(경매)</option>
          </select>
          <label className="flex items-center gap-1 text-xs" style={{ color: '#ead9b8' }}>
            <input type="checkbox" defaultChecked={art.forAuction} onChange={(e) => save({ forAuction: e.target.checked })} />
            경매 대상
          </label>
          <label
            className="flex items-center gap-1 text-xs"
            title="체크하면 다른 반 '작품 가져오기'에서 이 작품이 보이지 않아요"
            style={{ color: art.isPrivate ? '#e0a0a0' : 'rgba(232,217,184,0.55)' }}
          >
            <input
              type="checkbox"
              defaultChecked={art.isPrivate ?? false}
              onChange={(e) => save({ isPrivate: e.target.checked })}
            />
            🔒 공유 안 함
          </label>
          <button onClick={() => removeArtwork(code, art.id)} className="ml-auto text-xs" style={{ color: 'rgba(224,160,160,0.8)' }}>삭제</button>
        </div>
      </div>
    </div>
  );
}
