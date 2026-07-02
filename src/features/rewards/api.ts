import { ref, get, runTransaction } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';

// 사례금 봉투: 최종제출 때 3개 중 1개를 골라 그 금액을 모둠 경매자금에 유입.
// 금액은 1억/5억/10억/20억 가중치 랜덤 — 1억·20억 희소, 5억·10억 빈번.
// 지급은 학생·작품별 1회(장부). 선택작품은 학생당 최대 branchPickLimit개까지만.

const EOK = 100_000_000;

const ENVELOPE_TABLE: { amount: number; weight: number }[] = [
  { amount: 1 * EOK, weight: 1 }, // 희소
  { amount: 5 * EOK, weight: 4 }, // 빈번
  { amount: 10 * EOK, weight: 4 }, // 빈번
  { amount: 20 * EOK, weight: 1 }, // 희소
];
const TOTAL_WEIGHT = ENVELOPE_TABLE.reduce((s, t) => s + t.weight, 0);

/** 가중치 랜덤으로 봉투 금액 1개. */
export function rollEnvelope(): number {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const t of ENVELOPE_TABLE) {
    if ((r -= t.weight) < 0) return t.amount;
  }
  return ENVELOPE_TABLE[ENVELOPE_TABLE.length - 1].amount;
}

/** 서로 독립적으로 굴린 봉투 n개(기본 3). 각각 다른 금액일 수 있음. */
export function rollEnvelopes(n = 3): number[] {
  return Array.from({ length: n }, () => rollEnvelope());
}

export interface RewardResult {
  amount: number;
  isNew: boolean; // 방금 새로 지급됨
  blocked?: boolean; // 선택작품 한도 초과로 지급 안 됨
}

interface RewardRecord {
  amount: number;
  kind: 'common' | 'branch';
  at: number;
}

/** 이 학생이 이미 보상받은 선택작품 수(현재 작품 제외). */
async function branchRewardCount(
  code: string,
  studentNumber: string,
  exceptArtworkId: string,
): Promise<number> {
  const snap = await get(ref(db, paths.rewards(code, studentNumber)));
  if (!snap.exists()) return 0;
  const all = snap.val() as Record<string, RewardRecord>;
  return Object.entries(all).filter(
    ([aid, r]) => aid !== exceptArtworkId && r?.kind === 'branch',
  ).length;
}

/**
 * 고른 봉투 금액을 지급하고 모둠 예산에 유입한다.
 * - 학생·작품별 1회 (장부로 중복 지급 방지)
 * - kind='branch'는 학생당 최대 branchLimit개까지만 (기본 1)
 */
export async function awardEnvelope(
  code: string,
  studentNumber: string,
  groupId: string,
  artworkId: string,
  kind: 'common' | 'branch',
  amount: number,
  branchLimit = 1,
): Promise<RewardResult> {
  // 선택작품 한도 검사 (이미 받은 게 아니라면)
  if (kind === 'branch') {
    const already = await get(ref(db, paths.reward(code, studentNumber, artworkId)));
    if (!already.exists()) {
      const count = await branchRewardCount(code, studentNumber, artworkId);
      if (count >= branchLimit) return { amount: 0, isNew: false, blocked: true };
    }
  }

  // 장부에 원자적 기록 — 이미 있으면 중복 지급 방지
  const ledgerRef = ref(db, paths.reward(code, studentNumber, artworkId));
  const tx = await runTransaction(ledgerRef, (cur: RewardRecord | null) => {
    if (cur !== null) return;
    const rec: RewardRecord = { amount, kind, at: Date.now() };
    return rec;
  });
  if (!tx.committed) {
    const existing = tx.snapshot.val() as RewardRecord | null;
    return { amount: existing?.amount ?? 0, isNew: false };
  }

  // 모둠 예산에 유입 (원자적)
  await runTransaction(ref(db, paths.group(code, groupId)), (g) => {
    if (!g) return g;
    g.remainingBudget = (g.remainingBudget ?? 0) + amount;
    g.rewardTotal = (g.rewardTotal ?? 0) + amount; // 사례금 누적(기본자금과 구분)
    return g;
  });

  return { amount, isNew: true };
}

/** 이 학생이 해당 작품에서 이미 받은 보상 기록(있으면 금액, 없으면 null). */
export async function getRewardFor(
  code: string,
  studentNumber: string,
  artworkId: string,
): Promise<number | null> {
  const snap = await get(ref(db, paths.reward(code, studentNumber, artworkId)));
  if (!snap.exists()) return null;
  return (snap.val() as RewardRecord).amount;
}
