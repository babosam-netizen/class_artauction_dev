import { useState } from 'react';
import { MuseumShell } from '@/components/MuseumShell';
import { ArtworkManager } from './ArtworkManager';
import { TeacherAuctionPanel } from '@/features/auction/TeacherAuctionPanel';
import { TeacherResultPanel } from '@/features/results/TeacherResultPanel';
import { ContentEditor } from './ContentEditor';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import {
  createSession,
  setPhase,
  nextPhase,
  prevPhase,
  PHASE_LABELS,
} from '@/features/session/api';
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

  if (!code) {
    return (
      <MuseumShell title="교사 콘솔" route="/teacher">
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {(['3-4', '5-6'] as GradeBand[]).map((g) => (
              <button
                key={g}
                onClick={() => setGradeBand(g)}
                className="rounded-full border px-4 py-2 text-sm"
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
            className="rounded-full border px-8 py-3 text-base disabled:opacity-50"
            style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
          >
            {busy ? '생성 중…' : '세션 생성하기'}
          </button>
        </div>
      </MuseumShell>
    );
  }

  const phase = state?.phase ?? 'lobby';
  return (
    <MuseumShell title="교사 콘솔" route="/teacher">
      <div className="mt-6 flex flex-col items-center gap-5">
        <div className="text-center">
          <div className="text-xs tracking-widest text-cream-dim">입장 코드</div>
          <div className="font-display text-6xl tracking-[0.2em]" style={{ color: GOLD }}>
            {code}
          </div>
        </div>
        <div className="text-sm text-cream-dim">
          현재 단계: <b style={{ color: '#ead9b8' }}>{PHASE_LABELS[phase]}</b>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPhase(code, prevPhase(phase))}
            className="rounded-full border px-5 py-2 text-sm"
            style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
          >
            ← 이전 단계
          </button>
          <button
            onClick={() => setPhase(code, nextPhase(phase))}
            className="rounded-full border px-5 py-2 text-sm"
            style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
          >
            다음 단계 →
          </button>
        </div>

        {(phase === 'lobby' || phase === 'prologue') && <ContentEditor code={code} />}

        {phase === 'auction' && meta ? (
          <TeacherAuctionPanel code={code} meta={meta} />
        ) : phase === 'result' && meta ? (
          <TeacherResultPanel code={code} gradeBand={meta.gradeBand} />
        ) : (
          <ArtworkManager code={code} branchDoorCount={meta?.branchDoorCount ?? 4} />
        )}
      </div>
    </MuseumShell>
  );
}
