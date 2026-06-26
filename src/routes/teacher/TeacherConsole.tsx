import { MuseumShell } from '@/components/MuseumShell';

export function TeacherConsole() {
  return (
    <MuseumShell title="교사 콘솔" route="/teacher">
      <p className="mt-6 max-w-sm text-sm text-cream-dim">
        세션 생성·작품 업로드·단계 전환·경매 진행 (다음 단계에서 구현)
      </p>
    </MuseumShell>
  );
}
