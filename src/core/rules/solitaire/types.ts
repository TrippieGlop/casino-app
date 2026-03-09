export type SolitaireSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type SolitaireRank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7'
  | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type SolitaireCard = {
  id: string;
  suit: SolitaireSuit;
  rank: SolitaireRank;
  faceUp: boolean;
};

export type TableauColumn = {
  cards: SolitaireCard[];
};

export type FoundationPile = {
  suit: SolitaireSuit;
  cards: SolitaireCard[];
};

export type SolitaireState = {
  seed: number;
  stock: SolitaireCard[];
  waste: SolitaireCard[];
  tableau: [
    TableauColumn,
    TableauColumn,
    TableauColumn,
    TableauColumn,
    TableauColumn,
    TableauColumn,
    TableauColumn
  ];
  foundations: [
    FoundationPile,
    FoundationPile,
    FoundationPile,
    FoundationPile
  ];
  phase: 'playing' | 'won';
  message: string;
};
