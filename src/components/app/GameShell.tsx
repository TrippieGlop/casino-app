'use client';

import { useState, type ReactNode } from 'react';
import { TopBar } from '@/components/app/TopBar';
import { DifficultyControl } from '@/components/app/DifficultyControl';
import { ModeControl } from '@/components/app/ModeControl';
import { ThemeControl } from '@/components/app/ThemeControl';
import { RulesModal } from '@/components/ui/RulesModal';
import { useAppSettings } from '@/components/app/AppProvider';

type GameShellProps = {
  title: string;
  subtitle: string;
  rules: string[];
  children: ReactNode;
};

const accentBg: Record<string, string> = {
  emerald: 'bg-[radial-gradient(circle_at_top,_#16302a,_#09090b_45%)]',
  blue: 'bg-[radial-gradient(circle_at_top,_#0f2a56,_#09090b_45%)]',
  violet: 'bg-[radial-gradient(circle_at_top,_#4c1d95,_#09090b_45%)]',
  rose: 'bg-[radial-gradient(circle_at_top,_#7f1d1d,_#09090b_45%)]',
  amber: 'bg-[radial-gradient(circle_at_top,_#78350f,_#09090b_45%)]',
  cyan: 'bg-[radial-gradient(circle_at_top,_#0e7490,_#09090b_45%)]',
  lime: 'bg-[radial-gradient(circle_at_top,_#365314,_#09090b_45%)]',
  orange: 'bg-[radial-gradient(circle_at_top,_#9a3412,_#09090b_45%)]',
  pink: 'bg-[radial-gradient(circle_at_top,_#9d174d,_#09090b_45%)]',
};

export function GameShell({ title, subtitle, rules, children }: GameShellProps) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const { accentTheme } = useAppSettings();

  return (
    <div className={`min-h-screen text-white ${accentBg[accentTheme] ?? accentBg.emerald}`}>
      <TopBar />

      <RulesModal
        open={rulesOpen}
        title={title}
        rules={rules}
        onClose={() => setRulesOpen(false)}
      />

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{subtitle}</p>

            <button
              className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800"
              onClick={() => setRulesOpen(true)}
            >
              View Rules
            </button>
          </div>

          <DifficultyControl />
          <ModeControl />
          <ThemeControl />
        </aside>

        <section className="min-w-0 rounded-3xl border border-white/10 bg-black/30 p-4 shadow-2xl">
          {children}
        </section>
      </main>
    </div>
  );
}
