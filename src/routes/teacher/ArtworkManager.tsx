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
import type { Artwork, Placement, SessionMeta } from '@/models';

interface RawSessionForImport {
  meta?: SessionMeta;
  artworks?: Record<string, Artwork>;
}

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';
const inputCls = 'rounded border bg-transparent px-2.5 py-1.5 text-sm outline-none';
const inputStyle = { borderColor: BORDER, color: '#ead9b8' };

type ImportTab = 'common' | 'branch' | 'auction';
const TAB_LABELS: Record<ImportTab, string> = {
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

  // 다른 반 가져오기 상태
  const [srcCode, setSrcCode] = useState('');
  const [importTab, setImportTab] = useState<ImportTab>('common');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  // 모든 세션 구독 (반 목록 + 작품 데이터)
  const allSessions = useRtdbValue<Record<string, RawSessionForImport>>(paths.sessionsRoot());

  const otherSessions = useMemo(() => {
    if (!allSessions) return [];
    return Object.entries(allSessions)
      .filter(([c]) => c !== code)
      .map(([c, s]) => {
        const all = s.artworks ? Object.values(s.artworks) : [];
        const shared = all.filter((a) => !a.isPrivate);
        return {
          code: c,
          className: s.meta?.className,
          teacherName: s.meta?.teacherName,
          gradeBand: s.meta?.gradeBand,
          sharedCount: shared.length,
          createdAt: s.meta?.createdAt ?? 0,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allSessions, code]);

  // 선택된 반의 공유 가능 작품 (탭별 필터)
  const srcArtworks = useMemo<Artwork[]>(() => {
    if (!srcCode || !allSessions?.[srcCode]?.artworks) return [];
    const all = sortByOrder(
      Object.values(allSessions[srcCode].artworks!).filter((a) => !a.isPrivate),
    );
    if (importTab === 'common') return all.filter((a) => a.placement?.kind === 'common');
    if (importTab === 'branch') return all.filter((a) => a.placement?.kind === 'branch');
    if (importTab === 'auction') return all.filter((a) => a.forAuction);
    return all;
  }, [allSessions, srcCode, importTab]);

  function handleSelectSession(c: string) {
    setSrcCode(c);
    setSelectedIds(new Set());
    setImportMsg('');
    setImportTab('common');
  }

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === srcArtworks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(srcArtworks.map((a) => a.id)));
    }
  }

  async function importSelected() {
    if (selectedIds.size === 0) return;
    setImporting(true);
    setImportMsg('');
    try {
      // 전체 작품 목록에서 선택된 것만 추려 순서 유지
      const toImport = srcArtworks.filter((a) => selectedIds.has(a.id));
      const n = await copySelectedArtworks(toImport, code, artworks.length);
      setImportMsg(`${n}점을 가져왔어요 ✓`);
      setSelectedIds(new Set());
    } catch {
      setImportMsg('가져오기 실패 — 다시 시도해 주세요');
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
      const f = list[i];
      setUploading(`${i + 1}/${list.length}`);
      try {
        const url = await uploadImage(serverUrl.trim(), f);
        const title = f.name.replace(/\.[^.]+$/, '');
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

        {/* 다른 반에서 작품 가져오기 */}
        <div className="mt-1 flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'rgba(196,167,90,0.12)' }}>
          <div className="text-[11px] font-medium" style={{ color: GOLD }}>다른 반에서 작품 가져오기</div>

          {/* 반 선택 드롭다운 */}
          {otherSessions.length === 0 ? (
            <div className="text-[11px]" style={{ color: 'rgba(232,217,184,0.4)' }}>다른 세션이 없어요</div>
          ) : (
            <select
              value={srcCode}
              onChange={(e) => handleSelectSession(e.target.value)}
              className={`${inputCls} w-full`}
              style={{ ...inputStyle, background: 'rgba(28,18,10,0.8)' }}
            >
              <option value="">반 선택…</option>
              {otherSessions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.className || '(이름 없는 반)'}
                  {s.teacherName ? ` · ${s.teacherName}` : ''}
                  {` — 공유 가능 ${s.sharedCount}점`}
                  {` [${s.code}]`}
                </option>
              ))}
            </select>
          )}

          {/* 반 선택 후: 탭 + 작품 목록 */}
          {srcCode && (
            <div className="flex flex-col gap-2">
              {/* 탭 */}
              <div className="flex gap-1">
                {(Object.keys(TAB_LABELS) as ImportTab[]).map((tab) => {
                  const all = allSessions?.[srcCode]?.artworks
                    ? Object.values(allSessions[srcCode].artworks!).filter((a) => !a.isPrivate)
                    : [];
                  const count =
                    tab === 'common' ? all.filter((a) => a.placement?.kind === 'common').length
                    : tab === 'branch' ? all.filter((a) => a.placement?.kind === 'branch').length
                    : all.filter((a) => a.forAuction).length;
                  const active = importTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => { setImportTab(tab); setSelectedIds(new Set()); }}
                      className="flex-1 rounded border py-1 text-xs"
                      style={{
                        borderColor: active ? GOLD : 'rgba(196,167,90,0.25)',
                        background: active ? 'rgba(196,167,90,0.2)' : 'transparent',
                        color: active ? '#ead9b8' : 'rgba(232,217,184,0.6)',
                      }}
                    >
                      {TAB_LABELS[tab]} ({count})
                    </button>
                  );
                })}
              </div>

              {/* 작품 목록 */}
              {srcArtworks.length === 0 ? (
                <div className="text-center text-[11px] py-3" style={{ color: 'rgba(232,217,184,0.4)' }}>
                  이 카테고리에 작품이 없어요
                </div>
              ) : (
                <>
                  {/* 전체선택 */}
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px]" style={{ color: 'rgba(232,217,184,0.7)' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === srcArtworks.length && srcArtworks.length > 0}
                        onChange={toggleAll}
                      />
                      전체 선택 ({srcArtworks.length}점)
                    </label>
                    {selectedIds.size > 0 && (
                      <span className="text-[11px]" style={{ color: GOLD }}>{selectedIds.size}점 선택됨</span>
                    )}
                  </div>

                  {/* 작품 카드 목록 */}
                  <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
                    {srcArtworks.map((a) => {
                      const checked = selectedIds.has(a.id);
                      return (
                        <label
                          key={a.id}
                          className="flex cursor-pointer items-center gap-2 rounded border p-2"
                          style={{
                            borderColor: checked ? 'rgba(196,167,90,0.5)' : 'rgba(196,167,90,0.15)',
                            background: checked ? 'rgba(196,167,90,0.08)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleId(a.id)}
                            className="shrink-0"
                          />
                          {a.imageUrl && (
                            <img src={a.imageUrl} alt={a.title} className="h-10 w-10 shrink-0 rounded object-cover" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium" style={{ color: '#ead9b8' }}>{a.title || '(제목 없음)'}</div>
                            <div className="text-[10px]" style={{ color: 'rgba(232,217,184,0.5)' }}>
                              {a.placement?.kind === 'common' ? '공통감상' : '선택감상'}
                              {a.forAuction ? ' · 경매대상' : ''}
                              {a.appraisedValue ? ` · ${a.appraisedValue.toLocaleString()}원` : ''}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              {/* 가져오기 버튼 */}
              <button
                onClick={importSelected}
                disabled={importing || selectedIds.size === 0}
                className="rounded-full border py-2 text-sm disabled:opacity-40"
                style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
              >
                {importing ? '가져오는 중…' : `선택한 ${selectedIds.size}점 가져오기`}
              </button>
            </div>
          )}

          {importMsg && (
            <div className="text-[11px]" style={{ color: importMsg.includes('실패') ? 'rgba(224,160,160,0.9)' : '#8fce8f' }}>
              {importMsg}
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
            defaultValue={art.appraisedValue || ''}
            onBlur={(e) => save({ appraisedValue: Number(e.target.value) || 0 })}
            placeholder="감정가(원)"
            inputMode="numeric"
            className={`${inputCls} w-28`}
            style={inputStyle}
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
