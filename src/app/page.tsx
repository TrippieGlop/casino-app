import Link from "next/link";

// ─── Game definitions ─────────────────────────────────────────────────────────

const GAMES = [
  {
    slug:        "blackjack",
    title:       "Blackjack",
    description: "Beat the dealer to 21 without going over.",
    icon:        "🃏",
    bg:          "from-green-800 to-green-600",
    players:     "1–7 players",
  },
  {
    slug:        "uno",
    title:       "UNO",
    description: "Match colours and numbers. First to empty their hand wins.",
    icon:        "🌈",
    bg:          "from-red-700 to-yellow-500",
    players:     "2–10 players",
  },
  {
    slug:        "solitaire",
    title:       "Solitaire",
    description: "Classic Klondike. Build all four foundations A → K.",
    icon:        "♠",
    bg:          "from-blue-800 to-blue-600",
    players:     "1 player",
  },
  {
    slug:        "spades",
    title:       "Spades",
    description: "Bid your tricks, break spades, and outscore your rivals.",
    icon:        "♠️",
    bg:          "from-gray-800 to-gray-600",
    players:     "4 players",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center
                     bg-gray-950 px-4 py-12 text-white">

      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight mb-3">
          🃏 CardHub
        </h1>
        <p className="text-gray-400 text-lg">
          Pick a game and start playing
        </p>
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-5xl">
        {GAMES.map((game) => (
          <Link
            key={game.slug}
            href={`/games/${game.slug}`}
            className="group relative flex flex-col justify-between overflow-hidden
                       rounded-2xl p-6 shadow-lg transition-transform
                       hover:-translate-y-1 hover:shadow-2xl"
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${game.bg} opacity-90`} />

            {/* Content */}
            <div className="relative z-10 flex flex-col gap-3">
              <span className="text-5xl">{game.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{game.title}</h2>
                <p className="text-sm text-white/70 mt-1">{game.description}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 mt-6 flex items-center justify-between">
              <span className="text-xs text-white/50">{game.players}</span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs
                               font-semibold group-hover:bg-white/30 transition">
                Play →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-16 text-gray-600 text-sm">CardHub · Built with Next.js</p>
    </main>
  );
}
