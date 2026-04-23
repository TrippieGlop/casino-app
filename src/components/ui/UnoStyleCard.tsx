type UnoLikeCard = {
  label: string;
  color: 'red' | 'yellow' | 'green' | 'blue' | 'wild';
};

const bgMap: Record<UnoLikeCard['color'], string> = {
  red: 'from-red-500 to-red-700',
  yellow: 'from-yellow-300 to-yellow-500',
  green: 'from-green-500 to-green-700',
  blue: 'from-blue-500 to-blue-700',
  wild: 'from-zinc-700 to-black',
};

const textMap: Record<UnoLikeCard['color'], string> = {
  red: 'text-white',
  yellow: 'text-black',
  green: 'text-white',
  blue: 'text-white',
  wild: 'text-white',
};

export function UnoStyleCard({
  card,
  hidden = false,
  small = false,
}: {
  card?: UnoLikeCard;
  hidden?: boolean;
  small?: boolean;
}) {
  const size = small ? 'h-20 w-12' : 'h-24 w-16';

  if (hidden || !card) {
    return (
      <div className={`flex ${size} items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-lg`}>
        <div className="h-14 w-8 rounded-full border border-white/10 bg-white/5" />
      </div>
    );
  }

  return (
    <div className={`relative flex ${size} items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${bgMap[card.color]} shadow-lg`}>
      <div className="absolute inset-2 rotate-12 rounded-full bg-white/20" />
      <div className={`relative text-xl font-black ${textMap[card.color]}`}>{card.label}</div>
    </div>
  );
}
