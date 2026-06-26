import type { ReactNode } from 'react';
import { tokens } from '@/theme';

interface MuseumShellProps {
  title: string;
  route: string;
  children?: ReactNode;
}

/** 세 화면 공통 배경 — 다크 미술관 + 골드 (PRD §7.1). 단계별 콘텐츠는 children으로. */
export function MuseumShell({ title, route, children }: MuseumShellProps) {
  return (
    <div
      className="min-h-screen font-body text-cream"
      style={{ background: tokens.effect.wallGradient }}
    >
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="font-display text-5xl italic">{title}</div>
        <div className="mt-3 text-sm tracking-widest" style={{ color: tokens.color.gold }}>
          {route}
        </div>
        {children}
      </div>
    </div>
  );
}
