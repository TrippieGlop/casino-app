import type { BlackjackMove, BlackjackOutcome, BlackjackState } from './types';
import { scoreHand } from './scoring';
import { makeStandardDeck } from '@/core/cards/standardFactory';
import { mulberry32 } from '@/core/cards/rng';
import { shuffleInPlace } from '@/core/cards/shuffle';
import type { StandardCard } from '@/core/cards/types';

function drawOne(drawPile: StandardCard[]) {
  if (drawPile.length === 0) return { card: undefined as StandardCard | undefined, nextPile: drawPile };
  const next = [...drawPile];
  const card = next.pop();
  return { card, nextPile: next };
}

function drawMany(drawPile: StandardCard[], n: number) {
  let pile = drawPile;
  const out: StandardCard[] = [];
  for (let i = 0; i < n; i++) {
    const res = drawOne(pile);
    pile = res.nextPile;
    if (!res.card) break;
    out.push(res.card);
  }
  return { cards: out, nextPile: pile };
}

function computeOutcome(player: StandardCard[], dealer: StandardCard[]): BlackjackOutcome {
  const p = scoreHand(player);
  const d = scoreHand(dealer);

  if (p.isBust) return 'DEALER_WIN';
  if (d.isBust) return 'PLAYER_WIN';

  if (p.total > d.total) return 'PLAYER_WIN';
  if (p.total < d.total) return 'DEALER_WIN';
  return 'PUSH';
}

function dealerShouldHit(dealerCards: StandardCard[]) {
  return scoreHand(dealerCards).total < 17;
}

export function createInitialBlackjackState(seed = 123): BlackjackState {
  const rng = mulberry32(seed);
  const deck = makeStandardDeck();
  shuffleInPlace(deck, rng);

  const d1 = drawMany(deck, 4);
  const playerCards = [d1.cards[0], d1.cards[2]].filter(Boolean) as StandardCard[];
  const dealerCards = [d1.cards[1], d1.cards[3]].filter(Boolean) as StandardCard[];

  const playerScore = scoreHand(playerCards);
  const dealerVisibleScore = scoreHand(dealerCards.slice(0, 1));
  const dealerScoreFull = scoreHand(dealerCards);

  let phase: BlackjackState['phase'] = 'PLAYER_TURN';
  let outcome: BlackjackOutcome = 'NONE';
  let message = 'Your turn: Hit or Stand';
  let revealDealerHoleCard = false;

  if (playerScore.isBlackjack || dealerScoreFull.isBlackjack) {
    revealDealerHoleCard = true;
    phase = 'ROUND_OVER';
    if (playerScore.isBlackjack && dealerScoreFull.isBlackjack) {
      outcome = 'PUSH';
      message = 'Push: both have Blackjack';
    } else if (playerScore.isBlackjack) {
      outcome = 'PLAYER_WIN';
      message = 'Blackjack! You win';
    } else {
      outcome = 'DEALER_WIN';
      message = 'Dealer has Blackjack';
    }
  }

  return {
    seed,
    phase,
    outcome,
    drawPile: d1.nextPile,
    playerCards,
    dealerCards,
    revealDealerHoleCard,
    playerTotal: playerScore.total,
    dealerTotal: revealDealerHoleCard ? dealerScoreFull.total : dealerVisibleScore.total,
    message,
  };
}

export function blackjackReducer(state: BlackjackState, move: BlackjackMove): BlackjackState {
  switch (move.type) {
    case 'NEW_GAME': {
      const nextSeed = move.seed ?? state.seed + 1;
      return createInitialBlackjackState(nextSeed);
    }
    case 'RESET': {
      return createInitialBlackjackState(state.seed);
    }
    case 'HIT': {
      if (state.phase !== 'PLAYER_TURN') return state;

      const res = drawOne(state.drawPile);
      if (!res.card) return { ...state, message: 'Deck is empty' };

      const playerCards = [...state.playerCards, res.card];
      const p = scoreHand(playerCards);

      if (p.isBust) {
        const d = scoreHand(state.dealerCards);
        return {
          ...state,
          drawPile: res.nextPile,
          playerCards,
          phase: 'ROUND_OVER',
          outcome: 'DEALER_WIN',
          revealDealerHoleCard: true,
          playerTotal: p.total,
          dealerTotal: d.total,
          message: 'Bust! Dealer wins',
        };
      }

      return {
        ...state,
        drawPile: res.nextPile,
        playerCards,
        playerTotal: p.total,
        message: 'Your turn: Hit or Stand',
      };
    }
    case 'STAND': {
      if (state.phase !== 'PLAYER_TURN') return state;

      let pile = state.drawPile;
      let dealerCards = [...state.dealerCards];

      while (dealerShouldHit(dealerCards)) {
        const res = drawOne(pile);
        pile = res.nextPile;
        if (!res.card) break;
        dealerCards.push(res.card);
      }

      const outcome = computeOutcome(state.playerCards, dealerCards);
      const p = scoreHand(state.playerCards);
      const d = scoreHand(dealerCards);

      const message =
        outcome === 'PLAYER_WIN' ? 'You win!' :
        outcome === 'DEALER_WIN' ? 'Dealer wins' :
        'Push';

      return {
        ...state,
        drawPile: pile,
        dealerCards,
        phase: 'ROUND_OVER',
        outcome,
        revealDealerHoleCard: true,
        playerTotal: p.total,
        dealerTotal: d.total,
        message,
      };
    }
    default:
      return state;
  }
}
