// 작품 이미지 업로드 서버 (맥스튜디오/NAS에서 실행)
// - POST /upload           (multipart, 필드명 image) → { path: "/images/<파일>" }              (앱 구분 없음, 하위호환)
// - POST /upload/<앱이름>   (multipart, 필드명 image) → { path: "/images/<앱이름>/<파일>" }      (앱별 폴더에 저장)
// - GET  /images/<...경로>                           → 이미지 제공 (하위 폴더 포함)
// - GET  /health                                     → 상태 확인
//
// 앱이름 규칙: 소문자·숫자·하이픈 1~32자 (예: artauction, minguk-dream). 그 외 문자는 거부.
//
// 실행:  UPLOAD_DIR=/data PORT=8787 npm start
// 공개:  tailscale funnel --bg 8787   (또는 cloudflared tunnel --url http://localhost:8787)

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT) || 8787;
// 업로드 저장 위치 — NAS 마운트 경로로 바꾸면 NAS에 저장됨
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 앱 이름(폴더명) 검증: 경로 탈출(../) 방지 + 예측 가능한 폴더명만 허용
const APP_NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;

// ── 업로드 보안 ────────────────────────────────────────────────────────────
// 1) 허용 출처(Origin): 이 도메인의 브라우저에서 온 업로드만 받는다.
//    새 앱을 붙이면 그 앱 도메인을 ALLOWED_ORIGINS(콤마 구분)에 추가한다.
//    와일드카드 한 단계 지원: https://*.pages.dev
const DEFAULT_ORIGINS = [
  'https://art-auction.pages.dev',
  'https://*.art-auction.pages.dev', // Cloudflare Pages 미리보기 배포
  'https://babosam.net',
  'https://*.babosam.net', // 내 커스텀 도메인 하위 앱 전체
  'http://localhost:5173',
  'http://localhost:4173',
];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

function originAllowed(origin) {
  if (!origin) return false; // 브라우저가 아닌 요청(curl 등)은 Origin이 없음 → 거부
  return ALLOWED_ORIGINS.some((rule) => {
    if (rule === origin) return true;
    if (rule.includes('*')) {
      const re = new RegExp(
        '^' + rule.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^.]+') + '$',
      );
      return re.test(origin);
    }
    return false;
  });
}

function requireAllowedOrigin(req, res, next) {
  if (originAllowed(req.headers.origin)) return next();
  console.warn(`⛔ 업로드 거부(출처): ${req.headers.origin || '(Origin 없음)'} ip=${req.ip}`);
  return res.status(403).json({ error: '허용되지 않은 출처에서의 업로드입니다' });
}

// 2) IP당 요청 제한(슬라이딩 윈도우, 메모리). 도배·디스크 채우기 방지.
const RL_WINDOW_MS = Number(process.env.RL_WINDOW_MS) || 10 * 60 * 1000; // 10분
const RL_MAX = Number(process.env.RL_MAX) || 100; // 창당 업로드 최대 횟수
const rlHits = new Map(); // ip -> timestamp[]

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || 'unknown';
  const recent = (rlHits.get(ip) || []).filter((t) => now - t < RL_WINDOW_MS);
  if (recent.length >= RL_MAX) {
    console.warn(`⛔ 업로드 거부(횟수초과): ip=${ip}`);
    return res.status(429).json({ error: '너무 많이 올렸어요. 잠시 후 다시 시도해 주세요.' });
  }
  recent.push(now);
  rlHits.set(ip, recent);
  next();
}

// 오래된 IP 기록 주기적 정리(메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of rlHits) {
    const keep = arr.filter((t) => now - t < RL_WINDOW_MS);
    if (keep.length) rlHits.set(ip, keep);
    else rlHits.delete(ip);
  }
}, RL_WINDOW_MS).unref();

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const app = req.params.app;
    if (app !== undefined && !APP_NAME.test(app)) {
      return cb(new Error('BAD_APP_NAME'), '');
    }
    const dir = app ? path.join(UPLOAD_DIR, app) : UPLOAD_DIR;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

const app = express();
app.set('trust proxy', true); // 터널/프록시 뒤의 실제 클라이언트 IP 파악(X-Forwarded-For)
app.use(cors()); // 이미지 조회 등은 어디서나. 업로드는 requireAllowedOrigin으로 별도 제한

app.get('/health', (_req, res) => res.json({ ok: true, dir: UPLOAD_DIR }));

// 업로드 후 저장된 상대 경로를 돌려주는 공통 핸들러
function handleUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요합니다' });
  const app = req.params.app;
  const rel = app ? `/images/${app}/${req.file.filename}` : `/images/${req.file.filename}`;
  res.json({ path: rel });
}

// 업로드: 허용 출처 확인 → 횟수 제한 → 파일 수신 순서 (거부는 파일 받기 전에)
app.post('/upload', requireAllowedOrigin, rateLimit, upload.single('image'), handleUpload); // 하위호환
app.post('/upload/:app', requireAllowedOrigin, rateLimit, upload.single('image'), handleUpload); // 앱별 폴더

// 잘못된 앱 이름·업로드 오류 처리
app.use((err, _req, res, _next) => {
  if (err && err.message === 'BAD_APP_NAME') {
    return res.status(400).json({ error: '앱 이름은 소문자·숫자·하이픈 1~32자만 됩니다' });
  }
  res.status(500).json({ error: '업로드 실패' });
});

app.use('/images', express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true }));

// 하위호환 폴백: 예전에 루트(/images/<파일>)로 저장돼 URL이 그렇게 박혀 있는 파일을
// artauction/ 폴더로 옮긴 뒤에도 계속 제공한다. 루트에서 못 찾으면 artauction/에서 찾음.
app.get('/images/:file', (req, res, next) => {
  const safe = path.basename(req.params.file); // 경로 탈출 방지
  if (safe !== req.params.file) return next();
  res.sendFile(path.join(UPLOAD_DIR, 'artauction', safe), { maxAge: '7d', immutable: true }, (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`🖼  이미지 서버 실행: http://localhost:${PORT}`);
  console.log(`    저장 위치: ${UPLOAD_DIR}`);
  console.log(`    앱별 폴더: POST /upload/<앱이름>  (예: /upload/artauction)`);
  console.log(`    업로드 허용 출처: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`    요청 제한: IP당 ${RL_MAX}회 / ${Math.round(RL_WINDOW_MS / 60000)}분`);
  console.log(`    공개하려면: tailscale funnel --bg ${PORT}`);
});
