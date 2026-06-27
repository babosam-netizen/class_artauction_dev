import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { PHASE_LABELS } from '@/features/session/api';
import { DEFAULT_PROMPTS } from '@/content/prompts';
import type {
  Appreciation,
  Artwork,
  GradeBand,
  Group,
  SessionContent,
  Student,
} from '@/models';

const GOLD = '#c4975a';
const CARD = { borderColor: 'rgba(196,167,90,0.18)', background: 'rgba(28,18,10,0.5)' };

export function Dashboard({ code, gradeBand }: { code: string; gradeBand: GradeBand }) {
  const students = useRtdbList<Student>(paths.students(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code)) ?? {};
  const artworks = useRtdbList<Artwork>(paths.artworks(code));
  const appr =
    useRtdbValue<Record<string, Record<string, Appreciation>>>(paths.allAppreciations(code)) ?? {};
  const content = useRtdbValue<SessionContent>(paths.content(code));

  const prompts = content?.prompts?.length ? content.prompts : DEFAULT_PROMPTS[gradeBand];
  const commonArts = artworks.filter((a) => a.placement?.kind === 'common');
  const totalQ = Math.max(1, commonArts.length * prompts.length);
  const now = Date.now();

  const sorted = [...students].sort(
    (a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number),
  );

  function answeredCount(number: string): number {
    const byArt = appr[number] ?? {};
    let n = 0;
    for (const art of commonArts) {
      const a = byArt[art.id];
      if (a?.answers) n += a.answers.filter((x) => x.trim()).length;
    }
    return n;
  }

  const online = (s: Student) => now - (s.lastSeenAt ?? 0) < 120_000;
  const groups = Object.values(groupsMap).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4">
      <Section title={`접속 현황 (${students.length}명)`}>
        {students.length === 0 ? (
          <Empty>아직 입장한 학생이 없어요</Empty>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sorted.map((s) => (
              <span
                key={s.number}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
                style={{ background: 'rgba(196,167,90,0.1)', color: '#ead9b8' }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: online(s) ? '#8fce8f' : 'rgba(232,217,184,0.3)',
                  }}
                />
                {s.number} {s.name}
                <span style={{ color: 'rgba(196,167,90,0.6)' }}>· {groupsMap[s.groupId]?.name ?? '미배정'}</span>
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="학생별 감상 진행 (공통회랑)">
        {students.length === 0 ? (
          <Empty>입장 후 표시됩니다</Empty>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sorted.map((s) => {
              const a = answeredCount(s.number);
              const pct = Math.round((a / totalQ) * 100);
              return (
                <div key={s.number} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0" style={{ color: '#ead9b8' }}>
                    {s.number} {s.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded" style={{ background: 'rgba(196,167,90,0.12)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: GOLD }} />
                  </div>
                  <span className="w-12 text-right" style={{ color: 'rgba(232,217,184,0.7)' }}>
                    {a}/{totalQ}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="학생별 현재 위치">
        {students.length === 0 ? (
          <Empty>입장 후 표시됩니다</Empty>
        ) : (
          <div className="flex flex-col gap-1">
            {sorted.map((s) => (
              <div key={s.number} className="flex justify-between text-xs">
                <span style={{ color: '#ead9b8' }}>{s.number} {s.name}</span>
                <span style={{ color: 'rgba(232,217,184,0.65)' }}>
                  {s.current
                    ? `${PHASE_LABELS[s.current.phase]}${s.current.detail ? ` · ${s.current.detail}` : ''}`
                    : '대기'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="모둠별 경매 현황">
        {groups.length === 0 ? (
          <Empty>모둠 정보가 없습니다</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((g) => {
              const won = g.wonItems ?? {};
              const wonCount = Object.keys(won).length;
              const spent = Object.values(won).reduce((s, v) => s + v, 0);
              return (
                <div key={g.id} className="rounded border p-2" style={{ borderColor: 'rgba(196,167,90,0.15)' }}>
                  <div className="flex justify-between text-sm" style={{ color: '#ead9b8' }}>
                    <span>{g.name}</span>
                    <span style={{ color: GOLD }}>잔여 {(g.remainingBudget ?? 0).toLocaleString()}원</span>
                  </div>
                  <div className="text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>
                    낙찰 {wonCount}점 · 지출 {spent.toLocaleString()}원
                    {g.repStudentNumber ? ` · 대표 ${g.repStudentNumber}번` : ' · 대표 미정'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={CARD}>
      <div className="mb-2 text-sm font-medium" style={{ color: GOLD }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs" style={{ color: 'rgba(232,217,184,0.45)' }}>{children}</div>;
}
