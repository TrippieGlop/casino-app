'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { TurnBanner } from '@/components/ui/TurnBanner';
import { ActionLog } from '@/components/ui/ActionLog';
import { Card } from '@/components/ui/Card';
import { useAppSettings } from '@/components/app/AppProvider';
import { useSharedRoom } from '@/hooks/useSharedRoom';
import { useAccentGlow } from '@/hooks/useAccentGlow';

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

type PokerCard = {
  id: string;
  rank: Rank;
  suit: Suit;
};

type BetAction = 'fold' | 'check' | 'call' | 'raise';

type SoloSeat = {
  id: string;
  name: string;
  cards: PokerCard[];
  chips: number;
  bet: number;
  folded: boolean;
  acted: boolean;
  isBot: boolean;
};

type OnlineSeat = {
  id: string;
  playerId: string | null;
  name: string;
  cards: PokerCard[];
  chips: number;
  bet: number;
  folded: boolean;
  acted: boolean;
  ready: boolean;
};

type OnlineState = {
  seats: OnlineSeat[];
  spectators: Array<{ playerId: string; name: string }>;
  deck: PokerCard[];
  board: PokerCard[];
  pot: number;
  currentBet: number;
  raiseAmount: number;
  phase: 'waiting' | 'ready' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  activeSeat: number;
  timer: number;
  handId: number;
  logs: string[];
  status: string;
};

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const ONLINE_TIMER = 20;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const DEFAULT_RAISE = 20;

function makeDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit}-${Math.random().toString(36).slice(2, 8)}`,
        rank,
        suit,
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function parseCard(card: PokerCard) {
  return { rank: card.rank, suit: card.suit };
}

function rankValue(rank: Rank) {
  return RANKS.indexOf(rank) + 2;
}

function handScore(cards: PokerCard[]) {
  return [...cards].sort((a, b) => rankValue(b.rank) - rankValue(a.rank)).slice(0, 5).reduce((sum, card, idx) => sum + rankValue(card.rank) * Math.pow(100, 4 - idx), 0);
}

function nextLiveSeat<T extends { playerId?: string | null; folded: boolean }>(seats: T[], current: number) {
  const live = seats.filter((seat) => (!!seat.playerId || seat.playerId === undefined) && !seat.folded);
  if (live.length <= 1) return -1;
  let idx = current;
  for (let step = 0; step < seats.length; step += 1) {
    idx = (idx + 1) % seats.length;
    const seat = seats[idx];
    if ((seat.playerId !== null || seat.playerId === undefined) && !seat.folded) return idx;
  }
  return -1;
}

function activePlayersCount<T extends { playerId?: string | null; folded: boolean }>(seats: T[]) {
  return seats.filter((seat) => (!!seat.playerId || seat.playerId === undefined) && !seat.folded).length;
}

function allMatched<T extends { playerId?: string | null; folded: boolean; acted: boolean; bet: number }>(seats: T[], currentBet: number) {
  return seats
    .filter((seat) => (!!seat.playerId || seat.playerId === undefined) && !seat.folded)
    .every((seat) => seat.acted && seat.bet === currentBet);
}

function initialOnlineState(): OnlineState {
  return {
    seats: [],
    spectators: [],
    deck: [],
    board: [],
    pot: 0,
    currentBet: BIG_BLIND,
    raiseAmount: DEFAULT_RAISE,
    phase: 'ready',
    activeSeat: -1,
    timer: ONLINE_TIMER,
    handId: 0,
    logs: [],
    status: 'Join a seat or spectate. When at least 2 players are ready, the next hand begins on the 20 second table timer.',
  };
}

function WagerStylePanel({
  chips,
  title,
  subtitle,
  action,
  actionLabel,
}: {
  chips: number;
  title: string;
  subtitle: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{title}</div>
          <div className="mt-1 text-sm text-zinc-300">
            Bankroll: <span className="font-semibold text-emerald-300">${chips}</span>
          </div>
        </div>
        {action ? (
          <button
            className="rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-black"
            onClick={action}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="mt-4 text-sm text-zinc-300">{subtitle}</div>
    </div>
  );
}

export default function PokerPage() {
  const {
    account,
    addChips,
    spendChips,
    canAfford,
    localPlay,
    readyAutoStartSeconds,
  } = useAppSettings();

  const displayName = account.username.trim() || 'Guest';
  const accentGlow = useAccentGlow();
  const multiplayer = !!localPlay;

  const playerIdRef = useRef('');
  if (!playerIdRef.current) {
    playerIdRef.current = `poker-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  const playerId = playerIdRef.current;

  // SOLO STATE
  const soloTimerSetting = readyAutoStartSeconds || 15;
  const [soloTimer, setSoloTimer] = useState(soloTimerSetting);
  const [soloStatus, setSoloStatus] = useState('Solo poker with bots you can add or remove.');
  const [soloLogs, setSoloLogs] = useState<string[]>([]);
  const [soloBoard, setSoloBoard] = useState<PokerCard[]>([]);
  const [soloPot, setSoloPot] = useState(0);
  const [soloCurrentBet, setSoloCurrentBet] = useState(BIG_BLIND);
  const [soloRaiseAmount, setSoloRaiseAmount] = useState(DEFAULT_RAISE);
  const [soloPhase, setSoloPhase] = useState<'waiting' | 'preflop' | 'flop' | 'turn' | 'river'>('waiting');
  const [soloActiveSeat, setSoloActiveSeat] = useState(0);
  const [soloSeats, setSoloSeats] = useState<SoloSeat[]>([
    { id: 'you', name: displayName, cards: [], chips: 1000, bet: 0, folded: false, acted: false, isBot: false },
    { id: 'bot-1', name: 'CPU 1', cards: [], chips: 1000, bet: 0, folded: false, acted: false, isBot: true },
  ]);
  const [soloDeck, setSoloDeck] = useState<PokerCard[]>([]);

  function addSoloLog(text: string) {
    setSoloLogs((prev) => [text, ...prev].slice(0, 14));
  }

  function addSoloBot() {
    if (soloPhase !== 'waiting') return;
    setSoloSeats((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        name: `CPU ${prev.filter((s) => s.isBot).length + 1}`,
        cards: [],
        chips: 1000,
        bet: 0,
        folded: false,
        acted: false,
        isBot: true,
      },
    ]);
  }

  function removeSoloBot() {
    if (soloPhase !== 'waiting') return;
    const bots = soloSeats.filter((s) => s.isBot);
    if (bots.length <= 1) return;
    const removeId = bots[bots.length - 1].id;
    setSoloSeats((prev) => prev.filter((s) => s.id !== removeId));
  }

  function startSoloHand() {
    const nextDeck = makeDeck();
    const nextSeats = soloSeats.map((seat) => ({
      ...seat,
      cards: [nextDeck.shift()!, nextDeck.shift()!],
      bet: 0,
      folded: false,
      acted: false,
    }));
    nextSeats[0].bet = SMALL_BLIND;
    nextSeats[1].bet = BIG_BLIND;
    nextSeats[0].chips -= SMALL_BLIND;
    nextSeats[1].chips -= BIG_BLIND;

    setSoloDeck(nextDeck);
    setSoloBoard([]);
    setSoloPot(SMALL_BLIND + BIG_BLIND);
    setSoloCurrentBet(BIG_BLIND);
    setSoloPhase('preflop');
    setSoloSeats(nextSeats);
    setSoloActiveSeat(nextSeats.length > 2 ? 2 : 0);
    setSoloStatus(`${nextSeats[nextSeats.length > 2 ? 2 : 0].name} to act.`);
    addSoloLog('Poker hand started.');
  }

  function finishSoloStreet(nextSeats: SoloSeat[], nextDeck: PokerCard[]) {
    if (activePlayersCount(nextSeats) <= 1) {
      const winner = nextSeats.find((seat) => !seat.folded)!;
      if (!winner.isBot) addChips(soloPot);
      winner.chips += soloPot;
      setSoloSeats(nextSeats.map((seat) => ({ ...seat, cards: [], bet: 0, acted: false, folded: false })));
      setSoloBoard([]);
      setSoloDeck(nextDeck);
      setSoloPot(0);
      setSoloCurrentBet(BIG_BLIND);
      setSoloPhase('waiting');
      setSoloTimer(soloTimerSetting);
      setSoloStatus(`${winner.name} wins the pot.`);
      addSoloLog(`${winner.name} wins the hand.`);
      return;
    }

    if (!allMatched(nextSeats, soloCurrentBet)) {
      const next = nextLiveSeat(nextSeats, soloActiveSeat);
      setSoloSeats(nextSeats);
      setSoloDeck(nextDeck);
      setSoloActiveSeat(next);
      setSoloStatus(`${nextSeats[next]?.name || 'Player'} to act.`);
      return;
    }

    if (soloPhase === 'preflop') {
      setSoloBoard([nextDeck.shift()!, nextDeck.shift()!, nextDeck.shift()!]);
      setSoloPhase('flop');
    } else if (soloPhase === 'flop') {
      setSoloBoard((prev) => [...prev, nextDeck.shift()!]);
      setSoloPhase('turn');
    } else if (soloPhase === 'turn') {
      setSoloBoard((prev) => [...prev, nextDeck.shift()!]);
      setSoloPhase('river');
    } else {
      const live = nextSeats.filter((seat) => !seat.folded);
      const winner = live.reduce((best, seat) =>
        handScore([...seat.cards, ...soloBoard]) > handScore([...best.cards, ...soloBoard]) ? seat : best
      );
      if (!winner.isBot) addChips(soloPot);
      winner.chips += soloPot;
      setSoloSeats(nextSeats.map((seat) => ({ ...seat, cards: [], bet: 0, acted: false, folded: false })));
      setSoloBoard([]);
      setSoloDeck(nextDeck);
      setSoloPot(0);
      setSoloCurrentBet(BIG_BLIND);
      setSoloPhase('waiting');
      setSoloTimer(soloTimerSetting);
      setSoloStatus(`${winner.name} wins the showdown.`);
      addSoloLog(`${winner.name} wins the showdown.`);
      return;
    }

    const reset = nextSeats.map((seat) => ({ ...seat, bet: 0, acted: false }));
    const nxt = reset.findIndex((seat) => !seat.folded);
    setSoloSeats(reset);
    setSoloDeck(nextDeck);
    setSoloCurrentBet(0);
    setSoloActiveSeat(nxt);
    setSoloStatus(`${reset[nxt]?.name || 'Player'} to act.`);
  }

  function soloAct(action: BetAction) {
    if (soloPhase === 'waiting') return;
    if (soloActiveSeat !== 0) return;
    const nextDeck = [...soloDeck];
    const nextSeats = soloSeats.map((seat) => ({ ...seat, cards: [...seat.cards] }));
    const me = nextSeats[0];
    if (action === 'fold') {
      me.folded = true;
      me.acted = true;
      finishSoloStreet(nextSeats, nextDeck);
      return;
    }
    if (action === 'check') {
      if (me.bet !== soloCurrentBet) return;
      me.acted = true;
      finishSoloStreet(nextSeats, nextDeck);
      return;
    }
    if (action === 'call') {
      const owe = Math.max(0, soloCurrentBet - me.bet);
      me.chips -= owe;
      me.bet += owe;
      me.acted = true;
      setSoloPot((prev) => prev + owe);
      finishSoloStreet(nextSeats, nextDeck);
      return;
    }
    const target = soloCurrentBet + soloRaiseAmount;
    const owe = Math.max(0, target - me.bet);
    me.chips -= owe;
    me.bet += owe;
    me.acted = true;
    nextSeats.forEach((seat, idx) => {
      if (idx !== 0 && !seat.folded) seat.acted = false;
    });
    setSoloCurrentBet(target);
    setSoloPot((prev) => prev + owe);
    finishSoloStreet(nextSeats, nextDeck);
  }

  useEffect(() => {
    if (multiplayer) return;
    if (soloPhase !== 'waiting') return;
    setSoloTimer(soloTimerSetting);
    const id = setInterval(() => {
      setSoloTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [multiplayer, soloPhase, soloTimerSetting]);

  useEffect(() => {
    if (multiplayer) return;
    if (soloPhase !== 'waiting') return;
    if (soloTimer > 0) return;
    startSoloHand();
  }, [multiplayer, soloTimer, soloPhase]);

  useEffect(() => {
    if (multiplayer) return;
    if (soloPhase === 'waiting') return;
    const seat = soloSeats[soloActiveSeat];
    if (!seat || !seat.isBot) return;
    const id = setTimeout(() => {
      const nextDeck = [...soloDeck];
      const nextSeats = soloSeats.map((s) => ({ ...s, cards: [...s.cards] }));
      const bot = nextSeats[soloActiveSeat];
      const owe = Math.max(0, soloCurrentBet - bot.bet);

      if (owe > 0 && handScore(bot.cards) < 1000) {
        bot.folded = true;
        bot.acted = true;
      } else if (owe > 0) {
        bot.chips -= owe;
        bot.bet += owe;
        bot.acted = true;
        setSoloPot((prev) => prev + owe);
      } else {
        bot.acted = true;
      }
      finishSoloStreet(nextSeats, nextDeck);
    }, 900);
    return () => clearTimeout(id);
  }, [multiplayer, soloPhase, soloActiveSeat, soloSeats, soloCurrentBet, soloDeck, soloBoard]);

  // ONLINE
  const { sharedState, pushState, players: roomPlayers } = useSharedRoom<OnlineState>(
    'cardhub-poker-main',
    `${displayName} (${playerId.slice(-4)})`,
    useMemo(() => initialOnlineState(), [])
  );

  const seats = Array.isArray(sharedState?.seats) ? sharedState.seats : [];
  const spectators = Array.isArray(sharedState?.spectators) ? sharedState.spectators : [];
  const board = Array.isArray(sharedState?.board) ? sharedState.board : [];
  const deck = Array.isArray(sharedState?.deck) ? sharedState.deck : [];
  const logs = Array.isArray(sharedState?.logs) ? sharedState.logs : [];
  const pot = typeof sharedState?.pot === 'number' ? sharedState.pot : 0;
  const currentBet = typeof sharedState?.currentBet === 'number' ? sharedState.currentBet : BIG_BLIND;
  const raiseAmount = typeof sharedState?.raiseAmount === 'number' ? sharedState.raiseAmount : DEFAULT_RAISE;
  const activeSeat = typeof sharedState?.activeSeat === 'number' ? sharedState.activeSeat : -1;
  const phase = sharedState?.phase || 'ready';
  const timer = typeof sharedState?.timer === 'number' ? sharedState.timer : ONLINE_TIMER;
  const handId = typeof sharedState?.handId === 'number' ? sharedState.handId : 0;
  const mySeatIndex = seats.findIndex((seat) => seat.playerId === playerId);
  const mySeat = mySeatIndex >= 0 ? seats[mySeatIndex] : null;
  const isSpectator = mySeatIndex < 0;

  const latestRef = useRef({ seats, spectators, sharedState, mySeatIndex, phase, activeSeat });
  useEffect(() => {
    latestRef.current = { seats, spectators, sharedState, mySeatIndex, phase, activeSeat };
  }, [seats, spectators, sharedState, mySeatIndex, phase, activeSeat]);

  const processedHandRef = useRef<number>(-1);

  function push(next: OnlineState) {
    pushState(next);
  }

  function withLog(state: OnlineState, text: string) {
    return { ...state, logs: [text, ...state.logs].slice(0, 14) };
  }

  function joinSeat() {
    if (mySeatIndex >= 0) return;
    push({
      ...sharedState,
      seats: [
        ...seats,
        {
          id: `seat-${Date.now()}`,
          playerId,
          name: displayName,
          cards: [],
          chips: 1000,
          bet: 0,
          folded: false,
          acted: false,
          ready: false,
        },
      ],
      spectators: spectators.filter((s) => s.playerId !== playerId),
      status: `${displayName} joined the table.`,
    });
  }

  function leaveSeat() {
    if (mySeatIndex < 0) return;

    const currentSeat = seats[mySeatIndex];
    const nextSeats = seats.filter((_, i) => i !== mySeatIndex);

    let nextState: OnlineState = withLog(
      {
        ...sharedState,
        seats: nextSeats,
        spectators: spectators.some((s) => s.playerId === playerId)
          ? spectators
          : [...spectators, { playerId, name: displayName }],
        status: `${displayName} left the table.`,
      },
      `${displayName} left the table.`
    );

    if (phase !== 'ready' && phase !== 'waiting') {
      if (activePlayersCount(seats) <= 2) {
        const winner = nextSeats.find((seat) => !seat.folded);
        if (winner && winner.playerId === playerId) {
          addChips(pot);
        }
        nextState = withLog(
          {
            ...nextState,
            phase: 'ready',
            board: [],
            deck: [],
            pot: 0,
            currentBet: BIG_BLIND,
            timer: ONLINE_TIMER,
            status: winner ? `${winner.name} wins the pot.` : 'Table reset after player left.',
          },
          winner ? `${winner.name} wins the pot.` : 'Table reset after player left.'
        );
      } else if (activeSeat === mySeatIndex) {
        const nxt = nextLiveSeat(seats.filter((_, i) => i !== mySeatIndex), mySeatIndex - 1 < 0 ? 0 : mySeatIndex - 1);
        nextState = {
          ...nextState,
          activeSeat: nxt,
          status: nxt >= 0 ? `${nextSeats[nxt]?.name || 'Player'} to act.` : nextState.status,
        };
      }
    }

    push(nextState);
  }

  function toggleReady() {
    if (mySeatIndex < 0) return;
    push({
      ...sharedState,
      seats: seats.map((seat, idx) =>
        idx === mySeatIndex ? { ...seat, ready: !seat.ready } : seat
      ),
    });
  }

  function startOnlineHand() {
    const readySeats = seats.filter((seat) => seat.ready);
    if (readySeats.length < 2) {
      push({
        ...sharedState,
        timer: ONLINE_TIMER,
        status: 'Need at least 2 ready players to start the next poker hand.',
      });
      return;
    }

    const nextDeck = makeDeck();
    const nextSeats = seats.map((seat) =>
      seat.ready
        ? {
            ...seat,
            cards: [nextDeck.shift()!, nextDeck.shift()!],
            bet: 0,
            folded: false,
            acted: false,
          }
        : seat
    );

    const blindSeats = nextSeats.filter((seat) => seat.ready);
    const sbSeat = nextSeats.findIndex((seat) => seat.id === blindSeats[0].id);
    const bbSeat = nextSeats.findIndex((seat) => seat.id === blindSeats[1].id);

    nextSeats[sbSeat].bet = SMALL_BLIND;
    nextSeats[sbSeat].chips -= SMALL_BLIND;
    nextSeats[bbSeat].bet = BIG_BLIND;
    nextSeats[bbSeat].chips -= BIG_BLIND;

    const firstToAct = nextSeats.length > 2 ? nextSeats.findIndex((seat, idx) => idx !== sbSeat && idx !== bbSeat && seat.ready) : sbSeat;

    push(
      withLog(
        {
          ...sharedState,
          seats: nextSeats,
          spectators,
          deck: nextDeck,
          board: [],
          pot: SMALL_BLIND + BIG_BLIND,
          currentBet: BIG_BLIND,
          phase: 'preflop',
          activeSeat: firstToAct,
          timer: ONLINE_TIMER,
          handId: handId + 1,
          status: `${nextSeats[firstToAct]?.name || 'Player'} to act.`,
        },
        'Poker hand started.'
      )
    );
  }

  function finishOnlineStreet(nextSeats: OnlineSeat[], nextDeck: PokerCard[]) {
    if (activePlayersCount(nextSeats) <= 1) {
      const winner = nextSeats.find((seat) => !seat.folded)!;
      let nextState = withLog(
        {
          ...sharedState,
          seats: nextSeats.map((seat) => ({ ...seat, cards: [], bet: 0, acted: false, folded: false, ready: false })),
          deck: [],
          board: [],
          pot: 0,
          currentBet: BIG_BLIND,
          phase: 'ready',
          activeSeat: -1,
          timer: ONLINE_TIMER,
          status: `${winner.name} wins the pot.`,
        },
        `${winner.name} wins the hand.`
      );
      if (winner.playerId === playerId) addChips(pot);
      push(nextState);
      return;
    }

    if (!allMatched(nextSeats, currentBet)) {
      const nxt = nextLiveSeat(nextSeats, activeSeat);
      push({
        ...sharedState,
        seats: nextSeats,
        deck: nextDeck,
        activeSeat: nxt,
        status: `${nextSeats[nxt]?.name || 'Player'} to act.`,
      });
      return;
    }

    if (phase === 'preflop') {
      const nextBoard = [nextDeck.shift()!, nextDeck.shift()!, nextDeck.shift()!];
      const reset = nextSeats.map((seat) => ({ ...seat, bet: 0, acted: false }));
      const nxt = reset.findIndex((seat) => seat.ready && !seat.folded);
      push(
        withLog(
          {
            ...sharedState,
            seats: reset,
            deck: nextDeck,
            board: nextBoard,
            currentBet: 0,
            phase: 'flop',
            activeSeat: nxt,
            status: `${reset[nxt]?.name || 'Player'} to act.`,
          },
          'Flop dealt.'
        )
      );
      return;
    }

    if (phase === 'flop') {
      const nextBoard = [...board, nextDeck.shift()!];
      const reset = nextSeats.map((seat) => ({ ...seat, bet: 0, acted: false }));
      const nxt = reset.findIndex((seat) => seat.ready && !seat.folded);
      push(
        withLog(
          {
            ...sharedState,
            seats: reset,
            deck: nextDeck,
            board: nextBoard,
            currentBet: 0,
            phase: 'turn',
            activeSeat: nxt,
            status: `${reset[nxt]?.name || 'Player'} to act.`,
          },
          'Turn dealt.'
        )
      );
      return;
    }

    if (phase === 'turn') {
      const nextBoard = [...board, nextDeck.shift()!];
      const reset = nextSeats.map((seat) => ({ ...seat, bet: 0, acted: false }));
      const nxt = reset.findIndex((seat) => seat.ready && !seat.folded);
      push(
        withLog(
          {
            ...sharedState,
            seats: reset,
            deck: nextDeck,
            board: nextBoard,
            currentBet: 0,
            phase: 'river',
            activeSeat: nxt,
            status: `${reset[nxt]?.name || 'Player'} to act.`,
          },
          'River dealt.'
        )
      );
      return;
    }

    const live = nextSeats.filter((seat) => seat.ready && !seat.folded);
    const winner = live.reduce((best, seat) =>
      handScore([...seat.cards, ...board]) > handScore([...best.cards, ...board]) ? seat : best
    );

    if (winner.playerId === playerId) addChips(pot);

    push(
      withLog(
        {
          ...sharedState,
          seats: nextSeats.map((seat) => ({
            ...seat,
            cards: [],
            bet: 0,
            acted: false,
            folded: false,
            ready: false,
          })),
          deck: [],
          board: [],
          pot: 0,
          currentBet: BIG_BLIND,
          phase: 'ready',
          activeSeat: -1,
          timer: ONLINE_TIMER,
          status: `${winner.name} wins the showdown.`,
        },
        `${winner.name} wins the showdown.`
      )
    );
  }

  function onlineAct(action: BetAction) {
    if (mySeatIndex < 0) return;
    if (activeSeat !== mySeatIndex) return;
    if (phase === 'ready' || phase === 'waiting') return;

    const nextDeck = [...deck];
    const nextSeats = seats.map((seat) => ({ ...seat, cards: [...seat.cards] }));
    const me = nextSeats[mySeatIndex];

    if (action === 'fold') {
      me.folded = true;
      me.acted = true;
      finishOnlineStreet(nextSeats, nextDeck);
      return;
    }

    if (action === 'check') {
      if (me.bet !== currentBet) return;
      me.acted = true;
      finishOnlineStreet(nextSeats, nextDeck);
      return;
    }

    if (action === 'call') {
      const owe = Math.max(0, currentBet - me.bet);
      if (owe > me.chips) return;
      me.chips -= owe;
      me.bet += owe;
      me.acted = true;
      push({
        ...sharedState,
        pot: pot + owe,
        seats: nextSeats,
      });
      finishOnlineStreet(nextSeats, nextDeck);
      return;
    }

    const target = currentBet + raiseAmount;
    const owe = Math.max(0, target - me.bet);
    if (owe > me.chips) return;
    me.chips -= owe;
    me.bet += owe;
    me.acted = true;
    nextSeats.forEach((seat, idx) => {
      if (idx !== mySeatIndex && seat.ready && !seat.folded) seat.acted = false;
    });
    push({
      ...sharedState,
      pot: pot + owe,
      currentBet: target,
      seats: nextSeats,
    });
    finishOnlineStreet(nextSeats, nextDeck);
  }

  useEffect(() => {
    if (!multiplayer) return;
    if (seats.length < 1) return;
    if (mySeatIndex !== 0) return;

    const id = setInterval(() => {
      push({
        ...sharedState,
        timer: Math.max(0, timer - 1),
      });
    }, 1000);

    return () => clearInterval(id);
  }, [multiplayer, seats.length, mySeatIndex, timer, sharedState]);

  useEffect(() => {
    if (!multiplayer) return;
    if (mySeatIndex !== 0) return;
    if (timer > 0) return;
    if (phase === 'ready') {
      startOnlineHand();
    }
  }, [multiplayer, timer, phase, mySeatIndex, seats]);

  useEffect(() => {
    if (!multiplayer) return;
    if (phase === 'ready' || phase === 'waiting') return;
    const seat = seats[activeSeat];
    if (!seat || !seat.playerId || seat.playerId === playerId) return;

    const id = setTimeout(() => {
      const nextDeck = [...deck];
      const nextSeats = seats.map((s) => ({ ...s, cards: [...s.cards] }));
      const bot = nextSeats[activeSeat];
      const owe = Math.max(0, currentBet - bot.bet);

      // human-only online: no CPU logic, just simple fallback auto-action so table never freezes
      if (owe > 0) {
        if (owe > bot.chips) {
          bot.folded = true;
          bot.acted = true;
        } else {
          bot.chips -= owe;
          bot.bet += owe;
          bot.acted = true;
        }
      } else {
        bot.acted = true;
      }

      finishOnlineStreet(nextSeats, nextDeck);
    }, 900);

    return () => clearTimeout(id);
  }, [multiplayer, phase, activeSeat, seats, currentBet, deck, board, pot]);

  useEffect(() => {
    if (!multiplayer) return;
    const cleanup = () => {
      try {
        if (latestRef.current.mySeatIndex >= 0) leaveSeat();
      } catch {}
    };
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('pagehide', cleanup);
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [multiplayer]);

  return (
    <GameShell
      title="Poker"
      subtitle={multiplayer ? 'Online poker with spectators, ready-yourself-only flow, and synchronized 20 second table timing.' : 'Solo poker with local bots you can add or remove freely.'}
    >
      <div style={{ '--accent-glow': accentGlow } as any} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <WagerStylePanel
            chips={account.bankroll}
            title="Poker Table"
            subtitle={
              multiplayer
                ? `Current raise amount: $${raiseAmount} • ${isSpectator ? 'Spectating' : 'Seated'}`
                : `Current raise amount: $${soloRaiseAmount} • Bots: ${soloSeats.filter((s) => s.isBot).length}`
            }
            action={!multiplayer ? undefined : isSpectator ? joinSeat : undefined}
            actionLabel={isSpectator ? 'Join Seat' : undefined}
          />

          <TurnBanner
            title={
              multiplayer
                ? phase === 'ready'
                  ? `Next hand in ${timer}s`
                  : activeSeat >= 0
                    ? `${seats[activeSeat]?.name} to act`
                    : 'Resolving hand'
                : soloPhase === 'waiting'
                  ? `Next hand in ${soloTimer}s`
                  : `${soloSeats[soloActiveSeat]?.name} to act`
            }
            subtitle={
              multiplayer
                ? (sharedState?.status || 'Join the table or spectate.')
                : soloStatus
            }
          />

          <div className="rounded-[2rem] border border-white/10 p-6 shadow-2xl" style={{ '--accent-glow': accentGlow, background: 'radial-gradient(circle at center, var(--accent-glow), rgba(9,9,11,1) 72%)' } as any}>
            <section>
              <h2 className="text-lg font-medium text-zinc-200">Community Cards</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {(multiplayer ? board : soloBoard).map((card) => (
                  <span key={card.id} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-6 shadow-lg">
                    <Card card={parseCard(card)} />
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-zinc-300">
                Pot: ${multiplayer ? pot : soloPot} • Current Bet: ${multiplayer ? currentBet : soloCurrentBet}
              </p>
            </section>
          </div>
        </div>

        <div className="space-y-4">
          {!multiplayer ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-lg font-semibold">Seats</div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={addSoloBot} disabled={soloPhase !== 'waiting'}>
                      Add CPU
                    </button>
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={removeSoloBot} disabled={soloPhase !== 'waiting'}>
                      Remove CPU
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="mb-2 text-sm text-zinc-300">Raise Amount: ${soloRaiseAmount}</div>
                  <input
                    className="w-full"
                    type="range"
                    min={20}
                    max={200}
                    step={10}
                    value={soloRaiseAmount}
                    onChange={(e) => setSoloRaiseAmount(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-3">
                  {soloSeats.map((seat, idx) => (
                    <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="font-semibold">{seat.name}</div>
                      <div className="mt-1 text-sm text-zinc-400">
                        Chips ${seat.chips} • Bet ${seat.bet} {seat.folded ? '• Folded' : ''}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {seat.cards.map((card) => (
                          <Card key={card.id} card={parseCard(card)} hidden={idx !== 0 && soloPhase !== 'waiting'} />
                        ))}
                      </div>

                      {idx === 0 && soloPhase !== 'waiting' && soloActiveSeat === 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => soloAct('fold')}>Fold</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => soloAct('check')}>Check</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => soloAct('call')}>Call</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => soloAct('raise')}>Raise</button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold">Action Log</div>
                <div className="mt-3">
                  <ActionLog items={soloLogs} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 text-lg font-semibold">Active Seats</div>

                <div className="mb-4">
                  <div className="mb-2 text-sm text-zinc-300">Raise Amount: ${raiseAmount}</div>
                  {mySeatIndex >= 0 ? (
                    <input
                      className="w-full"
                      type="range"
                      min={20}
                      max={200}
                      step={10}
                      value={raiseAmount}
                      onChange={(e) =>
                        push({
                          ...sharedState,
                          raiseAmount: Number(e.target.value),
                        })
                      }
                    />
                  ) : null}
                </div>

                <div className="space-y-3">
                  {seats.map((seat, idx) => (
                    <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{seat.name}</div>
                          <div className="mt-1 text-sm text-zinc-400">
                            Chips ${seat.chips} • Bet ${seat.bet} {seat.folded ? '• Folded' : ''}
                          </div>
                        </div>
                        {idx === mySeatIndex ? (
                          <button
                            className={`rounded-lg px-3 py-2 text-sm ${seat.ready ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-white'}`}
                            onClick={toggleReady}
                            disabled={phase !== 'ready'}
                          >
                            {seat.ready ? 'Ready' : 'Unready'}
                          </button>
                        ) : (
                          <div className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300">
                            {seat.ready ? 'Ready' : 'Not Ready'}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {seat.cards.map((card) => (
                          <Card key={card.id} card={parseCard(card)} hidden={idx !== mySeatIndex && phase !== 'ready'} />
                        ))}
                      </div>

                      {idx === mySeatIndex && activeSeat === mySeatIndex && phase !== 'ready' ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => onlineAct('fold')}>Fold</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => onlineAct('check')}>Check</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => onlineAct('call')}>Call</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => onlineAct('raise')}>Raise</button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {!seats.length ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">
                      No seated players yet.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold">Action Log</div>
                <div className="mt-3">
                  <ActionLog items={logs} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold">Spectators</div>
                <div className="mt-2 text-sm text-zinc-400">
                  {spectators.length ? spectators.map((s) => s.name).join(', ') : 'No spectators'}
                </div>
                <div className="mt-3 text-xs text-zinc-500">Connected devices: {roomPlayers.length}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </GameShell>
  );
}
