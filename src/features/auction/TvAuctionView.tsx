import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { useCountdown } from './useCountdown';
import type { Artwork, AuctionItem, Bid, Group, SessionState } from '@/models';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

export function TvAuctionView({ code }: { code: string }) {
  const state = useRtdbValue<SessionState>(paths.state(code));
  const currentId = state?.currentAuctionArtworkId;
  const item = useRtdbValue<AuctionItem>(currentId ? paths.auctionItem(code, currentId) : null);
  const artworks = useRtdbList<Artwork>(paths.artworks(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code));
  const bids = useRtdbList<Bid>(paths.bids(code));
  const remaining = useCountdown(item?.timerState === 'running' ? item?.timerEndsAt : undefined);

  const artwork = artworks.find((a) => a.id === currentId);
  const groupName = (id?: string) => (id ? groupsMap?.[id]?.name : null);
  const recent = bids
    .filter((b) => b.artworkId === currentId)
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  return (
    <div className="flex h-screen items-center justify-center font-body" style={{ background: C.wall }}>
      {!artwork ? (
        <div className="font-display text-5xl italic" style={{ color: C.cream }}>
          경매를 준비하고 있습니다
        </div>
      ) : (
        <div className="flex w-full max-w-5xl items-center gap-12 px-12">
          {artwork.imageUrl && (
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="h-[60vh] w-1/2 rounded object-cover"
              style={{ boxShadow: '0 30px 90px rgba(0,0,0,0.85)' }}
            />
          )}
          <div className="flex-1">
            <div className="font-display text-5xl italic" style={{ color: C.cream }}>
              {artwork.title}
            </div>
            <div className="mt-8 text-lg" style={{ color: C.creamDim }}>현재 최고가</div>
            <div className="font-display text-7xl" style={{ color: C.gold }}>
              {(item?.currentPrice ?? 0).toLocaleString()}원
            </div>
            <div className="mt-2 text-2xl" style={{ color: C.cream }}>
              {item?.status === 'sold'
                ? `🔨 ${groupName(item.highBidGroupId)} 낙찰!`
                : item?.status === 'passed'
                  ? '유찰'
                  : item?.highBidGroupId
                    ? `최고 입찰: ${groupName(item.highBidGroupId)}`
                    : '입찰을 기다립니다'}
            </div>
            {item?.timerState === 'running' && (
              <div
                className="mt-4 font-display text-6xl"
                style={{ color: remaining <= 3 ? '#e0a0a0' : C.cream }}
              >
                ⏱ {remaining}
              </div>
            )}
            {recent.length > 0 && (
              <div className="mt-6 space-y-1 text-sm" style={{ color: C.creamDim }}>
                {recent.map((b) => (
                  <div key={b.id}>
                    {groupName(b.groupId)} — {b.amount.toLocaleString()}원
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
