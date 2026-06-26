import {
  ref,
  set,
  update,
  get,
  push,
  onValue,
  runTransaction,
  type DatabaseReference,
} from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import { getGroup } from '@/features/group/api';
import type { Artwork, AuctionItem } from '@/models';

/**
 * 트랜잭션 전 노드에 일시 리스너를 붙여 첫 값을 동기화한다.
 * (활성 리스너가 없으면 runTransaction 첫 실행이 null로 시작해 즉시 abort되는 RTDB 특성 회피)
 * 반환된 unsub을 트랜잭션 후 호출.
 */
function warmRef(r: DatabaseReference): Promise<() => void> {
  return new Promise((resolve) => {
    const unsub = onValue(r, () => resolve(() => unsub()));
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 경매 대상 작품을 랜덤 순서로 초기화. */
export async function initAuction(code: string, artworks: Artwork[]): Promise<void> {
  const forAuction = shuffle(artworks.filter((a) => a.forAuction));
  const items: Record<string, AuctionItem> = {};
  forAuction.forEach((a, i) => {
    items[a.id] = {
      artworkId: a.id,
      status: 'pending',
      currentPrice: 0,
      timerState: 'idle',
      order: i,
    };
  });
  await set(ref(db, paths.auctionItems(code)), items);
  await update(ref(db, paths.state(code)), { currentAuctionArtworkId: null });
}

/** 작품을 경매대에 올림(진행). */
export async function presentArtwork(code: string, artworkId: string): Promise<void> {
  await update(ref(db, paths.auctionItem(code, artworkId)), {
    status: 'live',
    currentPrice: 0,
    highBidGroupId: null,
    timerState: 'idle',
    timerEndsAt: null,
  });
  await update(ref(db, paths.state(code)), { currentAuctionArtworkId: artworkId });
}

export async function startTimer(
  code: string,
  artworkId: string,
  seconds: number,
): Promise<void> {
  await update(ref(db, paths.auctionItem(code, artworkId)), {
    timerState: 'running',
    timerEndsAt: Date.now() + seconds * 1000,
  });
}

export type BidResult = 'ok' | 'too-low' | 'closed' | 'budget';

/**
 * 입찰 — RTDB 트랜잭션으로 최고가 갱신을 원자적으로 처리.
 * 새 호가는 (현재가 + 최소 호가 단위) 이상이어야 유효. 타이머 진행 중이면 자동 연장.
 */
export async function placeBid(
  code: string,
  artworkId: string,
  groupId: string,
  amount: number,
  minIncrement: number,
  timerSeconds: number,
): Promise<BidResult> {
  const group = await getGroup(code, groupId);
  if (!group) return 'closed';
  if (amount > group.remainingBudget) return 'budget';

  const itemRef = ref(db, paths.auctionItem(code, artworkId));
  const unsub = await warmRef(itemRef);

  let reason: BidResult = 'ok';
  try {
    const res = await runTransaction(itemRef, (item: AuctionItem | null) => {
      if (!item || item.status !== 'live') {
        reason = 'closed';
        return; // abort
      }
      const floor = item.currentPrice > 0 ? item.currentPrice + minIncrement : minIncrement;
      if (amount < floor) {
        reason = 'too-low';
        return; // abort
      }
      item.currentPrice = amount;
      item.highBidGroupId = groupId;
      if (item.timerState === 'running') {
        item.timerEndsAt = Date.now() + timerSeconds * 1000;
      }
      return item;
    });

    if (res.committed) {
      const bidRef = push(ref(db, paths.bids(code)));
      await set(bidRef, { id: bidRef.key, artworkId, groupId, amount, at: Date.now() });
      return 'ok';
    }
    return reason;
  } finally {
    unsub();
  }
}

/** 마감 — 최고가 있으면 낙찰(모둠 예산 차감), 없으면 유찰. */
export async function finalizeItem(code: string, artworkId: string): Promise<'sold' | 'passed'> {
  const itemRef = ref(db, paths.auctionItem(code, artworkId));
  const item = (await get(itemRef)).val() as AuctionItem | null;
  if (!item) return 'passed';

  if (item.highBidGroupId) {
    const price = item.currentPrice;
    const gid = item.highBidGroupId;
    const groupRef = ref(db, paths.group(code, gid));
    const unsub = await warmRef(groupRef);
    try {
      await runTransaction(groupRef, (g) => {
        if (!g) return g;
        g.remainingBudget = (g.remainingBudget ?? 0) - price;
        g.wonItems = g.wonItems || {};
        g.wonItems[artworkId] = price;
        return g;
      });
    } finally {
      unsub();
    }
    await update(itemRef, { status: 'sold', timerState: 'idle', timerEndsAt: null });
    return 'sold';
  }

  await update(itemRef, { status: 'passed', timerState: 'idle', timerEndsAt: null });
  return 'passed';
}

/** 유찰작 재경매 — 다시 대기 상태로. */
export async function reauction(code: string, artworkId: string): Promise<void> {
  await update(ref(db, paths.auctionItem(code, artworkId)), {
    status: 'pending',
    currentPrice: 0,
    highBidGroupId: null,
    timerState: 'idle',
    timerEndsAt: null,
  });
}
