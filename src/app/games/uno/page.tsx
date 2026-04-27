'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { TurnBanner } from '@/components/ui/TurnBanner';
import { ActionLog } from '@/components/ui/ActionLog';
import { useAppSettings } from '@/components/app/AppProvider';
import { useSharedRoom } from '@/hooks/useSharedRoom';

type UnoColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
type UnoValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '+2' | '+4' | 'R' | 'S' | 'W';

type UnoCard = {
  id: string;
  color: UnoColor;
  value: UnoValue;
  chosenColor?: Exclude<UnoColor, 'wild'>;
};

type Seat = {
  id: string;
  playerId: string | null;
  name: string;
  cards: UnoCard[];
  ready: boolean;
  agreedWager: number;
  isBot?: boolean;
};

type UnoState = {
  seats: Seat[];
  spectators: Array<{ playerId: string; name: string }>;
  deck: UnoCard[];
  discard: UnoCard[];
  currentColor: Exclude<UnoColor, 'wild'>;
  turn: number;
  direction: 1 | -1;
  drawStack: number;
  started: boolean;
  timer: number;
  logs: string[];
  status: string;
  wager: number;
  pot: number;
};

const COLORS: Exclude<UnoColor, 'wild'>[] = ['red', 'yellow', 'green', 'blue'];
const VALUES: UnoValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+2', 'R', 'S'];
const TIMER = 15;

