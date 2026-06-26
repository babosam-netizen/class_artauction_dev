import { useState } from 'react';
import { useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { addArtwork, removeArtwork, placementLabel, sortByOrder } from '@/features/artwork/api';
import { uploadImage, loadImageServerUrl, saveImageServerUrl } from '@/features/artwork/upload';
import type { Artwork, Placement } from '@/models';

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';

interface Props {
  code: string;
  branchDoorCount: number;
}

export function ArtworkManager({ code, branchDoorCount }: Props) {
  const artworks = sortByOrder(useRtdbList<Artwork>(paths.artworks(code)));

  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [appraisedValue, setAppraisedValue] = useState('');
  const [commentary, setCommentary] = useState('');
  const [placeType, setPlaceType] = useState<'common' | 'branch'>('common');
  const [door, setDoor] = useState(0);
  const [forAuction, setForAuction] = useState(true);
  const [busy, setBusy] = useState(false);
  const [serverUrl, setServerUrl] = useState(loadImageServerUrl());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const canAdd = imageUrl.trim() && title.trim() && appraisedValue.trim();

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!serverUrl.trim()) {
      setUploadError('먼저 이미지 서버 주소를 입력하세요');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploadImage(serverUrl.trim(), file);
      setImageUrl(url);
    } catch {
      setUploadError('업로드 실패 — 서버 주소와 실행 상태를 확인하세요');
    } finally {
      setUploading(false);
    }
  }

  async function handleAdd() {
    setBusy(true);
    try {
      const placement: Placement =
        placeType === 'common' ? { kind: 'common' } : { kind: 'branch', door };
      await addArtwork(
        code,
        {
          imageUrl: imageUrl.trim(),
          title: title.trim(),
          source: source.trim(),
          appraisedValue: Number(appraisedValue) || 0,
          commentary: commentary.trim(),
          placement,
          forAuction,
        },
        artworks.length,
      );
      setImageUrl('');
      setTitle('');
      setSource('');
      setAppraisedValue('');
      setCommentary('');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'rounded border bg-transparent px-3 py-2 text-sm outline-none';
  const inputStyle = { borderColor: BORDER, color: '#ead9b8' };

  return (
    <div
      className="mt-8 w-[420px] rounded-lg border p-5 text-left"
      style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}
    >
      <div className="mb-3 text-sm font-medium" style={{ color: GOLD }}>
        작품 관리 ({artworks.length})
      </div>

      {/* 이미지 서버(맥스튜디오 터널) 설정 + 업로드 */}
      <div
        className="mb-3 flex flex-col gap-2 rounded border p-3"
        style={{ borderColor: 'rgba(196,167,90,0.15)' }}
      >
        <input
          value={serverUrl}
          onChange={(e) => {
            setServerUrl(e.target.value);
            saveImageServerUrl(e.target.value);
          }}
          placeholder="이미지 서버 주소 (https://...trycloudflare.com)"
          className={inputCls}
          style={inputStyle}
        />
        <label
          className="cursor-pointer rounded-full border px-4 py-2 text-center text-sm"
          style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
        >
          {uploading ? '업로드 중…' : '📤 이미지 업로드'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </label>
        {uploadError && (
          <div className="text-xs" style={{ color: 'rgba(224,160,160,0.9)' }}>
            {uploadError}
          </div>
        )}
      </div>

      {/* 추가 폼 */}
      <div className="flex flex-col gap-2">
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="이미지 URL (붙여넣기 또는 위에서 업로드)"
          className={inputCls}
          style={inputStyle}
        />
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="작품명"
            className={`${inputCls} flex-1`}
            style={inputStyle}
          />
          <input
            value={appraisedValue}
            onChange={(e) => setAppraisedValue(e.target.value)}
            placeholder="감정가(원)"
            inputMode="numeric"
            className={`${inputCls} w-28`}
            style={inputStyle}
          />
        </div>
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="출처 (결과 때 공개)"
          className={inputCls}
          style={inputStyle}
        />
        <textarea
          value={commentary}
          onChange={(e) => setCommentary(e.target.value)}
          placeholder="작품 해설 (감상 직후 학생에게 표시)"
          rows={2}
          className={`${inputCls} resize-none`}
          style={inputStyle}
        />
        <div className="flex items-center gap-2">
          <select
            value={placeType}
            onChange={(e) => setPlaceType(e.target.value as 'common' | 'branch')}
            className={inputCls}
            style={{ ...inputStyle, background: '#1c120a' }}
          >
            <option value="common">공통회랑</option>
            <option value="branch">분기</option>
          </select>
          {placeType === 'branch' && (
            <select
              value={door}
              onChange={(e) => setDoor(Number(e.target.value))}
              className={inputCls}
              style={{ ...inputStyle, background: '#1c120a' }}
            >
              {Array.from({ length: branchDoorCount }, (_, i) => (
                <option key={i} value={i}>
                  {i + 1}번 문
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1 text-xs" style={{ color: '#ead9b8' }}>
            <input
              type="checkbox"
              checked={forAuction}
              onChange={(e) => setForAuction(e.target.checked)}
            />
            경매 대상
          </label>
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAdd || busy}
          className="rounded-full border px-5 py-2 text-sm disabled:opacity-40"
          style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
        >
          {busy ? '추가 중…' : '＋ 작품 추가'}
        </button>
      </div>

      {/* 목록 */}
      {artworks.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {artworks.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded border px-3 py-2"
              style={{ borderColor: 'rgba(196,167,90,0.15)' }}
            >
              {a.imageUrl && (
                <img
                  src={a.imageUrl}
                  alt={a.title}
                  className="h-10 w-10 rounded object-cover"
                />
              )}
              <div className="flex-1 text-left">
                <div className="text-sm" style={{ color: '#ead9b8' }}>
                  {a.title}
                </div>
                <div className="text-[11px]" style={{ color: 'rgba(196,167,90,0.6)' }}>
                  {placementLabel(a.placement)} · {a.appraisedValue.toLocaleString()}원
                  {a.forAuction ? ' · 경매' : ''}
                </div>
              </div>
              <button
                onClick={() => removeArtwork(code, a.id)}
                className="text-xs"
                style={{ color: 'rgba(224,160,160,0.8)' }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
