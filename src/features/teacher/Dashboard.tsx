import { useState } from 'react';
import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { PHASE_LABELS } from '@/features/session/api';
import { sortByOrder } from '@/features/artwork/api';
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
const GREEN = '#8fce8f';
const CARD = { borderColor: 'rgba(196,167,90,0.18)', background: 'rgba(28,18,10,0.5)' };

interface AnswerModal {
  studentName: string;
  label: string;
  artTitle: string;
  qIndex: number;
  prompt: string;
  answer: string;
  updatedAt?: number;
}

export function Dashboard({ code, gradeBand }: { code: string; gradeBand: GradeBand }) {
  const students = useRtdbList<Student>(paths.students(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code)) ?? {};
  const artworks = useRtdbList<Artwork>(paths.artworks(code));
  const appr =
    useRtdbValue<Record<string, Record<string, Appreciation>>>(paths.allAppreciations(code)) ?? {};
  const content = useRtdbValue<SessionContent>(paths.content(code));

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<AnswerModal | null>(null);

  const prompts = content?.prompts?.length ? content.prompts : DEFAULT_PROMPTS[gradeBand];

  // 작품을 순서대로: 공통회랑 → 분기, 각각 라벨 부여
  const common = sortByOrder(artworks.filter((a) => a.placement?.kind === 'common'));
  const branch = sortByOrder(artworks.filter((a) => a.placement?.kind === 'branch'));
  const ordered: { art: Artwork; label: string }[] = [
    ...common.map((art, i) => ({ art, label: `공통 ${i + 1}` })),
    ...branch.map((art, i) => ({ art, label: `선택 ${i + 1}` })),
  ];
  const totalQ = Math.max(1, ordered.length * prompts.length);
  const now = Date.now();

  function answeredCount(number: string): number {
    const byArt = appr[number] ?? {};
    let n = 0;
    for (const { art } of ordered) {
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

  function toggle(n: string) {
    setExpanded((prev) => {
      const x = new Set(prev);
      if (x.has(n)) x.delete(n);
      else x.add(n);
      return x;
    });
  }

  function StudentBlock({ s }: { s: Student }) {
    const a = answeredCount(s.number);
    const pct = Math.round((a / totalQ) * 100);
    const open = expanded.has(s.number);
    const byArt = appr[s.number] ?? {};
    return (
      <div className="rounded-md" style={{ background: 'rgba(196,167,90,0.06)' }}>
        <button onClick={() => toggle(s.number)} className="flex w-full items-center justify-between px-2.5 py-2 text-left">
          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#ead9b8' }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: online(s) ? GREEN : 'rgba(232,217,184,0.3)' }} />
            {s.number} {s.name}
            {s.isRep && <span style={{ color: GOLD, fontSize: 11 }}>👑</span>}
          </span>
          <span className="flex items-center gap-2 text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
            {s.current ? PHASE_LABELS[s.current.phase] : '대기'} · 감상 {a}/{totalQ}
            <span style={{ color: GOLD }}>{open ? '▾' : '▸'}</span>
          </span>
        </button>

        {/* 진행 바 */}
        <div className="px-2.5 pb-2">
          <div className="h-1.5 overflow-hidden rounded" style={{ background: 'rgba(196,167,90,0.12)' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: GOLD }} />
          </div>
        </div>

        {/* 펼침: 작품별 질문 현황 */}
        {open && (
          <div className="flex flex-col gap-2 px-2.5 pb-2.5">
            {ordered.length === 0 && (
              <div className="text-[11px]" style={{ color: 'rgba(232,217,184,0.4)' }}>작품이 아직 없어요</div>
            )}
            {ordered.map(({ art, label }) => {
              const ans = byArt[art.id]?.answers ?? [];
              return (
                <div key={art.id}>
                  <div className="mb-1 text-[11px]" style={{ color: 'rgba(232,217,184,0.7)' }}>
                    {label} · {art.title}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prompts.map((p, qi) => {
                      const text = (ans[qi] ?? '').trim();
                      const done = !!text;
                      return (
                        <button
                          key={qi}
                          disabled={!done}
                          onClick={() =>
                            setModal({
                              studentName: `${s.number} ${s.name}`,
                              label,
                              artTitle: art.title,
                              qIndex: qi,
                              prompt: p,
                              answer: text,
                              updatedAt: byArt[art.id]?.updatedAt,
                            })
                          }
                          className="rounded px-2 py-1 text-[11px]"
                          style={{
                            border: `1px solid ${done ? GREEN : 'rgba(196,167,90,0.2)'}`,
                            background: done ? 'rgba(143,206,143,0.12)' : 'transparent',
                            color: done ? GREEN : 'rgba(232,217,184,0.4)',
                            cursor: done ? 'pointer' : 'default',
                          }}
                        >
                          Q{qi + 1} {done ? '✓' : '—'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
        접속 {students.length}명 · 모둠 {groups.length}개 · 작품 {ordered.length}점 (질문 {prompts.length}개씩)
      </div>

      {groups.map((g) => {
        const won = g.wonItems ?? {};
        const wonCount = Object.keys(won).length;
        const spent = Object.values(won).reduce((s, v) => s + v, 0);
        const members = studentsOf(g.id);
        return (
          <div key={g.id} className="rounded-xl border p-3" style={CARD}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-display text-xl italic" style={{ color: '#ead9b8' }}>
                {g.name} <span className="text-xs not-italic" style={{ color: 'rgba(232,217,184,0.5)' }}>· {members.length}명</span>
              </span>
              <span className="text-xs" style={{ color: GOLD }}>잔여 {(g.remainingBudget ?? 0).toLocaleString()}원</span>
            </div>
            <div className="mb-2 text-[11px]" style={{ color: 'rgba(232,217,184,0.55)' }}>
              낙찰 {wonCount}점 · 지출 {spent.toLocaleString()}원
            </div>
            {members.length === 0 ? (
              <div className="text-xs" style={{ color: 'rgba(232,217,184,0.4)' }}>아직 입장한 학생이 없어요</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {members.map((s) => (
                  <StudentBlock key={s.number} s={s} />
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
              <StudentBlock key={s.number} s={s} />
            ))}
          </div>
        </div>
      )}

      {modal && <AnswerLayer m={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function AnswerLayer({ m, onClose }: { m: AnswerModal; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: 'rgba(8,5,3,0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border p-6"
        style={{ background: '#1c120a', borderColor: 'rgba(196,167,90,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] tracking-[2px]" style={{ color: 'rgba(196,167,90,0.6)' }}>
              {m.studentName} · {m.label}
            </div>
            <div className="mt-0.5 font-display text-2xl italic" style={{ color: '#ead9b8' }}>{m.artTitle}</div>
          </div>
          <button onClick={onClose} className="text-xl" style={{ color: 'rgba(196,167,90,0.6)' }}>×</button>
        </div>
        <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(196,167,90,0.1)' }}>
          <div className="text-xs" style={{ color: GOLD }}>질문 {m.qIndex + 1}</div>
          <div className="mt-1 text-sm leading-relaxed" style={{ color: 'rgba(232,217,184,0.85)' }}>{m.prompt}</div>
        </div>
        <div className="mt-3 text-[11px]" style={{ color: 'rgba(196,167,90,0.6)' }}>학생 답변</div>
        <div className="mt-1 whitespace-pre-wrap rounded-lg border p-3 text-sm leading-relaxed" style={{ borderColor: 'rgba(196,167,90,0.2)', color: '#ead9b8', background: 'rgba(255,255,255,0.03)' }}>
          {m.answer}
        </div>
        {m.updatedAt && (
          <div className="mt-2 text-right text-[11px]" style={{ color: 'rgba(232,217,184,0.4)' }}>
            {new Date(m.updatedAt).toLocaleString()} 저장
          </div>
        )}
      </div>
    </div>
  );
}
