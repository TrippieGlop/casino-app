import type { SolitaireCard, SolitaireRank, SolitaireState } from './types';
import { mulberry32 } from '@/core/cards/rng';
import { shuffleInPlace } from '@/core/cards/shuffle';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'] as const;

function buildDeck(): SolitaireCard[] {
  const deck: SolitaireCard[] = [];
  let i = 0;

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `sol-${suit}-${rank}-${i++}`,
        suit,
        rank: rank as SolitaireRank,
        faceUp: false,
      });
    }
  }

  return deck;
}

function dealInitial(seed: number): SolitaireState {
  const deck = buildDeck();
  shuffleInPlace(deck, mulberry32(seed));

  const tableau = [0, 1, 2, 3, 4, 5, 6].map((colIndex) => {
    const cards = deck.splice(0, colIndex + 1).map((card, i, arr) => ({
      ...card,
      faceUp: i === arr.length - 1,
    }));
    return { cards };
  }) as SolitaireState['tableau'];

  return {
    seed,
    stock: deck,
    waste: [],
    tableau,
    foundations: [
      { suit: 'hearts', cards: [] },
      { suit: 'diamonds', cards: [] },
      { suit: 'clubs', cards: [] },
      { suit: 'spades', cards: [] },
    ],
    phase: 'playing',
    message: 'Solitaire scaffold is ready. Next step is move rules.',
  };
}

export type SolitaireMove =
  | { type: 'NEW_GAME'; seed?: number }
  | { type: 'DRAW_FROM_STOCK' };

export function createInitialSolitaireState(seed = 123): SolitaireState {
  return dealInitial(seed);
}

export function solitaireReducer(state: SolitaireState, move: SolitaireMove): SolitaireState {
  switch (move.type) {
    case 'NEW_GAME':
      return dealInitial(move.seed ?? state.seed + 1);

    case 'DRAW_FROM_STOCK': {
      if (state.stock.length === 0) {
        const recycled = [...state.waste].reverse().map((card) => ({
          ...card,
          faceUp: false,
        }));
        return {
          ...state,
          stock: recycled,
          waste: [],
          message: 'Waste recycled back into stock.',
        };
      }

      const nextStock = [...state.stock];
      const card = nextStock.shift()!;
      return {
        ...state,
        stock: nextStock,
        waste: [{ ...card, faceUp: true }, ...state.waste],
        message: 'Drew from stock.',
      };
    }

    default:
      return state;
  }
}
