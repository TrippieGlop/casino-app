import type { SpadesCard } from './card';

export type PlayerId = string;
export type Seat = 0 | 1 | 2 | 3;
export type TeamId = 'NS' | 'EW';

export function teamForSeat(seat: Seat): TeamId {
  return seat === 0 || seat === 2 ? 'NS' : 'EW';
}

export type SpadesPhase = 'bidding' | 'playing' | 'roundOver' | 'gameOver';

export type SpadesPlayer = {
  id: PlayerId;
  name: string;
  seat: Seat;
  hand: SpadesCard[];
  bid: number;
  tricksWon: number;
};

export type SpadesTeam = {
  id: TeamId;
  score: number;
  bags: number;
  combinedBid: number;
  tricksTaken: number;
};

export type TrickPlay = {
  seat: Seat;
  card: SpadesCard;
};

export type CurrentTrick = {
  leader: Seat;
  cards: TrickPlay[];
};

export type RoundResult = {
  nsScoreDelta: number;
  ewScoreDelta: number;
  nsBagsDelta: number;
  ewBagsDelta: number;
  message: string;
};

export type SpadesState = {
  gameId: string;
  seed: number;
  roundNumber: number;
  phase: SpadesPhase;
  players: [SpadesPlayer, SpadesPlayer, SpadesPlayer, SpadesPlayer];
  teams: [SpadesTeam, SpadesTeam];
  dealerSeat: Seat;
  activePlayerSeat: Seat;
  spadesBroken: boolean;
  currentTrick: CurrentTrick | null;
  completedTricks: Array<{ winner: Seat; cards: TrickPlay[] }>;
  lastRoundResult: RoundResult | null;
  message: string;
};
