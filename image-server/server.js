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
app.use(cors()); // 배포된 앱(다른 출처)에서 호출 허용

app.get('/health', (_req, res) => res.json({ ok: true, dir: UPLOAD_DIR }));

// 업로드 후 저장된 상대 경로를 돌려주는 공통 핸들러
function handleUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요합니다' });
  const app = req.params.app;
  const rel = app ? `/images/${app}/${req.file.filename}` : `/images/${req.file.filename}`;
  res.json({ path: rel });
}

app.post('/upload', upload.single('image'), handleUpload); // 앱 구분 없음(하위호환)
app.post('/upload/:app', upload.single('image'), handleUpload); // 앱별 폴더

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
  console.log(`    공개하려면: tailscale funnel --bg ${PORT}`);
});
