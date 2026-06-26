# 이미지 업로드 서버 (맥스튜디오 / NAS)

작품 이미지를 맥스튜디오(또는 NAS)에 저장하고, Cloudflare Tunnel로 **무료 HTTPS** 공개해서
배포된 앱(`art-auction.pages.dev`)에서 어디서나 업로드·표시할 수 있게 한다.

## 1. 설치 (맥스튜디오에서 1회)

```bash
cd image-server
npm install

# cloudflared 설치 (터널용)
brew install cloudflared
```

## 2. 실행 (수업 때마다)

터미널 ① — 이미지 서버:
```bash
cd image-server
# NAS에 저장하려면 UPLOAD_DIR을 NAS 마운트 경로로
UPLOAD_DIR=/Volumes/NAS/art-images npm start
# (생략하면 image-server/uploads 폴더에 저장)
```

터미널 ② — 터널 공개:
```bash
cloudflared tunnel --url http://localhost:8787
```
→ `https://<무작위>.trycloudflare.com` 주소가 출력됩니다. **이 주소를 복사.**

## 3. 앱에서 연결

1. `art-auction.pages.dev/teacher` → 세션 생성
2. "작품 관리"의 **이미지 서버 주소** 칸에 위 `https://...trycloudflare.com` 붙여넣기 (한 번)
3. **이미지 업로드** 버튼으로 파일 선택 → 자동 업로드 → 작품 이미지로 설정됨

## 참고 / 주의

- **빠른 터널 주소는 실행할 때마다 바뀝니다.** 한 수업 동안은 그대로 쓰면 되지만, 서버/터널을 재시작하면
  새 주소가 생기고 **이전에 업로드한 이미지 URL은 깨집니다.**
- 영구적으로 쓰려면: Cloudflare에 도메인을 연결해 **명명된 터널(named tunnel)**로 고정 주소를 만들면 됩니다
  (도메인 필요). 그때 `UPLOAD_DIR`을 NAS 폴더로 두면 자료가 NAS에 영구 보관됩니다.
- 맥스튜디오는 수업 동안 켜져 있어야 합니다(절전 해제 권장).
- 업로드는 20MB·이미지 파일만 허용. CORS는 모든 출처 허용(프로토타입).
