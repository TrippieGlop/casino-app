'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSettings } from '@/components/app/AppProvider';

export function TopBar() {
  const pathname = usePathname();
  const { account } = useAppSettings();

  return (
    <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <Link href="/hub" className="text-xl font-bold">
        Card Hub
      </Link>

      <div className="flex items-center gap-4 text-sm">
        <span>Player: {account.username}</span>
        <span className="text-emerald-400">${account.bankroll}</span>
      </div>
    </div>
  );
}
