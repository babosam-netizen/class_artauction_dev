import { useState } from 'react';
import { SAMPLE_ARTWORKS } from '@/content/sampleArtworks';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  green: '#8fce8f',
  red: '#e0a0a0',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

const INC = 100_000;
const START = 100_000;
const ART = SAMPLE_ARTWORKS.find((a) => a.forAuction) ?? SAMPLE_ARTWORKS[0];
// 데모용 상대 모둠: 각자 이 가격을 넘으면 기권
const RIVALS = [
  { name: '2모둠', dropAt: 300_000 },
  { name: '3모둠', dropAt: 600_000 },
  { name: '4모둠', dropAt: 900_000 },
];

export function DemoAuction() {
  const [price, setPrice] = useState(START);
  const [ourIn, setOurIn] = useState(true);
  const [sold, setSold] = useState<string | null>(null);

  const rivalsIn = RIVALS.filter((r) => price < r.dropAt).map((r) => r.name);
  const inList = [...(ourIn ? ['우리 모둠'] : []), ...rivalsIn];

  function raise() {
    if (sold) return;
    setPrice((p) => p + INC);
  }
  function awardOne() {
    if (inList.length === 1) setSold(inList[0]);
  }
  function reset() {
    setPrice(START);
    setOurIn(true);
    setSold(null);
  }

  return (
    <div className="flex h-screen items-center justify-center font-body" style={{ background: C.wall }}>
      <div className="flex w-full max-w-4xl items-center gap-10 px-10">
        {/* 작품 + 도장 */}
        <div className="relative w-1/2">
          <img src={ART.imageUrl} alt={ART.title} className="h-[52vh] w-full rounded object-cover" style={{ boxShadow: '0 24px 70px rgba(0,0,0,0.8)', opacity: sold ? 0.85 : 1 }} />
          {sold && (
            <div className="absolute left-1/2 top-1/2 rounded-2xl" style={{ border: '8px solid #d23', color: '#d23', padding: '10px 30px', fontSize: 52, fontWeight: 900, letterSpacing: 8, background: 'rgba(255,255,255,0.86)', animation: 'stampIn 0.5s cubic-bezier(.2,1.4,.4,1) both' }}>
              낙찰
            </div>
          )}
        </div>

        {/* 정보 + 조작 */}
        <div className="flex-1">
          <div className="font-display text-4xl italic" style={{ color: C.cream }}>{ART.title}</div>
          <div className="mt-5 text-sm" style={{ color: C.creamDim }}>현재 호가</div>
          <div className="font-display text-6xl" style={{ color: C.gold }}>{price.toLocaleString()}원</div>

          {sold ? (
            <>
              <div className="mt-4 font-display text-3xl italic" style={{ color: C.green }}>🔨 {sold} 낙찰!</div>
              <button onClick={reset} className="mt-5 rounded-full border px-5 py-2 text-sm" style={{ borderColor: C.gold, color: C.cream }}>다시</button>
            </>
          ) : (
            <>
              <div className="mt-5 text-sm" style={{ color: C.creamDim }}>참여 {inList.length}팀</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {['우리 모둠', ...RIVALS.map((r) => r.name)].map((name) => {
                  const isIn = inList.includes(name);
                  return (
                    <span key={name} className="rounded-full px-3 py-1.5 text-sm" style={{ border: `2px solid ${isIn ? C.green : 'rgba(196,167,90,0.25)'}`, background: isIn ? 'rgba(143,206,143,0.18)' : 'transparent', color: isIn ? C.cream : 'rgba(232,217,184,0.4)' }}>
                      {isIn ? '✋ ' : ''}{name}
                    </span>
                  );
                })}
              </div>

              {/* 학생(우리 모둠) 참여/기권 */}
              <div className="mt-5 flex gap-2">
                <button onClick={() => setOurIn(true)} disabled={ourIn} className="flex-1 rounded-xl border py-3 text-base disabled:opacity-50" style={{ borderColor: ourIn ? C.green : C.gold, background: ourIn ? 'rgba(143,206,143,0.2)' : 'rgba(196,167,90,0.15)', color: C.cream }}>✋ 참여</button>
                <button onClick={() => setOurIn(false)} disabled={!ourIn} className="flex-1 rounded-xl border py-3 text-base disabled:opacity-40" style={{ borderColor: 'rgba(224,160,160,0.5)', color: C.red }}>🏳️ 기권</button>
              </div>

              {/* 교사 조작 */}
              <div className="mt-3 flex gap-2">
                <button onClick={raise} className="flex-1 rounded-full border py-2 text-sm" style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.13)', color: C.cream }}>호가 올리기 +{INC.toLocaleString()}</button>
                <button onClick={awardOne} disabled={inList.length !== 1} className="flex-1 rounded-full border py-2 text-sm disabled:opacity-40" style={{ borderColor: C.green, background: 'rgba(143,206,143,0.18)', color: C.cream }}>🔨 낙찰 (1팀일 때)</button>
              </div>
              <div className="mt-3 text-[11px]" style={{ color: 'rgba(232,217,184,0.45)' }}>데모: 호가를 올리면 상대 모둠이 기권합니다. 1팀 남으면 낙찰.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
