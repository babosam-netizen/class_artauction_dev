import { ref, update, get } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Group } from '@/models';

/** 모둠 대표 지정 (대표 기기에서만 입찰 가능). */
export async function setRepresentative(
  code: string,
  groupId: string,
  studentNumber: string,
): Promise<void> {
  await update(ref(db, paths.group(code, groupId)), { repStudentNumber: studentNumber });
  await update(ref(db, paths.student(code, studentNumber)), { isRep: true, groupId });
}

export async function getGroup(code: string, groupId: string): Promise<Group | null> {
  const snap = await get(ref(db, paths.group(code, groupId)));
  return snap.exists() ? (snap.val() as Group) : null;
}

export function wonItemsOf(group: Group | undefined): Record<string, number> {
  return group?.wonItems ?? {};
}
