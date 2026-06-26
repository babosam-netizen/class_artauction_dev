import { useState } from 'react';
import { MuseumShell } from '@/components/MuseumShell';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { joinSession } from '@/features/entry/api';
import { sessionExists, PHASE_LABELS } from '@/features/session/api';
import type { SessionState } from '@/models';

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';

interface Joined {
  code: string;
  number: string;
  name: string;
}

export function StudentPlay() {
  const [joined, setJoined] = useState<Joined | null>(null);
  const [code, setCode] = useState('');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const state = useRtdbValue<SessionState>(joined ? paths.state(joined.code) : null);

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      const c = code.trim().toUpperCase();
      if (!(await sessionExists(c))) {
        setError('코드를 찾을 수 없어요');
        return;
      }
      await joinSession(c, number.trim(), name.trim());
      setJoined({ code: c, number: number.trim(), name: name.trim() });
    } catch {
      setError('입장에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  if (!joined) {
    return (
      <MuseumShell title="미술관 입장" route="/play">
        <div className="mt-8 flex w-72 flex-col gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="교사 접속 코드"
            className="rounded border bg-transparent px-4 py-3 text-center text-lg tracking-widest outline-none"
            style={{ borderColor: BORDER, color: '#ead9b8' }}
          />
          <div className="flex gap-2">
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="번호"
              inputMode="numeric"
              className="w-20 rounded border bg-transparent px-3 py-3 text-center outline-none"
              style={{ borderColor: BORDER, color: '#ead9b8' }}
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              className="flex-1 rounded border bg-transparent px-3 py-3 outline-none"
              style={{ borderColor: BORDER, color: '#ead9b8' }}
            />
          </div>
          {error && (
            <div className="text-center text-sm" style={{ color: '#e0a0a0' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={busy || !code || !number || !name}
            className="rounded-full border px-6 py-3 disabled:opacity-50"
            style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
          >
            {busy ? '입장 중…' : '🚪 미술관 입장하기'}
          </button>
        </div>
      </MuseumShell>
    );
  }

  const phase = state?.phase ?? 'lobby';
  return (
    <MuseumShell title={`${joined.name} 님`} route="/play">
      <div className="mt-6 text-center">
        <div className="text-sm text-cream-dim">
          {joined.number}번 · 코드 {joined.code}
        </div>
        <div className="mt-4 font-display text-3xl italic" style={{ color: GOLD }}>
          {PHASE_LABELS[phase]}
        </div>
        <div className="mt-2 text-xs text-cream-dim">
          교사가 다음 단계를 열면 자동으로 이동해요
        </div>
      </div>
    </MuseumShell>
  );
}
