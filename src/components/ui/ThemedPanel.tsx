'use client';

import { ReactNode } from 'react';
import { useAppSettings } from '@/components/app/AppProvider';

const panelStyles: Record<string, string> = {
  emerald: 'bg-[radial-gradient(circle_at_center,_rgba(20,83,45,0.95),_rgba(9,9,11,1)_72%)]',
  blue: 'bg-[radial-gradient(circle_at_center,_rgba(30,64,175,0.95),_rgba(9,9,11,1)_72%)]',
  violet: 'bg-[radial-gradient(circle_at_center,_rgba(91,33,182,0.95),_rgba(9,9,11,1)_72%)]',
  rose: 'bg-[radial-gradient(circle_at_center,_rgba(159,18,57,0.95),_rgba(9,9,11,1)_72%)]',
  amber: 'bg-[radial-gradient(circle_at_center,_rgba(180,83,9,0.95),_rgba(9,9,11,1)_72%)]',
  cyan: 'bg-[radial-gradient(circle_at_center,_rgba(14,116,144,0.95),_rgba(9,9,11,1)_72%)]',
  lime: 'bg-[radial-gradient(circle_at_center,_rgba(77,124,15,0.95),_rgba(9,9,11,1)_72%)]',
  orange: 'bg-[radial-gradient(circle_at_center,_rgba(194,65,12,0.95),_rgba(9,9,11,1)_72%)]',
  pink: 'bg-[radial-gradient(circle_at_center,_rgba(190,24,93,0.95),_rgba(9,9,11,1)_72%)]',
  gold: 'bg-[radial-gradient(circle_at_center,_rgba(161,98,7,0.95),_rgba(9,9,11,1)_72%)]',
  neon: 'bg-[radial-gradient(circle_at_center,_rgba(13,148,136,0.95),_rgba(9,9,11,1)_72%)]',
};

export function ThemedPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { theme } = useAppSettings();
  return (
    <div className={`rounded-[2rem] border border-white/10 p-4 shadow-2xl ${panelStyles[theme] ?? panelStyles.emerald} ${className}`}>
      {children}
    </div>
  );
}
