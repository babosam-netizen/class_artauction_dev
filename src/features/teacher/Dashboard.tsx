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
  const byNumber = (a: Student, b: Student) =>
    Number(a.number) - Number(b.number) || a.number.localeCompare(b.number);

  const groups = Object.values(groupsMap).sort((a, b) => a.name.localeCompare(b.name));
  const studentsOf = (gid: string) => students.filter((s) => s.groupId === gid).sort(byNumber);
  const ungrouped = students.filter((s) => !s.groupId || !groupsMap[s.groupId]).sort(byNumber);

  function StudentRow({ s }: { s: Student }) {
    const a = answeredCount(s.number);
    const pct = Math.round((a / totalQ) * 100);
    return (
      <div className="rounded-md px-2.5 py-2" style={{ background: 'rgba(196,167,90,0.06)' }}>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5" style={{ color: '#ead9b8' }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: online(s) ? '#8fce8f' : 'rgba(232,217,184,0.3)' }} />
            {s.number} {s.name}
            {s.isRep && <span style={{ color: GOLD, fontSize: 11 }}>👑대표</span>}
          </span>
          <span className="text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
            {s.current ? `${PHASE_LABELS[s.current.phase]}${s.current.detail ? ` · ${s.current.detail}` : ''}` : '대기'}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded" style={{ background: 'rgba(196,167,90,0.12)' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: GOLD }} />
          </div>
          <span className="text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>감상 {a}/{totalQ}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
        접속 {students.length}명 · 모둠 {groups.length}개
      </div>

      {groups.map((g) => {
        const won = g.wonItems ?? {};
        const wonCount = Object.keys(won).length;
        const spent = Object.values(won).reduce((s, v) => s + v, 0);
        const members = studentsOf(g.id);
        return (
          <div key={g.id} className="rounded-xl border p-3" style={CARD}>
            {/* 모둠 헤더 + 경매 현황 */}
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-xl italic" style={{ color: '#ead9b8' }}>
                {g.name} <span className="text-xs not-italic" style={{ color: 'rgba(232,217,184,0.5)' }}>· {members.length}명</span>
              </span>
              <span className="text-xs" style={{ color: GOLD }}>잔여 {(g.remainingBudget ?? 0).toLocaleString()}원</span>
            </div>
            <div className="mb-2 text-[11px]" style={{ color: 'rgba(232,217,184,0.55)' }}>
              낙찰 {wonCount}점 · 지출 {spent.toLocaleString()}원
            </div>

            {/* 소속 학생 */}
            {members.length === 0 ? (
              <div className="text-xs" style={{ color: 'rgba(232,217,184,0.4)' }}>아직 입장한 학생이 없어요</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {members.map((s) => (
                  <StudentRow key={s.number} s={s} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div className="rounded-xl border p-3" style={CARD}>
          <div className="mb-2 font-display text-xl italic" style={{ color: '#ead9b8' }}>미배정</div>
          <div className="flex flex-col gap-1.5">
            {ungrouped.map((s) => (
              <StudentRow key={s.number} s={s} />
            ))}
          </div>
        </div>
      )}

      {students.length === 0 && groups.length === 0 && (
        <div className="text-xs" style={{ color: 'rgba(232,217,184,0.45)' }}>세션 정보를 불러오는 중…</div>
      )}
    </div>
  );
}
