import type { StandardCard, Suit, Rank } from './types';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

export function makeStandardDeck(): StandardCard[] {
  const cards: StandardCard[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        kind: 'standard',
        suit,
        rank,
        id: `standard:${rank}${suit}`,
      });
    }
  }

  return cards;
}
