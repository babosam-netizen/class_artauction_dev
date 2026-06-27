# 이미지 서버 — Docker 상시 운영 (맥 스튜디오 + DAS + 명명된 터널)

목표: **재시작해도 자동 기동 + 주소 고정 + 파일은 DAS에 영구 보관.** Synology Web Station을 대체.

## 1. Cloudflare 명명된 터널 만들기 (1회, 도메인 필요)

1. Cloudflare 대시보드 → **Zero Trust → Networks → Tunnels → Create a tunnel**
2. 커넥터: **Cloudflared** 선택 → 터널 이름(예: `mac-images`) → 생성
3. 화면의 **토큰**(`eyJ...`) 복사 → 아래 `.env`의 `TUNNEL_TOKEN`에 넣기
4. **Public Hostname 추가**: 예) `images.example.com`
   - Service: `HTTP` → `image-server:8787` (도커 네트워크 내부 이름)
5. 저장하면 `https://images.example.com` 이 고정 주소가 됩니다 (재시작해도 불변).

## 2. .env 작성 (image-server/.env)

```
DAS_IMAGES_PATH=/Volumes/DAS/art-images   # DAS의 이미지 보관 폴더
TUNNEL_TOKEN=eyJ...                        # 위에서 복사한 토큰
```

## 3. 기동

```bash
cd image-server
docker compose up -d --build
```
- `restart: unless-stopped` 라서 **맥 부팅 후 OrbStack/Docker가 뜨면 컨테이너도 자동 기동**됩니다. 수동 실행 끝.
- 확인: `https://images.example.com/health` → `{"ok":true}`

## 4. 앱 연결

교사 화면 "이미지 서버 주소"에 `https://images.example.com` 한 번만 입력(고정이라 다시 안 바꿔도 됨).

## 맥을 "서버"로 쓰기 위한 권장 설정

- 시스템 설정 → **에너지: 전원 연결 시 잠자기 안 함**, "정전 후 자동 시작" 켜기.
- OrbStack/Docker Desktop **로그인 시 자동 실행** 켜기. (헤드리스로 두려면 자동 로그인 + 위 자동 시작.)
- DAS는 APFS로 마운트, `DAS_IMAGES_PATH`가 항상 마운트되는 경로인지 확인.

## 역할 분담 (전체 인프라)

| 구성 | 어디서 | 서버 관리 |
|---|---|---|
| 수업 앱(정적) | Cloudflare Pages | 없음(자동) |
| 실시간 DB | Firebase | 없음(관리형) |
| **이미지 업로드/보관** | **맥 Docker + DAS + 명명된 터널** | 자동 기동 |
