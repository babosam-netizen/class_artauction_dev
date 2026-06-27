import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArtworkManager } from './ArtworkManager';
import { ContentEditor } from './ContentEditor';
import { TeacherAuctionPanel } from '@/features/auction/TeacherAuctionPanel';
import { TeacherResultPanel } from '@/features/results/TeacherResultPanel';
import { StageNavigator } from '@/features/session/StageNavigator';
import { Dashboard } from '@/features/teacher/Dashboard';
import { openTv, openStudentQr } from '@/features/teacher/share';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { createSession } from '@/features/session/api';
import { tokens } from '@/theme';
import type { GradeBand, SessionMeta, SessionState } from '@/models';

const GOLD = '#c4975a';

export function TeacherConsole() {
  const [code, setCode] = useState<string | null>(null);
  const [gradeBand, setGradeBand] = useState<GradeBand>('3-4');
  const [busy, setBusy] = useState(false);
  const state = useRtdbValue<SessionState>(code ? paths.state(code) : null);
  const meta = useRtdbValue<SessionMeta>(code ? paths.meta(code) : null);

  async function handleCreate() {
    setBusy(true);
    try {
      const newCode = await createSession({
        gradeBand,
        startingFunds: 1_000_000,
        minIncrement: 50_000,
        timerSeconds: 10,
        commonGalleryCount: 2,
        branchDoorCount: 4,
        groupCount: 4,
      });
      setCode(newCode);
    } finally {
      setBusy(false);
    }
  }

  // 세션 생성 전
  if (!code) {
    return (
      <div className="min-h-screen font-body text-cream" style={{ background: tokens.effect.wallGradient }}>
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="font-display text-4xl italic">교사 콘솔</div>
          <p className="mt-2 text-sm text-cream-dim">학년군을 고르고 세션을 시작하세요</p>
          <div className="mt-6 flex gap-2">
            {(['3-4', '5-6'] as GradeBand[]).map((g) => (
              <button
                key={g}
                onClick={() => setGradeBand(g)}
                className="rounded-full border px-5 py-2 text-sm"
                style={{
                  borderColor: GOLD,
                  color: gradeBand === g ? '#130e08' : '#ead9b8',
                  background: gradeBand === g ? GOLD : 'transparent',
                }}
              >
                {g === '3-4' ? '3~4학년' : '5~6학년'}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={busy}
            className="mt-5 rounded-full border px-8 py-3 disabled:opacity-50"
            style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
          >
            {busy ? '생성 중…' : '세션 생성하기'}
          </button>
          <Link to="/" className="mt-6 text-xs" style={{ color: 'rgba(232,217,184,0.5)' }}>
            ← 홈으로
          </Link>
        </div>
      </div>
    );
  }

  const phase = state?.phase ?? 'lobby';
  const isAuction = phase === 'auction';
  const isResult = phase === 'result';

  return (
    <div
      className="min-h-screen font-body text-cream"
      style={{ background: tokens.effect.wallGradient }}
    >
      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* 헤더 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl italic">교사 콘솔</span>
            <span className="text-xs text-cream-dim">입장 코드</span>
            <span className="font-display text-3xl tracking-[0.15em]" style={{ color: GOLD }}>
              {code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openStudentQr(code)}
              className="rounded-full border px-4 py-2 text-sm"
              style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.12)', color: '#ead9b8' }}
            >
              📱 학생 입장 QR
            </button>
            <button
              onClick={() => openTv(code)}
              className="rounded-full border px-4 py-2 text-sm"
              style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.12)', color: '#ead9b8' }}
            >
              📺 TV 송출
            </button>
            <Link
              to="/"
              className="rounded-full border px-3 py-2 text-sm"
              style={{ borderColor: 'rgba(196,167,90,0.3)', color: 'rgba(232,217,184,0.7)' }}
            >
              홈
            </Link>
          </div>
        </div>

        {/* 단계 네비게이터 */}
        <StageNavigator code={code} phase={phase} />

        {/* 조정실 + 현황판 */}
        <div className="mt-5 flex flex-col gap-5 lg:flex-row">
          {/* 조정실 */}
          <section className="w-full lg:w-[460px] lg:shrink-0">
            <div className="mb-2 text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
              🎛 조정실
            </div>
            {isAuction && meta ? (
              <TeacherAuctionPanel code={code} meta={meta} />
            ) : isResult && meta ? (
              <TeacherResultPanel code={code} gradeBand={meta.gradeBand} />
            ) : (
              <>
                <ArtworkManager code={code} branchDoorCount={meta?.branchDoorCount ?? 4} />
                {(phase === 'lobby' || phase === 'prologue') && <ContentEditor code={code} />}
              </>
            )}
          </section>

          {/* 현황판 */}
          <section className="min-w-0 flex-1">
            <div className="mb-2 text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
              📊 현황판
            </div>
            <Dashboard code={code} gradeBand={meta?.gradeBand ?? gradeBand} />
          </section>
        </div>
      </div>
    </div>
  );
}
