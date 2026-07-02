import { ref, runTransaction } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';

// 감상/선택 보상 → 모둠 경매자금에 합산.
// - 공통감상: 작품을 감상하면 10억 (고정)
// - 선택작품: 고르면 0~20억 랜덤 (1억 단위). 같은 작품이어도 학생·선택마다 다르게.
// 지급은 학생·작품별 1회 (장부로 중복 지급 방지). 랜덤값은 최초 지급 때 확정돼 재지급되지 않음.

const EOK = 100_000_000; // 1억
export const COMMON_REWARD = 10 * EOK; // 공통감상 고정 10억
const BRANCH_MAX_EOK = 20; // 선택작품 최대 20억

/** 선택작품 랜덤 보상: 0, 1억, …, 20억 중 하나. */
export function rollBranchReward(): number {
  return Math.floor(Math.random() * (BRANCH_MAX_EOK + 1)) * EOK;
}

export interface RewardResult {
  amount: number;
  isNew: boolean; // true면 방금 새로 지급됨 (안내 표시용)
}

interface RewardRecord {
  amount: number;
  kind: 'common' | 'branch';
  at: number;
}

/**
 * 감상/선택 보상을 지급하고 모둠 예산에 합산한다.
 * 이미 지급된 (학생, 작품) 조합이면 재지급하지 않고 기존 금액을 돌려준다.
 */
export async function awardReward(
  code: string,
  studentNumber: string,
  groupId: string,
  artworkId: string,
  kind: 'common' | 'branch',
): Promise<RewardResult> {
  const amount = kind === 'common' ? COMMON_REWARD : rollBranchReward();

  // 1) 장부에 원자적으로 기록 시도 — 이미 있으면 abort(=중복 지급 방지)
  const ledgerRef = ref(db, paths.reward(code, studentNumber, artworkId));
  const tx = await runTransaction(ledgerRef, (cur: RewardRecord | null) => {
    if (cur !== null) return; // 이미 지급됨 → 트랜잭션 취소
    const rec: RewardRecord = { amount, kind, at: Date.now() };
    return rec;
  });

  if (!tx.committed) {
    const existing = tx.snapshot.val() as RewardRecord | null;
    return { amount: existing?.amount ?? 0, isNew: false };
  }

  // 2) 모둠 예산에 합산 (원자적 증가 — 동시에 여러 명이 더해도 안전)
  await runTransaction(ref(db, paths.group(code, groupId)), (g) => {
    if (!g) return g;
    g.remainingBudget = (g.remainingBudget ?? 0) + amount;
    return g;
  });

  return { amount, isNew: true };
}
