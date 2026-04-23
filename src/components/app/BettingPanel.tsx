'use client';

import { useMemo } from 'react';
import { useAppSettings } from '@/components/app/AppProvider';

type BettingPanelProps = {
  title?: string;
  wager: number;
  setWager: (value: number) => void;
  disabled?: boolean;
  onStart?: () => void;
  startLabel?: string;
  helperText?: string;
};

const PRESETS = [10, 25, 50, 100, 250, 500];

const themeButton: Record<string, string> = {
  emerald: 'from-emerald-400 to-cyan-500',
  blue: 'from-sky-400 to-blue-500',
  violet: 'from-violet-400 to-fuchsia-500',
  rose: 'from-rose-400 to-pink-500',
  amber: 'from-amber-300 to-orange-500',
  cyan: 'from-cyan-400 to-sky-500',
  lime: 'from-lime-400 to-emerald-500',
  orange: 'from-orange-400 to-amber-500',
  pink: 'from-pink-400 to-rose-500',
  gold: 'from-yellow-300 to-amber-500',
  neon: 'from-teal-300 to-cyan-400',
};

export function BettingPanel({
  title = 'Table Wager',
  wager,
  setWager,
  disabled = false,
  onStart,
  startLabel = 'Start Round',
  helperText,
}: BettingPanelProps) {
  const { account, canAfford, theme } = useAppSettings();
  const bankroll = account.bankroll;
  const safeWager = useMemo(() => Math.min(wager, bankroll), [wager, bankroll]);
  const canStart = canAfford(safeWager);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-zinc-300">
            Bankroll: <span className="font-semibold text-emerald-300">${bankroll}</span>
          </p>
        </div>

        {onStart && (
          <button
            className={`rounded-xl bg-gradient-to-r ${themeButton[theme] ?? themeButton.emerald} px-4 py-3 text-sm font-semibold text-black disabled:opacity-50`}
            onClick={onStart}
            disabled={disabled || !canStart}
          >
            {startLabel}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((amount) => (
          <button
            key={amount}
            className={`rounded-lg border px-3 py-2 text-sm ${
              safeWager === amount
                ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                : 'border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
            }`}
            onClick={() => setWager(Math.min(amount, bankroll))}
            disabled={disabled}
          >
            ${amount}
          </button>
        ))}
      </div>

      {!canStart && (
        <p className="mt-3 text-sm text-rose-300">You do not have enough chips for this wager.</p>
      )}

      {helperText ? <p className="mt-3 text-sm text-zinc-400">{helperText}</p> : null}
    </div>
  );
}
