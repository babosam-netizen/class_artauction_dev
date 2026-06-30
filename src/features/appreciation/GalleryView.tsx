import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import { saveAppreciation } from './api';
import { updatePresence } from '@/features/entry/api';
import type { Appreciation, Artwork, GradeBand, Phase } from '@/models';

const C = {
  bg: '#130e08',
  panel: '#1c120a',
  gold: '#c4975a',
  goldSoft: 'rgba(196,167,90,0.4)',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  green: '#8fce8f',
  frame:
    'linear-gradient(145deg, #d4b862 0%, #8b6010 20%, #c49b38 40%, #7a5010 60%, #c4a040 80%, #8b6010 100%)',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

interface GalleryViewProps {
  code: string;
  studentNumber: string;
  studentName: string;
  gradeBand: GradeBand;
  prompts: string[];
  artworks: Artwork[];
  phase?: Phase;
  demo?: boolean;
  showTitle?: boolean;
}

export function GalleryView({
  code,
  studentNumber,
  studentName,
  gradeBand,
  prompts,
  artworks,
  phase = 'gallery',
  demo = false,
  showTitle = true,
}: GalleryViewProps) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => prompts.map(() => ''));
  const [savedSteps, setSavedSteps] = useState<Set<number>>(new Set());
  const [showCommentary, setShowCommentary] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = artworks.length;
  const current = artworks[index];
  const qCount = prompts.length;

  useEffect(() => {
    if (!current) return;
    setOpen(false);
    setStep(0);
    setShowCommentary(false);
    setAnswers(prompts.map(() => ''));
    setSavedSteps(new Set());
    if (demo) return;
    let active = true;
    get(ref(db, paths.appreciation(code, studentNumber, current.id))).then((snap) => {
      if (!active || !snap.exists()) return;
      const prev = snap.val() as Appreciation;
      const next = prompts.map((_, i) => prev.answers?.[i] ?? '');
      setAnswers(next);
      setSavedSteps(new Set(next.map((a, i) => (a.trim() ? i : -1)).filter((i) => i >= 0)));
    });
    updatePresence(code, studentNumber, phase, current.title).catch(() => {});
    return () => {
      active = false;
    };
  }, [current?.id, code, studentNumber, prompts.length, demo, phase]);

  if (total === 0) {
    return (
      <Wall>
        <div className="text-center">
          <div className="font-display text-3xl italic" style={{ color: C.cream }}>전시 준비 중이에요</div>
          <div className="mt-2 text-sm" style={{ color: C.creamDim }}>
            선생님이 작품을 올리면 감상을 시작할 수 있어요
          </div>
        </div>
      </Wall>
    );
  }

  // 작품을 화면 대부분 채우게 (패널 열리면 살짝 축소)
  const boxH = open ? '64vh' : '72vh';
  const boxW = open ? 'min(90vh, calc(100vw - 400px))' : 'min(128vh, 95vw)';
  const answeredCount = answers.filter((a) => a.trim()).length;
  const allAnswered = qCount > 0 && answers.every((a) => a.trim().length > 0);

  function setAnswer(value: string) {
    setAnswers((prev) => prev.map((a, i) => (i === step ? value : a)));
    setSavedSteps((prev) => {
      const n = new Set(prev);
      n.delete(step);
      return n;
    });
  }

  async function persist(): Promise<void> {
    if (!demo) await saveAppreciation(code, studentNumber, current.id, answers);
    setSavedSteps((prev) => new Set(prev).add(step));
  }

  async function saveAndNext() {
    if (!answers[step].trim()) return;
    setBusy(true);
    try {
      await persist();
      if (step < qCount - 1) setStep((s) => s + 1);
    } finally {
      setBusy(false);
    }
  }

  function goNextArtwork() {
    if (!allAnswered) return;
    setIndex((i) => Math.min(total - 1, i + 1));
  }

  return (
    <Wall>
      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center" style={{ transition: 'all 0.4s ease' }}>
        {index > 0 && <Arrow side="left" onClick={() => setIndex((i) => Math.max(0, i - 1))} />}
        {index < total - 1 && (
          <Arrow side="right" disabled={!allAnswered} onClick={goNextArtwork} />
        )}

        <div className="relative z-[3] flex flex-col items-center" style={{ animation: 'fadeUp 0.5s ease' }}>
          <div
            style={{
              background: C.frame,
              padding: 10,
              boxShadow:
                '0 0 0 1.5px rgba(80,50,5,0.9), 0 32px 90px rgba(0,0,0,0.92), 0 8px 30px rgba(0,0,0,0.6)',
              transition: 'all 0.4s ease',
            }}
          >
            <div style={{ border: '3px solid rgba(50,32,4,0.7)', padding: 4, background: '#0e0903' }}>
              <div style={{ width: boxW, height: boxH, overflow: 'hidden', background: '#0e0903', transition: 'all 0.4s ease' }}>
                {current.imageUrl ? (
                  <img src={current.imageUrl} alt={current.title} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl opacity-30">🖼</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 text-center" style={{ animation: 'fadeUp 0.5s ease 0.1s both' }}>
            {showTitle && (
              <div className="font-display text-xl italic" style={{ color: C.cream, letterSpacing: '0.5px' }}>
                {current.title}
              </div>
            )}

            {/* 작품 진행 도트 */}
            <div className="mt-2 flex justify-center gap-[7px]">
              {artworks.map((a, i) => (
                <div key={a.id} style={{ width: i === index ? 20 : 6, height: 6, borderRadius: 3, background: i === index ? C.gold : 'rgba(196,150,90,0.28)', transition: 'all 0.35s ease' }} />
              ))}
            </div>

            {/* 질문 진행 요약 (항상 보임) */}
            <div className="mt-1 text-xs" style={{ color: C.creamDim }}>
              질문 <b style={{ color: C.gold }}>{answeredCount}</b> / {qCount} 완료
            </div>

            <button
              onClick={() => setOpen((o) => !o)}
              className="mt-2 inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm"
              style={{ borderColor: C.goldSoft, background: 'rgba(196,167,90,0.07)', color: C.creamDim }}
            >
              <span>✏️</span>
              <span>{open ? '닫기' : answeredCount > 0 ? `감상 이어쓰기 (${answeredCount}/${qCount})` : `감상 기록하기 (질문 ${qCount}개)`}</span>
            </button>

            {/* 해설/다음: 모두 답해야 열림 */}
            <div className="mt-2">
              {allAnswered ? (
                <button
                  onClick={() => setShowCommentary(true)}
                  className="inline-flex items-center rounded-full border px-6 py-3 text-sm"
                  style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.15)', color: C.cream }}
                >
                  해설 보기 →
                </button>
              ) : (
                <div className="text-xs" style={{ color: 'rgba(232,217,184,0.5)' }}>
                  🔒 {qCount}개 질문에 모두 답하면 해설과 다음 작품이 열려요
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="relative z-[5] flex w-[360px] min-w-[360px] flex-col" style={{ background: C.panel, borderLeft: '1px solid rgba(196,167,90,0.18)', animation: 'panelIn 0.35s ease' }}>
          <div className="border-b px-6 pb-4 pt-7" style={{ borderColor: 'rgba(196,167,90,0.12)' }}>
            <div className="text-[10px] tracking-[2px]" style={{ color: 'rgba(196,167,90,0.6)' }}>나의 감상 기록</div>
            <div className="mt-1 font-display text-lg italic" style={{ color: C.cream }}>{showTitle ? current.title : '작품'}</div>
          </div>

          {/* 질문 번호 탭 (N개임을 명확히) */}
          <div className="flex items-center gap-2 px-6 pt-4">
            {prompts.map((_, i) => {
              const done = savedSteps.has(i) || answers[i].trim().length > 0;
              const cur = i === step;
              return (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="flex h-9 flex-1 items-center justify-center rounded-md border text-sm"
                  style={{
                    borderColor: cur ? C.gold : 'rgba(196,167,90,0.25)',
                    background: cur ? 'rgba(196,167,90,0.2)' : 'transparent',
                    color: done ? C.green : cur ? C.cream : 'rgba(232,217,184,0.5)',
                    fontWeight: cur ? 700 : 400,
                  }}
                >
                  {done ? '✓' : ''} 질문 {i + 1}
                </button>
              );
            })}
          </div>

          <div className="px-6 pb-2 pt-4">
            <div className="mb-2 text-[11px]" style={{ color: 'rgba(196,167,90,0.7)' }}>
              질문 {step + 1} / {qCount} · {gradeBand === '3-4' ? '3~4학년' : '5~6학년'}
            </div>
            <div className="text-[13px] leading-[1.85]" style={{ color: C.creamDim }}>{prompts[step]}</div>
          </div>

          <div className="flex flex-1 flex-col gap-3 px-6 pb-5">
            <textarea
              value={answers[step]}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="여기에 감상을 적어보세요..."
              className="min-h-[110px] flex-1 resize-none rounded border p-3.5 text-[13px] leading-[1.7] outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(196,167,90,0.2)', color: C.creamDim }}
            />

            <button
              onClick={saveAndNext}
              disabled={busy || !answers[step].trim()}
              className="rounded-xl border py-4 text-center text-base font-bold disabled:opacity-40"
              style={{ background: answers[step].trim() ? 'rgba(196,167,90,0.22)' : 'transparent', borderColor: C.gold, color: C.cream, boxShadow: answers[step].trim() ? '0 0 18px rgba(196,167,90,0.25)' : 'none' }}
            >
              {busy
                ? '제출 중…'
                : step < qCount - 1
                ? `✏️ 답변 제출 → 다음 질문 (${step + 2}/${qCount})`
                : '✏️ 답변 제출'}
            </button>

            {allAnswered ? (
              <button
                onClick={() => { setOpen(false); setShowCommentary(true); }}
                className="rounded-xl border py-4 text-center text-base font-bold"
                style={{ background: 'rgba(143,206,143,0.2)', borderColor: C.green, color: C.cream, boxShadow: '0 0 18px rgba(143,206,143,0.2)' }}
              >
                ✅ {qCount}개 답변 완료 — 해설 보기 →
              </button>
            ) : (
              <div className="text-center text-[11px]" style={{ color: 'rgba(232,217,184,0.45)' }}>
                {qCount}개 질문에 모두 답하면 해설·다음 작품이 열려요 ({answeredCount}/{qCount})
              </div>
            )}
            <div className="text-center text-[11px]" style={{ color: 'rgba(196,167,90,0.3)' }}>수행평가 기록으로 저장됩니다</div>
          </div>
        </div>
      )}

      {showCommentary && allAnswered && (
        <CommentaryOverlay
          title={showTitle ? current.title : '작품'}
          commentary={current.commentary}
          isLast={index === total - 1}
          studentName={studentName}
          onClose={() => setShowCommentary(false)}
          onNext={() => { setShowCommentary(false); setIndex((i) => Math.min(total - 1, i + 1)); }}
        />
      )}
    </Wall>
  );
}

