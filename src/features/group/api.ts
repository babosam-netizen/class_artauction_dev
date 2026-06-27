import { ref, update, get, set, remove } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Group } from '@/models';

/**
 * 기존 세션의 모둠 수/정원을 수정.
 * 모둠 수를 늘리면 새 모둠 추가, 줄이면 초과 모둠 삭제(소속 학생은 미배정 처리).
 */
export async function updateGroupConfig(
  code: string,
  targetCount: number,
  groupSize: number,
  startingFunds: number,
): Promise<void> {
  await update(ref(db, paths.meta(code)), { groupCount: targetCount, groupSize });
  const existing = ((await get(ref(db, paths.groups(code)))).val() ?? {}) as Record<string, Group>;
  for (let i = 1; i <= targetCount; i++) {
    const id = `g${i}`;
    if (!existing[id]) {
      await set(ref(db, paths.group(code, id)), {
        id,
        name: `${i}모둠`,
        remainingBudget: startingFunds,
        wonItems: {},
      });
    }
  }
  for (const id of Object.keys(existing)) {
    const num = Number(id.replace('g', ''));
    if (num > targetCount) await remove(ref(db, paths.group(code, id)));
  }
}

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
