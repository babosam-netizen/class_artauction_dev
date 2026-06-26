import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from './app';

/** RTDB 단일 경로를 구독해 값을 반환. path가 null이면 구독하지 않음. */
export function useRtdbValue<T>(path: string | null): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!path) {
      setValue(undefined);
      return;
    }
    const r = ref(db, path);
    const unsub = onValue(r, (snap) => {
      setValue(snap.exists() ? (snap.val() as T) : undefined);
    });
    return () => unsub();
  }, [path]);

  return value;
}

/** RTDB 컬렉션(키→값 맵)을 구독해 값 배열로 반환. */
export function useRtdbList<T>(path: string | null): T[] {
  const map = useRtdbValue<Record<string, T>>(path);
  return map ? Object.values(map) : [];
}