function makeDeck(): UnoCard[] {
  const deck: UnoCard[] = [];

  for (const color of COLORS) {
    for (const value of VALUES) {
      deck.push({ id: `${color}-${value}-${Math.random().toString(36).slice(2, 9)}`, color, value });
      if (value !== '0') {
        deck.push({ id: `${color}-${value}-${Math.random().toString(36).slice(2, 9)}`, color, value });
      }
    }
  }

  for (let i = 0; i < 4; i += 1) {
    deck.push({ id: `wild-${i}-${Math.random().toString(36).slice(2, 9)}`, color: 'wild', value: 'W' });
    deck.push({ id: `wild4-${i}-${Math.random().toString(36).slice(2, 9)}`, color: 'wild', value: '+4' });
  }

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function drawCards(deck: UnoCard[], count: number) {
  const nextDeck = [...deck];
  const drawn: UnoCard[] = [];
  for (let i = 0; i < count && nextDeck.length; i += 1) {
    drawn.push(nextDeck.shift()!);
  }
  return { nextDeck, drawn };
}

function nextTurnIndex(seats: Seat[], current: number, direction: 1 | -1, skip = 1) {
  if (!seats.length) return 0;
  let idx = current;
  for (let i = 0; i < skip; i += 1) {
    idx = (idx + direction + seats.length) % seats.length;
  }
  return idx;
}

function isDrawCard(card: UnoCard) {
  return card.value === '+2' || card.value === '+4';
}

function isWild(card: UnoCard) {
  return card.color === 'wild' || card.value === 'W' || card.value === '+4';
}

function canPlay(card: UnoCard, top: UnoCard | undefined, currentColor: Exclude<UnoColor, 'wild'>, drawStack: number) {
  if (drawStack > 0) {
    return top?.value === '+2' && card.value === '+2';
  }
  if (!top) return true;
  if (isWild(card)) return true;
  return card.color === currentColor || card.value === top.value;
}

function displayValue(card: UnoCard) {
  if (card.value === 'W') return 'WILD';
  if (card.value === 'R') return 'REV';
  if (card.value === 'S') return 'SKIP';
  return card.value;
}

function cardClass(card: UnoCard) {
  if (isWild(card)) return 'bg-zinc-950 text-white border-white/30';
  if (card.color === 'red') return 'bg-red-600 text-white border-red-300/50';
  if (card.color === 'yellow') return 'bg-yellow-400 text-black border-yellow-100/80';
  if (card.color === 'green') return 'bg-green-600 text-white border-green-300/50';
  if (card.color === 'blue') return 'bg-blue-600 text-white border-blue-300/50';
  return 'bg-zinc-900 text-white border-white/10';
}

function UnoCardView({
  card,
  small = false,
  onClick,
  disabled,
  hidden = false,
}: {
  card: UnoCard;
  small?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  hidden?: boolean;
}) {
  if (hidden) {
    return (
      <button
        disabled
        className={`${small ? 'h-20 w-14 text-xs' : 'h-28 w-20 text-base'} rounded-2xl border border-white/20 bg-zinc-950 p-2 font-black text-white shadow-lg`}
      >
        <div className="flex h-full items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-zinc-900 to-black">
          UNO
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${small ? 'h-20 w-14 text-sm' : 'h-28 w-20 text-lg'} ${cardClass(card)} relative overflow-hidden rounded-2xl border p-2 font-black shadow-lg transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <div className="absolute inset-2 rounded-full bg-white/20 blur-sm" />
      <div className="absolute left-2 top-2 text-xs drop-shadow">{displayValue(card)}</div>
      <div className="relative flex h-full items-center justify-center rounded-full bg-white/20 px-2 text-center drop-shadow">
        {displayValue(card)}
      </div>
      <div className="absolute bottom-2 right-2 rotate-180 text-xs drop-shadow">{displayValue(card)}</div>
      {isWild(card) ? (
        <div className="absolute inset-x-2 bottom-7 flex justify-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="h-2 w-2 rounded-full bg-yellow-400" />
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="h-2 w-2 rounded-full bg-blue-500" />
        </div>
      ) : null}
    </button>
  );
}

function initialState(): UnoState {
  return {
    seats: [],
    spectators: [],
    deck: [],
    discard: [],
    currentColor: 'red',
    turn: 0,
    direction: 1,
    drawStack: 0,
    started: false,
    timer: TIMER,
    logs: [],
    status: 'Join a seat and ready up.',
    wager: 25,
    pot: 0,
  };
}

export default function UnoPage() {
  const { account, addChips, spendChips, canAfford, localPlay } = useAppSettings();
  const displayName = account.username.trim() || 'Guest';
  const multiplayerMode = !!localPlay;

  const playerIdRef = useRef('');
  if (!playerIdRef.current) {
    playerIdRef.current = `uno-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  const playerId = playerIdRef.current;

  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [tableWager, setTableWager] = useState(25);
  const [soloState, setSoloState] = useState<UnoState>(() => ({
    ...initialState(),
    seats: [
      { id: 'you', playerId, name: displayName, cards: [], ready: false, agreedWager: 25 },
      { id: 'bot-1', playerId: 'bot-1', name: 'CPU 1', cards: [], ready: true, agreedWager: 25, isBot: true },
    ],
  }));

  const { sharedState, pushState, players: roomPlayers } = useSharedRoom<UnoState>(
    'cardhub-uno-main',
    `${displayName} (${playerId.slice(-4)})`,
    useMemo(() => initialState(), [])
  );

  const state = multiplayerMode ? sharedState : soloState;
  const push = (next: UnoState) => {
    if (multiplayerMode) pushState(next);
    else setSoloState(next);
  };

  const seats = Array.isArray(state?.seats) ? state.seats : [];
  const spectators = Array.isArray(state?.spectators) ? state.spectators : [];
  const discard = Array.isArray(state?.discard) ? state.discard : [];
  const logs = Array.isArray(state?.logs) ? state.logs : [];
  const deck = Array.isArray(state?.deck) ? state.deck : [];
  const topCard = discard[discard.length - 1];
  const mySeatIndex = seats.findIndex((s) => s.playerId === playerId);
  const mySeat = mySeatIndex >= 0 ? seats[mySeatIndex] : null;
  const isMyTurn = state.started && state.turn === mySeatIndex;

  function withLog(next: UnoState, text: string): UnoState {
    return { ...next, logs: [text, ...(next.logs || [])].slice(0, 16) };
  }

  function updateMyWager(amount: number) {
    if (state.started) return;
    setTableWager(amount);

    const nextSeats = seats.map((s, i) => {
      if (!multiplayerMode) return { ...s, agreedWager: amount, ready: s.isBot ? true : false };
      if (i === mySeatIndex) return { ...s, agreedWager: amount, ready: false };
      return s;
    });

    push({
      ...state,
      wager: amount,
      seats: nextSeats,
      status: multiplayerMode
        ? `Wager set to $${amount}. Everyone must agree and ready up.`
        : `Solo wager set to $${amount}. Ready up when you are done adding CPUs.`,
    });
  }

  function allPlayersAgreeOnWager(list = seats) {
    if (!list.length) return false;
    return list.every((s) => s.agreedWager === state.wager);
  }

  function joinSeat() {
    if (mySeatIndex >= 0) return;
    if (state.started) {
      push({
        ...state,
        spectators: spectators.some((s) => s.playerId === playerId)
          ? spectators
          : [...spectators, { playerId, name: displayName }],
      });
      return;
    }

    push({
      ...state,
      seats: [
        ...seats,
        { id: `seat-${Date.now()}`, playerId, name: displayName, cards: [], ready: false, agreedWager: state.wager },
      ].slice(0, 6),
      spectators: spectators.filter((s) => s.playerId !== playerId),
      status: `${displayName} joined the table.`,
    });
  }

  function leaveSeat() {
    if (mySeatIndex < 0) return;

    const nextSeats = seats.filter((s) => s.playerId !== playerId);
    const remaining = nextSeats.filter((s) => !s.isBot);

    if (state.started && remaining.length === 1) {
      if (remaining[0].playerId === playerId) addChips(state.pot);
      push(
        withLog(
          {
            ...state,
            seats: nextSeats,
            spectators: spectators.some((s) => s.playerId === playerId)
              ? spectators
              : [...spectators, { playerId, name: displayName }],
            started: false,
            status: `${remaining[0].name} wins the pot.`,
          },
          `${displayName} left the table.`
        )
      );
      return;
    }

    push(
      withLog(
        {
          ...state,
          seats: nextSeats,
          spectators: spectators.some((s) => s.playerId === playerId)
            ? spectators
            : [...spectators, { playerId, name: displayName }],
          turn: Math.min(state.turn, Math.max(0, nextSeats.length - 1)),
          status: `${displayName} left the table.`,
        },
        `${displayName} left the table.`
      )
    );
  }

  function toggleReady() {
    if (mySeatIndex < 0 || state.started) return;

    const me = seats[mySeatIndex];
    if (!me) return;

    if (me.agreedWager !== state.wager) {
      push({
        ...state,
        status: `Set your wager to $${state.wager} before readying up.`,
      });
      return;
    }

    push({
      ...state,
      seats: seats.map((s, i) =>
        i === mySeatIndex ? { ...s, ready: !s.ready } : s
      ),
      status: !me.ready
        ? `${displayName} is ready.`
        : `${displayName} is no longer ready.`,
    });
  }

  function addBot() {
    if (multiplayerMode || state.started || seats.length >= 6) return;
    push({
      ...state,
      seats: [
        ...seats,
        {
          id: `bot-${Date.now()}`,
          playerId: `bot-${Date.now()}`,
          name: `CPU ${seats.filter((s) => s.isBot).length + 1}`,
          cards: [],
          ready: true,
          agreedWager: state.wager,
          isBot: true,
        },
      ],
    });
  }

  function removeBot() {
    if (multiplayerMode || state.started) return;
    const bot = [...seats].reverse().find((s) => s.isBot);
    if (!bot) return;
    push({ ...state, seats: seats.filter((s) => s.id !== bot.id) });
  }

  function startGame() {
    const readySeats = seats.filter((s) => s.ready);
    if (readySeats.length < 2) return;

    if (!allPlayersAgreeOnWager(readySeats)) {
      push({
        ...state,
        status: `Everyone must agree to the $${state.wager} wager before starting.`,
      });
      return;
    }

    const totalPot = state.wager * readySeats.length;
    if (mySeatIndex >= 0 && !canAfford(state.wager)) return;
    if (mySeatIndex >= 0) spendChips(state.wager);

    let nextDeck = makeDeck();
    const nextSeats = readySeats.map((s) => {
      const drawn = drawCards(nextDeck, 7);
      nextDeck = drawn.nextDeck;
      return { ...s, cards: drawn.drawn, ready: false };
    });

    let first = nextDeck.shift()!;
    while (isWild(first)) {
      nextDeck.push(first);
      first = nextDeck.shift()!;
    }

    push(
      withLog(
        {
          ...state,
          seats: nextSeats,
          deck: nextDeck,
          discard: [first],
          currentColor: first.color as Exclude<UnoColor, 'wild'>,
          turn: 0,
          direction: 1,
          drawStack: 0,
          started: true,
          timer: TIMER,
          pot: totalPot,
          status: `${nextSeats[0].name}'s turn.`,
        },
        'UNO game started.'
      )
    );
  }

  useEffect(() => {
    if (state.started) return;
    if (seats.length < 2) return;
    if (!seats.every((s) => s.ready)) return;
    if (!allPlayersAgreeOnWager(seats)) return;

    const id = setTimeout(startGame, 700);
    return () => clearTimeout(id);
  }, [state.started, seats, state.wager]);

  function applyCardEffect(card: UnoCard, base: UnoState, playerIndex: number): UnoState {
    let direction = base.direction;
    let drawStack = base.drawStack;
    let turnSkip = 1;

    if (card.value === 'R') {
      direction = direction === 1 ? -1 : 1;
      if (base.seats.length === 2) turnSkip = 2;
    }

    if (card.value === 'S') turnSkip = 2;

    if (card.value === '+2') {
      drawStack += 2;
      turnSkip = 1;
    }

    if (card.value === '+4') {
      const target = nextTurnIndex(base.seats, playerIndex, direction, 1);
      const drawn = drawCards(base.deck, 4);
      const punishedSeats = base.seats.map((s, i) =>
        i === target ? { ...s, cards: [...s.cards, ...drawn.drawn] } : s
      );
      const afterTarget = nextTurnIndex(base.seats, target, direction, 1);

      return {
        ...base,
        seats: punishedSeats,
        deck: drawn.nextDeck,
        direction,
        drawStack: 0,
        turn: afterTarget,
        status: `${punishedSeats[target]?.name || 'Player'} drew 4. ${punishedSeats[afterTarget]?.name || 'Player'}'s turn.`,
      };
    }

    const nextTurn = nextTurnIndex(base.seats, playerIndex, direction, turnSkip);

    return {
      ...base,
      direction,
      drawStack,
      turn: nextTurn,
      status: `${base.seats[nextTurn]?.name || 'Player'}'s turn.${drawStack > 0 ? ` Draw stack: +${drawStack}` : ''}`,
    };
  }

  function playCard(card: UnoCard) {
    if (!state.started || mySeatIndex < 0 || state.turn !== mySeatIndex) return;
    if (!canPlay(card, topCard, state.currentColor, state.drawStack)) return;

    if (isWild(card) && !card.chosenColor) {
      setPendingWildCard(card);
      return;
    }

    const playedCard = isWild(card)
      ? { ...card, color: 'wild' as UnoColor, chosenColor: card.chosenColor || 'red' }
      : card;

    const nextSeats = seats.map((s, i) =>
      i === mySeatIndex ? { ...s, cards: s.cards.filter((c) => c.id !== card.id) } : s
    );

    let nextState: UnoState = {
      ...state,
      seats: nextSeats,
      discard: [...discard, playedCard],
      currentColor: isWild(playedCard) ? playedCard.chosenColor! : playedCard.color as Exclude<UnoColor, 'wild'>,
    };

    if (nextSeats[mySeatIndex].cards.length === 0) {
      addChips(state.pot);
      push(
        withLog(
          {
            ...nextState,
            seats: nextState.seats.map((s) => ({ ...s, ready: false })),
            started: false,
            pot: 0,
            status: `${displayName} wins UNO and takes $${state.pot}. Ready up again for the next game.`,
          },
          `${displayName} wins UNO and wins the $${state.pot} pot.`
        )
      );
      return;
    }

    nextState = applyCardEffect(playedCard, nextState, mySeatIndex);
    push(withLog(nextState, `${displayName} played ${displayValue(playedCard)}.`));
  }

  function drawOrTakeStack() {
    if (!state.started || mySeatIndex < 0 || state.turn !== mySeatIndex) return;

    const amount = state.drawStack > 0 ? state.drawStack : 1;
    const drawn = drawCards(deck, amount);
    const nextSeats = seats.map((s, i) =>
      i === mySeatIndex ? { ...s, cards: [...s.cards, ...drawn.drawn] } : s
    );
    const nextTurn = nextTurnIndex(seats, mySeatIndex, state.direction, 1);

    push(
      withLog(
        {
          ...state,
          seats: nextSeats,
          deck: drawn.nextDeck,
          drawStack: 0,
          turn: nextTurn,
          status: `${seats[nextTurn]?.name || 'Player'}'s turn.`,
        },
        `${displayName} drew ${amount} card${amount === 1 ? '' : 's'}.`
      )
    );
  }

  useEffect(() => {
    if (!state.started) return;
    const seat = seats[state.turn];
    if (!seat?.isBot) return;

    const id = setTimeout(() => {
      const playable = seat.cards.find((c) => canPlay(c, topCard, state.currentColor, state.drawStack));
      if (!playable) {
        const amount = state.drawStack > 0 ? state.drawStack : 1;
        const drawn = drawCards(deck, amount);
        const nextSeats = seats.map((s, i) =>
          i === state.turn ? { ...s, cards: [...s.cards, ...drawn.drawn] } : s
        );
        const nextTurn = nextTurnIndex(seats, state.turn, state.direction, 1);
        push(
          withLog(
            {
              ...state,
              seats: nextSeats,
              deck: drawn.nextDeck,
              drawStack: 0,
              turn: nextTurn,
              status: `${seats[nextTurn]?.name || 'Player'}'s turn.`,
            },
            `${seat.name} drew ${amount} card${amount === 1 ? '' : 's'}.`
          )
        );
        return;
      }

      const chosen = isWild(playable)
        ? { ...playable, chosenColor: COLORS[Math.floor(Math.random() * COLORS.length)] }
        : playable;

      const nextSeats = seats.map((s, i) =>
        i === state.turn ? { ...s, cards: s.cards.filter((c) => c.id !== playable.id) } : s
      );

      let nextState: UnoState = {
        ...state,
        seats: nextSeats,
        discard: [...discard, chosen],
        currentColor: isWild(chosen) ? chosen.chosenColor! : chosen.color as Exclude<UnoColor, 'wild'>,
      };

      if (nextSeats[state.turn].cards.length === 0) {
        push(withLog({ ...nextState, seats: nextState.seats.map((s) => ({ ...s, ready: false })), started: false, pot: 0, status: `${seat.name} wins UNO. Ready up again for the next game.` }, `${seat.name} wins UNO.`));
        return;
      }

      nextState = applyCardEffect(chosen, nextState, state.turn);
      push(withLog(nextState, `${seat.name} played ${displayValue(chosen)}.`));
    }, 900);

    return () => clearTimeout(id);
  }, [state.started, state.turn, seats, deck, discard, topCard, state.currentColor, state.drawStack]);

  // unoSafeUnloadCleanup
  useEffect(() => {
    if (!multiplayerMode) return;

    const cleanup = () => {
      try {
        const currentSeats = Array.isArray(state?.seats) ? state.seats : [];
        if (!currentSeats.some((s) => s.playerId === playerId)) return;

        const nextSeats = currentSeats.filter((s) => s.playerId !== playerId);
        push({
          ...state,
          seats: nextSeats,
          spectators: Array.isArray(state?.spectators)
            ? state.spectators.some((s) => s.playerId === playerId)
              ? state.spectators
              : [...state.spectators, { playerId, name: displayName }]
            : [{ playerId, name: displayName }],
          status: `${displayName} left the table.`,
          logs: [`${displayName} left the table.`, ...(Array.isArray(state?.logs) ? state.logs : [])].slice(0, 16),
        });
      } catch {}
    };

    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);

    return () => {
      window.removeEventListener('pagehide', cleanup);
      window.removeEventListener('beforeunload', cleanup);
    };
  }, [multiplayerMode, playerId, displayName, state]);

  const pendingPicker = pendingWildCard ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-4 text-xl font-semibold">Choose Wild Color</div>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`rounded-xl border px-6 py-4 font-bold ${cardClass({ id: color, color, value: '0' })}`}
              onClick={() => {
                const chosen = { ...pendingWildCard, chosenColor: color };
                setPendingWildCard(null);
                playCard(chosen);
              }}
            >
              {color.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {pendingPicker}
      <GameShell
        title="UNO"
        subtitle={multiplayerMode ? '' : ''}
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold">Table Wager</div>
                  <div className="mt-1 text-sm text-zinc-300">
                    Bankroll: <span className="font-semibold text-emerald-300">${account.bankroll}</span>
                  </div>
                  <div className="mt-2 text-sm text-zinc-400">
                    Pot: ${state.pot} • Required agreement: ${state.wager}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {[10, 25, 50, 100, 250, 500].map((amount) => (
                  <button
                    key={amount}
                    disabled={state.started}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
                      state.wager === amount
                        ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                        : 'border-white/10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                    }`}
                    onClick={() => updateMyWager(amount)}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              <div className="mt-4 text-sm text-zinc-300">
                {multiplayerMode
                  ? allPlayersAgreeOnWager()
                    ? `Everyone agrees to $${state.wager}.`
                    : `Everyone must agree to $${state.wager} before the game starts.`
                  : `Solo wager is $${state.wager}.`}
              </div>
            </div>

            <TurnBanner
              title={state.started ? `${seats[state.turn]?.name || 'Player'}'s turn` : 'Waiting for players'}
              subtitle={`${state.status}${state.drawStack > 0 ? ` • Draw stack +${state.drawStack}` : ''}`}
            />

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 font-semibold">Draw Pile</div>
                  <button
                    onClick={drawOrTakeStack}
                    disabled={!isMyTurn}
                    className="h-28 w-20 rounded-2xl border border-white/20 bg-zinc-950 font-black text-white disabled:opacity-50"
                  >
                    {state.drawStack > 0 ? `+${state.drawStack}` : 'DRAW'}
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 font-semibold">Center Pile</div>
                  {topCard ? <UnoCardView card={topCard} /> : <div className="text-sm text-zinc-400">No card yet.</div>}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 font-semibold">Current Color</div>
                  <div className={`rounded-xl px-4 py-3 text-center font-bold ${cardClass({ id: state.currentColor, color: state.currentColor, value: '0' })}`}>
                    {state.currentColor.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            <ActionLog items={logs} />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-semibold">Seats</div>
                <div className="flex gap-2">
                  {mySeatIndex < 0 ? (
                    <button className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black" onClick={joinSeat}>
                      Join Seat
                    </button>
                  ) : (
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={leaveSeat}>
                      Leave Seat
                    </button>
                  )}

                  {!multiplayerMode ? (
                    <>
                      <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={addBot}>
                        Add CPU
                      </button>
                      <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={removeBot}>
                        Remove CPU
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                {seats.map((seat, idx) => (
                  <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{seat.name}</div>
                        <div className="text-sm text-zinc-400">{seat.cards.length} cards • Wager ${seat.agreedWager} {idx === state.turn && state.started ? '• Turn' : ''}</div>
                      </div>
                      {idx === mySeatIndex && !state.started ? (
                        <button
                          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                            seat.ready
                              ? 'bg-emerald-500 text-black'
                              : 'border border-white/10 bg-zinc-900 text-white'
                          }`}
                          onClick={toggleReady}
                        >
                          {seat.ready ? 'Ready Up' : 'Unready'}
                        </button>
                      ) : (
                        <span className="text-sm text-zinc-400">{seat.ready ? 'Ready' : ''}</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {seat.cards.slice(0, 12).map((card) => (
                        idx === mySeatIndex ? (
                          <UnoCardView
                            key={card.id}
                            card={card}
                            small
                            onClick={() => (isWild(card) ? setPendingWildCard(card) : playCard(card))}
                            disabled={!isMyTurn || !canPlay(card, topCard, state.currentColor, state.drawStack)}
                          />
                        ) : (
                          <UnoCardView key={card.id} card={card} small disabled hidden />
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {multiplayerMode ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold">Spectators</div>
                <div className="mt-2 text-sm text-zinc-400">
                  {spectators.length ? spectators.map((s) => s.name).join(', ') : 'No spectators'}
                </div>
                <div className="mt-3 text-xs text-zinc-500">Connected devices: {roomPlayers.length}</div>
              </div>
            ) : null}
          </div>
        </div>
      </GameShell>
    </>
  );
}
