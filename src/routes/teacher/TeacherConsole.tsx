import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArtworkManager } from './ArtworkManager';
import { ContentEditor } from './ContentEditor';
import { GroupSettings } from './GroupSettings';
import { TeacherAuctionPanel } from '@/features/auction/TeacherAuctionPanel';
import { TeacherResultPanel } from '@/features/results/TeacherResultPanel';
import { StageNavigator } from '@/features/session/StageNavigator';
import { Dashboard } from '@/features/teacher/Dashboard';
import { openTv, openStudentQr } from '@/features/teacher/share';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { createSession, sessionExists } from '@/features/session/api';
import { loadRecent, addRecent, removeRecent } from '@/features/session/recent';
import { tokens } from '@/theme';
import type { GradeBand, SessionMeta, SessionState } from '@/models';

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';

export function TeacherConsole() {
  const [code, setCode] = useState<string | null>(null);
  const [gradeBand, setGradeBand] = useState<GradeBand>('3-4');
  const [groupCount, setGroupCount] = useState(4);
  const [groupSize, setGroupSize] = useState(4);
  const [busy, setBusy] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [enterError, setEnterError] = useState('');
  const [recent, setRecent] = useState(loadRecent());

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
        groupCount,
        groupSize,
      });
      addRecent({ code: newCode, gradeBand, createdAt: Date.now() });
      setCode(newCode);
    } finally {
      setBusy(false);
    }
  }

  async function enterCode(c: string) {
    const up = c.trim().toUpperCase();
    if (!up) return;
    setBusy(true);
    setEnterError('');
    try {
      if (await sessionExists(up)) {
        setCode(up);
      } else {
        setEnterError(`'${up}' 세션을 찾을 수 없어요`);
        removeRecent(up);
        setRecent(loadRecent());
      }
    } catch {
      setEnterError('확인에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  // ───────── 세션 생성/입장 전 화면 ─────────
  if (!code) {
    return (
      <div className="min-h-screen font-body text-cream" style={{ background: tokens.effect.wallGradient }}>
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-6 py-10">
          <div className="text-center">
            <div className="font-display text-4xl italic">교사 콘솔</div>
          </div>

          {/* 새 세션 */}
          <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(196,167,90,0.25)', background: 'rgba(28,18,10,0.5)' }}>
            <div className="mb-3 text-sm font-semibold" style={{ color: GOLD }}>새 세션 만들기</div>

            <div className="flex flex-col gap-3">
              <Row label="학년군">
                <div className="flex gap-2">
                  {(['3-4', '5-6'] as GradeBand[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGradeBand(g)}
                      className="rounded-full border px-4 py-1.5 text-sm"
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
              </Row>
              <Row label="모둠 수">
                <Stepper value={groupCount} min={1} max={12} onChange={setGroupCount} suffix="모둠" />
              </Row>
              <Row label="모둠당 인원">
                <Stepper value={groupSize} min={1} max={15} onChange={setGroupSize} suffix="명" />
              </Row>
            </div>

            <button
              onClick={handleCreate}
              disabled={busy}
              className="mt-4 w-full rounded-full border py-2.5 text-sm disabled:opacity-50"
              style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.15)', color: '#ead9b8' }}
            >
              {busy ? '생성 중…' : `＋ 세션 생성 (최대 ${groupCount * groupSize}명)`}
            </button>
          </div>

          {/* 코드로 입장 */}
          <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(196,167,90,0.25)', background: 'rgba(28,18,10,0.5)' }}>
            <div className="mb-3 text-sm font-semibold" style={{ color: GOLD }}>코드로 입장</div>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enterCode(codeInput)}
                placeholder="세션 코드"
                className="flex-1 rounded border bg-transparent px-4 py-2 text-center tracking-widest outline-none"
                style={{ borderColor: BORDER, color: '#ead9b8' }}
              />
              <button
                onClick={() => enterCode(codeInput)}
                disabled={busy || !codeInput.trim()}
                className="rounded-full border px-5 py-2 text-sm disabled:opacity-50"
                style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.15)', color: '#ead9b8' }}
              >
                입장
              </button>
            </div>
            {enterError && <div className="mt-2 text-sm" style={{ color: '#e0a0a0' }}>{enterError}</div>}
          </div>

          {/* 최근 세션 */}
          {recent.length > 0 && (
            <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(196,167,90,0.25)', background: 'rgba(28,18,10,0.5)' }}>
              <div className="mb-3 text-sm font-semibold" style={{ color: GOLD }}>최근 세션 (이 기기)</div>
              <div className="flex flex-col gap-2">
                {recent.map((r) => (
                  <div key={r.code} className="flex items-center gap-2">
                    <button
                      onClick={() => enterCode(r.code)}
                      className="flex flex-1 items-center justify-between rounded-lg border px-4 py-2 text-left text-sm"
                      style={{ borderColor: 'rgba(196,167,90,0.2)', color: '#ead9b8' }}
                    >
                      <span className="font-display text-lg tracking-widest" style={{ color: GOLD }}>{r.code}</span>
                      <span className="text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
                        {r.gradeBand === '3-4' ? '3~4학년' : '5~6학년'} · {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      onClick={() => { removeRecent(r.code); setRecent(loadRecent()); }}
                      className="px-2 text-xs"
                      style={{ color: 'rgba(224,160,160,0.7)' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            to="/demo"
            className="rounded-xl border px-5 py-3 text-center text-sm"
            style={{ borderColor: 'rgba(196,167,90,0.3)', background: 'rgba(28,18,10,0.5)', color: '#ead9b8' }}
          >
            👀 데모 둘러보기 (교사·학생 화면 미리보기)
          </Link>
          <Link to="/" className="text-center text-xs" style={{ color: 'rgba(232,217,184,0.5)' }}>← 홈으로</Link>
        </div>
      </div>
    );
  }

  // ───────── 세션 진행 화면 ─────────
  const phase = state?.phase ?? 'lobby';
  const isAuction = phase === 'auction';
  const isResult = phase === 'result';
  const isSetup = !isAuction && !isResult;

  return (
    <div className="min-h-screen font-body text-cream" style={{ background: tokens.effect.wallGradient }}>
      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* 헤더 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl italic">교사 콘솔</span>
            <span className="text-xs text-cream-dim">입장 코드</span>
            <span className="font-display text-3xl tracking-[0.15em]" style={{ color: GOLD }}>{code}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openStudentQr(code)} className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.12)', color: '#ead9b8' }}>
              📱 학생 입장 QR
            </button>
            <button onClick={() => openTv(code)} className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.12)', color: '#ead9b8' }}>
              📺 TV 송출
            </button>
            <button onClick={() => setCode(null)} className="rounded-full border px-3 py-2 text-sm" style={{ borderColor: 'rgba(196,167,90,0.3)', color: 'rgba(232,217,184,0.7)' }}>
              세션 전환
            </button>
          </div>
        </div>

        <StageNavigator code={code} phase={phase} />

        {isSetup && (
          <div className="mt-4">
            <GroupSettings code={code} />
          </div>
        )}

        <div className="mt-5 flex flex-col gap-5 lg:flex-row">
          <section className="w-full lg:w-[460px] lg:shrink-0">
            <div className="mb-2 text-sm font-semibold tracking-wide" style={{ color: GOLD }}>🎛 조정실</div>
            {isAuction && meta ? (
              <TeacherAuctionPanel code={code} meta={meta} />
            ) : isResult && meta ? (
              <TeacherResultPanel code={code} gradeBand={meta.gradeBand} />
            ) : (
              <div className="flex flex-col gap-4">
                {isSetup && <ContentEditor code={code} />}
                <ArtworkManager code={code} />
              </div>
            )}
          </section>

          <section className="min-w-0 flex-1">
            <div className="mb-2 text-sm font-semibold tracking-wide" style={{ color: GOLD }}>📊 현황판</div>
            <Dashboard code={code} gradeBand={meta?.gradeBand ?? gradeBand} />
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'rgba(232,217,184,0.8)' }}>{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const btn = 'flex h-9 w-9 items-center justify-center rounded-full border text-lg disabled:opacity-30';
  const style = { borderColor: GOLD, color: '#ead9b8' };
  return (
    <div className="flex items-center gap-3">
      <button className={btn} style={style} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span className="w-16 text-center font-display text-xl" style={{ color: '#ead9b8' }}>
        {value}
        {suffix && <span className="ml-1 text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>{suffix}</span>}
      </span>
      <button className={btn} style={style} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>＋</button>
    </div>
  );
}
