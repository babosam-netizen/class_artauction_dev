import { useState } from 'react';
import { MuseumShell } from '@/components/MuseumShell';
import { sortByOrder } from '@/features/artwork/api';
import { GalleryView } from '@/features/appreciation/GalleryView';
import type { Artwork, GradeBand } from '@/models';

const GOLD = '#c4975a';

interface Props {
  code: string;
  studentNumber: string;
  studentName: string;
  gradeBand: GradeBand;
  prompts: string[];
  artworks: Artwork[];
  doorCount: number;
}

export function BranchView({
  code,
  studentNumber,
  studentName,
  gradeBand,
  prompts,
  artworks,
  doorCount,
}: Props) {
  const [door, setDoor] = useState<number | null>(null);

  if (door === null) {
    // 문마다 작품이 있는지 표시
    const countFor = (d: number) =>
      artworks.filter((a) => a.placement?.kind === 'branch' && a.placement.door === d).length;
    return (
      <MuseumShell title="회랑 분기" route="/play">
        <div className="mt-4 max-w-md text-center text-sm text-cream-dim">
          들어가고 싶은 문을 골라보세요. 모둠 친구들과 서로 다른 문을 고르면 더 많은 작품을 볼 수 있어요.
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {Array.from({ length: doorCount }, (_, d) => (
            <button
              key={d}
              onClick={() => setDoor(d)}
              className="flex h-28 w-36 flex-col items-center justify-center rounded-lg border"
              style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.08)', color: '#ead9b8' }}
            >
              <div className="text-3xl">🚪</div>
              <div className="mt-1 font-display text-xl italic">{d + 1}번 문</div>
              <div className="text-[11px]" style={{ color: 'rgba(196,167,90,0.6)' }}>
                작품 {countFor(d)}점
              </div>
            </button>
          ))}
        </div>
      </MuseumShell>
    );
  }

  const doorArtworks = sortByOrder(
    artworks.filter((a) => a.placement?.kind === 'branch' && a.placement.door === door),
  );

  return (
    <div className="relative">
      <button
        onClick={() => setDoor(null)}
        className="absolute left-4 top-4 z-[20] rounded-full border px-4 py-1.5 text-xs"
        style={{ borderColor: 'rgba(196,167,90,0.4)', background: 'rgba(0,0,0,0.4)', color: '#ead9b8' }}
      >
        ← 다른 문 고르기
      </button>
      <GalleryView
        code={code}
        studentNumber={studentNumber}
        studentName={studentName}
        gradeBand={gradeBand}
        prompts={prompts}
        artworks={doorArtworks}
      />
    </div>
  );
}
