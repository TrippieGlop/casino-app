import { mulberry32 } from '@/core/cards/rng';
import { shuffleInPlace } from '@/core/cards/shuffle';
import { buildSpadesDeck, type SpadesCard } from './card';
import type { SpadesMove } from './moves';
import type {
  RoundResult,
  Seat,
  SpadesPlayer,
  SpadesState,
  TeamId,
} from './state';
import { teamForSeat } from './state';
import { calculateTeamScore, isLegalPlay, trickWinner } from './rules';

function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

function teamFor(teamId: TeamId): 0 | 1 {
  return teamId === 'NS' ? 0 : 1;
}

function sortHand(hand: SpadesCard[]): SpadesCard[] {
  const suitOrder = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
  const rankOrder = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
  };

  return [...hand].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return rankOrder[a.rank] - rankOrder[b.rank];
  });
}

function combinedBid(players: SpadesState['players'], team: TeamId): number {
  return players
    .filter((p) => teamForSeat(p.seat) === team)
    .reduce((sum, p) => sum + Math.max(0, p.bid), 0);
}

function tricksTaken(players: SpadesState['players'], team: TeamId): number {
  return players
    .filter((p) => teamForSeat(p.seat) === team)
    .reduce((sum, p) => sum + p.tricksWon, 0);
}

function createRound(seed: number, roundNumber: number, dealerSeat: Seat, prevTeams?: SpadesState['teams']): SpadesState {
  const deck = buildSpadesDeck();
  shuffleInPlace(deck, mulberry32(seed));

  const hands: SpadesCard[][] = [[], [], [], []];
  deck.forEach((card, i) => {
    hands[i % 4].push(card);
  });

  const players: [SpadesPlayer, SpadesPlayer, SpadesPlayer, SpadesPlayer] = [
    { id: 'spades-p1', name: 'You (North)', seat: 0, hand: sortHand(hands[0]), bid: -1, tricksWon: 0 },
    { id: 'spades-p2', name: 'CPU East', seat: 1, hand: sortHand(hands[1]), bid: -1, tricksWon: 0 },
    { id: 'spades-p3', name: 'CPU South', seat: 2, hand: sortHand(hands[2]), bid: -1, tricksWon: 0 },
    { id: 'spades-p4', name: 'CPU West', seat: 3, hand: sortHand(hands[3]), bid: -1, tricksWon: 0 },
  ];

  return {
    gameId: `spades-${seed}`,
    seed,
    roundNumber,
    phase: 'bidding',
    players,
    teams: prevTeams ?? [
      { id: 'NS', score: 0, bags: 0, combinedBid: 0, tricksTaken: 0 },
      { id: 'EW', score: 0, bags: 0, combinedBid: 0, tricksTaken: 0 },
    ],
    dealerSeat,
    activePlayerSeat: nextSeat(dealerSeat),
    spadesBroken: false,
    currentTrick: null,
    completedTricks: [],
    lastRoundResult: null,
    message: 'Place bids to begin the round.',
  };
}

export function createInitialSpadesState(seed = 123): SpadesState {
  return createRound(seed, 1, 3);
}

function allPlayersBid(state: SpadesState) {
  return state.players.every((p) => p.bid >= 0);
}

function startPlaying(state: SpadesState): SpadesState {
  return {
    ...state,
    phase: 'playing',
    activePlayerSeat: nextSeat(state.dealerSeat),
    currentTrick: {
      leader: nextSeat(state.dealerSeat),
      cards: [],
    },
    message: 'Play begins.',
  };
}

function finishRound(state: SpadesState): SpadesState {
  const nsBid = combinedBid(state.players, 'NS');
  const ewBid = combinedBid(state.players, 'EW');
  const nsTricks = tricksTaken(state.players, 'NS');
  const ewTricks = tricksTaken(state.players, 'EW');

  const nsCalc = calculateTeamScore(nsBid, nsTricks, state.teams[0].bags);
  const ewCalc = calculateTeamScore(ewBid, ewTricks, state.teams[1].bags);

  let nsDelta = nsCalc.scoreDelta;
  let ewDelta = ewCalc.scoreDelta;

  for (const p of state.players) {
    if (p.bid === 0) {
      const nilSuccess = p.tricksWon === 0;
      if (teamForSeat(p.seat) === 'NS') nsDelta += nilSuccess ? 100 : -100;
      else ewDelta += nilSuccess ? 100 : -100;
    }
  }

  const teams: SpadesState['teams'] = [
    {
      ...state.teams[0],
      combinedBid: nsBid,
      tricksTaken: nsTricks,
      score: state.teams[0].score + nsDelta,
      bags: nsCalc.newBags,
    },
    {
      ...state.teams[1],
      combinedBid: ewBid,
      tricksTaken: ewTricks,
      score: state.teams[1].score + ewDelta,
      bags: ewCalc.newBags,
    },
  ];

  const lastRoundResult: RoundResult = {
    nsScoreDelta: nsDelta,
    ewScoreDelta: ewDelta,
    nsBagsDelta: nsCalc.bagsDelta,
    ewBagsDelta: ewCalc.bagsDelta,
    message: `Round ${state.roundNumber} complete.`,
  };

  const gameOver = teams.some((t) => t.score >= 500);

  return {
    ...state,
    teams,
    phase: gameOver ? 'gameOver' : 'roundOver',
    lastRoundResult,
    currentTrick: null,
    message: gameOver ? 'Game over.' : 'Round over.',
  };
}

