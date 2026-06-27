import { useEffect, useState } from 'react';
import { SAMPLE_ARTWORKS } from '@/content/sampleArtworks';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

const MIN = 50_000;
const TIMER = 10;
const BUDGET0 = 1_000_000;
const RIVAL_CAP = 650_000;
const ITEMS = SAMPLE_ARTWORKS.filter((a) => a.forAuction);

type Status = 'ready' | 'live' | 'sold';
type High = '우리 모둠' | '상대 모둠' | null;

interface S {
  idx: number;
  price: number;
  high: High;
  status: Status;
  remaining: number;
  budget: number;
  log: string[];
}

const init: S = { idx: 0, price: 0, high: null, status: 'ready', remaining: TIMER, budget: BUDGET0, log: [] };

export function DemoAuction() {
  const [s, setS] = useState<S>(init);
  const art = ITEMS[s.idx];

  useEffect(() => {
    if (s.status !== 'live') return;
    const id = setInterval(() => {
      setS((p) => {
        if (p.status !== 'live') return p;
        if (p.remaining <= 1) {
          const won = p.high === '우리 모둠';
          return {
            ...p,
            remaining: 0,
            status: 'sold',
            budget: won ? p.budget - p.price : p.budget,
            log: [`🔨 ${p.high ?? '아무도'} 낙찰 (${p.price.toLocaleString()}원)`, ...p.log],
          };
        }
        // 상대 모둠 자동 입찰
        if (Math.random() < 0.3 && p.price + MIN <= RIVAL_CAP) {
          const np = p.price + MIN;
          return {
            ...p,
            price: np,
            high: '상대 모둠',
            remaining: TIMER,
            log: [`상대 모둠 +${MIN.toLocaleString()} → ${np.toLocaleString()}원`, ...p.log],
          };
        }
        return { ...p, remaining: p.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [s.status]);

  function start() {
    setS((p) => ({ ...p, status: 'live', remaining: TIMER, log: ['⏱ 타이머 시작', ...p.log] }));
  }
  function bid() {
    setS((p) => {
      if (p.status !== 'live') return p;
      const np = p.price + MIN;
      if (np > p.budget) return { ...p, log: ['❌ 예산 초과', ...p.log] };
      return {
        ...p,
        price: np,
        high: '우리 모둠',
        remaining: TIMER,
        log: [`우리 모둠 +${MIN.toLocaleString()} → ${np.toLocaleString()}원`, ...p.log],
      };
    });
  }
  function next() {
    setS((p) => ({ ...p, idx: (p.idx + 1) % ITEMS.length, price: 0, high: null, status: 'ready', remaining: TIMER }));
  }

  return (
    <div className="flex h-screen items-center justify-center px-6 font-body" style={{ background: C.wall }}>
      <div className="flex w-full max-w-3xl items-center gap-10">
        <img
          src={art.imageUrl}
          alt={art.title}
          className="h-[52vh] w-1/2 rounded object-cover"
          style={{ boxShadow: '0 24px 70px rgba(0,0,0,0.8)' }}
        />
        <div className="flex-1">
          <div className="font-display text-4xl italic" style={{ color: C.cream }}>{art.title}</div>

          <div className="mt-6 text-sm" style={{ color: C.creamDim }}>현재 최고가</div>
          <div className="font-display text-6xl" style={{ color: C.gold }}>{s.price.toLocaleString()}원</div>
          <div className="mt-1 text-lg" style={{ color: C.cream }}>
            {s.status === 'sold'
              ? `🔨 ${s.high ?? '유찰'} 낙찰!`
              : s.high
                ? `최고 입찰: ${s.high}`
                : '입찰을 기다립니다'}
          </div>

          {s.status === 'live' && (
            <div className="mt-2 font-display text-4xl" style={{ color: s.remaining <= 3 ? '#e0a0a0' : C.cream }}>
              ⏱ {s.remaining}
            </div>
          )}

          <div className="mt-3 text-sm" style={{ color: C.creamDim }}>
            우리 모둠 남은 예산 <b style={{ color: C.cream }}>{s.budget.toLocaleString()}원</b>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {s.status === 'ready' && (
              <button onClick={start} className="rounded-full border px-6 py-3 text-sm" style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.15)', color: C.cream }}>
                타이머 시작 ({TIMER}초)
              </button>
            )}
            {s.status === 'live' && (
              <button onClick={bid} className="rounded-full border px-6 py-3 text-base" style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.2)', color: C.cream }}>
                + {MIN.toLocaleString()}원 입찰 (우리 모둠)
              </button>
            )}
            {s.status === 'sold' && (
              <button onClick={next} className="rounded-full border px-6 py-3 text-sm" style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.15)', color: C.cream }}>
                다음 작품 →
              </button>
            )}
          </div>

          {s.log.length > 0 && (
            <div className="mt-5 max-h-32 space-y-1 overflow-auto text-xs" style={{ color: C.creamDim }}>
              {s.log.slice(0, 6).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          )}
          <div className="mt-4 text-[11px]" style={{ color: 'rgba(232,217,184,0.45)' }}>
            데모: 상대 모둠은 자동으로 호가합니다. 타이머 안에 호가하면 연장돼요.
          </div>
        </div>
      </div>
    </div>
  );
}
