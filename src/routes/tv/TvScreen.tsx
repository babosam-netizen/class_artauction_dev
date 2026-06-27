import { useState } from 'react';
import { MuseumShell } from '@/components/MuseumShell';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { TvAuctionView } from '@/features/auction/TvAuctionView';
import { ResultsView } from '@/features/results/ResultsView';
import { TvWaiting, TvPrologue, TvGallery, TvBranch } from '@/features/tv/TvViews';
import type { SessionState } from '@/models';

const GOLD = '#c4975a';

function readQueryCode(): string {
  return new URLSearchParams(window.location.search).get('code')?.toUpperCase() ?? '';
}

export function TvScreen() {
  const [code, setCode] = useState(readQueryCode());
  const [input, setInput] = useState('');
  const state = useRtdbValue<SessionState>(code ? paths.state(code) : null);

  if (!code) {
    return (
      <MuseumShell title="TV 송출" route="/tv">
        <div className="mt-8 flex w-72 flex-col gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="세션 코드"
            className="rounded border bg-transparent px-4 py-3 text-center text-lg tracking-widest outline-none"
            style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
          />
          <button
            onClick={() => setCode(input.trim().toUpperCase())}
            className="rounded-full border px-6 py-3"
            style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
          >
            송출 시작
          </button>
        </div>
      </MuseumShell>
    );
  }

  const phase = state?.phase ?? 'lobby';

  switch (phase) {
    case 'prologue':
      return <TvPrologue code={code} />;
    case 'gallery':
      return <TvGallery code={code} />;
    case 'branch':
      return <TvBranch code={code} />;
    case 'auction':
      return <TvAuctionView code={code} />;
    case 'result':
      return <ResultsView code={code} />;
    default:
      return <TvWaiting code={code} />;
  }
}
