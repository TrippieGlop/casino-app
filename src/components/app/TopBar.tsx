'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSettings } from '@/components/app/AppProvider';

export function TopBar() {
  const pathname = usePathname();
  const { account, difficulty, localPlay } = useAppSettings();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 text-white">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2 font-bold text-black">
            Card Hub
          </Link>
          <Link
            href="/hub"
            className={pathname === '/hub' ? 'rounded-lg bg-white/10 px-3 py-2 text-sm' : 'rounded-lg px-3 py-2 text-sm hover:bg-white/5'}
          >
            Lobby
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            {account.username}
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            Bankroll: ${account.bankroll}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 capitalize">
            CPU: {difficulty}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            {localPlay ? 'Local Play On' : 'CPU Mode'}
          </div>
        </div>
      </div>
    </header>
  );
}
