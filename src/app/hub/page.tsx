'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/app/TopBar';
import { RulesModal } from '@/components/ui/RulesModal';
import { GAME_LIST, type GameId } from '@/lib/gameMeta';
import { useAppSettings } from '@/components/app/AppProvider';
import { themeSurface, themeButton } from '@/lib/theme';

export default function HubPage() {
  const {
    account,
    difficulty,
    localPlay,
    resetBankroll,
    setUsername,
    claimDailyRewardIfEligible,
    displayNameError,
    theme,
  } = useAppSettings();

  const [activeRules, setActiveRules] = useState<GameId | null>(null);
  const [dailyReward, setDailyReward] = useState(0);

  useEffect(() => {
    const reward = claimDailyRewardIfEligible();
    if (reward > 0) setDailyReward(reward);
  }, [claimDailyRewardIfEligible]);

  const selectedGame = useMemo(
    () => GAME_LIST.find((game) => game.id === activeRules) ?? null,
    [activeRules]
  );

  return (
    <div className={`min-h-screen text-white ${themeSurface[theme] ?? themeSurface.emerald}`}>
      <TopBar />

      <RulesModal
        open={!!selectedGame}
        title={selectedGame?.name ?? ''}
        rules={selectedGame?.rules ?? []}
        onClose={() => setActiveRules(null)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {dailyReward > 0 && (
          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Daily reward claimed: +${dailyReward} • Login streak: {account.streak} day{account.streak === 1 ? '' : 's'}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="mb-3 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">
              Main Lobby
            </div>

            <h1 className="text-4xl font-black tracking-tight">Choose Your Game</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
              Pick a table, settle in, and play your way. Your bankroll, settings, and style all stay with you.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {GAME_LIST.map((game) => (
                <article
                  key={game.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 shadow-2xl"
                >
                  <div className={`h-2 w-full bg-gradient-to-r ${game.accent}`} />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold">{game.name}</h2>
                        <p className="mt-2 text-sm leading-6 text-zinc-300">{game.description}</p>
                      </div>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        {game.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        {game.betting ? 'Betting Enabled' : 'Earn Chips'}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        {game.cpuSupported ? 'CPU Support' : 'No CPU'}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        {game.localPlaySupported ? 'Multiplayer Table' : 'Solo Only'}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={game.route}
                        className={`rounded-xl bg-gradient-to-r ${themeButton[theme] ?? themeButton.emerald} px-4 py-3 text-sm font-semibold text-black hover:opacity-95`}
                      >
                        Play {game.name}
                      </Link>

                      <button
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
                        onClick={() => setActiveRules(game.id)}
                      >
                        View Rules
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Player Snapshot</h2>

            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <label className="block rounded-xl bg-white/5 px-4 py-3">
                <div className="mb-2">Display Name</div>
                <input
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                  value={account.username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter name"
                />
                {displayNameError ? <div className="mt-2 text-xs text-rose-300">{displayNameError}</div> : null}
              </label>

              <div className="rounded-xl bg-white/5 px-4 py-3">Bankroll: <span className="font-semibold text-emerald-300">${account.bankroll}</span></div>
              <div className="rounded-xl bg-white/5 px-4 py-3">Streak: <span className="font-semibold">{account.streak}</span></div>
              <div className="rounded-xl bg-white/5 px-4 py-3">CPU: <span className="font-semibold capitalize">{difficulty}</span></div>
              <div className="rounded-xl bg-white/5 px-4 py-3">Mode: <span className="font-semibold">{localPlay ? 'Multiplayer Table' : 'CPU / Solo'}</span></div>
              <div className="rounded-xl bg-white/5 px-4 py-3">
                Session: wagered ${account.session.wagered} • won ${account.session.won} • lost ${account.session.lost} • profit ${account.session.profit}
              </div>
            </div>

            <button
              className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800"
              onClick={resetBankroll}
            >
              Reset Bankroll
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
