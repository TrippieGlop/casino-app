'use client';

import { useAppSettings } from '@/components/app/AppProvider';

const themeStyles: Record<string, string> = {
  emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  blue: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  violet: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  rose: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  cyan: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  lime: 'border-lime-400/30 bg-lime-400/10 text-lime-200',
  orange: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  pink: 'border-pink-400/30 bg-pink-400/10 text-pink-200',
  gold: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',
  neon: 'border-teal-300/30 bg-teal-300/10 text-teal-100',
};

export function TurnBanner({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useAppSettings();
  const cls = themeStyles[theme] ?? themeStyles.emerald;

  return (
    <div className={`rounded-2xl border px-4 py-3 ${cls}`}>
      <div className="font-semibold">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-zinc-200">{subtitle}</div> : null}
    </div>
  );
}
