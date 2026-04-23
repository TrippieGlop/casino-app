'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/app/TopBar';
import { useAppSettings } from '@/components/app/AppProvider';
import { themeSurface } from '@/lib/theme';

type GameShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function GameShell({ title, subtitle, children }: GameShellProps) {
  const { theme } = useAppSettings();

  return (
    <div className={`min-h-screen text-white ${themeSurface[theme] ?? themeSurface.emerald}`}>
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="mt-1 text-sm leading-6 text-zinc-300">{subtitle}</p>
            </div>
            <Link href="/hub" className="text-sm text-emerald-300 hover:underline">
              ← Back to lobby
            </Link>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
