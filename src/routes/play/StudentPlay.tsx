import { MuseumShell } from '@/components/MuseumShell';

export function StudentPlay() {
  return (
    <MuseumShell title="미술관 입장" route="/play">
      <p className="mt-6 max-w-sm text-sm text-cream-dim">
        코드 입장·감상 기록·모둠 경매 (다음 단계에서 구현)
      </p>
    </MuseumShell>
  );
}
