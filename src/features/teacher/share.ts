import QRCode from 'qrcode';

/** TV 송출 화면을 새 창으로 연다. */
export function openTv(code: string): void {
  const url = `${window.location.origin}/tv?code=${encodeURIComponent(code)}`;
  window.open(url, `tv_${code}`, 'width=1280,height=800');
}

/** 학생 입장 주소 QR을 새 창에 띄운다(코드 자동 입력 링크). */
export async function openStudentQr(code: string): Promise<void> {
  const url = `${window.location.origin}/play?code=${encodeURIComponent(code)}`;
  const dataUrl = await QRCode.toDataURL(url, {
    width: 440,
    margin: 2,
    color: { dark: '#130e08', light: '#ffffff' },
  });
  const w = window.open('', `qr_${code}`, 'width=520,height=640');
  if (!w) {
    alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.');
    return;
  }
  w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>학생 입장 QR · ${code}</title>
<style>
  html,body{margin:0;height:100%;font-family:'Noto Sans KR',-apple-system,sans-serif;
    background:radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%);color:#ead9b8}
  .wrap{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:28px;box-sizing:border-box;text-align:center}
  .title{font-size:20px;letter-spacing:1px}
  .qr{background:#fff;padding:16px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  .code{font-size:40px;font-weight:700;letter-spacing:.2em;color:#c4975a}
  .url{font-size:13px;color:rgba(232,217,184,.7);word-break:break-all;max-width:440px}
  .hint{font-size:12px;color:rgba(232,217,184,.5)}
</style></head><body><div class="wrap">
  <div class="title">📱 학생 입장</div>
  <div class="qr"><img src="${dataUrl}" width="440" height="440" alt="입장 QR"></div>
  <div class="code">${code}</div>
  <div class="url">${url}</div>
  <div class="hint">휴대폰·태블릿 카메라로 QR을 찍으면 코드가 자동 입력돼요</div>
</div></body></html>`);
  w.document.close();
}