export function spadesReducer(state: SpadesState, move: SpadesMove): SpadesState {
  switch (move.type) {
    case 'NEW_GAME':
      return createInitialSpadesState(move.seed ?? state.seed + 1);

    case 'NEXT_ROUND':
      if (state.phase !== 'roundOver') return state;
      return createRound(
        state.seed + 1,
        state.roundNumber + 1,
        nextSeat(state.dealerSeat),
        [
          { ...state.teams[0], combinedBid: 0, tricksTaken: 0 },
          { ...state.teams[1], combinedBid: 0, tricksTaken: 0 },
        ]
      );

    case 'PLACE_BID': {
      if (state.phase !== 'bidding') return state;
      const active = state.players[state.activePlayerSeat];
      if (active.id !== move.playerId) return state;

      const amount = Math.max(0, Math.min(13, move.amount));

      const players = state.players.map((p) =>
        p.id === move.playerId ? { ...p, bid: amount } : p
      ) as SpadesState['players'];

      const nextState: SpadesState = {
        ...state,
        players,
        activePlayerSeat: nextSeat(state.activePlayerSeat),
        message: `${active.name} bid ${amount}.`,
      };

      if (!allPlayersBid(nextState)) return nextState;

      return startPlaying({
        ...nextState,
        teams: [
          {
            ...nextState.teams[0],
            combinedBid: combinedBid(players, 'NS'),
            tricksTaken: 0,
          },
          {
            ...nextState.teams[1],
            combinedBid: combinedBid(players, 'EW'),
            tricksTaken: 0,
          },
        ],
        activePlayerSeat: nextSeat(state.dealerSeat),
      });
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'playing' || !state.currentTrick) return state;

      const active = state.players[state.activePlayerSeat];
      if (active.id !== move.playerId) return state;

      const card = active.hand.find((c) => c.id === move.cardId);
      if (!card) return state;

      if (!isLegalPlay(card, active.hand, state.currentTrick, state.spadesBroken)) {
        return state;
      }

      const players = state.players.map((p) =>
        p.id === move.playerId
          ? { ...p, hand: p.hand.filter((c) => c.id !== move.cardId) }
          : p
      ) as SpadesState['players'];

      const currentTrick = {
        ...state.currentTrick,
        cards: [...state.currentTrick.cards, { seat: active.seat, card }],
      };

      const spadesBroken =
        state.spadesBroken ||
        (card.suit === 'spades' &&
          currentTrick.cards.length > 1 &&
          currentTrick.cards[0].card.suit !== 'spades');

      if (currentTrick.cards.length < 4) {
        return {
          ...state,
          players,
          currentTrick,
          activePlayerSeat: nextSeat(state.activePlayerSeat),
          spadesBroken,
          message: `${active.name} played ${card.rank} of ${card.suit}.`,
        };
      }

      const winner = trickWinner(currentTrick.cards);
      const updatedPlayers = players.map((p) =>
        p.seat === winner ? { ...p, tricksWon: p.tricksWon + 1 } : p
      ) as SpadesState['players'];

      const completedTricks = [...state.completedTricks, { winner, cards: currentTrick.cards }];
      const tricksPlayed = completedTricks.length;

      const nextState: SpadesState = {
        ...state,
        players: updatedPlayers,
        completedTricks,
        currentTrick: { leader: winner, cards: [] },
        activePlayerSeat: winner,
        spadesBroken,
        teams: [
          { ...state.teams[0], tricksTaken: tricksTaken(updatedPlayers, 'NS') },
          { ...state.teams[1], tricksTaken: tricksTaken(updatedPlayers, 'EW') },
        ],
        message: `${state.players[winner].name} won the trick.`,
      };

      return tricksPlayed === 13 ? finishRound(nextState) : nextState;
    }

    default:
      return state;
  }
}
