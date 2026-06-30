import { useMemo, useState } from 'react';
import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { addArtwork, removeArtwork, updateArtwork, sortByOrder, copyArtworksFrom } from '@/features/artwork/api';
import { setShowCommonTitles } from '@/features/session/api';
import { uploadImage, loadImageServerUrl, saveImageServerUrl } from '@/features/artwork/upload';
import type { Artwork, Placement, SessionMeta } from '@/models';

interface RawSessionForImport {
  meta?: SessionMeta;
  artworks?: Record<string, { id: string }>;
}

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';
const inputCls = 'rounded border bg-transparent px-2.5 py-1.5 text-sm outline-none';
const inputStyle = { borderColor: BORDER, color: '#ead9b8' };

export function ArtworkManager({ code }: { code: string }) {
  const artworks = sortByOrder(useRtdbList<Artwork>(paths.artworks(code)));
  const meta = useRtdbValue<SessionMeta>(paths.meta(code));
  const showTitles = meta?.showCommonTitles !== false;
  const [serverUrl, setServerUrl] = useState(loadImageServerUrl());
  const [editingServer, setEditingServer] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [srcCode, setSrcCode] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  // 모든 세션 목록 (다른 반 가져오기용)
  const allSessions = useRtdbValue<Record<string, RawSessionForImport>>(paths.sessionsRoot());
  const otherSessions = useMemo(() => {
    if (!allSessions) return [];
    return Object.entries(allSessions)
      .filter(([c]) => c !== code)
      .map(([c, s]) => ({
        code: c,
        className: s.meta?.className,
        teacherName: s.meta?.teacherName,
        gradeBand: s.meta?.gradeBand,
        artworkCount: s.artworks ? Object.keys(s.artworks).length : 0,
        createdAt: s.meta?.createdAt ?? 0,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allSessions, code]);

  async function importFrom() {
    const from = srcCode.trim().toUpperCase();
    if (!from || from === code) return;
    setImporting(true);
    setImportMsg('');
    try {
      const n = await copyArtworksFrom(from, code, artworks.length);
      setImportMsg(n > 0 ? `${from}에서 ${n}점 복사했어요` : `${from}에 작품이 없어요`);
      if (n > 0) setSrcCode('');
    } catch {
      setImportMsg('가져오기 실패 — 코드를 확인하세요');
    } finally {
      setImporting(false);
    }
  }

  // 여러 장 일괄 업로드 → 각 파일을 업로드하고 카드(작품) 생성
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!serverUrl.trim()) {
      setError('먼저 이미지 서버 주소를 입력하세요');
      return;
    }
    setError('');
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      setUploading(`${i + 1}/${list.length}`);
      try {
        const url = await uploadImage(serverUrl.trim(), f);
        const title = f.name.replace(/\.[^.]+$/, '');
        await addArtwork(
          code,
          {
            imageUrl: url,
            title,
            source: '',
            appraisedValue: 0,
            commentary: '',
            placement: { kind: 'branch', door: 0 }, // 기본 분기(경매)
            forAuction: true,
          },
          artworks.length + i,
        );
      } catch {
        setError('일부 업로드 실패 — 서버 주소·실행 상태 확인');
      }
    }
    setUploading('');
  }

  async function addByUrl() {
    if (!urlInput.trim()) return;
    await addArtwork(
      code,
      {
        imageUrl: urlInput.trim(),
        title: '새 작품',
        source: '',
        appraisedValue: 0,
        commentary: '',
        placement: { kind: 'branch', door: 0 },
        forAuction: true,
      },
      artworks.length,
    );
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

      {/* 이미지 서버 + 일괄 업로드 */}
      <div className="mb-3 flex flex-col gap-2 rounded border p-3" style={{ borderColor: 'rgba(196,167,90,0.15)' }}>
        {editingServer ? (
          <div className="flex gap-2">
            <input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="이미지 서버 주소 (https://...ts.net)"
              className={`${inputCls} flex-1`}
              style={inputStyle}
            />
            <button
              onClick={() => { saveImageServerUrl(serverUrl); setEditingServer(false); }}
              className="rounded border px-3 text-sm"
              style={{ borderColor: GOLD, color: '#ead9b8' }}
            >
              저장
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs" style={{ color: 'rgba(232,217,184,0.7)' }}>
              이미지 서버: {serverUrl}
            </span>
            <button
              onClick={() => setEditingServer(true)}
              className="rounded border px-3 py-1 text-xs"
              style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
            >
              수정
            </button>
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
        <div className="text-[11px]" style={{ color: 'rgba(232,217,184,0.5)' }}>
          업로드한 작품마다 아래에서 감정가·해설·배치를 입력하세요.
        </div>

        {/* 다른 반에서 작품 가져오기 */}
        <div className="mt-1 flex flex-col gap-2 border-t pt-2" style={{ borderColor: 'rgba(196,167,90,0.12)' }}>
          <div className="text-[11px] font-medium" style={{ color: GOLD }}>다른 반에서 작품 가져오기</div>
          {otherSessions.length === 0 ? (
            <div className="text-[11px]" style={{ color: 'rgba(232,217,184,0.4)' }}>
              다른 세션이 없어요
            </div>
          ) : (
            <select
              value={srcCode}
              onChange={(e) => { setSrcCode(e.target.value); setImportMsg(''); }}
              className={`${inputCls} w-full`}
              style={{ ...inputStyle, background: 'rgba(28,18,10,0.8)' }}
            >
              <option value="">반 선택…</option>
              {otherSessions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.className || '(이름 없는 반)'}
                  {s.teacherName ? ` · ${s.teacherName}` : ''}
                  {` — 작품 ${s.artworkCount}점`}
                  {` [${s.code}]`}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={importFrom}
              disabled={importing || !srcCode.trim()}
              className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
              style={{ borderColor: GOLD, color: '#ead9b8' }}
            >
              {importing ? '가져오는 중…' : '작품 가져오기'}
            </button>
            {srcCode && (
              <span className="self-center text-[11px]" style={{ color: 'rgba(232,217,184,0.5)' }}>
                선택된 코드: <b style={{ color: GOLD }}>{srcCode}</b>
              </span>
            )}
          </div>
        </div>
        {importMsg && <div className="text-[11px]" style={{ color: 'rgba(232,217,184,0.7)' }}>{importMsg}</div>}
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
        <div className="flex items-center gap-2">
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
          <button onClick={() => removeArtwork(code, art.id)} className="ml-auto text-xs" style={{ color: 'rgba(224,160,160,0.8)' }}>삭제</button>
        </div>
      </div>
    </div>
  );
}
