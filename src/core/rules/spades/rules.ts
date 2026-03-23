import type { SpadesCard } from './card';
import { rankValue } from './card';
import type { CurrentTrick, Seat, TrickPlay } from './state';

export function legalPlays(
  hand: SpadesCard[],
  trick: CurrentTrick | null,
  spadesBroken: boolean
): SpadesCard[] {
  if (!trick || trick.cards.length === 0) {
    const nonSpades = hand.filter((c) => c.suit !== 'spades');
    if (spadesBroken || nonSpades.length === 0) return hand;
    return nonSpades;
  }

  const ledSuit = trick.cards[0].card.suit;
  const followSuit = hand.filter((c) => c.suit === ledSuit);
  return followSuit.length > 0 ? followSuit : hand;
}

export function isLegalPlay(
  card: SpadesCard,
  hand: SpadesCard[],
  trick: CurrentTrick | null,
  spadesBroken: boolean
): boolean {
  return legalPlays(hand, trick, spadesBroken).some((c) => c.id === card.id);
}

export function trickWinner(trick: TrickPlay[]): Seat {
  const ledSuit = trick[0].card.suit;
  let winner = trick[0];

  for (const play of trick.slice(1)) {
    const current = play.card;
    const best = winner.card;

    if (current.suit === 'spades' && best.suit !== 'spades') {
      winner = play;
      continue;
    }

    if (current.suit === best.suit && rankValue(current.rank) > rankValue(best.rank)) {
      winner = play;
      continue;
    }

    if (
      current.suit === 'spades' &&
      best.suit === 'spades' &&
      rankValue(current.rank) > rankValue(best.rank)
    ) {
      winner = play;
      continue;
    }

    if (
      best.suit !== 'spades' &&
      current.suit === ledSuit &&
      best.suit === ledSuit &&
      rankValue(current.rank) > rankValue(best.rank)
    ) {
      winner = play;
    }
  }

  return winner.seat;
}

export function calculateTeamScore(
  combinedBid: number,
  tricksTaken: number,
  currentBags: number
) {
  let scoreDelta = 0;
  let bagsDelta = 0;

  if (tricksTaken >= combinedBid) {
    const over = tricksTaken - combinedBid;
    scoreDelta = combinedBid * 10 + over;
    bagsDelta = over;
  } else {
    scoreDelta = -(combinedBid * 10);
    bagsDelta = 0;
  }

  const totalBags = currentBags + bagsDelta;
  const bagPenalties = Math.floor(totalBags / 10);
  const finalBags = totalBags % 10;

  scoreDelta -= bagPenalties * 100;

  return {
    scoreDelta,
    bagsDelta,
    newBags: finalBags,
  };
}
