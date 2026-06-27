// Step 4c(개정) 검증: 참여/기권 + 낙찰(예산 차감) 흐름 (실제 RTDB)
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
const warm = (r) => new Promise((res) => { const u = onValue(r, () => res(() => u())); });

async function main() {
  const app = initializeApp(config);
  const cred = await signInAnonymously(getAuth(app));
  const db = getDatabase(app);
  ok('익명 인증');

  const code = 'PART' + Math.floor(Math.random() * 9000 + 1000);
  const sPath = `sessions/${code}`;
  await set(ref(db, sPath), { meta: { code, teacherUid: cred.user.uid, gradeBand: '3-4', createdAt: Date.now() } });
  await set(ref(db, `${sPath}/groups/g1`), { id: 'g1', name: '1모둠', remainingBudget: 1000000, wonItems: {} });
  await set(ref(db, `${sPath}/groups/g2`), { id: 'g2', name: '2모둠', remainingBudget: 1000000, wonItems: {} });
  const itemRef = ref(db, `${sPath}/auction/items/art1`);
  await set(itemRef, { artworkId: 'art1', status: 'live', askingPrice: 300000, order: 0 });

  // 참여
  await set(ref(db, `${sPath}/auction/items/art1/participants/g1`), true);
  await set(ref(db, `${sPath}/auction/items/art1/participants/g2`), true);
  let item = (await get(itemRef)).val();
  const inCount = Object.values(item.participants || {}).filter(Boolean).length;
  if (inCount !== 2) fail(`참여 2팀이어야 함 (실제 ${inCount})`);
  ok('두 모둠 참여(✋) 기록');

  // g2 기권
  await set(ref(db, `${sPath}/auction/items/art1/participants/g2`), null);
  item = (await get(itemRef)).val();
  const inIds = Object.keys(item.participants || {}).filter((g) => item.participants[g]);
  if (inIds.length !== 1 || inIds[0] !== 'g1') fail(`기권 후 1팀(g1) 남아야 함 (실제 ${inIds.join(',')})`);
  ok('2모둠 기권 → 1모둠만 남음');

  // 낙찰: g1 예산 차감 + wonItem + 상태
  const price = item.askingPrice;
  const gRef = ref(db, `${sPath}/groups/g1`);
  const unsub = await warm(gRef);
  await runTransaction(gRef, (g) => { if (!g) return g; g.remainingBudget -= price; g.wonItems = g.wonItems || {}; g.wonItems.art1 = price; return g; });
  unsub();
  await update(itemRef, { status: 'sold', winnerGroupId: 'g1', askingPrice: price });
  const g1 = (await get(gRef)).val();
  const it = (await get(itemRef)).val();
  if (g1.remainingBudget !== 1000000 - price) fail('낙찰 후 예산 차감 오류');
  if (g1.wonItems.art1 !== price) fail('낙찰작 기록 오류');
  if (it.status !== 'sold' || it.winnerGroupId !== 'g1') fail('아이템 낙찰 상태 오류');
  ok(`낙찰 → 1모둠 ${price.toLocaleString()}원, 잔여 ${g1.remainingBudget.toLocaleString()}원`);

  await remove(ref(db, sPath));
  ok('테스트 세션 정리');
  console.log('\n✅ 참여/기권 + 낙찰 검증 통과');
  process.exit(0);
}
main().catch((e) => fail(e?.message ?? String(e)));
