import { ref, get, set } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Artwork, Group, GroupResult } from '@/models';

/** 모둠 자산(=잔여현금+낙찰작 감정가합) 계산 후 순위 산출하여 results에 기록·공개. */
export async function computeResults(code: string): Promise<void> {
  const groups: Record<string, Group> = (await get(ref(db, paths.groups(code)))).val() ?? {};
  const arts: Record<string, Artwork> = (await get(ref(db, paths.artworks(code)))).val() ?? {};

  const rows: GroupResult[] = Object.values(groups).map((g) => {
    const won = g.wonItems ?? {};
    const wonAppraisedSum = Object.keys(won).reduce(
      (sum, aid) => sum + (arts[aid]?.appraisedValue ?? 0),
      0,
    );
    const remainingCash = g.remainingBudget ?? 0;
    return {
      groupId: g.id,
      remainingCash,
      wonAppraisedSum,
      asset: remainingCash + wonAppraisedSum,
      rank: 0,
    };
  });

  rows.sort((a, b) => b.asset - a.asset);
  rows.forEach((r, i) => (r.rank = i + 1));

  const out: Record<string, GroupResult> = {};
  rows.forEach((r) => (out[r.groupId] = r));
  await set(ref(db, paths.results(code)), out);
}
