import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GalleryView } from '@/features/appreciation/GalleryView';
import { GalleryScene } from '@/features/appreciation/GalleryScene';
import { BranchView } from '@/features/branch/BranchView';
import { PrologueView } from '@/features/prologue/PrologueView';
import { DemoAuction } from '@/features/auction/DemoAuction';
import { SAMPLE_ARTWORKS } from '@/content/sampleArtworks';
import { DEFAULT_PROMPTS } from '@/content/prompts';
import { DEFAULT_PROLOGUE } from '@/content/prologue';
import { PHASE_ORDER, PHASE_LABELS } from '@/features/session/api';
import { tokens } from '@/theme';
import type { GradeBand, Phase } from '@/models';

const GOLD = '#c4975a';
const PHASES = PHASE_ORDER; // prologue → gallery → branch → auction → result

export function DemoView() {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get('embed');
  if (embed) {
    return (
      <DemoStudent
        phase={(PHASES.includes(embed as Phase) ? embed : 'prologue') as Phase}
        grade={(params.get('grade') as GradeBand) || '3-4'}
        reveal={params.get('reveal') === '1'}
      />
    );
  }
  return <DemoSplit />;
}

/** 좌(교사) · 우(학생) 분할. 좌측 조작이 우측(iframe) 학생 화면을 실제로 바꿈. */
function DemoSplit() {
  const [phase, setPhase] = useState<Phase>('prologue');
  const [grade, setGrade] = useState<GradeBand>('3-4');
  const [reveal, setReveal] = useState(false);
  const idx = PHASES.indexOf(phase);

  const teacherTask: Record<Phase, string> = {
    lobby: '학생 입장을 기다립니다.',
    prologue: '프롤로그를 열고 학생 입장을 받습니다.',
    gallery: '공통회랑을 열어 감상(수행평가)을 받습니다. 현황판에서 진행을 봅니다.',
    branch: '분기 작품(경매 대상)을 올리고, 학생이 1점 골라 감상하게 합니다.',
    auction: '작품을 올리고 타이머로 경매를 진행합니다.',
    result: '순위를 계산한 뒤 "공개"를 누르면 감정가·순위가 학생/TV에 나타납니다.',
  };

  const src = `/demo?embed=${phase}&grade=${grade}&reveal=${reveal ? '1' : '0'}`;

  return (
    <div className="flex h-screen w-full font-body" style={{ background: tokens.effect.wallGradient }}>
      {/* 좌: 교사 화면 미리보기 */}
      <div className="flex w-[360px] shrink-0 flex-col gap-3 overflow-auto border-r p-4" style={{ borderColor: 'rgba(196,167,90,0.2)' }}>
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl italic" style={{ color: '#ead9b8' }}>교사 화면</span>
          <Link to="/teacher" className="text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>실제 콘솔 →</Link>
        </div>

        {/* 학년 */}
        <div className="flex gap-2">
          {(['3-4', '5-6'] as GradeBand[]).map((g) => (
            <button key={g} onClick={() => setGrade(g)} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: GOLD, color: grade === g ? '#130e08' : '#ead9b8', background: grade === g ? GOLD : 'transparent' }}>
              {g === '3-4' ? '3~4학년' : '5~6학년'}
            </button>
          ))}
        </div>

        {/* 단계 네비게이터 (조정실) */}
        <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(196,167,90,0.25)', background: 'rgba(28,18,10,0.5)' }}>
          <div className="mb-2 text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>단계 (클릭해서 이동)</div>
          <div className="flex flex-col gap-1.5">
            {PHASES.map((p, i) => {
              const cur = p === phase;
              return (
                <button key={p} onClick={() => setPhase(p)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm" style={{ borderColor: cur ? GOLD : 'rgba(196,167,90,0.2)', background: cur ? 'rgba(196,167,90,0.18)' : 'transparent', color: i < idx ? 'rgba(232,217,184,0.7)' : cur ? '#ead9b8' : 'rgba(232,217,184,0.5)' }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: cur ? GOLD : 'rgba(196,167,90,0.2)', color: cur ? '#130e08' : '#ead9b8' }}>{i < idx ? '✓' : i + 1}</span>
                  {PHASE_LABELS[p]}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setPhase(PHASES[Math.max(0, idx - 1)])} disabled={idx <= 0} className="flex-1 rounded-full border py-2 text-xs disabled:opacity-30" style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}>← 이전</button>
            <button onClick={() => setPhase(PHASES[Math.min(PHASES.length - 1, idx + 1)])} disabled={idx >= PHASES.length - 1} className="flex-[2] rounded-full border py-2 text-xs disabled:opacity-30" style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.18)', color: '#ead9b8' }}>다음 →</button>
          </div>
        </div>

        {/* 교사가 하는 일 */}
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.5)', color: 'rgba(232,217,184,0.85)' }}>
          <div className="mb-1 text-xs" style={{ color: GOLD }}>🎛 조정실</div>
          {teacherTask[phase]}
        </div>

        {/* 결과 공개 토글 */}
        {phase === 'result' && (
          <button onClick={() => setReveal((r) => !r)} className="rounded-full border px-4 py-2.5 text-sm" style={reveal ? { borderColor: '#8fce8f', background: 'rgba(143,206,143,0.15)', color: '#ead9b8' } : { borderColor: GOLD, background: 'rgba(196,167,90,0.15)', color: '#ead9b8' }}>
            {reveal ? '🟢 공개 중 (숨기기)' : '🎁 감정가·순위 공개'}
          </button>
        )}

        <div className="mt-auto text-[11px]" style={{ color: 'rgba(232,217,184,0.4)' }}>
          데모 — 샘플 작품. 좌측을 바꾸면 우측 학생 화면이 실제로 바뀝니다.
        </div>
      </div>

      {/* 우: 학생 화면 (실제 컴포넌트, iframe) */}
      <div className="relative flex-1">
        <div className="absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs" style={{ background: 'rgba(12,8,4,0.85)', color: GOLD }}>📱 학생 화면</div>
        <iframe key={src} src={src} title="student" className="h-full w-full" style={{ border: 0 }} />
      </div>
    </div>
  );
}

