'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { BettingPanel } from '@/components/app/BettingPanel';
import { TurnBanner } from '@/components/ui/TurnBanner';
import { ActionLog } from '@/components/ui/ActionLog';
import { UnoStyleCard } from '@/components/ui/UnoStyleCard';
import { useAppSettings } from '@/components/app/AppProvider';
import { useSharedRoom } from '@/hooks/useSharedRoom';

type UnoColor = 'red' | 'blue' | 'green' | 'yellow';
type UnoCard = { color: UnoColor; value: number };

type MultiSeat = {
  id: string;
  playerId: string | null;
  name: string;
  isHuman: boolean;
  cards: UnoCard[];
  ready: boolean;
  bankrollPaid: boolean;
  forfeited: boolean;
};

type Spectator = {
  playerId: string;
  name: string;
};

type MultiState = {
  seats: MultiSeat[];
  spectators: Spectator[];
  deck: UnoCard[];
  discard: UnoCard[];
  turn: number;
  wager: number;
  pot: number;
  started: boolean;
  logs: string[];
  status: string;
};

const MAX_MULTIPLAYER_SEATS = 6;
const MULTI_READY_SECONDS = 15;

function makeDeck(): UnoCard[] {
  const colors: UnoColor[] = ['red', 'blue', 'green', 'yellow'];
  const deck: UnoCard[] = [];
  for (const color of colors) {
    for (let i = 0; i < 10; i += 1) {
      deck.push({ color, value: i });
      deck.push({ color, value: i });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function canPlay(card: UnoCard, top: UnoCard): boolean {
  return card.color === top.color || card.value === top.value;
}

function makeInitialMultiState(): MultiState {
  return {
    seats: [
      { id: 'seat-1', playerId: null, name: 'Open Seat', isHuman: true, cards: [], ready: false, bankrollPaid: false, forfeited: false },
      { id: 'seat-2', playerId: null, name: 'Open Seat', isHuman: true, cards: [], ready: false, bankrollPaid: false, forfeited: false },
    ],
    spectators: [],
    deck: [],
    discard: [],
    turn: 0,
    wager: 25,
    pot: 0,
    started: false,
    logs: [],
    status: 'Everyone starts as a spectator. Join a seat to play.',
  };
}

function nextActiveTurn(seats: MultiSeat[], current: number): number {
  const active = seats.filter((s) => s.playerId && !s.forfeited);
  if (active.length <= 1) return -1;
  let idx = current;
  for (let step = 0; step < seats.length; step += 1) {
    idx = (idx + 1) % seats.length;
    if (seats[idx].playerId && !seats[idx].forfeited) return idx;
  }
  return -1;
}

export default function UnoPage() {
  const { account, canAfford, spendChips, addChips, localPlay } = useAppSettings();
  const displayName = account.username.trim() || 'Guest';
  const multiplayerMode = !!localPlay;

  const playerIdRef = useRef<string>('');
  if (!playerIdRef.current) {
    playerIdRef.current = `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  const playerId = playerIdRef.current;

  // SOLO / CPU MODE
  const [soloWager, setSoloWager] = useState(25);
  const [soloDeck, setSoloDeck] = useState<UnoCard[]>([]);
  const [soloDiscard, setSoloDiscard] = useState<UnoCard[]>([]);
  const [soloHands, setSoloHands] = useState<UnoCard[][]>([]);
  const [soloTurn, setSoloTurn] = useState(0);
  const [soloLogs, setSoloLogs] = useState<string[]>([]);
  const [soloStarted, setSoloStarted] = useState(false);
  const [soloBotCount, setSoloBotCount] = useState(1);

  const soloNames = useMemo(
    () => [displayName, ...Array.from({ length: soloBotCount }, (_, i) => `CPU ${i + 1}`)],
    [displayName, soloBotCount]
  );
  const soloTop = soloDiscard[soloDiscard.length - 1];

  function addSoloLog(text: string) {
    setSoloLogs((prev) => [text, ...prev].slice(0, 12));
  }

  function startSoloGame() {
    if (!canAfford(soloWager)) return;
    spendChips(soloWager);

    const nextDeck = makeDeck();
    const dealtHands = Array.from({ length: soloNames.length }, () => nextDeck.splice(0, 7));
    const top = nextDeck.shift();
    if (!top) return;

    setSoloDeck(nextDeck);
    setSoloHands(dealtHands);
    setSoloDiscard([top]);
    setSoloTurn(0);
    setSoloStarted(true);
    setSoloLogs([`UNO round started at $${soloWager}. Top card: ${top.color} ${top.value}. CPUs: ${soloBotCount}.`]);
  }

  function drawSoloCard(playerIndex: number) {
    if (!soloStarted || !soloDeck.length) return;
    const nextDeck = [...soloDeck];
    const card = nextDeck.shift();
    if (!card) return;

    const nextHands = soloHands.map((h) => [...h]);
    nextHands[playerIndex].push(card);

    setSoloDeck(nextDeck);
    setSoloHands(nextHands);
    setSoloTurn((playerIndex + 1) % nextHands.length);
    addSoloLog(`${soloNames[playerIndex]} draws.`);
  }

  function playSoloCard(playerIndex: number, cardIndex: number) {
    const top = soloDiscard[soloDiscard.length - 1];
    const nextHands = soloHands.map((h) => [...h]);
    const card = nextHands[playerIndex]?.[cardIndex];
    if (!card || !top || !canPlay(card, top)) return;

    nextHands[playerIndex].splice(cardIndex, 1);
    setSoloHands(nextHands);
    setSoloDiscard((prev) => [...prev, card]);
    setSoloTurn((playerIndex + 1) % nextHands.length);
    addSoloLog(`${soloNames[playerIndex]} plays ${card.color} ${card.value}.`);
  }

  useEffect(() => {
    if (multiplayerMode) return;
    if (!soloStarted || soloTurn === 0) return;

    const timer = setTimeout(() => {
      const cpuHand = soloHands[soloTurn] || [];
      const top = soloDiscard[soloDiscard.length - 1];
      if (!top) return;

      const playableIndex = cpuHand.findIndex((c) => canPlay(c, top));
      if (playableIndex >= 0) playSoloCard(soloTurn, playableIndex);
      else drawSoloCard(soloTurn);
    }, 700);

    return () => clearTimeout(timer);
  }, [multiplayerMode, soloStarted, soloTurn, soloHands, soloDiscard, soloDeck]);

  // MULTIPLAYER MODE
  const initialMulti = useMemo(() => makeInitialMultiState(), []);
  const { players: roomPlayers, sharedState, pushState } = useSharedRoom<MultiState>(
    'cardhub-uno-main',
    `${displayName} (${playerId.slice(-4)})`,
    initialMulti
  );

  const seats = Array.isArray(sharedState?.seats) ? sharedState.seats : initialMulti.seats;
  const spectators = Array.isArray(sharedState?.spectators) ? sharedState.spectators : [];
  const multiDeck = Array.isArray(sharedState?.deck) ? sharedState.deck : [];
  const multiDiscard = Array.isArray(sharedState?.discard) ? sharedState.discard : [];
  const multiLogs = Array.isArray(sharedState?.logs) ? sharedState.logs : [];
  const multiTurn = typeof sharedState?.turn === 'number' ? sharedState.turn : 0;
  const multiStarted = !!sharedState?.started;
  const multiWager = typeof sharedState?.wager === 'number' ? sharedState.wager : 25;
  const multiPot = typeof sharedState?.pot === 'number' ? sharedState.pot : 0;
  const multiStatus = sharedState?.status || 'Everyone starts as a spectator. Join a seat to play.';
  const multiTop = multiDiscard[multiDiscard.length - 1];
  const mySeatIndex = seats.findIndex((s) => s.playerId === playerId);
  const isSpectator = mySeatIndex < 0;
  const activeSeats = seats.filter((s) => s.playerId && !s.forfeited);
  const everyoneReady = activeSeats.length >= 2 && activeSeats.every((s) => s.ready);

  const [multiSecondsLeft, setMultiSecondsLeft] = useState(MULTI_READY_SECONDS);

  const latestSeatsRef = useRef(seats);
  const latestSpectatorsRef = useRef(spectators);
  const latestSharedStateRef = useRef(sharedState);
  const latestMySeatIndexRef = useRef(mySeatIndex);
  const latestMultiStartedRef = useRef(multiStarted);

  useEffect(() => {
    latestSeatsRef.current = seats;
    latestSpectatorsRef.current = spectators;
    latestSharedStateRef.current = sharedState;
    latestMySeatIndexRef.current = mySeatIndex;
    latestMultiStartedRef.current = multiStarted;
  }, [seats, spectators, sharedState, mySeatIndex, multiStarted]);

  function pushMulti(next: MultiState) {
    pushState(next);
  }

  function addMultiLog(state: MultiState, text: string): MultiState {
    return { ...state, logs: [text, ...state.logs].slice(0, 14) };
  }

  function joinSeat() {
    if (multiStarted) return;
    if (!isSpectator) return;

    const openSeatIndex = seats.findIndex((s) => s.playerId === null);
    if (openSeatIndex >= 0) {
      pushMulti({
        ...sharedState,
        seats: seats.map((s, i) =>
          i === openSeatIndex
            ? { ...s, playerId, name: displayName, isHuman: true, ready: false, cards: [], bankrollPaid: false, forfeited: false }
            : s
        ),
        spectators: spectators.filter((s) => s.playerId !== playerId),
      });
      return;
    }

    if (seats.length < MAX_MULTIPLAYER_SEATS) {
      pushMulti({
        ...sharedState,
        seats: [
          ...seats,
          {
            id: `seat-${Date.now()}`,
            playerId,
            name: displayName,
            isHuman: true,
            cards: [],
            ready: false,
            bankrollPaid: false,
            forfeited: false,
          },
        ],
        spectators: spectators.filter((s) => s.playerId !== playerId),
      });
      return;
    }

    if (!spectators.some((s) => s.playerId === playerId)) {
      pushMulti({
        ...sharedState,
        spectators: [...spectators, { playerId, name: displayName }],
      });
    }
  }

  function leaveSeat() {
    if (mySeatIndex < 0) return;

    // Mid-game leave = forfeit and become spectator
    if (multiStarted) {
      const nextSeats = seats.map((s, i) =>
        i === mySeatIndex
          ? { ...s, forfeited: true, ready: false, playerId: null, name: 'Open Seat', cards: [] }
          : s
      );

      const remaining = nextSeats.filter((s) => s.playerId && !s.forfeited);
      let nextState: MultiState = addMultiLog(
        {
          ...sharedState,
          seats: nextSeats,
          spectators: spectators.some((s) => s.playerId === playerId)
            ? spectators
            : [...spectators, { playerId, name: displayName }],
          status: `${displayName} forfeited and moved to spectators.`,
        },
        `${displayName} left mid-game and forfeited.`
      );

      if (remaining.length === 1) {
        const winner = remaining[0];
        if (winner.playerId === playerId) {
          addChips(multiPot);
        }
        nextState = addMultiLog(
          {
            ...nextState,
            started: false,
            status: `${winner.name} wins the whole pot of $${multiPot}.`,
          },
          `${winner.name} wins by last player standing.`
        );
      } else {
        const currentTurnSeat = seats[multiTurn];
        if (currentTurnSeat?.playerId === playerId) {
          const nextTurn = nextActiveTurn(nextSeats, multiTurn);
          if (nextTurn >= 0) {
            nextState = { ...nextState, turn: nextTurn };
          }
        }
      }

      pushMulti(nextState);
      return;
    }

    // Pre-game leave
    pushMulti({
      ...sharedState,
      seats: seats.map((s, i) =>
        i === mySeatIndex
          ? { ...s, playerId: null, name: 'Open Seat', isHuman: true, cards: [], ready: false, bankrollPaid: false, forfeited: false }
          : s
      ),
      spectators: spectators.some((s) => s.playerId === playerId)
        ? spectators
        : [...spectators, { playerId, name: displayName }],
    });
  }

  function toggleMyReady() {
    if (mySeatIndex < 0 || multiStarted) return;
    pushMulti({
      ...sharedState,
      seats: seats.map((s, i) =>
        i === mySeatIndex ? { ...s, ready: !s.ready } : s
      ),
    });
  }

  function startMultiplayerRound() {
    if (!everyoneReady || multiStarted) return;

    const humanCount = activeSeats.length;
    if (humanCount < 2) return;

    // Only the host/first seated player triggers the room state.
    // Each participant pays on their own device when they see the started transition.
    const nextDeck = makeDeck();
    const nextSeats = seats.map((s) =>
      s.playerId
        ? { ...s, cards: nextDeck.splice(0, 7), bankrollPaid: false, forfeited: false }
        : s
    );
    const top = nextDeck.shift();
    if (!top) return;

    pushMulti(
      addMultiLog(
        {
          ...sharedState,
          seats: nextSeats,
          deck: nextDeck,
          discard: [top],
          turn: seats.findIndex((s) => s.playerId && !s.forfeited),
          started: true,
          status: `${nextSeats.find((s) => s.playerId && !s.forfeited)?.name || 'Player'} to act.`,
          wager: multiWager,
          pot: multiWager * humanCount,
        },
        `Multiplayer UNO round started at shared wager $${multiWager}. Total pot: $${multiWager * humanCount}.`
      )
    );
  }

  // Each participating player pays their own share exactly once when the round begins
  useEffect(() => {
    if (!multiplayerMode) return;
    if (!multiStarted) return;
    if (mySeatIndex < 0) return;

    const me = seats[mySeatIndex];
    if (!me || me.bankrollPaid || me.forfeited) return;
    if (!canAfford(multiWager)) return;

    spendChips(multiWager);
    pushMulti({
      ...sharedState,
      seats: seats.map((s, i) =>
        i === mySeatIndex ? { ...s, bankrollPaid: true } : s
      ),
    });
  }, [multiplayerMode, multiStarted, mySeatIndex, seats, multiWager]);

  function endRoundWithWinner(winnerSeat: MultiSeat, reason: string) {
    if (winnerSeat.playerId === playerId) {
      addChips(multiPot);
    }
    pushMulti(
      addMultiLog(
        {
          ...sharedState,
          started: false,
          status: `${winnerSeat.name} wins the pot of $${multiPot}. ${reason}`,
        },
        `${winnerSeat.name} wins the pot of $${multiPot}.`
      )
    );
  }

  function drawMultiCard(playerIndex: number) {
    if (!multiStarted || !multiDeck.length) return;
    const nextDeck = [...multiDeck];
    const card = nextDeck.shift();
    if (!card) return;

    const nextSeats = seats.map((s) => ({ ...s, cards: [...s.cards] }));
    nextSeats[playerIndex].cards.push(card);

    pushMulti(
      addMultiLog(
        {
          ...sharedState,
          seats: nextSeats,
          deck: nextDeck,
          discard: multiDiscard,
          turn: nextActiveTurn(nextSeats, playerIndex - 1 >= 0 ? playerIndex - 1 : seats.length - 1) >= 0 ? (playerIndex + 1) % nextSeats.length : playerIndex,
          started: true,
          status: `${nextSeats[(playerIndex + 1) % nextSeats.length]?.name || 'Player'} to act.`,
          wager: multiWager,
          pot: multiPot,
        },
        `${nextSeats[playerIndex].name} draws.`
      )
    );
  }

  function playMultiCard(playerIndex: number, cardIndex: number) {
    const top = multiDiscard[multiDiscard.length - 1];
    if (!top) return;

    const nextSeats = seats.map((s) => ({ ...s, cards: [...s.cards] }));
    const card = nextSeats[playerIndex]?.cards[cardIndex];
    if (!card || !canPlay(card, top)) return;

    nextSeats[playerIndex].cards.splice(cardIndex, 1);

    if (nextSeats[playerIndex].cards.length === 0) {
      endRoundWithWinner(nextSeats[playerIndex], 'Hand completed.');
      return;
    }

    const nextTurn = nextActiveTurn(nextSeats, playerIndex);
    pushMulti(
      addMultiLog(
        {
          ...sharedState,
          seats: nextSeats,
          deck: multiDeck,
          discard: [...multiDiscard, card],
          turn: nextTurn >= 0 ? nextTurn : playerIndex,
          started: true,
          status: nextTurn >= 0 ? `${nextSeats[nextTurn].name} to act.` : 'Round resolving.',
          wager: multiWager,
          pot: multiPot,
        },
        `${nextSeats[playerIndex].name} plays ${card.color} ${card.value}.`
      )
    );
  }

  useEffect(() => {
    if (!multiplayerMode) return;
    if (multiStarted || !everyoneReady) return;

    setMultiSecondsLeft(MULTI_READY_SECONDS);
    const timer = setInterval(() => {
      setMultiSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [multiplayerMode, multiStarted, everyoneReady, seats]);

  useEffect(() => {
    if (!multiplayerMode) return;
    if (multiStarted || !everyoneReady) return;
    if (multiSecondsLeft > 0) return;
    startMultiplayerRound();
    setMultiSecondsLeft(MULTI_READY_SECONDS);
  }, [multiplayerMode, multiSecondsLeft, multiStarted, everyoneReady]);

  useEffect(() => {
    if (!multiplayerMode) return;

    const autoLeave = () => {
      const currentSeats = latestSeatsRef.current;
      const currentSpectators = latestSpectatorsRef.current;
      const currentState = latestSharedStateRef.current;
      const currentSeatIndex = latestMySeatIndexRef.current;
      const currentStarted = latestMultiStartedRef.current;

      if (currentSeatIndex < 0) return;

      if (currentStarted) {
        const nextSeats = currentSeats.map((s, i) =>
          i === currentSeatIndex
            ? {
                ...s,
                forfeited: true,
                ready: false,
                playerId: null,
                name: 'Open Seat',
                cards: [],
                bankrollPaid: false,
              }
            : s
        );

        const remaining = nextSeats.filter((s) => s.playerId && !s.forfeited);
        let nextState = addMultiLog(
          {
            ...currentState,
            seats: nextSeats,
            spectators: currentSpectators.some((s) => s.playerId === playerId)
              ? currentSpectators
              : [...currentSpectators, { playerId, name: displayName }],
            status: `${displayName} left the table and forfeited.`,
          },
          `${displayName} left the table and forfeited.`
        );

        if (remaining.length === 1) {
          const winner = remaining[0];
          if (winner.playerId === playerId) {
            addChips(currentState.pot || 0);
          }
          nextState = addMultiLog(
            {
              ...nextState,
              started: false,
              status: `${winner.name} wins the pot of $${currentState.pot || 0}.`,
            },
            `${winner.name} wins by last player standing.`
          );
        } else {
          const currentTurnSeat = currentSeats[currentState.turn || 0];
          if (currentTurnSeat?.playerId === playerId) {
            const nextTurn = nextActiveTurn(nextSeats, currentState.turn || 0);
            if (nextTurn >= 0) {
              nextState = { ...nextState, turn: nextTurn };
            }
          }
        }

        pushState(nextState);
        return;
      }

      pushState({
        ...currentState,
        seats: currentSeats.map((s, i) =>
          i === currentSeatIndex
            ? {
                ...s,
                playerId: null,
                name: 'Open Seat',
                isHuman: true,
                cards: [],
                ready: false,
                bankrollPaid: false,
                forfeited: false,
              }
            : s
        ),
        spectators: currentSpectators.some((s) => s.playerId === playerId)
          ? currentSpectators
          : [...currentSpectators, { playerId, name: displayName }],
      });
    };

    const handlePageHide = () => autoLeave();
    const handleBeforeUnload = () => autoLeave();

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      autoLeave();
    };
  }, [multiplayerMode, playerId, displayName, addChips, pushState]);

  return (
    <GameShell
      title="UNO"
      subtitle={multiplayerMode ? 'Multiplayer table mode uses shared state and auto-starts once everyone is ready.' : 'Solo mode uses local state and local bots.'}
    >
      {!multiplayerMode ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <BettingPanel
              title="UNO Wager"
              wager={soloWager}
              setWager={setSoloWager}
              onStart={startSoloGame}
              startLabel="Start UNO Game"
              helperText={`Solo mode uses local state and local bots. CPUs selected: ${soloBotCount}.`}
            />

            <TurnBanner
              title={soloStarted ? `${soloNames[soloTurn]} to act` : 'UNO idle'}
              subtitle={soloTop ? `Top card: ${soloTop.color} ${soloTop.value}` : `Start a new game to deal cards. CPUs selected: ${soloBotCount}.`}
            />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-lg font-semibold">Center Pile</div>
              <div className="flex items-center gap-4">
                <button className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-6 text-sm" onClick={() => drawSoloCard(0)} disabled={!soloStarted || soloTurn !== 0}>
                  Draw Pile ({soloDeck.length})
                </button>
                {soloTop ? <UnoStyleCard card={{ label: String(soloTop.value), color: soloTop.color }} /> : <div className="text-sm text-zinc-400">No top card yet</div>}
              </div>
            </div>

            <ActionLog items={soloLogs} />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-semibold">Active Seats</div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => setSoloBotCount((v) => Math.min(5, v + 1))} disabled={soloStarted}>Add CPU</button>
                  <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => setSoloBotCount((v) => Math.max(1, v - 1))} disabled={soloStarted}>Remove CPU</button>
                </div>
              </div>

              <div className="mb-3 text-sm text-zinc-300">CPUs selected: {soloBotCount}</div>

              <div className="space-y-3">
                {soloHands.map((hand, playerIndex) => (
                  <div key={playerIndex} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="font-semibold">{soloNames[playerIndex]}</div>
                    <div className="mt-1 text-sm text-zinc-400">{hand.length} cards</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {hand.map((card, i) =>
                        playerIndex === 0 ? (
                          <button key={i} onClick={() => playSoloCard(0, i)} disabled={!soloStarted || soloTurn !== 0}>
                            <UnoStyleCard card={{ label: String(card.value), color: card.color }} small />
                          </button>
                        ) : (
                          <UnoStyleCard key={i} hidden small />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <BettingPanel
              title="Shared UNO Wager"
              wager={multiWager}
              setWager={(v) => {
                if (mySeatIndex >= 0 && !multiStarted) {
                  pushMulti({ ...sharedState, wager: v });
                }
              }}
              helperText={`Every seated player pays the same wager. If you leave mid-game, you forfeit. Pot: $${multiPot}.`}
            />

            <TurnBanner
              title={multiStarted ? `${seats[multiTurn]?.name || 'Player'} to act` : everyoneReady ? `Round starts in ${multiSecondsLeft}s` : 'Everyone starts as a spectator until they join a seat'}
              subtitle={multiTop ? `Top card: ${multiTop.color} ${multiTop.value}` : multiStatus}
            />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-lg font-semibold">Center Pile</div>
              <div className="flex items-center gap-4">
                <button
                  className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-6 text-sm"
                  onClick={() => mySeatIndex >= 0 && drawMultiCard(mySeatIndex)}
                  disabled={!multiStarted || multiTurn !== mySeatIndex}
                >
                  Draw Pile ({multiDeck.length})
                </button>
                {multiTop ? <UnoStyleCard card={{ label: String(multiTop.value), color: multiTop.color }} /> : <div className="text-sm text-zinc-400">No top card yet</div>}
              </div>
            </div>

            <ActionLog items={multiLogs} />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-semibold">Active Seats</div>
                <div className="flex gap-2">
                  {isSpectator ? (
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={joinSeat} disabled={multiStarted}>
                      Join Seat
                    </button>
                  ) : (
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={leaveSeat}>
                      Leave Seat
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-3 text-sm text-zinc-300">Shared table wager: ${multiWager} • Total pot: ${multiPot}</div>

              <div className="space-y-3">
                {seats.map((seat, idx) => (
                  <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{seat.playerId ? seat.name : 'Open Seat'}</div>
                        <div className="mt-1 text-sm text-zinc-400">{seat.cards.length} cards {seat.forfeited ? '• Forfeited' : ''}</div>
                      </div>
                      {seat.playerId === playerId ? (
                        <button
                          className={`rounded-lg px-3 py-2 text-sm ${seat.ready ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-white'}`}
                          onClick={toggleMyReady}
                          disabled={multiStarted}
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
                      {seat.cards.map((card, i) =>
                        idx === mySeatIndex ? (
                          <button key={i} onClick={() => playMultiCard(idx, i)} disabled={!multiStarted || multiTurn !== mySeatIndex}>
                            <UnoStyleCard card={{ label: String(card.value), color: card.color }} small />
                          </button>
                        ) : (
                          <UnoStyleCard key={i} hidden small />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold">Spectators</div>
              <div className="mt-2 text-sm text-zinc-400">
                {spectators.length ? spectators.map((s) => s.name).join(', ') : 'No spectators'}
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                Connected devices: {roomPlayers.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </GameShell>
  );
}
