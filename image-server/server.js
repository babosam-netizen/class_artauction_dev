// 작품 이미지 업로드 서버 (맥스튜디오/NAS에서 실행)
// - POST /upload  (multipart, 필드명 image) → { path: "/images/<파일>" }
// - GET  /images/<파일>                      → 이미지 제공
// - GET  /health                              → 상태 확인
//
// 실행:  UPLOAD_DIR=/Volumes/NAS/art-images PORT=8787 npm start
// 공개:  cloudflared tunnel --url http://localhost:8787   (무료 HTTPS 주소 발급)

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

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
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

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요합니다' });
  res.json({ path: `/images/${req.file.filename}` });
});

app.use('/images', express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true }));

app.listen(PORT, () => {
  console.log(`🖼  이미지 서버 실행: http://localhost:${PORT}`);
  console.log(`    저장 위치: ${UPLOAD_DIR}`);
  console.log(`    공개하려면: cloudflared tunnel --url http://localhost:${PORT}`);
});
