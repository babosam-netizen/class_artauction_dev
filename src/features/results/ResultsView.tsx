import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { sortByOrder } from '@/features/artwork/api';
import { formatWon } from '@/utils/format';
import type { AuctionItem, Artwork, Group, GroupResult, SessionState } from '@/models';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  green: '#8fce8f',
  red: '#e0a0a0',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

const MEDAL = ['🥇', '🥈', '🥉'];

export function ResultsView({ code }: { code: string }) {
  const results = useRtdbList<GroupResult>(paths.results(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code));
  const artworks = sortByOrder(useRtdbList<Artwork>(paths.artworks(code)));
  const auctionItemsRaw = useRtdbList<AuctionItem>(paths.auctionItems(code));
  const auctionItems = sortByOrder(auctionItemsRaw); // 경매 진행 순서
  const state = useRtdbValue<SessionState>(paths.state(code));

  const revealedCount: number | undefined =
    state?.revealedCount ?? (state?.revealValues ? auctionItems.length : undefined);
  const totalItems = auctionItems.length;

  const groupName = (id: string) => groupsMap?.[id]?.name ?? id;

  // k개 작품 공개 기준으로 모둠의 표시 자산 계산
  function displayedAsset(result: GroupResult, count: number): number {
    const wonItems = groupsMap?.[result.groupId]?.wonItems ?? {};
    const revealedIds = new Set(auctionItems.slice(0, count).map((i) => i.artworkId));
    return (
      result.remainingCash +
      Object.keys(wonItems).reduce((sum, aid) => {
        if (!revealedIds.has(aid)) return sum;
        return sum + (artworks.find((a) => a.id === aid)?.appraisedValue ?? 0);
      }, 0)
    );
  }

  // 현재 공개 기준 순위표 (displayedAsset 내림차순)
  function leaderboard(count: number) {
    return [...results].sort((a, b) => displayedAsset(b, count) - displayedAsset(a, count));
  }

  // ── 데이터 로딩 중 ──
  if (results.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center font-body" style={{ background: C.wall }}>
        <div className="font-display text-4xl italic" style={{ color: C.cream }}>결과를 집계하고 있어요…</div>
      </div>
    );
  }

  // ── 발표 전 대기 화면 ──
  if (revealedCount === undefined) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6 text-center font-body" style={{ background: C.wall }}>
        <div className="text-6xl">🎁</div>
        <div className="mt-6 font-display text-5xl italic" style={{ color: C.cream }}>곧 결과를 공개합니다</div>
        <div className="mt-3 text-lg" style={{ color: C.creamDim }}>작품들의 실제 감정가와 모둠 순위를 발표할게요</div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {Object.values(groupsMap ?? {}).sort((a, b) => a.name.localeCompare(b.name)).map((g) => (
            <span key={g.id} className="rounded-full px-4 py-2 text-sm" style={{ background: 'rgba(196,167,90,0.12)', color: C.cream }}>{g.name}</span>
          ))}
        </div>
      </div>
    );
  }

  // ── 전체 공개 완료 화면 ──
  if (revealedCount >= totalItems && totalItems > 0) {
    const ranked = leaderboard(totalItems);
    return (
      <div className="min-h-screen overflow-auto font-body" style={{ background: C.wall }}>
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="text-center font-display text-5xl italic" style={{ color: C.cream }}>최종 순위</div>
          <div className="mt-2 text-center text-sm" style={{ color: C.creamDim }}>자산 = 남은 현금 + 낙찰작의 실제 감정가</div>
          <div className="mt-8 space-y-3">
            {ranked.map((r, idx) => {
              const g = groupsMap?.[r.groupId];
              const won = g?.wonItems ?? {};
              return (
                <div key={r.groupId} className="rounded-lg border p-4" style={{ borderColor: idx === 0 ? C.gold : 'rgba(196,167,90,0.2)', background: idx === 0 ? 'rgba(196,167,90,0.08)' : 'transparent' }}>
                  <div className="flex items-center justify-between">
                    <div className="font-display text-2xl italic" style={{ color: C.cream }}>{MEDAL[idx] ?? `${idx + 1}위`} {groupName(r.groupId)}</div>
                    <div className="font-display text-3xl" style={{ color: C.gold }}>{formatWon(r.asset)}</div>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: C.creamDim }}>
                    남은 현금 {formatWon(r.remainingCash)} + 감정가 합 {formatWon(r.wonAppraisedSum)}
                  </div>
                  {Object.keys(won).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(won).map(([aid, paid]) => {
                        const art = artworks.find((a) => a.id === aid);
                        const appraised = art?.appraisedValue ?? 0;
                        const diff = appraised - (paid as number);
                        return (
                          <div key={aid} className="flex justify-between text-xs" style={{ color: C.creamDim }}>
                            <span>{art?.title ?? aid}</span>
                            <span>낙찰 {formatWon(paid as number)} · 감정 {formatWon(appraised)} <span style={{ color: diff >= 0 ? C.green : C.red }}>({diff >= 0 ? '+' : ''}{formatWon(Math.abs(diff))})</span></span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-10 font-display text-3xl italic" style={{ color: C.cream }}>작품의 실제 가치</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {artworks.map((a) => (
              <div key={a.id} className="rounded-lg border p-3" style={{ borderColor: 'rgba(196,167,90,0.2)' }}>
                {a.imageUrl && <img src={a.imageUrl} alt={a.title} className="h-28 w-full rounded object-cover" />}
                <div className="mt-2 font-display text-lg italic" style={{ color: C.cream }}>{a.title}</div>
                <div className="text-sm" style={{ color: C.gold }}>감정가 {formatWon(a.appraisedValue)}</div>
                {a.source && <div className="text-xs" style={{ color: C.creamDim }}>출처: {a.source}</div>}
                {a.commentary && <div className="mt-1.5 text-xs leading-relaxed" style={{ color: 'rgba(232,217,184,0.7)' }}>{a.commentary}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 누적 공개 화면 (0개 ~ N-1개 공개 중) ──
  const board = leaderboard(revealedCount);

  // 방금 공개된 작품 (revealedCount > 0)
  const featuredItem = revealedCount > 0 ? auctionItems[revealedCount - 1] : null;
  const featuredArt = featuredItem ? artworks.find((a) => a.id === featuredItem.artworkId) : null;
  const buyerGroupId = featuredItem?.winnerGroupId;
  const buyerGroup = buyerGroupId ? groupsMap?.[buyerGroupId] : null;
  const paidPrice = buyerGroup?.wonItems?.[featuredItem?.artworkId ?? ''] ?? 0;
  const appraisedValue = featuredArt?.appraisedValue ?? 0;
  const gainLoss = appraisedValue - paidPrice;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-8 font-body"
      style={{ background: C.wall }}
    >
      {/* 진행 표시 */}
      <div className="text-center text-xs tracking-widest" style={{ color: 'rgba(196,167,90,0.55)' }}>
        {revealedCount === 0
          ? '경매 결과 발표 — 낙찰 대금 지불 후 현금 현황'
          : `${revealedCount} / ${totalItems} 작품 공개됨`}
      </div>

      <div className="flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── 왼쪽: 방금 공개된 작품 카드 ── */}
        <div className="flex-1">
          {revealedCount === 0 ? (
            // 발표 시작 전: 안내 카드
            <div className="flex flex-col items-center justify-center rounded-2xl border py-16 text-center" style={{ borderColor: 'rgba(196,167,90,0.25)', background: 'rgba(28,18,10,0.7)' }}>
              <div className="text-5xl">🏛️</div>
              <div className="mt-4 font-display text-3xl italic" style={{ color: C.cream }}>작품 감정가 공개 시작</div>
              <div className="mt-2 text-sm" style={{ color: C.creamDim }}>선생님이 작품을 한 점씩 공개합니다</div>
            </div>
          ) : featuredArt ? (
            <div className="rounded-2xl border p-5" style={{ borderColor: C.gold, background: 'rgba(28,18,10,0.85)', boxShadow: '0 0 50px rgba(196,167,90,0.15)' }}>
              {featuredArt.imageUrl && (
                <img src={featuredArt.imageUrl} alt={featuredArt.title} className="w-full rounded-lg object-cover" style={{ maxHeight: '35vh' }} />
              )}
              <div className="mt-3 font-display text-2xl italic" style={{ color: C.cream }}>{featuredArt.title}</div>

              {/* 감정가 공개 */}
              <div className="mt-3 flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(196,167,90,0.3)', background: 'rgba(196,167,90,0.06)' }}>
                <span className="text-sm" style={{ color: C.creamDim }}>실제 감정가</span>
                <span className="font-display text-3xl font-bold" style={{ color: C.gold }}>{formatWon(appraisedValue)}</span>
              </div>

              {/* 낙찰 정보 */}
              {buyerGroup ? (
                <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(0,0,0,0.2)' }}>
                  <div className="text-xs" style={{ color: C.creamDim }}>낙찰 모둠</div>
                  <div className="mt-1 font-display text-xl" style={{ color: C.cream }}>{buyerGroup.name}</div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span style={{ color: C.creamDim }}>낙찰가 <span style={{ color: C.gold }}>{formatWon(paidPrice)}</span></span>
                    <span style={{ color: gainLoss >= 0 ? C.green : C.red, fontWeight: 700 }}>
                      {gainLoss >= 0 ? '▲ ' : '▼ '}{gainLoss >= 0 ? '+' : ''}{formatWon(Math.abs(gainLoss))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border px-3 py-2 text-center text-sm" style={{ borderColor: 'rgba(196,167,90,0.15)', color: C.creamDim }}>유찰 — 낙찰 모둠 없음</div>
              )}
            </div>
          ) : null}
        </div>

        {/* ── 오른쪽: 누적 순위표 ── */}
        <div className="w-full lg:w-72">
          <div className="mb-2 text-center text-xs tracking-widest" style={{ color: 'rgba(196,167,90,0.55)' }}>
            {revealedCount === 0 ? '초기 현금 순위' : '현재 자산 순위'}
          </div>
          <div className="flex flex-col gap-1.5">
            {board.map((r, idx) => {
              const asset = displayedAsset(r, revealedCount);
              const finalAsset = r.asset;
              const isHighlighted = revealedCount > 0 && buyerGroupId === r.groupId;
              const gainSoFar = asset - r.remainingCash; // 지금까지 공개된 감정가 합

              return (
                <div
                  key={r.groupId}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: isHighlighted ? C.gold : idx === 0 ? 'rgba(196,167,90,0.35)' : 'rgba(196,167,90,0.12)',
                    background: isHighlighted ? 'rgba(196,167,90,0.12)' : 'rgba(28,18,10,0.6)',
                  }}
                >
                  <div>
                    <div className="text-sm" style={{ color: C.cream }}>
                      <span style={{ color: 'rgba(196,167,90,0.6)', marginRight: 6 }}>{MEDAL[idx] ?? `${idx + 1}위`}</span>
                      {groupName(r.groupId)}
                    </div>
                    {gainSoFar > 0 && (
                      <div className="text-[11px]" style={{ color: C.green }}>+{formatWon(gainSoFar)} 자산 추가</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg" style={{ color: C.gold }}>{formatWon(asset)}</div>
                    {asset !== finalAsset && (
                      <div className="text-[10px]" style={{ color: 'rgba(232,217,184,0.3)' }}>최종 {formatWon(finalAsset)}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {totalItems > revealedCount && (
            <div className="mt-2 text-center text-[11px]" style={{ color: 'rgba(232,217,184,0.3)' }}>
              {totalItems - revealedCount}점 더 공개 예정
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
