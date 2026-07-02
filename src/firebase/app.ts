import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getDatabase(firebaseApp);

// 로컬 에뮬레이터 사용 시 (VITE_USE_EMULATOR=true)
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
}

// 앱 로드 시 익명 로그인 보장.
// RTDB 보안 규칙이 모든 읽기/쓰기에 auth != null 을 요구하므로,
// 어떤 화면이든 데이터에 접근하기 전에 인증이 끝나 있어야 한다.
export const authReady: Promise<void> = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // 이미 로그인돼 있으면(익명이든, 지속된 교사 계정이든) 그대로 사용.
      resolve();
    } else {
      // 로그인이 전혀 없을 때만 익명 로그인. (지속된 교사 계정을 덮어쓰지 않도록)
      signInAnonymously(auth).catch((e) => console.error('익명 로그인 실패', e));
    }
  });
});
