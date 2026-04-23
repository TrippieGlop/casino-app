type DisplayCard = {
  rank: string;
  suit: string;
};

export function Card({
  card,
  hidden = false,
  className = '',
}: {
  card?: DisplayCard;
  hidden?: boolean;
  className?: string;
}) {
  if (hidden || !card) {
    return (
      <div className={`flex h-24 w-16 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-lg ${className}`}>
        <div className="h-16 w-10 rounded-md border border-white/10 bg-white/5" />
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <div className={`flex h-24 w-16 flex-col justify-between rounded-xl border border-zinc-300 bg-white p-2 shadow-lg ${className}`}>
      <span className={`text-sm font-bold ${isRed ? 'text-red-500' : 'text-black'}`}>{card.rank}</span>
      <span className={`text-center text-xl ${isRed ? 'text-red-500' : 'text-black'}`}>{card.suit}</span>
      <span className={`self-end text-sm font-bold ${isRed ? 'text-red-500' : 'text-black'}`}>{card.rank}</span>
    </div>
  );
}
