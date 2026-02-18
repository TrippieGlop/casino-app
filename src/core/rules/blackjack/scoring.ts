import type { StandardCard, Rank } from '@/core/cards/types';

const RANK_VALUE: Record<Rank, number> = {
  A: 11,
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  J: 10, Q: 10, K: 10,
};

export function scoreHand(cards: StandardCard[]) {
  let total = 0;
  let aces = 0;

  for (const c of cards) {
    total += RANK_VALUE[c.rank];
    if (c.rank === 'A') aces += 1;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return {
    total,
    isBust: total > 21,
    isBlackjack: cards.length === 2 && total === 21,
  };
}
