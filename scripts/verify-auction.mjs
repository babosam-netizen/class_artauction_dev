// Step 4c 검증: RTDB 트랜잭션 동시 입찰 원자성 + 마감(낙찰/예산차감) (실제 RTDB)
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, set, get, update, onValue, runTransaction, remove } from 'firebase/database';

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return { ...env, ...process.env };
}
const env = loadEnv();
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
const fail = (m) => { console.error('❌', m); process.exit(1); };
const ok = (m) => console.log('  ✓', m);
const MIN = 1000;

// 트랜잭션 전 노드에 활성 리스너를 붙여 첫 값 동기화
function warmRef(r) {
  return new Promise((resolve) => {
    const unsub = onValue(r, () => resolve(unsub));
  });
}

// placeBid 의 트랜잭션 로직과 동일 (floor = currentPrice>0 ? currentPrice+min : min)
function bidTxn(itemRef, amount, groupId) {
  return runTransaction(itemRef, (item) => {
    if (!item || item.status !== 'live') return;
    const floor = item.currentPrice > 0 ? item.currentPrice + MIN : MIN;
    if (amount < floor) return;
    item.currentPrice = amount;
    item.highBidGroupId = groupId;
    return item;
  });
}
function incBidTxn(itemRef, groupId) {
  return runTransaction(itemRef, (item) => {
    if (!item || item.status !== 'live') return;
    const next = item.currentPrice > 0 ? item.currentPrice + MIN : MIN;
    item.currentPrice = next;
    item.highBidGroupId = groupId;
    return item;
  });
}

async function main() {
  const app = initializeApp(config);
  const cred = await signInAnonymously(getAuth(app));
  const db = getDatabase(app);
  ok('익명 인증');

  const code = 'TEST' + Math.floor(Math.random() * 9000 + 1000);
  const sPath = `sessions/${code}`;
  await set(ref(db, sPath), {
    meta: { code, teacherUid: cred.user.uid, gradeBand: '3-4', createdAt: Date.now() },
  });
  const itemRef = ref(db, `${sPath}/auction/items/art1`);
  await set(ref(db, `${sPath}/groups/g1`), { id: 'g1', name: '1모둠', remainingBudget: 1000000, wonItems: {} });
  await set(ref(db, `${sPath}/groups/g2`), { id: 'g2', name: '2모둠', remainingBudget: 1000000, wonItems: {} });
  await set(itemRef, { artworkId: 'art1', status: 'live', currentPrice: 0, timerState: 'idle', order: 0 });
  const unsub = await warmRef(itemRef); // 활성 리스너 유지

  // 1) 동시 증분 입찰 12건 → 손실 없는 원자적 증가
  const N = 12;
  await Promise.all(Array.from({ length: N }, (_, i) => incBidTxn(itemRef, i % 2 ? 'g1' : 'g2')));
  const after = (await get(itemRef)).val();
  if (after.currentPrice !== N * MIN) fail(`동시 입찰 손실 발생: 기대 ${N * MIN}, 실제 ${after.currentPrice}`);
  ok(`동시 입찰 ${N}건 원자적 처리 → currentPrice=${after.currentPrice} (손실 0)`);

  // 2) 동일 금액 동시 입찰 → 한쪽만 성공
  await set(itemRef, { artworkId: 'art1', status: 'live', currentPrice: 0, timerState: 'idle', order: 0 });
  const target = MIN; // floor=MIN
  const results = await Promise.all([
    bidTxn(itemRef, target, 'g1'),
    bidTxn(itemRef, target, 'g2'),
  ]);
  const committed = results.filter((r) => r.committed).length;
  if (committed !== 1) fail(`동일 금액 동시 입찰: 정확히 1건 성공해야 함 (실제 ${committed})`);
  ok(`동일 금액 동시 입찰 → 정확히 1모둠만 최고가 (committed=${committed})`);

  // 3) too-low 거부
  const low = await bidTxn(itemRef, MIN, 'g2'); // floor 이미 MIN+? 현재가 MIN → floor=2*MIN
  if (low.committed) fail('현재가 이하 입찰이 거부되지 않음');
  ok('최소 호가 단위 미만(현재가 이하) 입찰 거부');

  // 4) 마감 → 낙찰 + 예산 차감 + wonItem 기록
  const cur = (await get(itemRef)).val();
  const price = cur.currentPrice;
  const gid = cur.highBidGroupId;
  await runTransaction(ref(db, `${sPath}/groups/${gid}`), (g) => {
    if (!g) return g;
    g.remainingBudget -= price;
    g.wonItems = g.wonItems || {};
    g.wonItems.art1 = price;
    return g;
  });
  await update(itemRef, { status: 'sold' });
  const grp = (await get(ref(db, `${sPath}/groups/${gid}`))).val();
  if (grp.remainingBudget !== 1000000 - price) fail('낙찰 후 예산 차감 오류');
  if (grp.wonItems.art1 !== price) fail('낙찰작 기록 오류');
  ok(`마감 → ${gid} 낙찰 ${price}원, 잔여예산 ${grp.remainingBudget}원`);

  unsub();
  await remove(ref(db, sPath));
  ok('테스트 세션 정리');
  console.log('\n✅ Step 4c 경매 트랜잭션 검증 통과');
  process.exit(0);
}
main().catch((e) => fail(e?.message ?? String(e)));
