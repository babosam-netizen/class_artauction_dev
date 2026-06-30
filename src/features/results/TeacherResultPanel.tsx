import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { computeResults } from './api';
import { setRevealCount } from '@/features/session/api';
import { sortByOrder } from '@/features/artwork/api';
import {
  buildAppreciationsCsv,
  buildResultsCsv,
  downloadCsv,
} from '@/features/export/csv';
import { DEFAULT_PROMPTS } from '@/content/prompts';
import { formatWon } from '@/utils/format';
import type {
  Appreciation,
  AuctionItem,
  Artwork,
  GradeBand,
  Group,
  GroupResult,
  SessionContent,
  SessionState,
  Student,
} from '@/models';

const GOLD = '#c4975a';
const GREEN = '#8fce8f';

interface Props {
  code: string;
  gradeBand: GradeBand;
}

export function TeacherResultPanel({ code, gradeBand }: Props) {
  const results = useRtdbList<GroupResult>(paths.results(code));
  const students = useRtdbList<Student>(paths.students(code));
  const artworks = useRtdbList<Artwork>(paths.artworks(code));
  const auctionItemsRaw = useRtdbList<AuctionItem>(paths.auctionItems(code));
  const auctionItems = sortByOrder(auctionItemsRaw);
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code)) ?? {};
  const apprMap =
    useRtdbValue<Record<string, Record<string, Appreciation>>>(paths.allAppreciations(code)) ?? {};
  const content = useRtdbValue<SessionContent>(paths.content(code));
  const state = useRtdbValue<SessionState>(paths.state(code));
  const prompts = content?.prompts?.length ? content.prompts : DEFAULT_PROMPTS[gradeBand];

  const totalItems = auctionItems.length;
  const revealedCount = state?.revealedCount; // undefined = 발표 전 대기
  const started = revealedCount !== undefined;
  const count = revealedCount ?? 0;

  const ranked = [...results].sort((a, b) => a.rank - b.rank);
  const groupName = (id: string) => groupsMap[id]?.name ?? id;

  const btn = 'rounded-full border px-4 py-2 text-sm';
  const btnStyle = { borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' };

  // 현재 공개 중인 작품
  const currentItem = started && count > 0 ? auctionItems[count - 1] : null;
  const currentArt = currentItem ? artworks.find((a) => a.id === currentItem.artworkId) : null;

  return (
    <div
      className="w-full rounded-lg border p-5 text-left"
      style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}
    >
      <div className="mb-3 text-sm font-medium" style={{ color: GOLD }}>
        결과 발표 · 내보내기
      </div>

      {/* 결과 계산 + CSV/인쇄 */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => computeResults(code)} className={btn} style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}>
          {results.length ? '순위 다시 계산' : '결과 계산'}
        </button>
        <button
          onClick={() => downloadCsv(`${code}_감상기록.csv`, buildAppreciationsCsv(students, apprMap, artworks, groupsMap, prompts))}
          className={btn}
          style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
        >
          감상 CSV
        </button>
        <button
          onClick={() => downloadCsv(`${code}_경매결과.csv`, buildResultsCsv(results, groupsMap, artworks))}
          className={btn}
          style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
        >
          경매결과 CSV
        </button>
        <button onClick={() => window.print()} className={btn} style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}>
          인쇄 / PDF
        </button>
      </div>
      <div className="mt-1 text-xs" style={{ color: 'rgba(232,217,184,0.5)' }}>
        "결과 계산" 후 발표를 시작하세요. 작품을 한 점씩 공개하면서 순위가 바뀌는 것을 볼 수 있어요.
      </div>

      {/* 발표 컨트롤 */}
      {results.length > 0 && (
        <div className="mt-4 rounded border p-3" style={{ borderColor: 'rgba(196,167,90,0.25)', background: 'rgba(196,167,90,0.05)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: GOLD }}>작품별 감정가 공개</span>
            <span className="text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
              {!started
                ? '대기 중'
                : count === 0
                ? '초기 현금 순위 공개 중'
                : count >= totalItems
                ? `전체 공개 완료 (${totalItems}/${totalItems})`
                : `${count} / ${totalItems} 작품 공개`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {!started ? (
              <button
                onClick={() => setRevealCount(code, 0)}
                className="rounded-full border px-5 py-2 text-sm font-bold"
                style={{ borderColor: GREEN, background: 'rgba(143,206,143,0.18)', color: '#ead9b8' }}
              >
                🎬 발표 시작 (초기 현금 공개)
              </button>
            ) : (
              <>
                <button
                  onClick={() => setRevealCount(code, count + 1)}
                  disabled={count >= totalItems}
                  className="rounded-full border px-5 py-2 text-sm font-bold disabled:opacity-40"
                  style={{ borderColor: GREEN, background: 'rgba(143,206,143,0.18)', color: '#ead9b8' }}
                >
                  다음 작품 공개 →
                </button>
                <button
                  onClick={() => setRevealCount(code, Math.max(0, count - 1))}
                  disabled={count === 0}
                  className={btn}
                  style={{ ...btnStyle, opacity: count === 0 ? 0.4 : 1 }}
                >
                  ← 이전
                </button>
                <button
                  onClick={() => setRevealCount(code, totalItems)}
                  disabled={count >= totalItems}
                  className={btn}
                  style={{ ...btnStyle, opacity: count >= totalItems ? 0.4 : 1 }}
                >
                  전체 공개
                </button>
                <button
                  onClick={() => setRevealCount(code, null)}
                  className={btn}
                  style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
                >
                  처음부터
                </button>
              </>
            )}
          </div>

          {/* 현재 공개 중인 작품 표시 */}
          {currentArt && (
            <div className="mt-3 rounded border px-3 py-2 text-xs" style={{ borderColor: 'rgba(196,167,90,0.2)', color: '#ead9b8' }}>
              <span style={{ color: 'rgba(232,217,184,0.5)' }}>공개 중: </span>
              {currentArt.title}
              {currentItem?.winnerGroupId
                ? ` → ${groupName(currentItem.winnerGroupId)} 낙찰 (감정가 ${formatWon(currentArt.appraisedValue)})`
                : ` → 유찰`}
            </div>
          )}

          {/* 교사 미리보기 순위 */}
          {ranked.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-[11px] mb-1" style={{ color: 'rgba(232,217,184,0.4)' }}>최종 순위 미리보기</div>
              {ranked.map((r) => (
                <div key={r.groupId} className="flex justify-between text-xs" style={{ color: '#ead9b8' }}>
                  <span>{r.rank}위 · {groupName(r.groupId)}</span>
                  <span style={{ color: GOLD }}>{formatWon(r.asset)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
