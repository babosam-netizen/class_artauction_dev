// Step 3 수직 슬라이스 라이브 검증 (실제 Firebase RTDB 대상, 브라우저 불필요)
//
// 사용법:
//   1) .env 에 VITE_FIREBASE_* 값 채우기 (VITE_USE_EMULATOR 무관)
//   2) node scripts/verify-slice.mjs
//
// 검증 흐름:
//   교사 클라이언트가 세션 생성 → 학생 클라이언트가 구독+입장 →
//   교사가 단계 전환 → 학생 구독이 새 단계를 실시간 수신하는지 확인 → 정리

import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue,
  remove,
} from 'firebase/database';

// --- .env 로더 (의존성 없이) ---
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* .env 없음 */
  }
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

if (!config.databaseURL || !config.apiKey) {
  console.error('❌ .env 에 VITE_FIREBASE_* 값이 없습니다. 셋업 후 다시 실행하세요.');
  process.exit(2);
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () =>
  Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (msg) => {
  console.error('❌', msg);
  process.exit(1);
};
const ok = (msg) => console.log('  ✓', msg);

async function main() {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getDatabase(app);

  const cred = await signInAnonymously(auth);
  ok(`익명 인증 성공 (uid ${cred.user.uid.slice(0, 8)}…)`);

  const code = genCode();
  const sPath = `sessions/${code}`;

  // 1) 교사: 세션 생성
  await set(ref(db, sPath), {
    meta: { code, teacherUid: cred.user.uid, gradeBand: '3-4', startingFunds: 1000000, createdAt: Date.now() },
    state: { phase: 'lobby' },
    content: { prologue: ['a', 'b', 'c'], prompts: ['q1', 'q2', 'q3'] },
  });
  ok(`세션 생성 → 코드 ${code}, state.phase=lobby`);

  // 2) 학생: 구독 시작 + 입장
  let lastPhase = null;
  const received = [];
  const unsub = onValue(ref(db, `${sPath}/state`), (snap) => {
    const v = snap.val();
    if (v) {
      lastPhase = v.phase;
      received.push(v.phase);
    }
  });
  await wait(500);
  if (lastPhase !== 'lobby') fail(`학생 구독 초기값이 lobby가 아님 (받은 값: ${lastPhase})`);
  ok('학생 구독이 초기 단계(lobby) 수신');

  await set(ref(db, `${sPath}/students/7`), {
    number: '7', name: '테스트', groupId: '', isRep: false, uid: cred.user.uid,
    joinedAt: Date.now(), lastSeenAt: Date.now(),
  });
  // 재입장 idempotent 확인
  await update(ref(db, `${sPath}/students/7`), { name: '테스트2', lastSeenAt: Date.now() });
  const stu = (await get(ref(db, `${sPath}/students/7`))).val();
  if (!stu || stu.number !== '7' || stu.name !== '테스트2') fail('학생 입장/재입장 idempotent 실패');
  ok('학생 입장 + 동일 번호 재입장 idempotent');

  // 3) 교사: 단계 전환 → 학생 실시간 수신 확인
  for (const phase of ['prologue', 'gallery']) {
    await update(ref(db, `${sPath}/state`), { phase });
    await wait(400);
    if (lastPhase !== phase) fail(`단계 전환 ${phase} 가 구독에 반영되지 않음 (현재 ${lastPhase})`);
    ok(`교사 단계 전환 → 학생 구독 실시간 수신: ${phase}`);
  }

  // 정리
  unsub();
  await remove(ref(db, sPath));
  ok('테스트 세션 정리 완료');

  console.log(`\n✅ Step 3 수직 슬라이스 통과 (수신 시퀀스: ${received.join(' → ')})`);
  process.exit(0);
}

main().catch((e) => fail(e?.message ?? String(e)));
