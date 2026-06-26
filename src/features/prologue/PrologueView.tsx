import { useState } from 'react';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

export function PrologueView({ steps }: { steps: string[] }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  if (done || steps.length === 0) {
    return (
      <Wall>
        <div className="text-center">
          <div className="font-display text-4xl italic" style={{ color: C.cream }}>
            곧 전시가 시작돼요
          </div>
          <div className="mt-2 text-sm" style={{ color: C.creamDim }}>
            선생님이 전시실 문을 열 때까지 잠시 기다려요
          </div>
        </div>
      </Wall>
    );
  }

  const isLast = step === steps.length - 1;

  return (
    <Wall>
      <div className="flex max-w-lg flex-col items-center px-8 text-center">
        <div className="text-5xl">🏛️</div>
        <p
          className="mt-8 font-display text-3xl leading-snug"
          style={{ color: C.cream, animation: 'fadeUp 0.5s ease' }}
        >
          {steps[step]}
        </p>

        <div className="mt-8 flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 22 : 7,
                height: 7,
                borderRadius: 4,
                background: i === step ? C.gold : 'rgba(196,150,90,0.3)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => setDone(true)}
            className="text-sm"
            style={{ color: C.creamDim }}
          >
            건너뛰기
          </button>
          <button
            onClick={() => (isLast ? setDone(true) : setStep((s) => s + 1))}
            className="rounded-full border px-8 py-3"
            style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.13)', color: C.cream }}
          >
            {isLast ? '시작하기' : '다음 →'}
          </button>
        </div>
      </div>
    </Wall>
  );
}

function Wall({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen items-center justify-center font-body"
      style={{ background: C.wall }}
    >
      {children}
    </div>
  );
}
