import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { computeResults } from './api';
import { setReveal } from '@/features/session/api';
import {
  buildAppreciationsCsv,
  buildResultsCsv,
  downloadCsv,
} from '@/features/export/csv';
import { DEFAULT_PROMPTS } from '@/content/prompts';
import type {
  Appreciation,
  Artwork,
  GradeBand,
  Group,
  GroupResult,
  SessionContent,
  SessionState,
  Student,
} from '@/models';

const GOLD = '#c4975a';

interface Props {
  code: string;
  gradeBand: GradeBand;
}

export function TeacherResultPanel({ code, gradeBand }: Props) {
  const results = useRtdbList<GroupResult>(paths.results(code));
  const students = useRtdbList<Student>(paths.students(code));
  const artworks = useRtdbList<Artwork>(paths.artworks(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code)) ?? {};
  const apprMap =
    useRtdbValue<Record<string, Record<string, Appreciation>>>(paths.allAppreciations(code)) ?? {};
  const content = useRtdbValue<SessionContent>(paths.content(code));
  const state = useRtdbValue<SessionState>(paths.state(code));
  const prompts = content?.prompts?.length ? content.prompts : DEFAULT_PROMPTS[gradeBand];
  const reveal = state?.revealValues ?? false;
  const ranked = [...results].sort((a, b) => a.rank - b.rank);
  const groupName = (id: string) => groupsMap[id]?.name ?? id;

  const btn = 'rounded-full border px-4 py-2 text-sm';
  const btnStyle = { borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' };

  return (
    <div
      className="w-full rounded-lg border p-5 text-left"
      style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}
    >
      <div className="mb-3 text-sm font-medium" style={{ color: GOLD }}>
        결과 발표 · 내보내기
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => computeResults(code)} className={btn} style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}>
          {results.length ? '순위 다시 계산' : '결과 계산'}
        </button>
        <button
          onClick={() => setReveal(code, !reveal)}
          className={btn}
          style={reveal ? { borderColor: '#8fce8f', background: 'rgba(143,206,143,0.15)', color: '#ead9b8' } : btnStyle}
        >
          {reveal ? '🟢 공개 중 (숨기기)' : '🎁 학생·TV에 공개'}
        </button>
        <button
          onClick={() =>
            downloadCsv(
              `${code}_감상기록.csv`,
              buildAppreciationsCsv(students, apprMap, artworks, groupsMap, prompts),
            )
          }
          className={btn}
          style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
        >
          감상 CSV
        </button>
        <button
          onClick={() =>
            downloadCsv(`${code}_경매결과.csv`, buildResultsCsv(results, groupsMap, artworks))
          }
          className={btn}
          style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
        >
          경매결과 CSV
        </button>
        <button
          onClick={() => window.print()}
          className={btn}
          style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
        >
          인쇄 / PDF
        </button>
      </div>
      <div className="mt-2 text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
        "결과 계산"으로 순위를 집계한 뒤, "공개"를 누르면 학생·TV에 감정가·순위가 나타납니다.
      </div>

      {/* 교사 미리보기 (학생엔 공개 전까지 안 보임) */}
      {ranked.length > 0 && (
        <div className="mt-3 rounded border p-2" style={{ borderColor: 'rgba(196,167,90,0.15)' }}>
          <div className="mb-1 text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>
            교사 미리보기 {reveal ? '· 공개됨' : '· 아직 비공개'}
          </div>
          {ranked.map((r) => (
            <div key={r.groupId} className="flex justify-between text-sm" style={{ color: '#ead9b8' }}>
              <span>{r.rank}위 · {groupName(r.groupId)}</span>
              <span style={{ color: GOLD }}>{r.asset.toLocaleString()}원</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
