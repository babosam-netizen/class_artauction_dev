import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { computeResults } from './api';
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
  const prompts = content?.prompts?.length ? content.prompts : DEFAULT_PROMPTS[gradeBand];

  const btn = 'rounded-full border px-4 py-2 text-sm';
  const btnStyle = { borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' };

  return (
    <div
      className="mt-8 w-[420px] rounded-lg border p-5 text-left"
      style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}
    >
      <div className="mb-3 text-sm font-medium" style={{ color: GOLD }}>
        결과 발표 · 내보내기
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => computeResults(code)} className={btn} style={btnStyle}>
          결과 계산 &amp; 공개
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
        결과를 계산하면 학생·TV 화면에 순위와 감정가가 공개됩니다.
      </div>
    </div>
  );
}
