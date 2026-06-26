// Step 4a 검증: 작품 추가 → 감상 저장/수정(작성시점 보존) → 해설 데이터 확인 (실제 RTDB)
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, set, push, get, remove } from 'firebase/database';

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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (m) => {
  console.error('❌', m);
  process.exit(1);
};
const ok = (m) => console.log('  ✓', m);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () =>
  Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

async function main() {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getDatabase(app);
  await signInAnonymously(auth);
  ok('익명 인증');

  const code = genCode();
  const sPath = `sessions/${code}`;
  await set(ref(db, `${sPath}/meta`), { code, gradeBand: '3-4', createdAt: Date.now() });
  await set(ref(db, `${sPath}/state`), { phase: 'gallery' });

  // 작품 추가 (공통회랑)
  const artRef = push(ref(db, `${sPath}/artworks`));
  const artId = artRef.key;
  await set(artRef, {
    id: artId,
    imageUrl: 'https://example.com/a.jpg',
    title: '수련',
    source: '오르세 미술관',
    appraisedValue: 8000000,
    commentary: '모네의 대표작으로, 빛과 물의 반사를 표현했습니다.',
    placement: { kind: 'common' },
    forAuction: true,
    order: 0,
  });
  ok(`작품 추가 (id ${artId.slice(0, 6)}…, 공통회랑)`);

  // 감상 저장
  const apPath = `${sPath}/appreciations/7/${artId}`;
  await set(ref(db, apPath), {
    studentNumber: '7',
    artworkId: artId,
    answers: ['빛이 예뻐요', '연못이 좋아요', '제목은 빛의 정원'],
    submittedAt: Date.now(),
    updatedAt: Date.now(),
  });
  const first = (await get(ref(db, apPath))).val();
  if (!first || first.answers.length !== 3) fail('감상 저장 실패');
  ok(`감상 저장 (답변 ${first.answers.length}개)`);
  const firstSubmitted = first.submittedAt;

  // 감상 수정 — submittedAt 보존, updatedAt 갱신
  await wait(50);
  await set(ref(db, apPath), {
    ...first,
    answers: ['빛이 정말 예뻐요(수정)', first.answers[1], first.answers[2]],
    updatedAt: Date.now(),
  });
  const second = (await get(ref(db, apPath))).val();
  if (second.submittedAt !== firstSubmitted) fail('수정 시 작성시점(submittedAt) 보존 실패');
  if (second.updatedAt <= firstSubmitted) fail('수정 시각(updatedAt) 갱신 실패');
  if (!second.answers[0].includes('수정')) fail('감상 수정 반영 실패');
  ok('감상 수정: submittedAt 보존 + updatedAt 갱신');

  // 해설 데이터 확인
  const art = (await get(ref(db, `${sPath}/artworks/${artId}`))).val();
  if (!art.commentary || art.commentary.length < 5) fail('작품 해설 누락');
  ok('작품 해설 데이터 존재(감상 직후 표시용)');

  await remove(ref(db, sPath));
  ok('테스트 세션 정리');
  console.log('\n✅ Step 4a 감상+해설 검증 통과');
  process.exit(0);
}

main().catch((e) => fail(e?.message ?? String(e)));
