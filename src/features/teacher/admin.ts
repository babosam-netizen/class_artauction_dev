import { ref, remove, update, get, set } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Group, SessionMeta } from '@/models';

/** 학생 퇴장. withData=true면 그 학생의 감상 자료까지 삭제. */
export async function removeStudent(code: string, number: string, withData: boolean): Promise<void> {
  await remove(ref(db, paths.student(code, number)));
  if (withData) await remove(ref(db, paths.appreciations(code, number)));
}

/** 반 초기화 — 학생·감상·경매·결과 삭제, 단계/모둠 예산 초기화. 작품·콘텐츠·설정은 유지. */
export async function resetClass(code: string): Promise<void> {
  await remove(ref(db, paths.students(code)));
  await remove(ref(db, paths.allAppreciations(code)));
  await remove(ref(db, `sessions/${code}/auction`));
  await remove(ref(db, paths.results(code)));
  await update(ref(db, paths.state(code)), {
    phase: 'prologue',
    currentAuctionArtworkId: null,
    revealValues: false,
  });
  const meta = (await get(ref(db, paths.meta(code)))).val() as SessionMeta | null;
  const startingFunds = meta?.startingFunds ?? 0;
  const groups = (await get(ref(db, paths.groups(code)))).val() as Record<string, Group> | null;
  if (groups) {
    for (const g of Object.values(groups)) {
      await set(ref(db, paths.group(code, g.id)), {
        id: g.id,
        name: g.name,
        remainingBudget: startingFunds,
        wonItems: {},
      });
    }
  }
}
