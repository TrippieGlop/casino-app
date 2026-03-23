import type { PlayerId } from './state';

export type SpadesMove =
  | { type: 'NEW_GAME'; seed?: number }
  | { type: 'PLACE_BID'; playerId: PlayerId; amount: number }
  | { type: 'PLAY_CARD'; playerId: PlayerId; cardId: string }
  | { type: 'NEXT_ROUND' };
