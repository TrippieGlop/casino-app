import type { UnoColour } from './card';
import type { PlayerId } from './state';

export type UnoMove =
  | { type: 'NEW_GAME'; seed?: number }
  | { type: 'PLAY_CARD'; playerId: PlayerId; cardId: string }
  | { type: 'CHOOSE_COLOUR'; playerId: PlayerId; colour: UnoColour }
  | { type: 'DRAW_CARD'; playerId: PlayerId }
  | { type: 'PASS_TURN'; playerId: PlayerId };