/** 임베드(우측)용 학생 화면 — 단계별 실제 컴포넌트 + 샘플 데이터. */
function DemoStudent({ phase, grade, reveal }: { phase: Phase; grade: GradeBand; reveal: boolean }) {
  const prompts = DEFAULT_PROMPTS[grade];
  const common = SAMPLE_ARTWORKS.filter((a) => a.placement.kind === 'common');
  const branch = SAMPLE_ARTWORKS.filter((a) => a.placement.kind === 'branch');
  const [entered, setEntered] = useState(false);
  useEffect(() => setEntered(false), [phase, grade]);

  if (phase === 'prologue') return <PrologueView steps={DEFAULT_PROLOGUE[grade]} />;
  if (phase === 'gallery')
    return entered ? (
      <GalleryView code="demo" studentNumber="0" studentName="미리보기" gradeBand={grade} prompts={prompts} artworks={common} demo phase="gallery" />
    ) : (
      <GalleryScene onEnter={() => setEntered(true)} />
    );
  if (phase === 'branch')
    return <BranchView code="demo" studentNumber="0" studentName="미리보기" gradeBand={grade} prompts={prompts} artworks={branch} demo />;
  if (phase === 'auction') return <DemoAuction />;
  return <DemoResults reveal={reveal} />;
}

/** 데모 결과 발표 — 샘플 모둠/순위 + 교사 공개 토글 반영. */
const DEMO_RESULTS = [
  { name: '1모둠', cash: 800_000, won: ['게르니카'] },
  { name: '2모둠', cash: 650_000, won: ['진주 귀고리를 한 소녀'] },
  { name: '3모둠', cash: 1_000_000, won: [] },
  { name: '4모둠', cash: 700_000, won: ['수련'] },
];
const RC = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};
const MEDAL = ['🥇', '🥈', '🥉'];

function DemoResults({ reveal }: { reveal: boolean }) {
  const appraisedOf = (title: string) => SAMPLE_ARTWORKS.find((a) => a.title === title)?.appraisedValue ?? 0;
  const rows = DEMO_RESULTS.map((g) => {
    const wonSum = g.won.reduce((s, t) => s + appraisedOf(t), 0);
    return { ...g, asset: g.cash + wonSum, wonSum };
  }).sort((a, b) => b.asset - a.asset).map((r, i) => ({ ...r, rank: i + 1 }));

  if (!reveal) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6 text-center font-body" style={{ background: RC.wall }}>
        <div className="text-6xl">🎁</div>
        <div className="mt-6 font-display text-4xl italic" style={{ color: RC.cream }}>곧 결과를 공개합니다</div>
        <div className="mt-3 text-base" style={{ color: RC.creamDim }}>선생님이 "공개"를 누르면 순위·감정가가 나타나요</div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {DEMO_RESULTS.map((g) => (
            <span key={g.name} className="rounded-full px-3 py-1.5 text-sm" style={{ background: 'rgba(196,167,90,0.12)', color: RC.cream }}>{g.name}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-auto font-body" style={{ background: RC.wall }}>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="text-center font-display text-4xl italic" style={{ color: RC.cream }}>모둠 자산 순위</div>
        <div className="mt-1 text-center text-sm" style={{ color: RC.creamDim }}>자산 = 남은 현금 + 낙찰작 감정가</div>
        <div className="mt-6 space-y-2">
          {rows.map((r) => (
            <div key={r.name} className="rounded-lg border p-3" style={{ borderColor: r.rank === 1 ? RC.gold : 'rgba(196,167,90,0.2)', background: r.rank === 1 ? 'rgba(196,167,90,0.08)' : 'transparent' }}>
              <div className="flex items-center justify-between">
                <span className="font-display text-xl italic" style={{ color: RC.cream }}>{MEDAL[r.rank - 1] ?? `${r.rank}위`} {r.name}</span>
                <span className="font-display text-2xl" style={{ color: RC.gold }}>{r.asset.toLocaleString()}원</span>
              </div>
              <div className="text-xs" style={{ color: RC.creamDim }}>남은 현금 {r.cash.toLocaleString()} + 감정가 {r.wonSum.toLocaleString()}{r.won.length ? ` · 낙찰: ${r.won.join(', ')}` : ' · 낙찰 없음'}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 font-display text-2xl italic" style={{ color: RC.cream }}>작품의 실제 가치</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {SAMPLE_ARTWORKS.map((a) => (
            <div key={a.id} className="rounded-lg border p-3" style={{ borderColor: 'rgba(196,167,90,0.2)' }}>
              <img src={a.imageUrl} alt={a.title} className="h-24 w-full rounded object-cover" />
              <div className="mt-2 font-display text-base italic" style={{ color: RC.cream }}>{a.title}</div>
              <div className="text-sm" style={{ color: RC.gold }}>감정가 {a.appraisedValue.toLocaleString()}원</div>
              <div className="text-xs" style={{ color: RC.creamDim }}>출처: {a.source}</div>
              <div className="mt-1 text-xs leading-relaxed" style={{ color: 'rgba(232,217,184,0.7)' }}>{a.commentary}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
