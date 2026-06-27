import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { sortByOrder } from '@/features/artwork/api';
import type { Artwork, Group, GroupResult } from '@/models';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

const MEDAL = ['🥇', '🥈', '🥉'];

export function ResultsView({ code }: { code: string }) {
  const results = useRtdbList<GroupResult>(paths.results(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code));
  const artworks = sortByOrder(useRtdbList<Artwork>(paths.artworks(code)));

  const ranked = [...results].sort((a, b) => a.rank - b.rank);
  const groupName = (id: string) => groupsMap?.[id]?.name ?? id;

  if (results.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center font-body" style={{ background: C.wall }}>
        <div className="font-display text-4xl italic" style={{ color: C.cream }}>
          결과를 집계하고 있어요…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-auto font-body" style={{ background: C.wall }}>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-center font-display text-5xl italic" style={{ color: C.cream }}>
          모둠 자산 순위
        </div>
        <div className="mt-2 text-center text-sm" style={{ color: C.creamDim }}>
          자산 = 남은 현금 + 낙찰작의 실제 감정가
        </div>

        {/* 순위 */}
        <div className="mt-8 space-y-3">
          {ranked.map((r) => {
            const g = groupsMap?.[r.groupId];
            const won = g?.wonItems ?? {};
            return (
              <div
                key={r.groupId}
                className="rounded-lg border p-4"
                style={{
                  borderColor: r.rank === 1 ? C.gold : 'rgba(196,167,90,0.2)',
                  background: r.rank === 1 ? 'rgba(196,167,90,0.08)' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-display text-2xl italic" style={{ color: C.cream }}>
                    {MEDAL[r.rank - 1] ?? `${r.rank}위`} {groupName(r.groupId)}
                  </div>
                  <div className="font-display text-3xl" style={{ color: C.gold }}>
                    {r.asset.toLocaleString()}원
                  </div>
                </div>
                <div className="mt-1 text-xs" style={{ color: C.creamDim }}>
                  남은 현금 {r.remainingCash.toLocaleString()}원 + 감정가 합{' '}
                  {r.wonAppraisedSum.toLocaleString()}원
                </div>
                {/* 지불가 vs 감정가 */}
                {Object.keys(won).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(won).map(([aid, paid]) => {
                      const art = artworks.find((a) => a.id === aid);
                      const appraised = art?.appraisedValue ?? 0;
                      const diff = appraised - paid;
                      return (
                        <div key={aid} className="flex justify-between text-xs" style={{ color: C.creamDim }}>
                          <span>{art?.title ?? aid}</span>
                          <span>
                            지불 {paid.toLocaleString()} · 감정 {appraised.toLocaleString()}{' '}
                            <span style={{ color: diff >= 0 ? '#8fce8f' : '#e0a0a0' }}>
                              ({diff >= 0 ? '+' : ''}
                              {diff.toLocaleString()})
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 작품 감정가·출처 공개 */}
        <div className="mt-10 font-display text-3xl italic" style={{ color: C.cream }}>
          작품의 실제 가치
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {artworks.map((a) => (
            <div key={a.id} className="rounded-lg border p-3" style={{ borderColor: 'rgba(196,167,90,0.2)' }}>
              {a.imageUrl && (
                <img src={a.imageUrl} alt={a.title} className="h-28 w-full rounded object-cover" />
              )}
              <div className="mt-2 font-display text-lg italic" style={{ color: C.cream }}>
                {a.title}
              </div>
              <div className="text-sm" style={{ color: C.gold }}>
                감정가 {a.appraisedValue.toLocaleString()}원
              </div>
              {a.source && (
                <div className="text-xs" style={{ color: C.creamDim }}>
                  출처: {a.source}
                </div>
              )}
              {a.commentary && (
                <div className="mt-1.5 text-xs leading-relaxed" style={{ color: 'rgba(232,217,184,0.7)' }}>
                  {a.commentary}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
