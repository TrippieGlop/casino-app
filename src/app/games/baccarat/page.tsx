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
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

type BCard = {
  id: string;
  rank: Rank;
  suit: Suit;
};

type BetSide = 'player' | 'banker' | 'tie';

type SoloBot = {
  id: string;
  name: string;
};

type MultiSeat = {
  id: string;
  playerId: string;
  name: string;
  wager: number;
  betSide: BetSide;
  playerPairBet: number;
  bankerPairBet: number;
};

type MultiState = {
  seats: MultiSeat[];
  spectators: Array<{ playerId: string; name: string }>;
  playerHand: BCard[];
  bankerHand: BCard[];
  playerTotal: number;
  bankerTotal: number;
  timer: number;
  roundId: number;
  status: string;
  logs: string[];
};

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ONLINE_TIMER = 20;
const WAGER_OPTIONS = [10, 25, 50, 100, 250, 500];
const SIDE_OPTIONS = [0, 5, 10, 25];

function makeDeck(): BCard[] {
  const deck: BCard[] = [];
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

function parseCard(card: BCard) {
  return { rank: card.rank, suit: card.suit };
}

function baccaratValue(rank: Rank) {
  if (rank === 'A') return 1;
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
  return Number(rank);
}

function baccaratTotal(hand: BCard[]) {
  return hand.reduce((sum, card) => sum + baccaratValue(card.rank), 0) % 10;
}

function payoutRows() {
  return [
    'Player win: 1:1',
    'Banker win: 0.95:1',
    'Tie: 8:1',
    'Player Pair: 11:1',
    'Banker Pair: 11:1',
  ];
}

function resultSide(playerTotal: number, bankerTotal: number): BetSide {
  if (playerTotal > bankerTotal) return 'player';
  if (bankerTotal > playerTotal) return 'banker';
  return 'tie';
}

function pairPayout(hand: BCard[], wager: number) {
  return hand.length >= 2 && hand[0].rank === hand[1].rank ? wager * 12 : 0;
}

function chipButton(
  amount: number,
  current: number,
  onClick: () => void,
  label?: string
) {
  const active = current === amount;
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
  playerPairBet,
  bankerPairBet,
  setPlayerPairBet,
  setBankerPairBet,
  onJoin,
  joinLabel,
  helper,
}: {
  bankroll: number;
  wager: number;
  setWager: (v: number) => void;
  playerPairBet: number;
  bankerPairBet: number;
  setPlayerPairBet: (n: number) => void;
  setBankerPairBet: (n: number) => void;
  onJoin?: () => void;
  joinLabel?: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Table Wager</div>
          <div className="mt-1 text-sm text-zinc-300">
            Bankroll: <span className="font-semibold text-emerald-300">${bankroll}</span>
          </div>
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
        {WAGER_OPTIONS.map((amount) => chipButton(amount, wager, () => setWager(amount)))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-sm text-zinc-300">Player Pair</div>
          <div className="flex flex-wrap gap-2">
            {SIDE_OPTIONS.map((amount) =>
              chipButton(amount, playerPairBet, () => setPlayerPairBet(amount), 'Player Pair')
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm text-zinc-300">Banker Pair</div>
          <div className="flex flex-wrap gap-2">
            {SIDE_OPTIONS.map((amount) =>
              chipButton(amount, bankerPairBet, () => setBankerPairBet(amount), 'Banker Pair')
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-zinc-300">{helper}</div>
    </div>
  );
}

function MainBetBox({
  betSide,
  setBetSide,
}: {
  betSide: BetSide;
  setBetSide: (side: BetSide) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 text-lg font-semibold">Main Bet</div>
      <div className="flex flex-wrap gap-3">
        {(['player', 'banker', 'tie'] as BetSide[]).map((side) => {
          const active = betSide === side;
          return (
            <button
              key={side}
              className={`rounded-xl border px-5 py-4 text-sm font-medium transition ${
                active
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                  : 'border-white/10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
              }`}
              onClick={() => setBetSide(side)}
            >
              {side[0].toUpperCase() + side.slice(1)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PayoutChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 text-lg font-semibold">Payout Chart</div>
      <div className="space-y-2 text-sm text-zinc-300">
        {payoutRows().map((row) => (
          <div key={row}>{row}</div>
        ))}
      </div>
    </div>
  );
}

export default function BaccaratPage() {
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

  const baccaratBoxThemeStyle = {
    background: 'radial-gradient(circle at center, var(--accent-glow, var(--accent-glow, var(--accent-glow))), rgba(9,9,11,1) 72%)',
  };

  const playerIdRef = useRef('');
  if (!playerIdRef.current) {
    playerIdRef.current = `bacc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  const playerId = playerIdRef.current;

  // SOLO STATE
  const soloTimerSetting = readyAutoStartSeconds || 15;
  const [soloBots, setSoloBots] = useState<SoloBot[]>([{ id: 'bot-1', name: 'CPU 1' }]);
  const [soloTimer, setSoloTimer] = useState(soloTimerSetting);
  const [soloWager, setSoloWager] = useState(25);
  const [soloBetSide, setSoloBetSide] = useState<BetSide>('player');
  const [soloPlayerPairBet, setSoloPlayerPairBet] = useState(5);
  const [soloBankerPairBet, setSoloBankerPairBet] = useState(5);
  const [soloPlayerHand, setSoloPlayerHand] = useState<BCard[]>([]);
  const [soloBankerHand, setSoloBankerHand] = useState<BCard[]>([]);
  const [soloPlayerTotal, setSoloPlayerTotal] = useState(0);
  const [soloBankerTotal, setSoloBankerTotal] = useState(0);
  const [soloLogs, setSoloLogs] = useState<string[]>([]);
  const [soloStatus, setSoloStatus] = useState('Solo baccarat with adjustable timer and removable bots.');

  function addSoloLog(text: string) {
    setSoloLogs((prev) => [text, ...prev].slice(0, 14));
  }

  function addSoloBot() {
    setSoloBots((prev) => [
      ...prev,
      { id: `bot-${Date.now()}`, name: `CPU ${prev.length + 1}` },
    ]);
  }

  function removeSoloBot() {
    setSoloBots((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }

  function settleSoloRound() {
    const totalCommit = soloWager + soloPlayerPairBet + soloBankerPairBet;
    if (!canAfford(totalCommit)) return;

    spendChips(totalCommit);

    const deck = makeDeck();
    const playerHand = [deck.shift()!, deck.shift()!];
    const bankerHand = [deck.shift()!, deck.shift()!];
    const playerTotal = baccaratTotal(playerHand);
    const bankerTotal = baccaratTotal(bankerHand);
    const winner = resultSide(playerTotal, bankerTotal);

    if (winner === soloBetSide) {
      if (winner === 'player') addChips(soloWager * 2);
      else if (winner === 'banker') addChips(Math.floor(soloWager * 1.95));
      else addChips(soloWager * 9);
    }

    const playerPairWin = pairPayout(playerHand, soloPlayerPairBet);
    const bankerPairWin = pairPayout(bankerHand, soloBankerPairBet);
    if (playerPairWin > 0) addChips(playerPairWin);
    if (bankerPairWin > 0) addChips(bankerPairWin);

    setSoloPlayerHand(playerHand);
    setSoloBankerHand(bankerHand);
    setSoloPlayerTotal(playerTotal);
    setSoloBankerTotal(bankerTotal);
    setSoloStatus(`${winner[0].toUpperCase() + winner.slice(1)} wins. Betting open for the next hand.`);
    addSoloLog(`Baccarat settled: ${winner.toUpperCase()} wins.`);
    setSoloTimer(soloTimerSetting);
  }

  useEffect(() => {
    if (multiplayer) return;
    setSoloTimer(soloTimerSetting);
  }, [multiplayer, soloTimerSetting]);

  useEffect(() => {
    if (multiplayer) return;
    const id = setInterval(() => {
      setSoloTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [multiplayer, soloTimerSetting]);

  useEffect(() => {
    if (multiplayer) return;
    if (soloTimer > 0) return;
    settleSoloRound();
  }, [multiplayer, soloTimer]);

  // MULTIPLAYER STATE
  const { sharedState, pushState, players: roomPlayers } = useSharedRoom<MultiState>(
    'cardhub-baccarat-main',
    `${displayName} (${playerId.slice(-4)})`,
    useMemo(() => ({
      seats: [],
      spectators: [],
      playerHand: [],
      bankerHand: [],
      playerTotal: 0,
      bankerTotal: 0,
      timer: ONLINE_TIMER,
      roundId: 0,
      status: 'Join a seat or spectate. The table deals every 20 seconds.',
      logs: [],
    }), [])
  );

  const seats = Array.isArray(sharedState?.seats) ? sharedState.seats : [];
  const spectators = Array.isArray(sharedState?.spectators) ? sharedState.spectators : [];
  const playerHand = Array.isArray(sharedState?.playerHand) ? sharedState.playerHand : [];
  const bankerHand = Array.isArray(sharedState?.bankerHand) ? sharedState.bankerHand : [];
  const playerTotal = typeof sharedState?.playerTotal === 'number' ? sharedState.playerTotal : 0;
  const bankerTotal = typeof sharedState?.bankerTotal === 'number' ? sharedState.bankerTotal : 0;
  const timer = typeof sharedState?.timer === 'number' ? sharedState.timer : ONLINE_TIMER;
  const roundId = typeof sharedState?.roundId === 'number' ? sharedState.roundId : 0;
  const logs = Array.isArray(sharedState?.logs) ? sharedState.logs : [];
  const mySeatIndex = seats.findIndex((s) => s.playerId === playerId);
  const mySeat = mySeatIndex >= 0 ? seats[mySeatIndex] : null;
  const isSpectator = mySeatIndex < 0;

  const processedRoundRef = useRef<number>(-1);

  function push(next: MultiState) {
    pushState(next);
  }

  function withLog(state: MultiState, text: string): MultiState {
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
          wager: multiWager,
          betSide: multiBetSide,
          playerPairBet: multiPlayerPairBet,
          bankerPairBet: multiBankerPairBet,
        },
      ],
      spectators: spectators.filter((s) => s.playerId !== playerId),
      status: `${displayName} joined the table.`,
    });
  }

  function leaveSeat() {
    if (mySeatIndex < 0) return;
    push(
      withLog(
        {
          ...sharedState,
          seats: seats.filter((s) => s.playerId !== playerId),
          spectators: spectators.some((s) => s.playerId === playerId)
            ? spectators
            : [...spectators, { playerId, name: displayName }],
          status: `${displayName} left the table.`,
        },
        `${displayName} left the table.`
      )
    );
  }

  // local online betting controls for this device only
  const [multiWager, setMultiWager] = useState(25);
  const [multiBetSide, setMultiBetSide] = useState<BetSide>('player');
  const [multiPlayerPairBet, setMultiPlayerPairBet] = useState(5);
  const [multiBankerPairBet, setMultiBankerPairBet] = useState(5);

  useEffect(() => {
    if (!multiplayer) return;
    if (mySeatIndex < 0) return;

    const seat = seats[mySeatIndex];
    if (!seat) return;

    if (
      seat.wager !== multiWager ||
      seat.betSide !== multiBetSide ||
      seat.playerPairBet !== multiPlayerPairBet ||
      seat.bankerPairBet !== multiBankerPairBet
    ) {
      push({
        ...sharedState,
        seats: seats.map((s, i) =>
          i === mySeatIndex
            ? {
                ...s,
                wager: multiWager,
                betSide: multiBetSide,
                playerPairBet: multiPlayerPairBet,
                bankerPairBet: multiBankerPairBet,
              }
            : s
        ),
      });
    }
  }, [multiplayer, mySeatIndex, multiWager, multiBetSide, multiPlayerPairBet, multiBankerPairBet]);

  // only seat 0 drives synchronized timer
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

  // only seat 0 deals the next round
  useEffect(() => {
    if (!multiplayer) return;
    if (seats.length < 1) return;
    if (mySeatIndex !== 0) return;
    if (timer > 0) return;

    const deck = makeDeck();
    const nextPlayerHand = [deck.shift()!, deck.shift()!];
    const nextBankerHand = [deck.shift()!, deck.shift()!];
    const nextPlayerTotal = baccaratTotal(nextPlayerHand);
    const nextBankerTotal = baccaratTotal(nextBankerHand);
    const winner = resultSide(nextPlayerTotal, nextBankerTotal);

    push(
      withLog(
        {
          ...sharedState,
          playerHand: nextPlayerHand,
          bankerHand: nextBankerHand,
          playerTotal: nextPlayerTotal,
          bankerTotal: nextBankerTotal,
          timer: ONLINE_TIMER,
          roundId: roundId + 1,
          status: `${winner[0].toUpperCase() + winner.slice(1)} wins. Betting open for the next hand.`,
        },
        `Baccarat settled: ${winner.toUpperCase()} wins.`
      )
    );
  }, [multiplayer, seats.length, mySeatIndex, timer, sharedState, roundId]);

  // each device settles its own bankroll for its own seat
  useEffect(() => {
    if (!multiplayer) return;
    if (mySeatIndex < 0) return;
    if (roundId <= 0) return;
    if (processedRoundRef.current === roundId) return;

    const seat = seats[mySeatIndex];
    if (!seat) return;

    const totalCommit = seat.wager + seat.playerPairBet + seat.bankerPairBet;
    if (!canAfford(totalCommit)) return;

    spendChips(totalCommit);

    const winner = resultSide(playerTotal, bankerTotal);
    if (winner === seat.betSide) {
      if (winner === 'player') addChips(seat.wager * 2);
      else if (winner === 'banker') addChips(Math.floor(seat.wager * 1.95));
      else addChips(seat.wager * 9);
    }

    const playerPairWin = pairPayout(playerHand, seat.playerPairBet);
    const bankerPairWin = pairPayout(bankerHand, seat.bankerPairBet);
    if (playerPairWin > 0) addChips(playerPairWin);
    if (bankerPairWin > 0) addChips(bankerPairWin);

    processedRoundRef.current = roundId;
  }, [multiplayer, roundId, mySeatIndex, seats, playerTotal, bankerTotal, playerHand, bankerHand]);

  useEffect(() => {
    if (!multiplayer) return;
    const cleanup = () => {
      try {
        if (mySeatIndex >= 0) leaveSeat();
      } catch {}
    };
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('pagehide', cleanup);
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [multiplayer, mySeatIndex, seats]);

  // baccaratLeaveCleanupInstalled
  useEffect(() => {
    if (!multiplayer) return;

    const cleanup = () => {
      try {
        const currentSeats = Array.isArray(sharedState?.seats) ? sharedState.seats : [];
        const currentSpectators = Array.isArray(sharedState?.spectators) ? sharedState.spectators : [];
        if (!currentSeats.some((s) => s.playerId === playerId)) return;

        pushState({
          ...sharedState,
          seats: currentSeats.filter((s) => s.playerId !== playerId),
          spectators: currentSpectators.some((s) => s.playerId === playerId)
            ? currentSpectators
            : [...currentSpectators, { playerId, name: displayName }],
          status: `${displayName} left the table.`,
          logs: [`${displayName} left the table.`, ...(Array.isArray(sharedState?.logs) ? sharedState.logs : [])].slice(0, 14),
        });
      } catch {}
    };

    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);

    return () => {
      window.removeEventListener('pagehide', cleanup);
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [multiplayer, sharedState, playerId, displayName, pushState]);

  const title = multiplayer ? 'Baccarat' : 'Baccarat';
  const subtitle = multiplayer
    ? ''
    : '';

  return (
    <GameShell title={title} subtitle={subtitle}>
      <div style={{ '--accent-glow': accentGlow } as any} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <WagerPanel
            bankroll={account.bankroll}
            wager={multiplayer ? multiWager : soloWager}
            setWager={multiplayer ? setMultiWager : setSoloWager}
            playerPairBet={multiplayer ? multiPlayerPairBet : soloPlayerPairBet}
            bankerPairBet={multiplayer ? multiBankerPairBet : soloBankerPairBet}
            setPlayerPairBet={multiplayer ? setMultiPlayerPairBet : setSoloPlayerPairBet}
            setBankerPairBet={multiplayer ? setMultiBankerPairBet : setSoloBankerPairBet}
            onJoin={multiplayer && isSpectator ? joinSeat : undefined}
            joinLabel={isSpectator ? 'Join Seat' : 'Seated'}
            helper={
              multiplayer
                ? `Main $${multiWager} • Player Pair $${multiPlayerPairBet} • Banker Pair $${multiBankerPairBet}`
                : `Main $${soloWager} • Player Pair $${soloPlayerPairBet} • Banker Pair $${soloBankerPairBet}`
            }
          />

          <TurnBanner
            title={multiplayer ? `Next hand in ${timer}s` : `Next hand in ${soloTimer}s`}
            subtitle={
              multiplayer
                ? (sharedState?.status || 'Join the table or spectate.')
                : soloStatus
            }
          />

          <div
            className="rounded-[2rem] border border-white/10 p-6 shadow-2xl"
            style={baccaratBoxThemeStyle}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-lg font-medium text-zinc-200">Player</h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(multiplayer ? playerHand : soloPlayerHand).map((c) => (
                    <span key={c.id} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-6 font-mono text-lg shadow-lg">
                      <Card card={parseCard(c)} />
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-zinc-300">
                  {(multiplayer ? playerHand : soloPlayerHand).length ? `Total: ${multiplayer ? playerTotal : soloPlayerTotal}` : 'Waiting for hand.'}
                </p>
              </div>

              <div>
                <h2 className="text-lg font-medium text-zinc-200">Banker</h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(multiplayer ? bankerHand : soloBankerHand).map((c) => (
                    <span key={c.id} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-6 font-mono text-lg shadow-lg">
                      <Card card={parseCard(c)} />
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-zinc-300">
                  {(multiplayer ? bankerHand : soloBankerHand).length ? `Total: ${multiplayer ? bankerTotal : soloBankerTotal}` : 'Waiting for hand.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MainBetBox
              betSide={multiplayer ? multiBetSide : soloBetSide}
              setBetSide={multiplayer ? setMultiBetSide : setSoloBetSide}
            />
            <PayoutChart />
          </div>
        </div>

        <div className="space-y-4">
          {!multiplayer ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-lg font-semibold">Seats</div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={addSoloBot}>
                      Add CPU
                    </button>
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={removeSoloBot}>
                      Remove CPU
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="font-semibold">{displayName}</div>
                    <div className="mt-1 text-sm text-zinc-400">You</div>
                  </div>

                  {soloBots.map((bot) => (
                    <div key={bot.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="font-semibold">{bot.name}</div>
                      <div className="mt-1 text-sm text-zinc-400">CPU</div>
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
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-lg font-semibold">Active Seats</div>
                  {!isSpectator ? (
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={leaveSeat}>
                      Leave Seat
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {seats.map((seat) => (
                    <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="font-semibold">{seat.name}</div>
                      <div className="mt-1 text-sm text-zinc-400">
                        Main ${seat.wager} • {seat.betSide[0].toUpperCase() + seat.betSide.slice(1)} • Player Pair ${seat.playerPairBet} • Banker Pair ${seat.bankerPairBet}
                      </div>
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
