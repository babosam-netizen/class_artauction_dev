import { useEffect, useState } from 'react';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { saveContent } from '@/features/session/api';
import type { SessionContent } from '@/models';

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';

export function ContentEditor({ code }: { code: string }) {
  const content = useRtdbValue<SessionContent>(paths.content(code));
  const [prologue, setPrologue] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (content) {
      setPrologue(content.prologue ?? []);
      setPrompts(content.prompts ?? []);
    }
  }, [content]);

  async function handleSave() {
    await saveContent(code, { prologue, prompts });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const ta = 'w-full rounded border bg-transparent px-3 py-2 text-sm outline-none';
  const taStyle = { borderColor: BORDER, color: '#ead9b8' };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 rounded-full border px-5 py-2 text-sm"
        style={{ borderColor: BORDER, color: '#ead9b8' }}
      >
        프롤로그·발문 편집
      </button>
    );
  }

  return (
    <div
      className="mt-4 w-full rounded-lg border p-5 text-left"
      style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}
    >
      <div className="mb-2 text-sm font-medium" style={{ color: GOLD }}>
        프롤로그 (3단계)
      </div>
      <div className="flex flex-col gap-2">
        {prologue.map((line, i) => (
          <textarea
            key={i}
            value={line}
            onChange={(e) =>
              setPrologue((p) => p.map((l, j) => (j === i ? e.target.value : l)))
            }
            rows={2}
            className={`${ta} resize-none`}
            style={taStyle}
          />
        ))}
      </div>

      <div className="mb-2 mt-4 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: GOLD }}>
          감상 발문 ({prompts.length})
        </span>
        <button
          onClick={() => setPrompts((p) => [...p, ''])}
          className="text-xs"
          style={{ color: GOLD }}
        >
          ＋ 발문 추가
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {prompts.map((q, i) => (
          <div key={i} className="flex gap-2">
            <textarea
              value={q}
              onChange={(e) => setPrompts((p) => p.map((l, j) => (j === i ? e.target.value : l)))}
              rows={2}
              className={`${ta} resize-none`}
              style={taStyle}
            />
            <button
              onClick={() => setPrompts((p) => p.filter((_, j) => j !== i))}
              className="text-xs"
              style={{ color: 'rgba(224,160,160,0.8)' }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          className="rounded-full border px-5 py-2 text-sm"
          style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
        >
          저장
        </button>
        {saved && <span className="text-xs" style={{ color: '#8fce8f' }}>저장됨 ✓</span>}
        <button onClick={() => setOpen(false)} className="text-xs" style={{ color: '#ead9b8' }}>
          닫기
        </button>
      </div>
    </div>
  );
}
