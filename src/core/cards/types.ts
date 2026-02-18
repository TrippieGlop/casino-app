export type CardId = string;

export type BaseCard = {
  id: CardId; // stable identity for UI keys/logs
  kind: string; // e.g., 'standard', 'uno'
};

export type Suit = '♠' | '♥' | '♦' | '♣';

export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export type StandardCard = BaseCard & {
  kind: 'standard';
  suit: Suit;
  rank: Rank;
};