function Wall({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden font-body" style={{ background: C.bg }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: C.wall }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8" style={{ background: 'linear-gradient(to bottom,rgba(196,167,90,0.13),transparent)', borderBottom: '1px solid rgba(196,167,90,0.12)' }} />
      {children}
    </div>
  );
}

function Arrow({ side, onClick, disabled = false }: { side: 'left' | 'right'; onClick: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      title={disabled ? '모든 질문에 답하면 넘어갈 수 있어요' : undefined}
      className="absolute top-1/2 z-[4] flex -translate-y-1/2 items-center justify-center rounded-full border"
      style={{
        [side]: 28,
        width: 52,
        height: 52,
        borderColor: disabled ? 'rgba(196,167,90,0.15)' : 'rgba(196,167,90,0.25)',
        background: 'rgba(0,0,0,0.2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <span style={{ color: 'rgba(220,190,130,0.65)', fontSize: 26, lineHeight: 1 }}>
        {disabled ? '🔒' : side === 'left' ? '‹' : '›'}
      </span>
    </div>
  );
}

function CommentaryOverlay({ title, commentary, isLast, onClose, onNext, studentName }: { title: string; commentary: string; isLast: boolean; onClose: () => void; onNext: () => void; studentName: string }) {
  return (
    <div className="absolute inset-0 z-[10] flex items-center justify-center px-6" style={{ background: 'rgba(8,5,3,0.82)', animation: 'fadeUp 0.3s ease' }}>
      <div className="w-full max-w-md rounded-lg border p-7" style={{ background: C.panel, borderColor: 'rgba(196,167,90,0.25)' }}>
        <div className="text-[10px] tracking-[2px]" style={{ color: 'rgba(196,167,90,0.6)' }}>작품 해설</div>
        <div className="mt-1 font-display text-2xl italic" style={{ color: C.cream }}>{title}</div>
        <p className="mt-4 text-sm leading-[1.9]" style={{ color: C.creamDim }}>{commentary || '해설이 준비되지 않았어요.'}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border px-5 py-2.5 text-sm" style={{ borderColor: 'rgba(196,167,90,0.4)', color: C.creamDim }}>닫기</button>
          {isLast ? (
            <div className="rounded-full px-5 py-2.5 text-sm" style={{ color: C.creamDim }}>{studentName} 님, 감상을 모두 마쳤어요 🎉</div>
          ) : (
            <button onClick={onNext} className="rounded-full border px-6 py-2.5 text-sm" style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.13)', color: C.cream }}>다음 작품 →</button>
          )}
        </div>
      </div>
    </div>
  );
}
