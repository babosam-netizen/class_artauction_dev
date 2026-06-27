import { ref, set, update, get, onValue, runTransaction, type DatabaseReference } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Artwork, AuctionItem } from '@/models';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 트랜잭션 전 노드에 일시 리스너를 붙여 첫 값을 동기화(널-first-pass abort 회피). */
function warmRef(r: DatabaseReference): Promise<() => void> {
  return new Promise((resolve) => {
    const unsub = onValue(r, () => resolve(() => unsub()));
  });
}

/** 경매 대상 작품을 랜덤 순서로 초기화. */
export async function initAuction(code: string, artworks: Artwork[]): Promise<void> {
  const forAuction = shuffle(artworks.filter((a) => a.forAuction));
  const items: Record<string, AuctionItem> = {};
  forAuction.forEach((a, i) => {
    items[a.id] = { artworkId: a.id, status: 'pending', askingPrice: 0, order: i };
  });
  await set(ref(db, paths.auctionItems(code)), items);
  await update(ref(db, paths.state(code)), { currentAuctionArtworkId: null });
}

/** 작품을 경매대에 올림. 시작 호가 지정, 참여 초기화. */
export async function presentArtwork(
  code: string,
  artworkId: string,
  startPrice: number,
): Promise<void> {
  await update(ref(db, paths.auctionItem(code, artworkId)), {
    status: 'live',
    askingPrice: startPrice,
    participants: null,
    winnerGroupId: null,
  });
  await update(ref(db, paths.state(code)), { currentAuctionArtworkId: artworkId });
}

/** 호가 올리기 (+증가폭). */
export async function raisePrice(code: string, artworkId: string, inc: number): Promise<void> {
  const r = ref(db, paths.auctionItem(code, artworkId));
  const cur = (await get(r)).val() as AuctionItem | null;
  if (!cur) return;
  await update(r, { askingPrice: (cur.askingPrice ?? 0) + inc });
}

/** 모둠 참여(사겠다) / 기권 토글. */
export async function setParticipation(
  code: string,
  artworkId: string,
  groupId: string,
  joining: boolean,
): Promise<void> {
  const r = ref(db, `${paths.auctionItem(code, artworkId)}/participants/${groupId}`);
  await set(r, joining ? true : null);
}

/** 낙찰 — 모둠 예산 차감 + 낙찰작 기록 + 도장. */
export async function award(
  code: string,
  artworkId: string,
  groupId: string,
  price: number,
): Promise<void> {
  const groupRef = ref(db, paths.group(code, groupId));
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
  await update(ref(db, paths.auctionItem(code, artworkId)), {
    status: 'sold',
    winnerGroupId: groupId,
    askingPrice: price,
  });
}

/** 유찰. */
export async function passItem(code: string, artworkId: string): Promise<void> {
  await update(ref(db, paths.auctionItem(code, artworkId)), { status: 'passed' });
}

/** 유찰작 재경매 — 다시 대기. */
export async function reauction(code: string, artworkId: string): Promise<void> {
  await update(ref(db, paths.auctionItem(code, artworkId)), {
    status: 'pending',
    askingPrice: 0,
    participants: null,
    winnerGroupId: null,
  });
}

/** 참여 중 모둠 id 목록. */
export function participantIds(item: AuctionItem | undefined): string[] {
  if (!item?.participants) return [];
  return Object.keys(item.participants).filter((g) => item.participants![g]);
}
