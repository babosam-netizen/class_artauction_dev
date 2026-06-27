import { useEffect, useState, type ReactNode } from 'react';
import { MuseumShell } from '@/components/MuseumShell';
import {
  teacherPasswordExists,
  setTeacherPassword,
  verifyTeacherPassword,
  isUnlocked,
  markUnlocked,
} from './api';

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';

export function TeacherGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const [exists, setExists] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!unlocked) teacherPasswordExists().then(setExists);
  }, [unlocked]);

  if (unlocked) return <>{children}</>;

  async function handleSubmit() {
    setBusy(true);
    setError('');
    try {
      if (exists === false) {
        if (pw.length < 4) return setError('암호는 4자 이상으로 정해주세요');
        if (pw !== pw2) return setError('두 암호가 다릅니다');
        await setTeacherPassword(pw);
        markUnlocked();
        setUnlocked(true);
      } else {
        if (await verifyTeacherPassword(pw)) {
          markUnlocked();
          setUnlocked(true);
        } else {
          setError('암호가 틀렸습니다');
        }
      }
    } catch {
      setError('처리 중 오류가 났어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  const firstTime = exists === false;
  return (
    <MuseumShell title="교사 입장" route="/teacher">
      <div className="mt-8 flex w-72 flex-col gap-3">
        <div className="text-center text-sm" style={{ color: 'rgba(232,217,184,0.8)' }}>
          {exists === null
            ? '확인 중…'
            : firstTime
              ? '처음이시네요. 교사 암호를 새로 정하세요. (이후 고정, 수정 불가)'
              : '교사 암호를 입력하세요'}
        </div>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !firstTime && handleSubmit()}
          placeholder={firstTime ? '새 암호' : '암호'}
          className="rounded border bg-transparent px-4 py-3 text-center outline-none"
          style={{ borderColor: BORDER, color: '#ead9b8' }}
        />
        {firstTime && (
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="새 암호 확인"
            className="rounded border bg-transparent px-4 py-3 text-center outline-none"
            style={{ borderColor: BORDER, color: '#ead9b8' }}
          />
        )}
        {error && (
          <div className="text-center text-sm" style={{ color: '#e0a0a0' }}>
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={busy || exists === null || !pw}
          className="rounded-full border px-6 py-3 disabled:opacity-50"
          style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
        >
          {busy ? '처리 중…' : firstTime ? '암호 설정하고 입장' : '입장'}
        </button>
      </div>
    </MuseumShell>
  );
}
