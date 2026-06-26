import { MuseumShell } from '@/components/MuseumShell';

export function TvScreen() {
  return (
    <MuseumShell title="경매장" route="/tv">
      <p className="mt-6 max-w-sm text-sm text-cream-dim">
        현재 작품·최고가·입찰 모둠·타이머 송출 (다음 단계에서 구현)
      </p>
    </MuseumShell>
  );
}
