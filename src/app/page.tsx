import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1d4d3b,_#09090b_45%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
          Card Hub
        </div>

        <h1 className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-6xl font-black tracking-tight text-transparent md:text-8xl">
          Card Hub
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          A polished multi-game card platform for Blackjack, Poker, UNO, Spades, and Solitaire.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/hub"
            className="rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-8 py-4 text-lg font-semibold text-black shadow-xl"
          >
            Enter Card Hub
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-16 text-gray-600 text-sm">CardHub · Built with Next.js</p>
    </main>
  );
}
