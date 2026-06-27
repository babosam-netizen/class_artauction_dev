import { useState } from 'react';
import { useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { addArtwork, removeArtwork, updateArtwork, sortByOrder } from '@/features/artwork/api';
import { uploadImage, loadImageServerUrl, saveImageServerUrl } from '@/features/artwork/upload';
import type { Artwork, Placement } from '@/models';

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';
const inputCls = 'rounded border bg-transparent px-2.5 py-1.5 text-sm outline-none';
const inputStyle = { borderColor: BORDER, color: '#ead9b8' };

export function ArtworkManager({ code }: { code: string }) {
  const artworks = sortByOrder(useRtdbList<Artwork>(paths.artworks(code)));
  const [serverUrl, setServerUrl] = useState(loadImageServerUrl());
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [urlInput, setUrlInput] = useState('');

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
      <div className="mb-3 text-sm font-medium" style={{ color: GOLD }}>작품 관리 ({artworks.length})</div>

      {/* 이미지 서버 + 일괄 업로드 */}
      <div className="mb-3 flex flex-col gap-2 rounded border p-3" style={{ borderColor: 'rgba(196,167,90,0.15)' }}>
        <input
          value={serverUrl}
          onChange={(e) => { setServerUrl(e.target.value); saveImageServerUrl(e.target.value); }}
          placeholder="이미지 서버 주소 (https://...ts.net)"
          className={inputCls}
          style={inputStyle}
        />
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
            <option value="common">공통회랑(수행평가)</option>
            <option value="branch">분기(경매)</option>
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
