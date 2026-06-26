import { ref, get, set } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Appreciation } from '@/models';

/** 감상 저장(개인). 최초 제출 시각은 보존, 수정 시 updatedAt만 갱신. */
export async function saveAppreciation(
  code: string,
  studentNumber: string,
  artworkId: string,
  answers: string[],
): Promise<void> {
  if (!auth.currentUser) await signInAnonymously(auth);
  const r = ref(db, paths.appreciation(code, studentNumber, artworkId));
  const snap = await get(r);
  const now = Date.now();
  const prev = snap.exists() ? (snap.val() as Appreciation) : null;
  const data: Appreciation = {
    studentNumber,
    artworkId,
    answers,
    submittedAt: prev?.submittedAt ?? now,
    updatedAt: now,
  };
  await set(r, data);
}
