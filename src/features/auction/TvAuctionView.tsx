import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { participantIds } from './api';
import type { Artwork, AuctionItem, Group, SessionState } from '@/models';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  green: '#8fce8f',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

export function TvAuctionView({ code }: { code: string }) {
  const state = useRtdbValue<SessionState>(paths.state(code));
  const currentId = state?.currentAuctionArtworkId;
  const item = useRtdbValue<AuctionItem>(currentId ? paths.auctionItem(code, currentId) : null);
  const artworks = useRtdbList<Artwork>(paths.artworks(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code));

  const artwork = artworks.find((a) => a.id === currentId);
  const groupName = (id: string) => groupsMap?.[id]?.name ?? id;
  const inIds = participantIds(item);
  const sold = item?.status === 'sold';
  const passed = item?.status === 'passed';

  if (!artwork) {
    return (
      <div className="flex h-screen items-center justify-center font-body" style={{ background: C.wall }}>
        <div className="font-display text-5xl italic" style={{ color: C.cream }}>경매를 준비하고 있습니다</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center font-body" style={{ background: C.wall }}>
      <div className="flex w-full max-w-6xl items-center gap-12 px-12">
        {/* 작품 + 낙찰 도장 */}
        <div className="relative w-1/2">
          <img src={artwork.imageUrl} alt={artwork.title} className="h-[60vh] w-full rounded object-cover" style={{ boxShadow: '0 30px 90px rgba(0,0,0,0.85)', opacity: sold ? 0.85 : 1 }} />
          {sold && (
            <div
              className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-2xl"
              style={{
                border: '8px solid #d23',
                color: '#d23',
                padding: '12px 36px',
                fontSize: 64,
                fontWeight: 900,
                letterSpacing: 8,
                background: 'rgba(255,255,255,0.86)',
                animation: 'stampIn 0.5s cubic-bezier(.2,1.4,.4,1) both',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            >
              낙찰
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1">
          <div className="font-display text-5xl italic" style={{ color: C.cream }}>{artwork.title}</div>
          <div className="mt-8 text-lg" style={{ color: C.creamDim }}>현재 호가</div>
          <div className="font-display text-7xl" style={{ color: C.gold }}>{(item?.askingPrice ?? 0).toLocaleString()}원</div>

          {sold ? (
            <div className="mt-4 font-display text-4xl italic" style={{ color: C.green, animation: 'popIn 0.4s ease both' }}>
              🔨 {groupName(item!.winnerGroupId ?? '')} 낙찰!
            </div>
          ) : passed ? (
            <div className="mt-4 font-display text-4xl italic" style={{ color: C.creamDim }}>유찰</div>
          ) : (
            <>
              <div className="mt-6 text-lg" style={{ color: C.creamDim }}>참여 {inIds.length}팀</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.values(groupsMap ?? {})).sort((a, b) => a.name.localeCompare(b.name)).map((g) => {
                  const isIn = inIds.includes(g.id);
                  return (
                    <span key={g.id} className="rounded-full px-4 py-2 text-xl" style={{ border: `2px solid ${isIn ? C.green : 'rgba(196,167,90,0.25)'}`, background: isIn ? 'rgba(143,206,143,0.18)' : 'transparent', color: isIn ? C.cream : 'rgba(232,217,184,0.35)', animation: isIn ? 'popIn 0.3s ease both' : undefined }}>
                      {isIn ? '✋ ' : ''}{g.name}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
