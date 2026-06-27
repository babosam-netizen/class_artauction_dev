import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import { sortByOrder } from '@/features/artwork/api';
import { saveAppreciation } from '@/features/appreciation/api';
import { updatePresence } from '@/features/entry/api';
import type { Appreciation, Artwork, GradeBand } from '@/models';

const C = {
  bg: '#130e08',
  panel: '#1c120a',
  gold: '#c4975a',
  goldSoft: 'rgba(196,167,90,0.4)',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  green: '#8fce8f',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
  frame:
    'linear-gradient(145deg, #d4b862 0%, #8b6010 20%, #c49b38 40%, #7a5010 60%, #c4a040 80%, #8b6010 100%)',
};

interface Props {
  code: string;
  studentNumber: string;
  studentName: string;
  gradeBand: GradeBand;
  prompts: string[];
  artworks: Artwork[];
  demo?: boolean;
}

export function BranchView({ code, studentNumber, studentName, gradeBand, prompts, artworks, demo = false }: Props) {
  const pool = sortByOrder(artworks.filter((a) => a.placement?.kind === 'branch'));

  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>(() => prompts.map(() => ''));
  const [savedSteps, setSavedSteps] = useState<Set<number>>(new Set());
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  // 재입장 시 기존 선택/감상 복구
  useEffect(() => {
    if (demo) return;
    let active = true;
    get(ref(db, paths.appreciations(code, studentNumber))).then((snap) => {
      if (!active || !snap.exists()) return;
      const map = snap.val() as Record<string, Appreciation>;
      const branchIds = new Set(pool.map((a) => a.id));
      const found = Object.keys(map).find((id) => branchIds.has(id));
      if (found) {
        const prev = map[found];
        setPicked(found);
        setAnswers(prompts.map((_, i) => prev.answers?.[i] ?? ''));
        setSavedSteps(new Set((prev.answers ?? []).map((a, i) => (a.trim() ? i : -1)).filter((i) => i >= 0)));
        setSubmitted(true);
      }
    });
    updatePresence(code, studentNumber, 'branch').catch(() => {});
    return () => {
      active = false;
    };
  }, [code, studentNumber, prompts.length, pool.length, demo]);

  const current = pool.find((a) => a.id === picked);
  const allAnswered = prompts.length > 0 && answers.every((a) => a.trim().length > 0);

  function choose(a: Artwork) {
    setPicked(a.id);
    setStep(0);
    if (!demo) updatePresence(code, studentNumber, 'branch', a.title).catch(() => {});
  }

  function setAnswer(v: string) {
    setAnswers((prev) => prev.map((x, i) => (i === step ? v : x)));
    setSavedSteps((prev) => {
      const n = new Set(prev);
      n.delete(step);
      return n;
    });
  }

  async function saveStep() {
    if (!current || !answers[step].trim()) return;
    setBusy(true);
    try {
      if (!demo) await saveAppreciation(code, studentNumber, current.id, answers);
      setSavedSteps((p) => new Set(p).add(step));
      if (step < prompts.length - 1) setStep((s) => s + 1);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!current || !allAnswered) return;
    setBusy(true);
    try {
      if (!demo) await saveAppreciation(code, studentNumber, current.id, answers);
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }

  // ── 0) 작품이 없을 때
  if (pool.length === 0) {
    return (
      <Wall>
        <div className="text-center">
          <div className="font-display text-3xl italic" style={{ color: C.cream }}>분기 전시실 준비 중</div>
          <div className="mt-2 text-sm" style={{ color: C.creamDim }}>선생님이 작품을 올리면 시작해요</div>
        </div>
      </Wall>
    );
  }

  // ── 3) 제출 완료 → 경매 대기
  if (submitted && current) {
    return (
      <Wall>
        <div className="flex flex-col items-center px-6 text-center">
          {current.imageUrl && (
            <img src={current.imageUrl} alt={current.title} className="h-44 w-64 rounded object-cover" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }} />
          )}
          <div className="mt-4 font-display text-2xl italic" style={{ color: C.cream }}>{current.title}</div>
          <div className="mt-4 text-lg" style={{ color: C.green }}>✅ 감상을 제출했어요</div>
          <div className="mt-1 text-sm" style={{ color: C.creamDim }}>{studentName} 님, 경매를 기다려요</div>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-6 rounded-full border px-5 py-2 text-sm"
            style={{ borderColor: C.goldSoft, color: C.creamDim }}
          >
            감상 수정하기
          </button>
        </div>
      </Wall>
    );
  }

  // ── 1) 작품 선택 (12종 중 1점)
  if (!current) {
    return (
      <Wall scroll>
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="text-center">
            <div className="text-xs tracking-[4px]" style={{ color: 'rgba(196,167,90,0.7)' }}>분기 전시실</div>
            <div className="mt-2 font-display text-4xl italic" style={{ color: C.cream }}>마음에 드는 작품 1점을 골라요</div>
            <div className="mt-2 text-sm" style={{ color: C.creamDim }}>{pool.length}점 중 하나를 골라 감상을 써요</div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {pool.map((a) => (
              <button key={a.id} onClick={() => choose(a)} className="overflow-hidden rounded-lg border text-left" style={{ borderColor: C.goldSoft, background: 'rgba(28,18,10,0.6)' }}>
                {a.imageUrl && <img src={a.imageUrl} alt={a.title} className="h-32 w-full object-cover" />}
                <div className="p-2 font-display text-base italic" style={{ color: C.cream }}>{a.title}</div>
              </button>
            ))}
          </div>
        </div>
      </Wall>
    );
  }

  // ── 2) 선택한 작품 감상 (해설 없음)
  return (
    <Wall>
      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center" style={{ animation: 'fadeUp 0.5s ease' }}>
          <div style={{ background: C.frame, padding: 16, boxShadow: '0 0 0 1.5px rgba(80,50,5,0.9), 0 28px 80px rgba(0,0,0,0.9)' }}>
            <div style={{ border: '3px solid rgba(50,32,4,0.7)', padding: 4, background: '#0e0903' }}>
              <img src={current.imageUrl} alt={current.title} style={{ width: 'min(52vh,82vw)', height: 'min(38vh,60vw)', objectFit: 'cover', display: 'block' }} />
            </div>
          </div>
          <div className="mt-3 font-display text-2xl italic" style={{ color: C.cream }}>{current.title}</div>
          <button onClick={() => setPicked(null)} className="mt-2 text-xs" style={{ color: C.creamDim }}>← 다른 작품 고르기</button>
        </div>
      </div>

      {/* 감상 패널 */}
      <div className="relative z-[5] flex w-[360px] min-w-[360px] flex-col" style={{ background: C.panel, borderLeft: '1px solid rgba(196,167,90,0.18)', animation: 'panelIn 0.35s ease' }}>
        <div className="border-b px-6 pb-4 pt-7" style={{ borderColor: 'rgba(196,167,90,0.12)' }}>
          <div className="text-[10px] tracking-[2px]" style={{ color: 'rgba(196,167,90,0.6)' }}>나의 감상 기록 · 분기</div>
          <div className="mt-1 font-display text-lg italic" style={{ color: C.cream }}>{current.title}</div>
        </div>
        <div className="flex items-center gap-2 px-6 pt-4">
          {prompts.map((_, i) => {
            const done = savedSteps.has(i) || answers[i].trim().length > 0;
            const cur = i === step;
            return (
              <button key={i} onClick={() => setStep(i)} className="flex h-9 flex-1 items-center justify-center rounded-md border text-sm" style={{ borderColor: cur ? C.gold : 'rgba(196,167,90,0.25)', background: cur ? 'rgba(196,167,90,0.2)' : 'transparent', color: done ? C.green : cur ? C.cream : 'rgba(232,217,184,0.5)', fontWeight: cur ? 700 : 400 }}>
                {done ? '✓' : ''} 질문 {i + 1}
              </button>
            );
          })}
        </div>
        <div className="px-6 pb-2 pt-4">
          <div className="mb-2 text-[11px]" style={{ color: 'rgba(196,167,90,0.7)' }}>질문 {step + 1} / {prompts.length} · {gradeBand === '3-4' ? '3~4학년' : '5~6학년'}</div>
          <div className="text-[13px] leading-[1.85]" style={{ color: C.creamDim }}>{prompts[step]}</div>
        </div>
        <div className="flex flex-1 flex-col gap-3 px-6 pb-5">
          <textarea value={answers[step]} onChange={(e) => setAnswer(e.target.value)} placeholder="여기에 감상을 적어보세요..." className="min-h-[110px] flex-1 resize-none rounded border p-3.5 text-[13px] leading-[1.7] outline-none" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(196,167,90,0.2)', color: C.creamDim }} />
          <button onClick={saveStep} disabled={busy || !answers[step].trim()} className="rounded-lg border py-3 text-center text-sm disabled:opacity-40" style={{ background: 'rgba(196,167,90,0.13)', borderColor: C.gold, color: C.cream }}>
            {busy ? '저장 중…' : step < prompts.length - 1 ? `저장하고 다음 질문 (${step + 2}/${prompts.length}) →` : '이 질문 저장'}
          </button>
          <button onClick={submit} disabled={busy || !allAnswered} className="rounded-lg border py-3 text-center text-sm disabled:opacity-40" style={{ background: allAnswered ? 'rgba(143,206,143,0.15)' : 'transparent', borderColor: allAnswered ? C.green : 'rgba(196,167,90,0.25)', color: C.cream }}>
            {allAnswered ? '제출하고 경매 기다리기 →' : `모든 질문에 답하면 제출 가능 (${answers.filter((a) => a.trim()).length}/${prompts.length})`}
          </button>
        </div>
      </div>
    </Wall>
  );
}

function Wall({ children, scroll }: { children: React.ReactNode; scroll?: boolean }) {
  return (
    <div className={`relative flex w-full font-body ${scroll ? 'min-h-screen overflow-auto' : 'h-screen overflow-hidden'}`} style={{ background: C.bg }}>
      <div className="pointer-events-none fixed inset-0" style={{ background: C.wall }} />
      <div className="relative z-[1] flex w-full">{children}</div>
    </div>
  );
}
