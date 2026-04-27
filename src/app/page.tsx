'use client';

import Link from 'next/link';
import { useAppSettings } from '@/components/app/AppProvider';
import { themeSurface, themeButton } from '@/lib/theme';

function HeroCard({ rank, suit, rotate }: { rank: string; suit: string; rotate: string }) {
  const red = suit === '♥' || suit === '♦';
  return (
    <div className={`absolute h-28 w-20 ${rotate} rounded-2xl border border-zinc-300 bg-white p-2 shadow-2xl`}>
      <div className={`text-sm font-bold ${red ? 'text-red-500' : 'text-black'}`}>{rank}</div>
      <div className={`mt-4 text-center text-2xl ${red ? 'text-red-500' : 'text-black'}`}>{suit}</div>
      <div className={`mt-4 text-right text-sm font-bold ${red ? 'text-red-500' : 'text-black'}`}>{rank}</div>
    </div>
  );
}

export default function Home() {
  const { theme } = useAppSettings();

  return (
    <main className={`min-h-screen overflow-hidden text-white ${themeSurface[theme] ?? themeSurface.emerald}`}>
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-6 py-12 lg:grid-cols-2">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
            Casino style card games, all in one place
          </div>

          <h1 className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-6xl font-black tracking-tight text-transparent md:text-8xl">
            Card Hub
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Play Blackjack, Poker, and other classic casino games on CardHub.
          </p>

          <div className="mt-10">
            <Link
              href="/hub"
              className={`rounded-2xl bg-gradient-to-r ${themeButton[theme] ?? themeButton.emerald} px-8 py-4 text-lg font-semibold text-black shadow-xl`}
            >
              Begin
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <HeroCard rank="A" suit="♠" rotate="left-10 top-10 -rotate-[14deg]" />
          <HeroCard rank="K" suit="♥" rotate="left-28 top-24 -rotate-[4deg]" />
          <HeroCard rank="Q" suit="♦" rotate="left-44 top-0 rotate-[9deg]" />
          <HeroCard rank="J" suit="♣" rotate="right-14 top-16 rotate-[14deg]" />
          <HeroCard rank="10" suit="♠" rotate="right-32 top-0 -rotate-[8deg]" />
          <div className="h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>
      </div>
    </main>
  );
}
