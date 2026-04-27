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

type BJCard = {
  id: string;
  rank: Rank;
  suit: Suit;
};

type HandState = {
  cards: BJCard[];
  total: number;
  stood: boolean;
  busted: boolean;
  doubled: boolean;
  finished: boolean;
};

type SoloSeat = {
  id: string;
  name: string;
  hands: HandState[];
  activeHand: number;
};

type MultiSeat = {
  id: string;
  playerId: string | null;
  name: string;
  hands: HandState[];
  activeHand: number;
  wager: number;
  pairBet: number;
  threeBet: number;
};

type MultiState = {
  seats: MultiSeat[];
  spectators: Array<{ playerId: string; name: string }>;
  deck: BJCard[];
  dealer: BJCard[];
  dealerTotal: number;
  phase: 'betting' | 'player';
  activeSeat: number;
  timer: number;
  logs: string[];
  status: string;
};

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const ONLINE_TIMER = 20;
const WAGER_OPTIONS = [10, 25, 50, 100, 250, 500];
const SIDE_OPTIONS = [0, 5, 10];

function makeDeck(): BJCard[] {
  const deck: BJCard[] = [];
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

function parseValue(rank: Rank) {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return Number(rank);
}

function handTotal(cards: BJCard[]) {
  let total = cards.reduce((sum, card) => sum + parseValue(card.rank), 0);
  let aces = cards.filter((card) => card.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function sameRank(a?: BJCard, b?: BJCard) {
  return !!a && !!b && a.rank === b.rank;
}

function isFlush(cards: BJCard[]) {
  return cards.length === 3 && cards.every((c) => c.suit === cards[0].suit);
}

function isThreeKind(cards: BJCard[]) {
  return cards.length === 3 && cards.every((c) => c.rank === cards[0].rank);
}

function isStraight(cards: BJCard[]) {
  if (cards.length !== 3) return false;
  const vals = cards
    .map((c) => {
      if (c.rank === 'A') return 1;
      if (c.rank === 'J') return 11;
      if (c.rank === 'Q') return 12;
      if (c.rank === 'K') return 13;
      return Number(c.rank);
    })
    .sort((a, b) => a - b);

  const normal = vals[1] === vals[0] + 1 && vals[2] === vals[1] + 1;
  const broadway = vals[0] === 1 && vals[1] === 12 && vals[2] === 13;
  return normal || broadway;
}

function evaluate21Plus3(cards: BJCard[]) {
  if (cards.length !== 3) return 0;
  if (isThreeKind(cards)) return 30;
  if (isStraight(cards) && isFlush(cards)) return 10;
  if (isFlush(cards)) return 5;
  if (isStraight(cards)) return 3;
  return 0;
}

function parseCard(card: BJCard) {
  return { rank: card.rank, suit: card.suit };
}

function makeEmptyHand(): HandState {
  return {
    cards: [],
    total: 0,
    stood: false,
    busted: false,
    doubled: false,
    finished: false,
  };
}

function payoutRows() {
  return [
    'Main win: 1:1',
    'Push: wager returned',
    'Blackjack: 3:2',
    'Perfect Pairs: 11:1',
    '21+3 Straight: 3:1',
    '21+3 Flush: 5:1',
    '21+3 Straight Flush: 10:1',
    '21+3 Trips: 30:1',
  ];
}

function nextPlayableSeat<T extends { hands: HandState[]; activeHand: number; playerId?: string | null }>(
  seats: T[],
  from: number,
  seatIsActive: (seat: T) => boolean
) {
  let idx = from;
  for (let step = 0; step < seats.length; step += 1) {
    idx = (idx + 1) % seats.length;
    const seat = seats[idx];
    if (!seatIsActive(seat)) continue;
    const hand = seat.hands[seat.activeHand];
    if (hand && !hand.finished) return idx;
  }
  return -1;
}

function hasPlayableHands<T extends { hands: HandState[] }>(seat: T) {
  return seat.hands.some((hand) => !hand.finished);
}


function chipButton(amount: number, current: number, onClick: () => void, label?: string) {
  const active = amount === current;
  return (
    <button
      key={`${label || 'chip'}-${amount}`}
      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
        active
          ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
          : 'border-white/10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
      }`}
      onClick={onClick}
    >
      {label ? `${label} $${amount}` : `$${amount}`}
    </button>
  );
}

function WagerPanel({
  bankroll,
  wager,
  setWager,
  onJoin,
  joinLabel,
  helper,
  pairBet,
  threeBet,
  setPairBet,
  setThreeBet,
}: {
  bankroll: number;
  wager: number;
  setWager: (v: number) => void;
  onJoin?: () => void;
  joinLabel?: string;
  helper: string;
  pairBet: number;
  threeBet: number;
  setPairBet: (n: number) => void;
  setThreeBet: (n: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Table Wager</div>
          <div className="mt-1 text-sm text-zinc-300">Bankroll: <span className="text-emerald-300 font-semibold">${bankroll}</span></div>
        </div>
        {onJoin ? (
          <button
            className="rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-black"
            onClick={onJoin}
          >
            {joinLabel}
          </button>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {WAGER_OPTIONS.map((amount) => {
          const active = amount === wager;
          return (
            <button
              key={amount}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                active
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                  : 'border-white/10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
              }`}
              onClick={() => setWager(amount)}
            >
              ${amount}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-sm text-zinc-300">Perfect Pairs</div>
          <div className="flex flex-wrap gap-2">
            {SIDE_OPTIONS.map((amount) => chipButton(amount, pairBet, () => setPairBet(amount), 'Perfect Pairs'))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm text-zinc-300">21+3</div>
          <div className="flex flex-wrap gap-2">
            {SIDE_OPTIONS.map((amount) => chipButton(amount, threeBet, () => setThreeBet(amount), '21+3'))}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-zinc-300">{helper}</div>
    </div>
  );
}

function SideBets({
  pairBet,
  threeBet,
  setPairBet,
  setThreeBet,
}: {
  pairBet: number;
  threeBet: number;
  setPairBet: (n: number) => void;
  setThreeBet: (n: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_38px_var(--accent-glow)]">
      <div className="mb-4 text-lg font-semibold">Side Bets</div>

      <div className="mb-4">
        <div className="mb-2 text-sm text-zinc-300">Perfect Pairs</div>
        <div className="flex flex-wrap gap-2">
          {SIDE_OPTIONS.map((amount) => {
            const active = amount === pairBet;
            return (
              <button
                key={`pair-${amount}`}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  active
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                    : 'border-white/10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                }`}
                onClick={() => setPairBet(amount)}
              >
                Perfect Pairs ${amount}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm text-zinc-300">21+3</div>
        <div className="flex flex-wrap gap-2">
          {SIDE_OPTIONS.map((amount) => {
            const active = amount === threeBet;
            return (
              <button
                key={`three-${amount}`}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  active
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                    : 'border-white/10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                }`}
                onClick={() => setThreeBet(amount)}
              >
                21+3 ${amount}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PayoutChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_38px_var(--accent-glow)]">
      <div className="mb-3 text-lg font-semibold">Payout Chart</div>
      <div className="space-y-2 text-sm text-zinc-300">
        {payoutRows().map((row) => (
          <div key={row}>{row}</div>
        ))}
      </div>
    </div>
  );
}

function settlePlayerMainPayout(
  hand: HandState,
  dealerCards: BJCard[],
  dealerTotal: number,
  baseBet: number,
  addChips: (amount: number) => void
) {
  const actualBet = hand.doubled ? baseBet * 2 : baseBet;
  const playerBlackjack = hand.cards.length === 2 && hand.total === 21;
  const dealerBlackjack = dealerCards.length === 2 && dealerTotal === 21;

  if (hand.busted) return;
  if (playerBlackjack && !dealerBlackjack) {
    addChips(Math.floor(actualBet * 2.5));
  } else if (dealerBlackjack && !playerBlackjack) {
    return;
  } else if (dealerTotal > 21 || hand.total > dealerTotal) {
    addChips(actualBet * 2);
  } else if (hand.total === dealerTotal) {
    addChips(actualBet);
  }
}

export default function BlackjackPage() {
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
  const soloTimerSetting = readyAutoStartSeconds || 15;

  const playerIdRef = useRef('');
  if (!playerIdRef.current) {
    playerIdRef.current = `bj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  const playerId = playerIdRef.current;

  const [soloWager, setSoloWager] = useState(25);
  const [soloPairBet, setSoloPairBet] = useState(5);
  const [soloThreeBet, setSoloThreeBet] = useState(5);

  const [multiWager, setMultiWager] = useState(25);
  const [multiPairBet, setMultiPairBet] = useState(5);
  const [multiThreeBet, setMultiThreeBet] = useState(5);

  // SOLO
  const [soloSeats, setSoloSeats] = useState<SoloSeat[]>([
    { id: 'human', name: displayName, hands: [makeEmptyHand()], activeHand: 0 },
    { id: 'cpu-1', name: 'CPU 1', hands: [makeEmptyHand()], activeHand: 0 },
  ]);
  const [soloDealer, setSoloDealer] = useState<BJCard[]>([]);
  const [soloDealerTotal, setSoloDealerTotal] = useState(0);
  const [soloDeck, setSoloDeck] = useState<BJCard[]>([]);
  const [soloPhase, setSoloPhase] = useState<'betting' | 'player'>('betting');
  const [soloTimerLeft, setSoloTimerLeft] = useState(soloTimerSetting);
  const [soloLogs, setSoloLogs] = useState<string[]>([]);
  const [soloStatus, setSoloStatus] = useState('Join the table, tune your bets, and let the next round begin.');
  const soloPlayerSeat = soloSeats[0];
  const soloPlayerHand = soloPlayerSeat?.hands[soloPlayerSeat.activeHand];

  function addSoloLog(text: string) {
    setSoloLogs((prev) => [text, ...prev].slice(0, 14));
  }

  function addSoloCpu() {
    if (soloPhase !== 'betting') return;
    setSoloSeats((prev) => [
      ...prev,
      { id: `cpu-${Date.now()}`, name: `CPU ${prev.length}`, hands: [makeEmptyHand()], activeHand: 0 },
    ]);
  }

  function removeSoloCpu() {
    if (soloPhase !== 'betting') return;
    if (soloSeats.length <= 2) return;
    setSoloSeats((prev) => prev.slice(0, -1));
  }

  function startSoloRound() {
    const totalCommit = soloWager + soloPairBet + soloThreeBet;
    if (!canAfford(totalCommit)) return;
    spendChips(totalCommit);

    const nextDeck = makeDeck();
    const nextSeats = soloSeats.map((seat) => ({
      ...seat,
      activeHand: 0,
      hands: [{
        cards: [nextDeck.shift()!, nextDeck.shift()!],
        total: 0,
        stood: false,
        busted: false,
        doubled: false,
        finished: false,
      }],
    })).map((seat) => ({
      ...seat,
      hands: seat.hands.map((hand) => ({ ...hand, total: handTotal(hand.cards) })),
    }));

    const nextDealer = [nextDeck.shift()!, nextDeck.shift()!];
    const dealerUp = nextDealer[0];

    const myCards = nextSeats[0].hands[0].cards;
    if (sameRank(myCards[0], myCards[1]) && soloPairBet > 0) {
      addChips(soloPairBet * 12);
    }
    const threePayout = evaluate21Plus3([myCards[0], myCards[1], dealerUp]);
    if (threePayout > 0 && soloThreeBet > 0) {
      addChips(soloThreeBet + soloThreeBet * threePayout);
    }

    setSoloSeats(nextSeats);
    setSoloDeck(nextDeck);
    setSoloDealer(nextDealer);
    setSoloDealerTotal(handTotal(nextDealer));
    setSoloPhase('player');
    setSoloStatus('Your turn.');
    addSoloLog('Blackjack round started.');
  }

  function finishSoloRound(nextSeats: SoloSeat[], nextDeck: BJCard[]) {
    const cpuSeats = nextSeats.map((seat) => ({
      ...seat,
      hands: seat.hands.map((hand) => ({ ...hand, cards: [...hand.cards] })),
    }));

    for (let i = 1; i < cpuSeats.length; i += 1) {
      const hand = cpuSeats[i].hands[0];
      while (!hand.finished) {
        if (hand.total < 16) {
          hand.cards.push(nextDeck.shift()!);
          hand.total = handTotal(hand.cards);
          if (hand.total > 21) {
            hand.busted = true;
            hand.finished = true;
          }
        } else {
          hand.stood = true;
          hand.finished = true;
        }
      }
    }

    let nextDealer = [...soloDealer];
    let nextDealerTotal = handTotal(nextDealer);
    while (nextDealerTotal < 17 && nextDeck.length) {
      nextDealer.push(nextDeck.shift()!);
      nextDealerTotal = handTotal(nextDealer);
    }

    cpuSeats[0].hands.forEach((hand) => {
      settlePlayerMainPayout(hand, nextDealer, nextDealerTotal, soloWager, addChips);
    });

    setSoloSeats(cpuSeats.map((seat) => ({
      ...seat,
      hands: [makeEmptyHand()],
      activeHand: 0,
    })));
    setSoloDealer(nextDealer);
    setSoloDealerTotal(nextDealerTotal);
    setSoloDeck(nextDeck);
    setSoloPhase('betting');
    setSoloTimerLeft(soloTimerSetting);
    setSoloStatus('Betting open for the next hand.');
    addSoloLog('Dealer settled the hand.');
  }

  function updateSoloHand(transform: (hand: HandState, nextDeck: BJCard[]) => void) {
    if (soloPhase !== 'player') return;

    const nextSeats = soloSeats.map((seat) => ({
      ...seat,
      hands: seat.hands.map((hand) => ({ ...hand, cards: [...hand.cards] })),
    }));
    const nextDeck = [...soloDeck];
    const hand = nextSeats[0].hands[nextSeats[0].activeHand];
    if (!hand || hand.finished) return;

    transform(hand, nextDeck);

    if (hand.finished && nextSeats[0].activeHand + 1 < nextSeats[0].hands.length && !nextSeats[0].hands[nextSeats[0].activeHand + 1].finished) {
      nextSeats[0].activeHand += 1;
      setSoloSeats(nextSeats);
      setSoloDeck(nextDeck);
      return;
    }

    setSoloSeats(nextSeats);
    setSoloDeck(nextDeck);

    if (!nextSeats[0].hands.some((h) => !h.finished)) {
      finishSoloRound(nextSeats, nextDeck);
    }
  }

  function soloHit() {
    updateSoloHand((hand, nextDeck) => {
      hand.cards.push(nextDeck.shift()!);
      hand.total = handTotal(hand.cards);
      if (hand.total > 21) {
        hand.busted = true;
        hand.finished = true;
      }
    });
  }

  function soloStand() {
    updateSoloHand((hand) => {
      hand.stood = true;
      hand.finished = true;
    });
  }

  function soloDouble() {
    if (!soloPlayerHand || soloPlayerHand.cards.length !== 2) return;
    if (!canAfford(soloWager)) return;

    spendChips(soloWager);
    updateSoloHand((hand, nextDeck) => {
      hand.doubled = true;
      hand.cards.push(nextDeck.shift()!);
      hand.total = handTotal(hand.cards);
      if (hand.total > 21) hand.busted = true;
      hand.finished = true;
      hand.stood = !hand.busted;
    });
  }

  function soloSplit() {
    if (!soloPlayerHand || soloPlayerHand.cards.length !== 2) return;
    if (!sameRank(soloPlayerHand.cards[0], soloPlayerHand.cards[1])) return;
    if (!canAfford(soloWager)) return;

    spendChips(soloWager);

    const nextSeats = soloSeats.map((seat) => ({
      ...seat,
      hands: seat.hands.map((hand) => ({ ...hand, cards: [...hand.cards] })),
    }));
    const nextDeck = [...soloDeck];
    const hand = nextSeats[0].hands[nextSeats[0].activeHand];

    const first = hand.cards[0];
    const second = hand.cards[1];

    nextSeats[0].hands[nextSeats[0].activeHand] = {
      cards: [first, nextDeck.shift()!],
      total: 0,
      stood: false,
      busted: false,
      doubled: false,
      finished: false,
    };
    nextSeats[0].hands.splice(nextSeats[0].activeHand + 1, 0, {
      cards: [second, nextDeck.shift()!],
      total: 0,
      stood: false,
      busted: false,
      doubled: false,
      finished: false,
    });
    nextSeats[0].hands = nextSeats[0].hands.map((h) => ({ ...h, total: handTotal(h.cards) }));

    setSoloSeats(nextSeats);
    setSoloDeck(nextDeck);
    addSoloLog('You split.');
  }

  useEffect(() => {
    if (multiplayer) return;
    if (soloPhase !== 'betting') return;

    setSoloTimerLeft(soloTimerSetting);
    const id = setInterval(() => {
      setSoloTimerLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [multiplayer, soloPhase, soloTimerSetting]);

  useEffect(() => {
    if (multiplayer) return;
    if (soloPhase !== 'betting') return;
    if (soloTimerLeft > 0) return;
    startSoloRound();
  }, [multiplayer, soloPhase, soloTimerLeft]);

  // MULTIPLAYER
  const { sharedState, pushState, players: roomPlayers } = useSharedRoom<MultiState>(
    'cardhub-blackjack-main',
    `${displayName} (${playerId.slice(-4)})`,
    useMemo(() => ({
      seats: [],
      spectators: [],
      deck: [],
      dealer: [],
      dealerTotal: 0,
      phase: 'betting',
      activeSeat: -1,
      timer: ONLINE_TIMER,
      logs: [],
      status: 'Join the table and your next hand begins automatically.',
    }), [])
  );

  const seats = Array.isArray(sharedState?.seats) ? sharedState.seats : [];
  const spectators = Array.isArray(sharedState?.spectators) ? sharedState.spectators : [];
  const deck = Array.isArray(sharedState?.deck) ? sharedState.deck : [];
  const dealer = Array.isArray(sharedState?.dealer) ? sharedState.dealer : [];
  const logs = Array.isArray(sharedState?.logs) ? sharedState.logs : [];
  const phase = sharedState?.phase || 'betting';
  const timer = typeof sharedState?.timer === 'number' ? sharedState.timer : ONLINE_TIMER;
  const dealerTotal = typeof sharedState?.dealerTotal === 'number' ? sharedState.dealerTotal : 0;
  const activeSeat = typeof sharedState?.activeSeat === 'number' ? sharedState.activeSeat : -1;
  const mySeatIndex = seats.findIndex((s) => s.playerId === playerId);
  const mySeat = mySeatIndex >= 0 ? seats[mySeatIndex] : null;
  const myActiveHand = mySeat ? mySeat.hands[mySeat.activeHand] : null;

  const latestRef = useRef({ seats, spectators, sharedState, mySeatIndex, phase, activeSeat });
  useEffect(() => {
    latestRef.current = { seats, spectators, sharedState, mySeatIndex, phase, activeSeat };
  }, [seats, spectators, sharedState, mySeatIndex, phase, activeSeat]);

  function push(next: MultiState) {
    pushState(next);
  }

  function withLogMulti(state: MultiState, text: string): MultiState {
    return { ...state, logs: [text, ...state.logs].slice(0, 14) };
  }

  function joinSeat() {
    if (mySeatIndex >= 0) return;

    if (phase !== 'betting') {
      push({
        ...sharedState,
        spectators: spectators.some((s) => s.playerId === playerId)
          ? spectators
          : [...spectators, { playerId, name: displayName }],
      });
      return;
    }

    push({
      ...sharedState,
      seats: [
        ...seats,
        {
          id: `seat-${Date.now()}`,
          playerId,
          name: displayName,
          hands: [makeEmptyHand()],
          activeHand: 0,
          wager: multiWager,
          pairBet: multiPairBet,
          threeBet: multiThreeBet,
        },
      ],
      spectators: spectators.filter((s) => s.playerId !== playerId),
    });
  }

  function leaveSeat() {
    if (mySeatIndex < 0) return;

    if (phase !== 'betting') {
      const nextSeats = seats.map((seat, i) =>
        i === mySeatIndex
          ? {
              ...seat,
              playerId: null,
              name: 'Open Seat',
              hands: [makeEmptyHand()],
              activeHand: 0,
            }
          : seat
      );

      const nextState = withLogMulti(
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

      const remaining = nextSeats.filter((seat) => seat.playerId);
      if (!remaining.length) {
        push({
          ...nextState,
          phase: 'betting',
          activeSeat: -1,
          timer: ONLINE_TIMER,
          dealer: [],
          dealerTotal: 0,
          deck: [],
          status: 'All players left. Waiting for new seats.',
        });
        return;
      }

      if (activeSeat === mySeatIndex) {
        const nextTurn = nextPlayableSeat(nextSeats, mySeatIndex, (seat) => !!seat.playerId);
        push({
          ...nextState,
          activeSeat: nextTurn,
          status: nextTurn >= 0 ? `${nextSeats[nextTurn].name} to act.` : 'Dealer turn.',
        });
        return;
      }

      push(nextState);
      return;
    }

    push({
      ...sharedState,
      seats: seats.filter((_, i) => i !== mySeatIndex),
      spectators: spectators.some((s) => s.playerId === playerId)
        ? spectators
        : [...spectators, { playerId, name: displayName }],
    });
  }

  function beginMultiRound() {
    const playingSeats = seats.filter((seat) => seat.playerId);
    if (!playingSeats.length) {
      push({
        ...sharedState,
        timer: ONLINE_TIMER,
        status: 'Join the table and your next hand begins automatically.',
      });
      return;
    }

    const myCommit = multiWager + multiPairBet + multiThreeBet;
    if (mySeatIndex >= 0 && !canAfford(myCommit)) return;

    const nextDeck = makeDeck();
    const nextSeats = seats.map((seat) =>
      seat.playerId
        ? {
            ...seat,
            hands: [{
              cards: [nextDeck.shift()!, nextDeck.shift()!],
              total: 0,
              stood: false,
              busted: false,
              doubled: false,
              finished: false,
            }],
            activeHand: 0,
            wager: seat.playerId === playerId ? multiWager : seat.wager,
            pairBet: seat.playerId === playerId ? multiPairBet : seat.pairBet,
            threeBet: seat.playerId === playerId ? multiThreeBet : seat.threeBet,
          }
        : seat
    ).map((seat) => ({
      ...seat,
      hands: seat.hands.map((hand) => ({ ...hand, total: handTotal(hand.cards) })),
    }));

    const nextDealer = [nextDeck.shift()!, nextDeck.shift()!];
    const dealerUp = nextDealer[0];

    if (mySeatIndex >= 0) {
      spendChips(myCommit);

      const myCards = nextSeats[mySeatIndex].hands[0].cards;
      if (sameRank(myCards[0], myCards[1]) && multiPairBet > 0) {
        addChips(multiPairBet * 12);
      }
      const threePayout = evaluate21Plus3([myCards[0], myCards[1], dealerUp]);
      if (threePayout > 0 && multiThreeBet > 0) {
        addChips(multiThreeBet + multiThreeBet * threePayout);
      }
    }

    push(
      withLogMulti(
        {
          ...sharedState,
          seats: nextSeats,
          deck: nextDeck,
          dealer: nextDealer,
          dealerTotal: handTotal(nextDealer),
          phase: 'player',
          activeSeat: nextSeats.findIndex((seat) => seat.playerId),
          timer: ONLINE_TIMER,
          status: 'Player actions are live.',
        },
        'Blackjack round started.'
      )
    );
  }

  useEffect(() => {
    if (!multiplayer) return;
    const id = setInterval(() => {
      push({ ...sharedState, timer: Math.max(0, timer - 1) });
    }, 1000);
    return () => clearInterval(id);
  }, [multiplayer, timer, sharedState]);

  useEffect(() => {
    if (!multiplayer) return;
    if (timer > 0) return;
    if (phase === 'betting') beginMultiRound();
  }, [multiplayer, timer, phase]);

  function settleMultiRound(nextSeats: MultiSeat[], nextDeck: BJCard[]) {
    const unfinishedSeat = nextSeats.findIndex((seat) => seat.playerId && hasPlayableHands(seat));

    if (unfinishedSeat >= 0) {
      push({
        ...sharedState,
        seats: nextSeats,
        deck: nextDeck,
        activeSeat: unfinishedSeat,
        status: `${nextSeats[unfinishedSeat].name} to act.`,
      });
      return;
    }

    let nextDealer = [...dealer];
    let nextDealerTotal = handTotal(nextDealer);
    while (nextDealerTotal < 17 && nextDeck.length) {
      nextDealer.push(nextDeck.shift()!);
      nextDealerTotal = handTotal(nextDealer);
    }

    if (mySeatIndex >= 0) {
      nextSeats[mySeatIndex].hands.forEach((hand) => {
        settlePlayerMainPayout(hand, nextDealer, nextDealerTotal, nextSeats[mySeatIndex].wager, addChips);
      });
    }

    push(
      withLogMulti(
        {
          ...sharedState,
          seats: nextSeats.map((seat) => ({
            ...seat,
            hands: [makeEmptyHand()],
            activeHand: 0,
          })),
          deck: [],
          dealer: nextDealer,
          dealerTotal: nextDealerTotal,
          phase: 'betting',
          activeSeat: -1,
          timer: ONLINE_TIMER,
          status: 'Betting open for the next hand.',
        },
        'Dealer settled the hand.'
      )
    );
  }

  function updateCurrentHand(transform: (hand: HandState, nextDeck: BJCard[]) => void) {
    if (mySeatIndex < 0 || activeSeat !== mySeatIndex || phase !== 'player') return;

    const nextSeats = seats.map((seat) => ({
      ...seat,
      hands: seat.hands.map((hand) => ({ ...hand, cards: [...hand.cards] })),
    }));
    const nextDeck = [...deck];
    const seat = nextSeats[mySeatIndex];
    const hand = seat.hands[seat.activeHand];
    if (!hand || hand.finished) return;

    transform(hand, nextDeck);

    if (hand.finished && seat.activeHand + 1 < seat.hands.length && !seat.hands[seat.activeHand + 1].finished) {
      seat.activeHand += 1;
      push({
        ...sharedState,
        seats: nextSeats,
        deck: nextDeck,
      });
      return;
    }

    if (seat.hands.some((h) => !h.finished)) {
      push({
        ...sharedState,
        seats: nextSeats,
        deck: nextDeck,
      });
      return;
    }

    settleMultiRound(nextSeats, nextDeck);
  }

  function hit() {
    updateCurrentHand((hand, nextDeck) => {
      hand.cards.push(nextDeck.shift()!);
      hand.total = handTotal(hand.cards);
      if (hand.total > 21) {
        hand.busted = true;
        hand.finished = true;
      }
    });
  }

  function stand() {
    updateCurrentHand((hand) => {
      hand.stood = true;
      hand.finished = true;
    });
  }

  function doubleDown() {
    if (!myActiveHand || myActiveHand.cards.length !== 2) return;
    if (!canAfford(multiWager)) return;

    spendChips(multiWager);
    updateCurrentHand((hand, nextDeck) => {
      hand.doubled = true;
      hand.cards.push(nextDeck.shift()!);
      hand.total = handTotal(hand.cards);
      if (hand.total > 21) hand.busted = true;
      hand.finished = true;
      hand.stood = !hand.busted;
    });
  }

  function split() {
    if (!myActiveHand || myActiveHand.cards.length !== 2) return;
    if (!sameRank(myActiveHand.cards[0], myActiveHand.cards[1])) return;
    if (!canAfford(multiWager)) return;

    spendChips(multiWager);

    const nextSeats = seats.map((seat) => ({
      ...seat,
      hands: seat.hands.map((hand) => ({ ...hand, cards: [...hand.cards] })),
    }));
    const nextDeck = [...deck];
    const seat = nextSeats[mySeatIndex];
    const hand = seat.hands[seat.activeHand];

    const first = hand.cards[0];
    const second = hand.cards[1];

    seat.hands[seat.activeHand] = {
      cards: [first, nextDeck.shift()!],
      total: 0,
      stood: false,
      busted: false,
      doubled: false,
      finished: false,
    };
    seat.hands.splice(seat.activeHand + 1, 0, {
      cards: [second, nextDeck.shift()!],
      total: 0,
      stood: false,
      busted: false,
      doubled: false,
      finished: false,
    });
    seat.hands = seat.hands.map((handState) => ({ ...handState, total: handTotal(handState.cards) }));

    push(
      withLogMulti(
        {
          ...sharedState,
          seats: nextSeats,
          deck: nextDeck,
          status: `${seat.name} split the hand.`,
        },
        `${seat.name} split.`
      )
    );
  }

  useEffect(() => {
    if (!multiplayer) return;
    const cleanup = () => {
      if (latestRef.current.mySeatIndex >= 0) leaveSeat();
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
      title="Blackjack"
      subtitle={multiplayer ? '' : ''}
    >
      <div style={{ '--accent-glow': accentGlow } as any} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <WagerPanel
            bankroll={account.bankroll}
            wager={multiplayer ? multiWager : soloWager}
            setWager={multiplayer ? setMultiWager : setSoloWager}
            onJoin={multiplayer ? (mySeatIndex < 0 ? joinSeat : undefined) : undefined}
            joinLabel={mySeatIndex < 0 ? 'Join Seat' : 'Seated'}
            helper={
              multiplayer
                ? `Main $${multiWager} • Perfect Pairs $${multiPairBet} • 21+3 $${multiThreeBet}`
                : `Main $${soloWager} • Perfect Pairs $${soloPairBet} • 21+3 $${soloThreeBet}`
            }
            pairBet={multiplayer ? multiPairBet : soloPairBet}
            threeBet={multiplayer ? multiThreeBet : soloThreeBet}
            setPairBet={multiplayer ? setMultiPairBet : setSoloPairBet}
            setThreeBet={multiplayer ? setMultiThreeBet : setSoloThreeBet}
          />

          <TurnBanner
            title={
              multiplayer
                ? phase === 'betting'
                  ? 'Waiting for the next round'
                  : phase === 'player'
                    ? activeSeat >= 0
                      ? `${seats[activeSeat]?.name} to act`
                      : 'Dealer turn'
                    : 'Dealer turn'
                : soloPhase === 'betting'
                  ? 'Waiting for the next round'
                  : 'Your turn'
            }
            subtitle={
              multiplayer
                ? `${sharedState?.status || 'Join the table and the next hand will begin.'}${phase === 'betting' ? ` • ${timer}s` : ''}`
                : `${soloStatus}${soloPhase === 'betting' ? ` • ${soloTimerLeft}s` : ''}`
            }
          />

          <div className="rounded-[2rem] border border-white/10 p-6 shadow-2xl" style={{ background: "radial-gradient(circle at center, var(--accent-glow, var(--accent-glow)), rgba(9,9,11,1) 72%)" }}>
            <section>
              <h2 className="text-lg font-medium text-zinc-200">Dealer</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {(multiplayer ? dealer : soloDealer).map((c, idx) => (
                  <span key={c.id} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-6 font-mono text-lg shadow-lg">
                    <Card
                      card={parseCard(c)}
                      hidden={(multiplayer ? phase : soloPhase) === 'player' && idx === 1}
                    />
                  </span>
                ))}
              </div>


          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_38px_var(--accent-glow)]">
              <div className="font-semibold">Action Log</div>
              <div className="mt-3">
                <ActionLog items={multiplayer ? logs : soloLogs} />
              </div>
            </div>
            <PayoutChart />
          </div>              <p className="mt-3 text-sm text-zinc-300">
                {(multiplayer ? phase : soloPhase) === 'player'
                  ? `Showing: ${(multiplayer ? dealer : soloDealer)[0] ? handTotal([(multiplayer ? dealer : soloDealer)[0]]) : 0}`
                  : `Total: ${multiplayer ? dealerTotal : soloDealerTotal}`}
              </p>
            </section>
          </div>
        </div>

        <div className="space-y-4">
          {!multiplayer ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_38px_var(--accent-glow)]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-lg font-semibold">Active Seats</div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={addSoloCpu} disabled={soloPhase !== 'betting'}>
                      Add CPU
                    </button>
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={removeSoloCpu} disabled={soloPhase !== 'betting'}>
                      Remove CPU
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {soloSeats.map((seat, idx) => (
                    <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="font-semibold">{seat.name}</div>
                      <div className="mt-3 space-y-3">
                        {seat.hands.map((hand, hIdx) => (
                          <div key={hIdx} className="rounded-lg border border-white/10 bg-black/20 p-3">
                            <div className="mb-2 text-xs text-zinc-400">
                              Hand {hIdx + 1}{idx === 0 && seat.activeHand === hIdx && soloPhase === 'player' ? ' • Active' : ''}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {hand.cards.map((c) => (
                                <Card key={c.id} card={parseCard(c)} />
                              ))}
                            </div>
                            <div className="mt-2 text-sm text-zinc-300">
                              Total: {hand.total}
                              {hand.doubled ? ' • Doubled' : ''}
                              {hand.busted ? ' • Busted' : ''}
                              {hand.stood ? ' • Stood' : ''}
                            </div>
                          </div>
                        ))}
                      </div>

                      {idx === 0 && soloPhase === 'player' && soloPlayerHand && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={soloHit}>Hit</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={soloStand}>Stand</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm disabled:opacity-50" onClick={soloDouble} disabled={soloPlayerHand.cards.length !== 2}>Double</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm disabled:opacity-50" onClick={soloSplit} disabled={!sameRank(soloPlayerHand.cards[0], soloPlayerHand.cards[1])}>Split</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_38px_var(--accent-glow)]">
                <div className="mb-3 text-lg font-semibold">Active Seats</div>
                <div className="space-y-3">
                  {seats.map((seat, idx) => (
                    <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{seat.playerId ? seat.name : 'Open Seat'}</div>
                          <div className="mt-1 text-sm text-zinc-400">
                            Main ${seat.playerId && idx === mySeatIndex ? multiWager : seat.wager} • Pairs ${seat.playerId && idx === mySeatIndex ? multiPairBet : seat.pairBet} • 21+3 ${seat.playerId && idx === mySeatIndex ? multiThreeBet : seat.threeBet}
                          </div>
                        </div>
                        {idx === mySeatIndex ? (
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={leaveSeat}>
                            Leave Seat
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-3">
                        {seat.hands.map((hand, hIdx) => (
                          <div key={hIdx} className="rounded-lg border border-white/10 bg-black/20 p-3">
                            <div className="mb-2 text-xs text-zinc-400">
                              Hand {hIdx + 1}{seat.activeHand === hIdx && idx === activeSeat && phase === 'player' ? ' • Active' : ''}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {hand.cards.map((c) => (
                                <Card key={c.id} card={parseCard(c)} />
                              ))}
                            </div>
                            <div className="mt-2 text-sm text-zinc-300">
                              Total: {hand.total}
                              {hand.doubled ? ' • Doubled' : ''}
                              {hand.busted ? ' • Busted' : ''}
                              {hand.stood ? ' • Stood' : ''}
                            </div>
                          </div>
                        ))}
                      </div>

                      {idx === mySeatIndex && phase === 'player' && activeSeat === mySeatIndex && myActiveHand && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={hit}>Hit</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={stand}>Stand</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm disabled:opacity-50" onClick={doubleDown} disabled={myActiveHand.cards.length !== 2}>Double</button>
                          <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm disabled:opacity-50" onClick={split} disabled={!sameRank(myActiveHand.cards[0], myActiveHand.cards[1])}>Split</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_38px_var(--accent-glow)]">
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
