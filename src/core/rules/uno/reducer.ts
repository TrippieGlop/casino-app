import { mulberry32 } from '@/core/cards/rng';
import { shuffleInPlace } from '@/core/cards/shuffle';
import type { UnoMove } from './moves';
import type { PlayerId, TurnDirection, UnoPlayer, UnoResult, UnoState } from './state';
import {
  UNO_COLOURS,
  buildUnoDeck,
  effectiveColour,
  isColoured,
  isLegalPlay,
  isWild,
  type UnoCard,
  type UnoColour,
} from './card';

function nextPlayerIndex(
  currentIndex: number,
  playerCount: number,
  direction: TurnDirection,
  skip = 0
): number {
  const step = direction === 'clockwise' ? 1 : -1;
  const advance = 1 + skip;
  let idx = currentIndex;
  for (let i = 0; i < advance; i++) {
    idx = ((idx + step) % playerCount + playerCount) % playerCount;
  }
  return idx;
}

function updatePlayer(
  state: UnoState,
  id: PlayerId,
  patch: Partial<UnoPlayer>
): UnoState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  };
}

function activePlayer(state: UnoState): UnoPlayer {
  return state.players[state.activePlayerIndex];
}

function drawCards(state: UnoState, count: number): { cards: UnoCard[]; state: UnoState } {
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  const drawn: UnoCard[] = [];

  for (let i = 0; i < count; i++) {
    if (drawPile.length === 0) {
      if (discardPile.length <= 1) break;

      const top = discardPile[0];
      const refill = discardPile.slice(1).map((c) =>
        isWild(c) ? { ...c, chosenColour: null } : c
      );
      shuffleInPlace(refill, mulberry32(state.seed + i + drawn.length));
      drawPile = refill;
      discardPile = [top];
    }

    const card = drawPile.shift();
    if (!card) break;
    drawn.push(card);
  }

  return {
    cards: drawn,
    state: {
      ...state,
      drawPile,
      discardPile,
    },
  };
}

function advanceTurn(state: UnoState, skip = 0): UnoState {
  return {
    ...state,
    activePlayerIndex: nextPlayerIndex(
      state.activePlayerIndex,
      state.players.length,
      state.direction,
      skip
    ),
    hasDrawnThisTurn: false,
  };
}

function checkGameOver(state: UnoState): UnoState {
  const winner = state.players.find((p) => p.hand.length === 0);
  if (!winner) return state;

  const result: UnoResult = { winnerId: winner.id };
  return {
    ...state,
    phase: 'gameOver',
    result,
    message: `${winner.name} wins!`,
  };
}

function createPlayers(): Array<{ id: string; name: string }> {
  return [
    { id: 'p1', name: 'You' },
    { id: 'p2', name: 'CPU' },
  ];
}

export function createInitialUnoState(seed = 123): UnoState {
  const deck = buildUnoDeck();
  shuffleInPlace(deck, mulberry32(seed));

  const playersInfo = createPlayers();
  const startingHandSize = 7;

  const players = playersInfo.map((p, i) => ({
    id: p.id,
    name: p.name,
    hand: deck.slice(i * startingHandSize, (i + 1) * startingHandSize),
  }));

  let drawPile = deck.slice(players.length * startingHandSize);
  let firstCard = drawPile.shift()!;
  while (firstCard && isWild(firstCard) && firstCard.face === 'wild_draw_four') {
    drawPile.push(firstCard);
    firstCard = drawPile.shift()!;
  }

  return {
    gameId: `uno-${seed}`,
    seed,
    drawPile,
    discardPile: [firstCard],
    players,
    activePlayerIndex: 0,
    direction: 'clockwise',
    phase: 'playing',
    pendingWild: null,
    hasDrawnThisTurn: false,
    result: null,
    message: 'Your turn: play a card, draw, or pass after drawing.',
  };
}

function applyCpuTurn(state: UnoState): UnoState {
  let next = state;

  while (next.phase === 'playing' && activePlayer(next).id === 'p2') {
    const cpu = activePlayer(next);
    const top = next.discardPile[0];

    const playable = cpu.hand.find((card) => isLegalPlay(card, top));

    if (!playable) {
      const drawResult = drawCards(next, 1);
      const cpuAfterDraw = drawResult.state.players.find((p) => p.id === 'p2')!;
      const cpuWithDrawn = updatePlayer(drawResult.state, 'p2', {
        hand: [...cpu.hand, ...drawResult.cards],
      });

      const drawnPlayable = drawResult.cards[0] && isLegalPlay(drawResult.cards[0], top);

      if (drawnPlayable && drawResult.cards[0]) {
        next = unoReducer(cpuWithDrawn, {
          type: 'PLAY_CARD',
          playerId: 'p2',
          cardId: drawResult.cards[0].id,
        });
      } else {
        next = advanceTurn({
          ...cpuWithDrawn,
          message: 'CPU passed.',
        });
      }

      continue;
    }

    next = unoReducer(next, {
      type: 'PLAY_CARD',
      playerId: 'p2',
      cardId: playable.id,
    });

    if (next.phase === 'choosingColour') {
      const colourCounts: Record<UnoColour, number> = {
        red: 0,
        yellow: 0,
        green: 0,
        blue: 0,
      };

      const cpuNow = next.players.find((p) => p.id === 'p2')!;
      for (const card of cpuNow.hand) {
        if (isColoured(card)) colourCounts[card.colour] += 1;
      }

      const bestColour = UNO_COLOURS.reduce((best, colour) =>
        colourCounts[colour] > colourCounts[best] ? colour : best
      , 'red' as UnoColour);

      next = unoReducer(next, {
        type: 'CHOOSE_COLOUR',
        playerId: 'p2',
        colour: bestColour,
      });
    }
  }

  return next;
}

