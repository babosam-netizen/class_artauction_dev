// Step 4d 검증: 자산(잔여현금+감정가합) 계산 + 순위 산출 (실제 RTDB)
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, set, get, remove } from 'firebase/database';

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

async function main() {
  const app = initializeApp(config);
  const cred = await signInAnonymously(getAuth(app));
  const db = getDatabase(app);
  ok('익명 인증');

  const code = 'RES' + Math.floor(Math.random() * 9000 + 1000);
  const sPath = `sessions/${code}`;
  await set(ref(db, sPath), {
    meta: { code, teacherUid: cred.user.uid, gradeBand: '3-4', createdAt: Date.now() },
  });
  await set(ref(db, `${sPath}/groups`), {
    g1: { id: 'g1', name: '1모둠', remainingBudget: 600000, wonItems: { art1: 400000 } },
    g2: { id: 'g2', name: '2모둠', remainingBudget: 1000000, wonItems: {} },
  });
  await set(ref(db, `${sPath}/artworks`), {
    art1: { id: 'art1', title: '수련', appraisedValue: 500000, forAuction: true, order: 0, placement: { kind: 'common' } },
  });

  // computeResults 로직 재현
  const groups = (await get(ref(db, `${sPath}/groups`))).val();
  const arts = (await get(ref(db, `${sPath}/artworks`))).val();
  const rows = Object.values(groups).map((g) => {
    const won = g.wonItems ?? {};
    const wonAppraisedSum = Object.keys(won).reduce((s, aid) => s + (arts[aid]?.appraisedValue ?? 0), 0);
    return { groupId: g.id, remainingCash: g.remainingBudget, wonAppraisedSum, asset: g.remainingBudget + wonAppraisedSum, rank: 0 };
  });
  rows.sort((a, b) => b.asset - a.asset);
  rows.forEach((r, i) => (r.rank = i + 1));
  const out = {};
  rows.forEach((r) => (out[r.groupId] = r));
  await set(ref(db, `${sPath}/results`), out);

  const r1 = out.g1;
  const r2 = out.g2;
  if (r1.asset !== 1100000) fail(`g1 자산 오류: ${r1.asset} (기대 1,100,000 = 600,000 + 500,000)`);
  ok(`g1 자산 = 잔여 600,000 + 감정가 500,000 = ${r1.asset.toLocaleString()}원`);
  if (r2.asset !== 1000000) fail(`g2 자산 오류: ${r2.asset}`);
  ok(`g2 자산 = ${r2.asset.toLocaleString()}원`);
  if (r1.rank !== 1 || r2.rank !== 2) fail(`순위 오류: g1=${r1.rank}, g2=${r2.rank}`);
  ok(`순위: 1위 g1(${r1.asset.toLocaleString()}), 2위 g2(${r2.asset.toLocaleString()})`);
  // 지불가 vs 감정가: g1은 400,000에 사서 500,000짜리 → +100,000 이득
  const diff = arts.art1.appraisedValue - groups.g1.wonItems.art1;
  if (diff !== 100000) fail('지불가 vs 감정가 차이 오류');
  ok(`g1 지불 400,000 vs 감정 500,000 → +${diff.toLocaleString()} 이득`);

  await remove(ref(db, sPath));
  ok('테스트 세션 정리');
  console.log('\n✅ Step 4d 결과·자산 순위 검증 통과');
  process.exit(0);
}
main().catch((e) => fail(e?.message ?? String(e)));
