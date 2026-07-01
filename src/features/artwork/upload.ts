// 이 앱의 이미지가 저장될 서버 하위 폴더 이름. 다른 앱과 파일이 섞이지 않게 구분한다.
const APP_FOLDER = 'artauction';

/** 이미지 서버(맥스튜디오/터널)에 파일 업로드 → 표시용 절대 URL 반환. artauction 폴더에 저장됨. */
export async function uploadImage(serverBase: string, file: File): Promise<string> {
  const base = serverBase.replace(/\/+$/, '');
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`${base}/upload/${APP_FOLDER}`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`업로드 실패 (${res.status})`);
  const data = (await res.json()) as { path: string };
  return `${base}${data.path}`;
}

// 기본 이미지 서버 (맥 스튜디오 Tailscale Funnel 고정 주소). 교사는 수정 가능.
export const DEFAULT_IMAGE_SERVER = 'https://soris-mac-studio.tail392e94.ts.net';

const KEY = 'imageServerUrl';
export const loadImageServerUrl = (): string => localStorage.getItem(KEY) || DEFAULT_IMAGE_SERVER;
export const saveImageServerUrl = (url: string): void => localStorage.setItem(KEY, url.trim());
