import { ref, get, set, update } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Phase, Student } from '@/models';

/** 학생 현재 위치 갱신 (현황판용). */
export async function updatePresence(
  code: string,
  number: string,
  phase: Phase,
  detail?: string,
): Promise<void> {
  const now = Date.now();
  const current = detail ? { phase, detail, at: now } : { phase, at: now };
  await update(ref(db, paths.student(code, number)), { current, lastSeenAt: now });
}

/**
 * 코드 + 번호 + 이름으로 입장. 학생 익명 인증.
 * 동일 번호 재입장은 idempotent — 기존 레코드를 이어받고 이름·uid·접속시각만 갱신.
 */
export async function joinSession(
  code: string,
  number: string,
  name: string,
  groupId: string,
): Promise<Student> {
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;
  const now = Date.now();
  const studentRef = ref(db, paths.student(code, number));

  const existing = await get(studentRef);
  if (existing.exists()) {
    const prev = existing.val() as Student;
    await update(studentRef, { name, uid, groupId, lastSeenAt: now });
    return { ...prev, name, uid, groupId, lastSeenAt: now };
  }

  const student: Student = {
    number,
    name,
    groupId,
    isRep: false,
    uid,
    joinedAt: now,
    lastSeenAt: now,
  };
  await set(studentRef, student);
  return student;
}
