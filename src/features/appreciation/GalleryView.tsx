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

  // 작품 전환 시: 기존 감상 불러오기 + 위치 보고
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
          <div className="font-display text-3xl italic" style={{ color: C.cream }}>
            전시 준비 중이에요
          </div>
          <div className="mt-2 text-sm" style={{ color: C.creamDim }}>
            선생님이 작품을 올리면 감상을 시작할 수 있어요
          </div>
        </div>
      </Wall>
    );
  }

  const artW = open ? 360 : 460;
  const answeredCount = answers.filter((a) => a.trim()).length;

  function setAnswer(value: string) {
    setAnswers((prev) => prev.map((a, i) => (i === step ? value : a)));
    setSavedSteps((prev) => {
      const n = new Set(prev);
      n.delete(step);
      return n;
    });
  }

  async function saveCurrent() {
    if (!current) return;
    setBusy(true);
    try {
      if (!demo) await saveAppreciation(code, studentNumber, current.id, answers);
      setSavedSteps((prev) => new Set(prev).add(step));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Wall>
      <div
        className="relative z-[2] flex flex-1 flex-col items-center justify-center"
        style={{ transition: 'all 0.4s ease' }}
      >
        {index > 0 && <Arrow side="left" onClick={() => setIndex((i) => Math.max(0, i - 1))} />}
        {index < total - 1 && (
          <Arrow side="right" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} />
        )}

        <div className="relative z-[3] flex flex-col items-center" style={{ animation: 'fadeUp 0.5s ease' }}>
          <div
            style={{
              background: C.frame,
              padding: 18,
              boxShadow:
                '0 0 0 1.5px rgba(80,50,5,0.9), 0 32px 90px rgba(0,0,0,0.92), 0 8px 30px rgba(0,0,0,0.6)',
              transition: 'all 0.4s ease',
            }}
          >
            <div style={{ border: '3px solid rgba(50,32,4,0.7)', padding: 4, background: '#0e0903' }}>
              <div
                style={{
                  width: artW,
                  height: artW * 0.72,
                  overflow: 'hidden',
                  background: '#0e0903',
                  transition: 'all 0.4s ease',
                }}
              >
                {current.imageUrl ? (
                  <img
                    src={current.imageUrl}
                    alt={current.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl opacity-30">🖼</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 text-center" style={{ animation: 'fadeUp 0.5s ease 0.1s both' }}>
            <div className="font-display text-2xl italic" style={{ color: C.cream, letterSpacing: '0.5px' }}>
              {current.title}
            </div>

            <div className="mt-4 flex justify-center gap-[7px]">
              {artworks.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    width: i === index ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === index ? C.gold : 'rgba(196,150,90,0.28)',
                    transition: 'all 0.35s ease',
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => setOpen((o) => !o)}
              className="mt-5 inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm"
              style={{ borderColor: C.goldSoft, background: 'rgba(196,167,90,0.07)', color: C.creamDim }}
            >
              <span>✏️</span>
              <span>
                {open ? '닫기' : answeredCount > 0 ? `감상 이어쓰기 (${answeredCount}/${prompts.length})` : '감상 기록하기'}
              </span>
            </button>
            {answeredCount > 0 && !open && (
              <button
                onClick={() => setShowCommentary(true)}
                className="ml-2 mt-5 inline-flex items-center rounded-full border px-5 py-3 text-sm"
                style={{ borderColor: C.goldSoft, color: C.creamDim }}
              >
                해설 보기
              </button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="relative z-[5] flex w-[360px] min-w-[360px] flex-col"
          style={{ background: C.panel, borderLeft: '1px solid rgba(196,167,90,0.18)', animation: 'panelIn 0.35s ease' }}
        >
          <div className="border-b px-6 pb-4 pt-7" style={{ borderColor: 'rgba(196,167,90,0.12)' }}>
            <div className="text-[10px] tracking-[2px]" style={{ color: 'rgba(196,167,90,0.6)' }}>
              나의 감상 기록
            </div>
            <div className="mt-1 font-display text-lg italic" style={{ color: C.cream }}>
              {current.title}
            </div>
          </div>

          <div className="px-6 pb-2 pt-5">
            <div
              className="mb-3 inline-flex items-center rounded px-2.5 py-1 text-[10px]"
              style={{ background: 'rgba(196,167,90,0.1)', color: C.gold }}
            >
              💬 질문 {step + 1}/{prompts.length} · {gradeBand === '3-4' ? '3~4학년' : '5~6학년'}
              {savedSteps.has(step) && <span style={{ marginLeft: 6, color: '#8fce8f' }}>저장됨 ✓</span>}
            </div>
            <div className="text-[13px] leading-[1.85]" style={{ color: C.creamDim }}>
              {prompts[step]}
            </div>
          </div>

          <div className="mx-6 h-px" style={{ background: 'rgba(196,167,90,0.1)' }} />

          <div className="flex flex-1 flex-col gap-3 px-6 py-4">
            <textarea
              value={answers[step]}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="여기에 감상을 적어보세요..."
              className="min-h-[120px] flex-1 resize-none rounded border p-3.5 text-[13px] leading-[1.7] outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(196,167,90,0.2)', color: C.creamDim }}
            />

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="text-xs disabled:opacity-30"
                style={{ color: C.gold }}
              >
                ‹ 이전 질문
              </button>
              <div className="flex gap-1.5">
                {prompts.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setStep(i)}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: savedSteps.has(i) ? '#8fce8f' : i === step ? C.gold : 'rgba(196,150,90,0.28)',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => setStep((s) => Math.min(prompts.length - 1, s + 1))}
                disabled={step === prompts.length - 1}
                className="text-xs disabled:opacity-30"
                style={{ color: C.gold }}
              >
                다음 질문 ›
              </button>
            </div>

            <button
              onClick={saveCurrent}
              disabled={busy || !answers[step].trim()}
              className="rounded border py-3 text-center text-[13px] disabled:opacity-50"
              style={{ background: 'rgba(196,167,90,0.13)', borderColor: 'rgba(196,167,90,0.38)', color: C.gold }}
            >
              {busy ? '저장 중…' : `이 질문 저장 (${step + 1}/${prompts.length})`}
            </button>
            <button
              onClick={() => setShowCommentary(true)}
              className="text-center text-[12px]"
              style={{ color: C.creamDim }}
            >
              작품 해설 보기 →
            </button>
            <div className="text-center text-[11px]" style={{ color: 'rgba(196,167,90,0.3)' }}>
              수행평가 기록으로 저장됩니다
            </div>
          </div>
        </div>
      )}

      {showCommentary && (
        <CommentaryOverlay
          title={current.title}
          commentary={current.commentary}
          isLast={index === total - 1}
          studentName={studentName}
          onClose={() => setShowCommentary(false)}
          onNext={() => {
            setShowCommentary(false);
            setIndex((i) => Math.min(total - 1, i + 1));
          }}
        />
      )}
    </Wall>
  );
}

function Wall({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden font-body" style={{ background: C.bg }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: C.wall }} />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-8"
        style={{
          background: 'linear-gradient(to bottom,rgba(196,167,90,0.13),transparent)',
          borderBottom: '1px solid rgba(196,167,90,0.12)',
        }}
      />
      {children}
    </div>
  );
}

function Arrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="absolute top-1/2 z-[4] flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border"
      style={{
        [side]: 28,
        width: 52,
        height: 52,
        borderColor: 'rgba(196,167,90,0.25)',
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <span style={{ color: 'rgba(220,190,130,0.65)', fontSize: 26, lineHeight: 1 }}>
        {side === 'left' ? '‹' : '›'}
      </span>
    </div>
  );
}

function CommentaryOverlay({
  title,
  commentary,
  isLast,
  onClose,
  onNext,
  studentName,
}: {
  title: string;
  commentary: string;
  isLast: boolean;
  onClose: () => void;
  onNext: () => void;
  studentName: string;
}) {
  return (
    <div
      className="absolute inset-0 z-[10] flex items-center justify-center px-6"
      style={{ background: 'rgba(8,5,3,0.82)', animation: 'fadeUp 0.3s ease' }}
    >
      <div className="w-full max-w-md rounded-lg border p-7" style={{ background: C.panel, borderColor: 'rgba(196,167,90,0.25)' }}>
        <div className="text-[10px] tracking-[2px]" style={{ color: 'rgba(196,167,90,0.6)' }}>
          작품 해설
        </div>
        <div className="mt-1 font-display text-2xl italic" style={{ color: C.cream }}>
          {title}
        </div>
        <p className="mt-4 text-sm leading-[1.9]" style={{ color: C.creamDim }}>
          {commentary || '해설이 준비되지 않았어요.'}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border px-5 py-2.5 text-sm"
            style={{ borderColor: 'rgba(196,167,90,0.4)', color: C.creamDim }}
          >
            닫기
          </button>
          {isLast ? (
            <div className="rounded-full px-5 py-2.5 text-sm" style={{ color: C.creamDim }}>
              {studentName} 님, 감상을 모두 마쳤어요 🎉
            </div>
          ) : (
            <button
              onClick={onNext}
              className="rounded-full border px-6 py-2.5 text-sm"
              style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.13)', color: C.cream }}
            >
              다음 작품 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
