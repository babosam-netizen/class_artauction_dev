# 미술 감상 경매 웹앱

초등 미술 감상·경매 수업용 실시간 웹앱. 교사가 반 이름을 입력해 세션을 열면 학생이 태블릿으로 입장해 작품을 감상(개인·수행평가)하고, 모둠 단위로 실시간 경매에 참여한다.

**버전:** v0.2.0 · **배포(라이브):** https://art-auction.pages.dev

설계 기준 문서: [docs/현대미술경매_웹앱_PRD.md](docs/현대미술경매_웹앱_PRD.md) · 변경 이력: [CHANGELOG.md](CHANGELOG.md) · 단계 검토표: [docs/검토_체크리스트.md](docs/검토_체크리스트.md)

---

## 라우트

| 경로 | 화면 | 비고 |
|---|---|---|
| `/teacher` | 교사 콘솔 | 세션 생성·단계 전환·경매 진행·작품 관리 |
| `/play` | 학생 태블릿 | 입장·감상·입찰 |
| `/tv` | TV 송출 | 읽기 전용 관전 뷰 |
| `/admin` | 슈퍼어드민 | 전체 세션 모니터링 (별도 암호) |
| `/demo` | 데모 | 교사·학생 화면 미리보기 |

---

## 주요 기능 (v0.2.0)

### 교사 콘솔 (`/teacher`)
- **반 이름 + 교사 이름**으로 세션 생성 → 입장 코드 자동 발급
- **이 기기에서 들어갔던 반 목록**: 반 이름·교사 이름 포함, 클릭 한 번으로 재입장
- 단계 전환(프롤로그→공통감상→선택감상→경매→결과), 현황판 실시간 확인
- 작품 업로드 (이미지 일괄 업로드 / URL 추가)
- **다른 반 작품 가져오기**: 공통감상/선택감상/경매대상 탭으로 분류된 전체 공유 작품 탐색 → 원하는 작품 체크 → 가져올 위치(공통감상실/선택감상실) 지정
- **작품 비공개** (`🔒 공유 안 함`): 체크 시 다른 반 가져오기에서 숨겨짐
- 감상 발문·프롤로그 편집, CSV 내보내기

### 슈퍼어드민 (`/admin`)
- 별도 암호로 보호 (교사 암호와 독립)
- 전체 세션 실시간 목록: 반 이름·교사 이름·단계·접속 학생 수·작품 수·감상 답안 수
- 코드/반 이름 검색, 교사 콘솔 바로 열기·TV·QR 링크

### 학생 (`/play`)
- 코드 + 번호 + 이름으로 입장 (계정 불필요)
- 공통작품감상실 → 선택작품감상실 → 경매장 → 결과

---

## 기술 스택

- React 18 + Vite + TypeScript, Tailwind CSS
- Firebase Realtime Database + 익명 인증 (저지연 입찰, 실시간 동기화)
- Cloudflare Pages(호스팅) + Cloudflare Worker(이미지 업로드 중계)

---

## 로컬 실행

```bash
npm install
cp .env.example .env      # 값 채우기 (아래 참고)
npm run dev               # http://localhost:5173
```

`.env` 값은 `.github/workflows/deploy.yml`의 `env:` 섹션에서 확인 가능 (Firebase 웹 config는 공개 값).

### 방법 A — Firebase 에뮬레이터 (클라우드 계정 불필요)

```bash
# .env 에서
VITE_USE_EMULATOR=true

# 터미널 1
npm run emulators         # RTDB:9000, Auth:9099, UI:4000

# 터미널 2
npm run dev
```

> 에뮬레이터에는 `firebase-tools`가 필요합니다. `npx firebase-tools emulators:start --project demo-artauction` 로도 실행 가능.

### 방법 B — 실제 Firebase 프로젝트

`.env`에 `VITE_USE_EMULATOR=false` 와 Firebase 웹 config 값을 채운다.

---

## 환경 변수

`.env.example` 참고. Firebase 웹 config(`VITE_FIREBASE_*`)는 클라이언트에 노출돼도 되는 값. **진짜 시크릿(Cloudflare API 키 등)은 절대 `.env`/클라이언트에 두지 않고 Worker 시크릿으로만** 설정한다.

---

## 배포

`main` 브랜치 push → GitHub Actions가 빌드 후 Cloudflare Pages 자동 배포.

RTDB 보안 규칙 변경 시 별도 배포 필요:
```bash
npx firebase-tools deploy --only database --project art-auction-8552
```

클라우드 셋업 상세: [docs/클라우드_셋업.md](docs/클라우드_셋업.md)

---

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 + 프로덕션 빌드 |
| `npm run typecheck` | 타입 검사만 |
| `npm run emulators` | Firebase 에뮬레이터 |

---

## 폴더 구조

```
src/
  routes/{teacher,play,tv,demo,admin}  # 화면별 뷰
  features/                            # 도메인 로직 (감상·경매·교사·어드민 등)
  firebase/                            # app·paths·hooks
  models/                              # 데이터 타입 (PRD §6)
  content/                             # 발문·프롤로그 기본값
  theme/                               # 디자인 토큰 (단일 소스)
  components/                          # 공용 UI
worker/                                # Cloudflare Worker (이미지 중계)
docs/                                  # 설계 문서·PRD·체크리스트
```
