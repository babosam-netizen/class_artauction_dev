import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { initAuction, presentArtwork, raisePrice, award, passItem, reauction, participantIds } from './api';
import { sortByOrder } from '@/features/artwork/api';
import type { Artwork, AuctionItem, Group, SessionMeta, SessionState } from '@/models';

const GOLD = '#c4975a';
const GREEN = '#8fce8f';

interface Props {
  code: string;
  meta: SessionMeta;
}

export function TeacherAuctionPanel({ code, meta }: Props) {
  const items = sortByOrder(useRtdbList<AuctionItem>(paths.auctionItems(code)));
  const artworks = useRtdbList<Artwork>(paths.artworks(code));
  const state = useRtdbValue<SessionState>(paths.state(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code)) ?? {};

  const currentId = state?.currentAuctionArtworkId;
  const current = items.find((i) => i.artworkId === currentId);
  const title = (id: string) => artworks.find((a) => a.id === id)?.title ?? id;
  const groupName = (id: string) => groupsMap[id]?.name ?? id;

  const forAuctionCount = artworks.filter((a) => a.forAuction).length;
  const allGroups = Object.values(groupsMap).sort((a, b) => a.name.localeCompare(b.name));
  const inIds = participantIds(current);
  const liveOngoing = current && current.status === 'live';
  const soldCount = items.filter((i) => i.status === 'sold').length;
  const remainCount = items.filter((i) => i.status === 'pending' || i.status === 'passed').length;

  const inc = meta.minIncrement;
  const start = meta.minIncrement;

  return (
    <div className="w-full rounded-lg border p-5 text-left" style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}>
      <div className="mb-2 text-sm font-medium" style={{ color: GOLD }}>경매 진행 ({items.length})</div>
      <div className="mb-3 rounded px-2 py-1.5 text-[11px]" style={{ background: 'rgba(196,167,90,0.08)', color: 'rgba(232,217,184,0.7)' }}>
        ① 초기화 → ② 작품 올리기 → ③ 호가 올리기(비싸지면 모둠이 기권) → ④ 1팀 남으면 낙찰
      </div>

      {items.length === 0 &&
        (forAuctionCount === 0 ? (
          <div className="rounded border p-3 text-xs" style={{ borderColor: 'rgba(224,160,160,0.4)', color: 'rgba(224,160,160,0.9)' }}>
            경매 대상 작품이 없어요. "작품 관리"에서 <b>선택작품감상실(경매)</b> 작품을 올리거나 <b>경매 대상</b>을 체크하세요.
          </div>
        ) : (
          <button onClick={() => initAuction(code, artworks)} className="w-full rounded-full border py-2.5 text-sm" style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.15)', color: '#ead9b8' }}>
            경매 초기화 — 경매 대상 {forAuctionCount}점 (랜덤 순서)
          </button>
        ))}

      {/* 현재 작품 */}
      {current && (
        <div className="mb-4 rounded border p-3" style={{ borderColor: 'rgba(196,167,90,0.3)' }}>
          <div className="flex items-baseline justify-between">
            <div className="font-display text-lg italic" style={{ color: '#ead9b8' }}>{title(current.artworkId)}</div>
            <div className="font-display text-xl" style={{ color: GOLD }}>{current.askingPrice.toLocaleString()}원</div>
          </div>

          {current.status === 'sold' ? (
            <div className="mt-1 text-sm" style={{ color: GREEN }}>🔨 {groupName(current.winnerGroupId ?? '')} 낙찰 ({current.askingPrice.toLocaleString()}원)</div>
          ) : current.status === 'passed' ? (
            <div className="mt-1 text-sm" style={{ color: 'rgba(232,217,184,0.6)' }}>유찰</div>
          ) : (
            <>
              {/* 참여 현황 */}
              <div className="mt-2 text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>참여 {inIds.length}팀</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {allGroups.map((g) => {
                  const isIn = inIds.includes(g.id);
                  return (
                    <span key={g.id} className="rounded-full px-2.5 py-1 text-xs" style={{ background: isIn ? 'rgba(143,206,143,0.18)' : 'transparent', border: `1px solid ${isIn ? GREEN : 'rgba(196,167,90,0.25)'}`, color: isIn ? '#ead9b8' : 'rgba(232,217,184,0.4)' }}>
                      {isIn ? '✋ ' : ''}{g.name}
                    </span>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => raisePrice(code, current.artworkId, inc)} className="rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}>
                  호가 올리기 +{inc.toLocaleString()}
                </button>
                {inIds.length === 1 ? (
                  <button onClick={() => award(code, current.artworkId, inIds[0], current.askingPrice)} className="rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: GREEN, background: 'rgba(143,206,143,0.18)', color: '#ead9b8' }}>
                    🔨 {groupName(inIds[0])} 낙찰
                  </button>
                ) : inIds.length === 0 ? (
                  <button onClick={() => passItem(code, current.artworkId)} className="rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}>
                    유찰 처리
                  </button>
                ) : (
                  <span className="self-center text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>참여 1팀이 될 때까지 호가를 올리세요</span>
                )}
              </div>
            </>
          )}
          {current.status === 'passed' && (
            <button onClick={() => reauction(code, current.artworkId)} className="mt-2 rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: GOLD, color: '#ead9b8' }}>재경매</button>
          )}
        </div>
      )}

      {items.length > 0 && !liveOngoing && (
        <div className="mb-2 text-xs" style={{ color: 'rgba(232,217,184,0.7)' }}>
          아래 목록에서 작품을 <b style={{ color: GOLD }}>올리기</b> 하면 경매가 시작됩니다.
        </div>
      )}

      {/* 목록 */}
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div key={it.artworkId} className="flex items-center justify-between rounded border px-3 py-2 text-sm" style={{ borderColor: it.artworkId === currentId ? GOLD : 'rgba(196,167,90,0.15)' }}>
            <span style={{ color: '#ead9b8' }}>
              {title(it.artworkId)}{' '}
              <span style={{ color: 'rgba(196,167,90,0.6)' }}>
                {it.status === 'sold' ? `· 낙찰 ${it.askingPrice.toLocaleString()}원` : it.status === 'passed' ? '· 유찰' : it.status === 'live' ? '· 진행 중' : ''}
              </span>
            </span>
            {(it.status === 'pending' || it.status === 'passed') && !liveOngoing && (
              <button onClick={() => presentArtwork(code, it.artworkId, start)} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: GOLD, color: '#ead9b8' }}>올리기</button>
            )}
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-3 text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>
          낙찰 {soldCount} · 남음 {remainCount}{remainCount === 0 && ' · 경매 종료 → 결과 단계로'}
        </div>
      )}
    </div>
  );
}
