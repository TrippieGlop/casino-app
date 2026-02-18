import type { StandardCard } from '@/core/cards/types';

export type BlackjackPhase = 'PLAYER_TURN' | 'DEALER_TURN' | 'ROUND_OVER';
export type BlackjackOutcome = 'PLAYER_WIN' | 'DEALER_WIN' | 'PUSH' | 'NONE';

export type BlackjackState = {
  seed: number;
  phase: BlackjackPhase;
  outcome: BlackjackOutcome;

  drawPile: StandardCard[];
  playerCards: StandardCard[];
  dealerCards: StandardCard[];

  revealDealerHoleCard: boolean;

  playerTotal: number;
  dealerTotal: number;
  message: string;
};

export type BlackjackMove =
  | { type: 'NEW_GAME'; seed?: number }
  | { type: 'HIT' }
  | { type: 'STAND' }
  | { type: 'RESET' };
