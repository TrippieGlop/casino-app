export type SpadesSuit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type SpadesRank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

export type SpadesCard = {
  id: string;
  suit: SpadesSuit;
  rank: SpadesRank;
};

const SUITS: SpadesSuit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS: SpadesRank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

let counter = 0;

export function buildSpadesDeck(): SpadesCard[] {
  const deck: SpadesCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `spades-${suit}-${rank}-${counter++}`,
        suit,
        rank,
      });
    }
  }
  return deck;
}

export function rankValue(rank: SpadesRank): number {
  const order: Record<SpadesRank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
  };
  return order[rank];
}

export function renderSpadesCard(card: SpadesCard): string {
  const suitSymbol: Record<SpadesSuit, string> = {
    clubs: '♣',
    diamonds: '♦',
    hearts: '♥',
    spades: '♠',
  };
  return `${card.rank}${suitSymbol[card.suit]}`;
}
