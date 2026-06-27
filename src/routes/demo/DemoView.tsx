import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GalleryView } from '@/features/appreciation/GalleryView';
import { PrologueView } from '@/features/prologue/PrologueView';
import { SAMPLE_ARTWORKS } from '@/content/sampleArtworks';
import { DEFAULT_PROMPTS } from '@/content/prompts';
import { DEFAULT_PROLOGUE } from '@/content/prologue';
import { PHASE_ORDER, PHASE_LABELS } from '@/features/session/api';
import { PHASE_HINT, PHASE_SUBSTAGES } from '@/features/session/stages';
import { tokens } from '@/theme';
import type { GradeBand, Phase } from '@/models';

const GOLD = '#c4975a';

export function DemoView() {
  const [phase, setPhase] = useState<Phase>('gallery');
  const [grade, setGrade] = useState<GradeBand>('3-4');

  const prompts = DEFAULT_PROMPTS[grade];
  const common = SAMPLE_ARTWORKS.filter((a) => a.placement.kind === 'common');
  const branch = SAMPLE_ARTWORKS.filter((a) => a.placement.kind === 'branch');

  let screen: React.ReactNode;
  if (phase === 'prologue') {
    screen = <PrologueView steps={DEFAULT_PROLOGUE[grade]} />;
  } else if (phase === 'gallery') {
    screen = (
      <GalleryView code="demo" studentNumber="0" studentName="미리보기" gradeBand={grade} prompts={prompts} artworks={common} demo phase="gallery" />
    );
  } else if (phase === 'branch') {
    screen = (
      <GalleryView code="demo" studentNumber="0" studentName="미리보기" gradeBand={grade} prompts={prompts} artworks={branch} demo phase="branch" />
    );
  } else {
    screen = <DescribeScreen phase={phase} />;
  }

  return (
    <div className="relative">
      {/* 떠다니는 데모 툴바 */}
      <div
        className="fixed left-1/2 top-3 z-[100] flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-full border px-3 py-2"
        style={{ borderColor: GOLD, background: 'rgba(12,8,4,0.92)' }}
      >
        <span className="px-1 text-xs" style={{ color: GOLD }}>데모</span>
        {PHASE_ORDER.filter((p) => p !== 'lobby').map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className="rounded-full px-2.5 py-1 text-xs"
            style={{
              background: phase === p ? GOLD : 'transparent',
              color: phase === p ? '#130e08' : '#ead9b8',
            }}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
        <span className="mx-1 h-4 w-px" style={{ background: 'rgba(196,167,90,0.3)' }} />
        <button
          onClick={() => setGrade((g) => (g === '3-4' ? '5-6' : '3-4'))}
          className="rounded-full px-2.5 py-1 text-xs"
          style={{ border: `1px solid ${GOLD}`, color: '#ead9b8' }}
        >
          {grade === '3-4' ? '3~4학년' : '5~6학년'}
        </button>
        <Link to="/" className="rounded-full px-2.5 py-1 text-xs" style={{ color: 'rgba(232,217,184,0.7)' }}>
          홈
        </Link>
      </div>

      {screen}
    </div>
  );
}

function DescribeScreen({ phase }: { phase: Phase }) {
  return (
    <div className="flex h-screen items-center justify-center px-6 font-body" style={{ background: tokens.effect.wallGradient }}>
      <div className="max-w-md rounded-2xl border p-8 text-center" style={{ borderColor: 'rgba(196,167,90,0.3)', background: 'rgba(28,18,10,0.6)' }}>
        <div className="font-display text-4xl italic" style={{ color: '#ead9b8' }}>
          {PHASE_LABELS[phase]}
        </div>
        <p className="mt-3 text-sm" style={{ color: 'rgba(232,217,184,0.8)' }}>
          {PHASE_HINT[phase]}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {PHASE_SUBSTAGES[phase].map((s, i) => (
            <div key={i} className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(196,167,90,0.1)', color: GOLD }}>
              {i + 1}. {s}
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs" style={{ color: 'rgba(232,217,184,0.5)' }}>
          실제 진행은 학생 기기 · TV 화면과 실시간으로 연동됩니다
        </p>
      </div>
    </div>
  );
}
