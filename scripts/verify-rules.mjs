// 보안 규칙 음성 테스트: 비소유자(학생)가 교사 전용 노드를 못 쓰는지 확인 (실제 RTDB)
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, set, update, remove } from 'firebase/database';

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
const denied = async (p, label) => {
  try { await p; fail(`${label} — 차단돼야 하는데 허용됨!`); }
  catch (e) {
    if (String(e).includes('PERMISSION_DENIED') || String(e).includes('permission_denied'))
      ok(`${label} — 거부됨 (PERMISSION_DENIED)`);
    else fail(`${label} — 예상과 다른 에러: ${e.message}`);
  }
};
const allowed = async (p, label) => {
  try { await p; ok(`${label} — 허용됨`); }
  catch (e) { fail(`${label} — 허용돼야 하는데 거부됨: ${e.message}`); }
};

async function main() {
  // 교사(소유자)
  const teacherApp = initializeApp(config, 'teacher');
  const tCred = await signInAnonymously(getAuth(teacherApp));
  const tdb = getDatabase(teacherApp);
  // 학생(다른 uid)
  const studentApp = initializeApp(config, 'student');
  const sCred = await signInAnonymously(getAuth(studentApp));
  const sdb = getDatabase(studentApp);
  if (tCred.user.uid === sCred.user.uid) fail('두 uid가 같음(테스트 불가)');
  ok(`교사 uid ${tCred.user.uid.slice(0, 6)}… / 학생 uid ${sCred.user.uid.slice(0, 6)}…`);

  const code = 'RULE' + Math.floor(Math.random() * 9000 + 1000);
  const sPath = `sessions/${code}`;

  // 교사가 세션 생성(소유자 등록)
  await set(ref(tdb, sPath), {
    meta: { code, teacherUid: tCred.user.uid, gradeBand: '3-4', createdAt: Date.now() },
    state: { phase: 'lobby' },
  });
  ok('교사가 세션 생성(소유자=teacherUid)');

  // 학생이 교사 전용 노드에 쓰기 시도 → 거부돼야 함
  await denied(update(ref(sdb, `${sPath}/state`), { phase: 'auction' }), '학생→state.phase 변경');
  await denied(set(ref(sdb, `${sPath}/artworks/x`), { id: 'x', title: 'hack' }), '학생→artworks 추가');
  await denied(set(ref(sdb, `${sPath}/results/g1`), { asset: 999 }), '학생→results 조작');
  await denied(set(ref(sdb, `${sPath}/meta/teacherUid`), sCred.user.uid), '학생→teacherUid 탈취');

  // 학생이 자기 상호작용 노드에 쓰기 → 허용돼야 함
  await allowed(
    set(ref(sdb, `${sPath}/students/9`), {
      number: '9', name: '학생', groupId: 'g1', isRep: false,
      uid: sCred.user.uid, joinedAt: Date.now(), lastSeenAt: Date.now(),
    }),
    '학생→students/9 입장',
  );
  await allowed(
    set(ref(sdb, `${sPath}/appreciations/9/art1`), {
      studentNumber: '9', artworkId: 'art1', answers: ['좋아요'], submittedAt: Date.now(), updatedAt: Date.now(),
    }),
    '학생→감상 저장',
  );

  // 정리(교사만 가능)
  await remove(ref(tdb, sPath));
  ok('교사가 세션 정리');
  console.log('\n✅ 보안 규칙 음성 테스트 통과 (교사 전용 노드 보호 확인)');
  process.exit(0);
}
main().catch((e) => fail(e?.message ?? String(e)));