export function unoReducer(state: UnoState, move: UnoMove): UnoState {
  let next = state;

  switch (move.type) {
    case 'NEW_GAME': {
      return createInitialUnoState(move.seed ?? state.seed + 1);
    }

    case 'DRAW_CARD': {
      if (state.phase !== 'playing') return state;
      const player = activePlayer(state);
      if (player.id !== move.playerId) return state;
      if (state.hasDrawnThisTurn) return state;

      const result = drawCards(state, 1);
      const updated = updatePlayer(result.state, player.id, {
        hand: [...player.hand, ...result.cards],
      });

      next = {
        ...updated,
        hasDrawnThisTurn: true,
        message: `${player.name} drew a card.`,
      };
      break;
    }

    case 'PASS_TURN': {
      if (state.phase !== 'playing') return state;
      const player = activePlayer(state);
      if (player.id !== move.playerId) return state;
      if (!state.hasDrawnThisTurn) return state;

      next = advanceTurn({
        ...state,
        message: `${player.name} passed.`,
      });
      break;
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'playing') return state;
      const player = activePlayer(state);
      if (player.id !== move.playerId) return state;

      const cardIndex = player.hand.findIndex((c) => c.id === move.cardId);
      if (cardIndex === -1) return state;

      const card = player.hand[cardIndex];
      const top = state.discardPile[0];

      if (!isLegalPlay(card, top)) return state;

      const newHand = player.hand.filter((_, i) => i !== cardIndex);
      next = updatePlayer(state, player.id, { hand: newHand });

      if (isWild(card)) {
        next = {
          ...next,
          pendingWild: card,
          phase: 'choosingColour',
          message: `${player.name} played a wild. Choose a colour.`,
        };
        next = checkGameOver(next);
        return next;
      }

      next = {
        ...next,
        discardPile: [card, ...next.discardPile],
      };

      if (isColoured(card)) {
        if (card.face === 'reverse') {
          next = {
            ...next,
            direction: next.direction === 'clockwise' ? 'counter-clockwise' : 'clockwise',
            message: `${player.name} played Reverse.`,
          };
        } else if (card.face === 'skip') {
          next = advanceTurn({
            ...next,
            message: `${player.name} played Skip.`,
          }, 1);
          next = checkGameOver(next);
          return activePlayer(next).id === 'p2' ? applyCpuTurn(next) : next;
        } else if (card.face === 'draw_two') {
          const targetIndex = nextPlayerIndex(
            next.activePlayerIndex,
            next.players.length,
            next.direction
          );
          const target = next.players[targetIndex];
          const penalty = drawCards(next, 2);
          next = updatePlayer(penalty.state, target.id, {
            hand: [...target.hand, ...penalty.cards],
          });
          next = {
            ...next,
            activePlayerIndex: targetIndex,
            message: `${player.name} played Draw Two.`,
          };
          next = advanceTurn(next);
          next = checkGameOver(next);
          return activePlayer(next).id === 'p2' ? applyCpuTurn(next) : next;
        } else {
          next = {
            ...next,
            message: `${player.name} played ${String(card.face)}.`,
          };
        }
      }

      next = checkGameOver(next);
      if (next.phase === 'gameOver') return next;

      next = advanceTurn(next);
      break;
    }

    case 'CHOOSE_COLOUR': {
      if (state.phase !== 'choosingColour') return state;
      const player = activePlayer(state);
      if (player.id !== move.playerId) return state;
      if (!state.pendingWild) return state;

      const colouredWild: UnoCard = {
        ...state.pendingWild,
        chosenColour: move.colour,
      };

      next = {
        ...state,
        pendingWild: null,
        phase: 'playing',
        discardPile: [colouredWild, ...state.discardPile],
        message: `${player.name} chose ${move.colour}.`,
      };

      if (colouredWild.face === 'wild_draw_four') {
        const targetIndex = nextPlayerIndex(
          next.activePlayerIndex,
          next.players.length,
          next.direction
        );
        const target = next.players[targetIndex];
        const penalty = drawCards(next, 4);
        next = updatePlayer(penalty.state, target.id, {
          hand: [...target.hand, ...penalty.cards],
        });
        next = {
          ...next,
          activePlayerIndex: targetIndex,
          message: `${player.name} played Wild Draw Four and chose ${move.colour}.`,
        };
      }

      next = checkGameOver(next);
      if (next.phase === 'gameOver') return next;

      next = advanceTurn(next);
      break;
    }

    default:
      return state;
  }

  return activePlayer(next).id === 'p2' && next.phase === 'playing'
    ? applyCpuTurn(next)
    : next;
}
