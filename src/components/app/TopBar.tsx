'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAppSettings, type Difficulty, type AccentTheme } from '@/components/app/AppProvider';
import { themeButton } from '@/lib/theme';

const difficultyDescriptions: Record<Difficulty, string> = {
  easy: 'Easy CPU makes simpler choices and plays more conservatively.',
  medium: 'Medium CPU balances safer decisions with some pressure.',
  hard: 'Hard CPU makes stronger tactical choices and pushes value more often.',
};

const themes: AccentTheme[] = ['emerald', 'blue', 'violet', 'rose', 'amber', 'cyan', 'lime', 'orange', 'pink', 'gold', 'neon'];

export function TopBar() {
  const pathname = usePathname();
  const {
    account,
    difficulty,
    localPlay,
    theme,
    soundOn,
    readyAutoStartSeconds,
    setDifficulty,
    setLocalPlay,
    setTheme,
    setSoundOn,
    setReadyAutoStartSeconds,
    setUsername,
    displayNameError,
  } = useAppSettings();

  const [open, setOpen] = useState(false);
  const shownName = account.username.trim() || 'Guest';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={`rounded-xl bg-gradient-to-r ${themeButton[theme] ?? themeButton.emerald} px-4 py-2 font-black text-black shadow-lg`}
            >
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
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">{shownName}</div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">Bankroll: ${account.bankroll}</div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Profit: ${account.session.profit}</div>
            <button
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
              onClick={() => setOpen((v) => !v)}
            >
              Settings
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-zinc-200">Display Name</div>
              <input
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                value={account.username}
                placeholder="Enter name"
                onChange={(e) => setUsername(e.target.value)}
              />
              {displayNameError ? <div className="text-xs text-rose-300">{displayNameError}</div> : <div className="text-xs text-zinc-400">Profanity is blocked.</div>}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-zinc-200">CPU Difficulty</div>
              <div className="flex flex-wrap gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    title={difficultyDescriptions[level]}
                    onClick={() => setDifficulty(level)}
                    className={`rounded-lg px-3 py-2 text-sm capitalize ${
                      difficulty === level
                        ? 'bg-emerald-500 text-black'
                        : 'border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="text-xs text-zinc-400">{difficultyDescriptions[difficulty]}</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-zinc-200">Session</div>
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm">
                <span>Multiplayer</span>
                <input type="checkbox" checked={localPlay} onChange={(e) => setLocalPlay(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm">
                <span>Sound</span>
                <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
              </label>
              <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm">
                <div>Timer: {readyAutoStartSeconds}s</div>
                <input
                  className="mt-2 w-full"
                  type="range"
                  min={5}
                  max={30}
                  step={5}
                  value={readyAutoStartSeconds}
                  onChange={(e) => setReadyAutoStartSeconds(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-zinc-200">Themes</div>
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`rounded-lg px-3 py-2 text-sm capitalize ${
                      theme === t
                        ? 'bg-white text-black'
                        : 'border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
