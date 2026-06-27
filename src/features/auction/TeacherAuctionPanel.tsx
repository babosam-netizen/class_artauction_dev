import { useEffect, useRef } from 'react';
import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import {
  initAuction,
  presentArtwork,
  startTimer,
  finalizeItem,
  reauction,
} from './api';
import { sortByOrder } from '@/features/artwork/api';
import { useCountdown } from './useCountdown';
import type { Artwork, AuctionItem, Group, SessionMeta, SessionState } from '@/models';

const GOLD = '#c4975a';

interface Props {
  code: string;
  meta: SessionMeta;
}

export function TeacherAuctionPanel({ code, meta }: Props) {
  const items = sortByOrder(useRtdbList<AuctionItem>(paths.auctionItems(code)));
  const artworks = useRtdbList<Artwork>(paths.artworks(code));
  const state = useRtdbValue<SessionState>(paths.state(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code));

  const currentId = state?.currentAuctionArtworkId;
  const current = items.find((i) => i.artworkId === currentId);
  const remaining = useCountdown(current?.timerState === 'running' ? current?.timerEndsAt : undefined);

  const title = (id: string) => artworks.find((a) => a.id === id)?.title ?? id;
  const groupName = (id?: string) => (id ? groupsMap?.[id]?.name : null);

  // 타이머 종료 시 자동 마감 (호가 없으면 유찰, 있으면 낙찰)
  const finalizingRef = useRef(false);
  useEffect(() => {
    if (!current || current.timerState !== 'running' || !current.timerEndsAt) return;
    if (remaining > 0) return;
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    finalizeItem(code, current.artworkId).finally(() => {
      finalizingRef.current = false;
    });
  }, [remaining, current?.artworkId, current?.timerState, current?.timerEndsAt, code]);

  const liveOngoing = current && current.status === 'live';
  const forAuctionCount = artworks.filter((a) => a.forAuction).length;
  const soldCount = items.filter((i) => i.status === 'sold').length;
  const passedCount = items.filter((i) => i.status === 'passed').length;
  const remainCount = items.filter((i) => i.status === 'pending' || i.status === 'passed').length;

  return (
    <div
      className="w-full rounded-lg border p-5 text-left"
      style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}
    >
      <div className="mb-2 text-sm font-medium" style={{ color: GOLD }}>
        경매 진행 ({items.length})
      </div>
      <div className="mb-3 rounded px-2 py-1.5 text-[11px]" style={{ background: 'rgba(196,167,90,0.08)', color: 'rgba(232,217,184,0.7)' }}>
        ① 경매 초기화 → ② 작품 올리기 → ③ 타이머 시작 → ④ 시간 내 호가 없으면 자동 낙찰(있으면 연장)
      </div>

      {items.length === 0 &&
        (forAuctionCount === 0 ? (
          <div className="rounded border p-3 text-xs" style={{ borderColor: 'rgba(224,160,160,0.4)', color: 'rgba(224,160,160,0.9)' }}>
            경매 대상 작품이 없어요. "작품 관리"에서 <b>분기(경매)</b> 작품을 올리거나 <b>경매 대상</b>을 체크한 뒤 다시 오세요.
          </div>
        ) : (
          <button
            onClick={() => initAuction(code, artworks)}
            className="w-full rounded-full border py-2.5 text-sm"
            style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.15)', color: '#ead9b8' }}
          >
            경매 초기화 — 경매 대상 {forAuctionCount}점 (랜덤 순서로 목록 생성)
          </button>
        ))}

      {/* 현재 진행 작품 */}
      {current && (
        <div className="mb-4 rounded border p-3" style={{ borderColor: 'rgba(196,167,90,0.3)' }}>
          <div className="font-display text-lg italic" style={{ color: '#ead9b8' }}>
            {title(current.artworkId)}
          </div>
          <div className="mt-1 text-sm" style={{ color: GOLD }}>
            {current.currentPrice.toLocaleString()}원
            {current.highBidGroupId && ` · 최고 ${groupName(current.highBidGroupId)}`}
          </div>
          {current.timerState === 'running' && (
            <div className="mt-1 text-sm" style={{ color: '#ead9b8' }}>⏱ {remaining}초</div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {current.status === 'live' && current.timerState !== 'running' && (
              <button
                onClick={() => startTimer(code, current.artworkId, meta.timerSeconds)}
                className="rounded-full border px-4 py-1.5 text-xs"
                style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
              >
                타이머 시작 ({meta.timerSeconds}초)
              </button>
            )}
            {current.status === 'live' && (
              <button
                onClick={() => finalizeItem(code, current.artworkId)}
                className="rounded-full border px-4 py-1.5 text-xs"
                style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
              >
                지금 마감
              </button>
            )}
            {current.status === 'passed' && (
              <button
                onClick={() => reauction(code, current.artworkId)}
                className="rounded-full border px-4 py-1.5 text-xs"
                style={{ borderColor: GOLD, color: '#ead9b8' }}
              >
                재경매
              </button>
            )}
          </div>
        </div>
      )}

      {/* 올리기 안내 */}
      {items.length > 0 && !current && (
        <div className="mb-2 text-xs" style={{ color: 'rgba(232,217,184,0.7)' }}>
          아래 목록에서 작품을 <b style={{ color: GOLD }}>올리기</b> 하면 경매가 시작됩니다.
        </div>
      )}

      {/* 작품 목록 */}
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div
            key={it.artworkId}
            className="flex items-center justify-between rounded border px-3 py-2 text-sm"
            style={{
              borderColor: it.artworkId === currentId ? GOLD : 'rgba(196,167,90,0.15)',
            }}
          >
            <span style={{ color: '#ead9b8' }}>
              {title(it.artworkId)}{' '}
              <span style={{ color: 'rgba(196,167,90,0.6)' }}>
                {it.status === 'sold'
                  ? `· 낙찰 ${it.currentPrice.toLocaleString()}원`
                  : it.status === 'passed'
                    ? '· 유찰'
                    : it.status === 'live'
                      ? '· 진행 중'
                      : ''}
              </span>
            </span>
            {(it.status === 'pending' || it.status === 'passed') && !liveOngoing && (
              <button
                onClick={() => presentArtwork(code, it.artworkId)}
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: GOLD, color: '#ead9b8' }}
              >
                올리기
              </button>
            )}
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-3 text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>
          낙찰 {soldCount} · 유찰 {passedCount} · 남음 {remainCount}
          {remainCount === 0 && ' · 경매 종료 → 결과 단계로 넘어가세요'}
        </div>
      )}
    </div>
  );
}
