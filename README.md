# 미술 감상 경매 웹앱 (프로토타입)

초등 미술 감상·경매 수업용 실시간 웹앱. 교사가 코드로 세션을 열면 학생이 태블릿으로 입장해 작품을 감상(개인·수행평가)하고, 모둠 단위로 실시간 경매에 참여한다.

설계 기준 문서: [docs/현대미술경매_웹앱_PRD.md](docs/현대미술경매_웹앱_PRD.md) · 단계 검토표: [docs/검토_체크리스트.md](docs/검토_체크리스트.md)

## 기술 스택

- React + Vite + TypeScript, Tailwind CSS
- Firebase Realtime Database + 익명 인증 (저지연 입찰)
- Cloudflare Pages(호스팅) + Cloudflare Worker(이미지 업로드 중계)

## 세 화면 (라우트)

| 경로 | 화면 | 비고 |
|---|---|---|
| `/teacher` | 교사 콘솔 | 세션 생성·단계 전환·경매 진행 |
| `/play` | 학생 태블릿 | 입장·감상·입찰 |
| `/tv` | TV 송출 | 읽기 전용 관전 뷰 |

## 로컬 실행

```bash
npm install
cp .env.example .env      # 값 채우기 (아래 참고)
npm run dev               # http://localhost:5173
```

### 방법 A — Firebase 에뮬레이터 (클라우드 계정 불필요)

```bash
# .env 에서
VITE_USE_EMULATOR=true

# 터미널 1
npm run emulators         # RTDB:9000, Auth:9099, UI:4000

# 터미널 2
npm run dev
```

> 에뮬레이터에는 `firebase-tools`가 필요합니다. 전역 설치 없이 `npx firebase-tools emulators:start --project demo-artauction` 로도 실행 가능.

### 방법 B — 실제 Firebase 프로젝트

`.env`에 `VITE_USE_EMULATOR=false` 와 Firebase 웹 config 값을 채운다(아래 셋업).

## 환경 변수

`.env.example` 참고. Firebase 웹 config(`VITE_FIREBASE_*`)는 클라이언트에 노출돼도 되는 값이다.
Cloudflare API 키 등 **진짜 시크릿은 절대 `.env`/클라이언트에 두지 않고 Worker 시크릿으로만** 설정한다.

## 클라우드 셋업 (배포 시)

상세 절차: [docs/클라우드_셋업.md](docs/클라우드_셋업.md)

1. Firebase: 프로젝트 생성 → Realtime Database·익명 인증 활성화 → 웹 앱 등록 → config 복사
2. Cloudflare: 이미지 저장소(R2 또는 Images) + Worker 배포(업로드 중계) + Pages 배포

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 + 프로덕션 빌드 |
| `npm run typecheck` | 타입 검사만 |
| `npm run emulators` | Firebase 에뮬레이터 |

## 폴더 구조

```
src/
  routes/{teacher,play,tv}   # 세 뷰
  features/                  # 도메인 로직(단계별 구현)
  firebase/                  # app·paths·hooks
  models/                    # 데이터 타입(PRD §6)
  content/                   # 발문·프롤로그 기본값
  theme/                     # 디자인 토큰(단일 소스)
  components/                # 공용 UI
worker/                      # Cloudflare Worker (이미지 중계)
```
