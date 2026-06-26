import { ref, get, set, update } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Student } from '@/models';

/**
 * 코드 + 번호 + 이름으로 입장. 학생 익명 인증.
 * 동일 번호 재입장은 idempotent — 기존 레코드를 이어받고 이름·uid·접속시각만 갱신.
 */
export async function joinSession(
  code: string,
  number: string,
  name: string,
): Promise<Student> {
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;
  const now = Date.now();
  const studentRef = ref(db, paths.student(code, number));

  const existing = await get(studentRef);
  if (existing.exists()) {
    const prev = existing.val() as Student;
    await update(studentRef, { name, uid, lastSeenAt: now });
    return { ...prev, name, uid, lastSeenAt: now };
  }

  const student: Student = {
    number,
    name,
    groupId: '', // 모둠 배정은 이후 단계
    isRep: false,
    uid,
    joinedAt: now,
    lastSeenAt: now,
  };
  await set(studentRef, student);
  return student;
}
