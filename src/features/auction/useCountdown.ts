import { useEffect, useState } from 'react';

/** endsAt(ms)까지 남은 초를 반환. endsAt 없으면 0. */
export function useCountdown(endsAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
