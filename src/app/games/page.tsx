import Link from 'next/link';

const games = [
  { name: 'Blackjack', href: '/games/blackjack', status: 'Playable' },
  { name: 'UNO', href: '/games/uno', status: 'Playable' },
  { name: 'Solitaire', href: '/games/solitaire', status: 'Coming Next' },
  { name: 'Poker', href: '#', status: 'Coming Soon' },
  { name: 'Spades', href: '#', status: 'Coming Soon' },
];

export default function GamesPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Game Lobby</h1>
      <p className="mt-2 text-sm opacity-70">Choose a game to begin.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <div key={game.name} className="rounded-xl border p-4">
            <h2 className="text-xl font-semibold">{game.name}</h2>
            <p className="mt-1 text-sm opacity-70">{game.status}</p>

            {game.href === '#' ? (
              <button disabled className="mt-4 rounded-lg border px-4 py-2 opacity-50">
                Not Available Yet
              </button>
            ) : (
              <Link href={game.href} className="mt-4 inline-block rounded-lg border px-4 py-2 hover:bg-gray-50">
                Play
              </Link>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
