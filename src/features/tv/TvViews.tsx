import { useEffect, useMemo, useState } from 'react';
import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { sortByOrder } from '@/features/artwork/api';
import { DEFAULT_PROLOGUE } from '@/content/prologue';
import type { Artwork, SessionContent, SessionMeta } from '@/models';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.8)',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 32%, #2e1e10 0%, #0c0804 100%)',
  frame:
    'linear-gradient(145deg, #d4b862 0%, #8b6010 20%, #c49b38 40%, #7a5010 60%, #c4a040 80%, #8b6010 100%)',
};

function Wall({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden font-body" style={{ background: C.wall }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 42%, rgba(255,220,140,0.10) 0%, transparent 68%)' }} />
      {children}
    </div>
  );
}

function Dots({ n, active }: { n: number; active: number }) {
  return (
    <div className="mt-8 flex justify-center gap-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ width: i === active ? 28 : 8, height: 8, borderRadius: 4, background: i === active ? C.gold : 'rgba(196,150,90,0.3)', transition: 'all 0.4s' }} />
      ))}
    </div>
  );
}

export function TvWaiting({ code }: { code: string }) {
  return (
    <Wall>
      <div className="text-center">
        <div className="text-6xl">🏛️</div>
        <div className="mt-6 font-display text-6xl italic" style={{ color: C.cream }}>준비 중입니다</div>
        <div className="mt-4 text-xl" style={{ color: C.creamDim }}>곧 미술관 여행이 시작돼요</div>
        <div className="mt-10 text-sm tracking-[3px]" style={{ color: 'rgba(196,167,90,0.7)' }}>입장 코드</div>
        <div className="font-display text-7xl tracking-[0.2em]" style={{ color: C.gold }}>{code}</div>
      </div>
    </Wall>
  );
}

export function TvPrologue({ code }: { code: string }) {
  const meta = useRtdbValue<SessionMeta>(paths.meta(code));
  const content = useRtdbValue<SessionContent>(paths.content(code));
  const steps = content?.prologue?.length ? content.prologue : DEFAULT_PROLOGUE[meta?.gradeBand ?? '3-4'];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (steps.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % steps.length), 6000);
    return () => clearInterval(id);
  }, [steps.length]);

  const idx = i % Math.max(1, steps.length);
  return (
    <Wall>
      <div className="max-w-4xl px-12 text-center">
        <div className="text-xs tracking-[5px]" style={{ color: 'rgba(196,167,90,0.7)' }}>PROLOGUE</div>
        <p key={idx} className="mt-6 font-display text-5xl leading-snug" style={{ color: C.cream, animation: 'fadeUp 0.6s ease' }}>
          {steps[idx]}
        </p>
        <Dots n={steps.length} active={idx} />
      </div>
    </Wall>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TvGallery({ code }: { code: string }) {
  const arts = useRtdbList<Artwork>(paths.artworks(code)).filter((a) => a.placement?.kind === 'common');
  const key = arts.map((a) => a.id).join(',');
  const shuffled = useMemo(() => shuffle(arts), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  useEffect(() => {
    if (shuffled.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % shuffled.length), 6000);
    return () => clearInterval(id);
  }, [shuffled.length]);

  if (shuffled.length === 0) {
    return (
      <Wall>
        <div className="text-center">
          <div className="font-display text-5xl italic" style={{ color: C.cream }}>공통 전시실</div>
          <div className="mt-3 text-xl" style={{ color: C.creamDim }}>작품을 준비하고 있어요</div>
        </div>
      </Wall>
    );
  }

  const cur = shuffled[i % shuffled.length];
  return (
    <Wall>
      <div className="flex flex-col items-center">
        <div className="text-xs tracking-[5px]" style={{ color: 'rgba(196,167,90,0.7)' }}>공통 전시실</div>
        <div key={cur.id} className="mt-5 flex flex-col items-center" style={{ animation: 'fadeUp 0.6s ease' }}>
          <div style={{ background: C.frame, padding: 16, boxShadow: '0 0 0 1.5px rgba(80,50,5,0.9), 0 32px 90px rgba(0,0,0,0.9)' }}>
            <div style={{ border: '3px solid rgba(50,32,4,0.7)', padding: 4, background: '#0e0903' }}>
              <img src={cur.imageUrl} alt={cur.title} style={{ width: 'min(72vh,80vw)', height: 'min(50vh,56vw)', objectFit: 'cover', display: 'block' }} />
            </div>
          </div>
          <div className="mt-5 font-display text-4xl italic" style={{ color: C.cream }}>{cur.title}</div>
        </div>
        <Dots n={shuffled.length} active={i % shuffled.length} />
      </div>
    </Wall>
  );
}

export function TvBranch({ code }: { code: string }) {
  const meta = useRtdbValue<SessionMeta>(paths.meta(code));
  const arts = sortByOrder(useRtdbList<Artwork>(paths.artworks(code)).filter((a) => a.placement?.kind === 'branch'));
  const doors = meta?.branchDoorCount ?? 4;
  const countFor = (d: number) => arts.filter((a) => a.placement.kind === 'branch' && a.placement.door === d).length;

  return (
    <Wall>
      <div className="flex flex-col items-center px-10">
        <div className="text-xs tracking-[5px]" style={{ color: 'rgba(196,167,90,0.7)' }}>회랑 분기</div>
        <div className="mt-3 font-display text-5xl italic" style={{ color: C.cream }}>전시실을 골라 들어가요</div>
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          {Array.from({ length: doors }, (_, d) => (
            <div key={d} className="flex flex-col items-center justify-end" style={{
              width: 150, height: 190, borderTopLeftRadius: 75, borderTopRightRadius: 75,
              border: '2px solid rgba(196,167,90,0.45)', borderBottom: 'none',
              background: 'linear-gradient(to top, rgba(196,167,90,0.16), transparent)',
            }}>
              <div className="text-4xl">🚪</div>
              <div className="mt-1 font-display text-2xl italic" style={{ color: C.cream }}>{d + 1}번 문</div>
              <div className="mb-6 text-sm" style={{ color: 'rgba(196,167,90,0.7)' }}>작품 {countFor(d)}점</div>
            </div>
          ))}
        </div>
      </div>
    </Wall>
  );
}
