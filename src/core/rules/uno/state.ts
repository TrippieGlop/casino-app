import type { UnoCard } from './card';

export type PlayerId = string;
export type TurnDirection = 'clockwise' | 'counter-clockwise';
export type UnoPhase = 'idle' | 'playing' | 'choosingColour' | 'gameOver';

export interface UnoPlayer {
  readonly id: PlayerId;
  readonly name: string;
  readonly hand: readonly UnoCard[];
}

export interface UnoResult {
  readonly winnerId: PlayerId;
}

export interface UnoState {
  readonly gameId: string;
  readonly seed: number;
  readonly drawPile: readonly UnoCard[];
  readonly discardPile: readonly UnoCard[];
  readonly players: readonly UnoPlayer[];
  readonly activePlayerIndex: number;
  readonly direction: TurnDirection;
  readonly phase: UnoPhase;
  readonly pendingWild: UnoCard | null;
  readonly hasDrawnThisTurn: boolean;
  readonly result: UnoResult | null;
  readonly message: string;
}
