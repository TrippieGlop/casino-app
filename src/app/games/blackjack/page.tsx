'use client';

import { useEffect, useReducer, useState } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { BettingPanel } from '@/components/app/BettingPanel';
import { useAppSettings } from '@/components/app/AppProvider';
import { GAME_META } from '@/lib/gameMeta';
import type { StandardCard } from '@/core/cards/types';
import { blackjackReducer, createInitialBlackjackState } from '@/core/rules/blackjack/reducer';

type Seat = {
  id: string;
  label: string;
  kind: 'human' | 'cpu' | 'empty';
  ready: boolean;
};

function renderCard(c: StandardCard) {
  return `${c.rank}${c.suit}`;
}

function sameRank(cards: StandardCard[]) {
  return cards.length >= 2 && cards[0].rank === cards[1].rank;
}

function sameSuit(cards: StandardCard[]) {
  return cards.length >= 2 && cards[0].suit === cards[1].suit;
}

export default function BlackjackPage() {
  const { account, addChips, spendChips, readyAutoStartSeconds } = useAppSettings();
  const [state, dispatch] = useReducer(blackjackReducer, undefined, () =>
    createInitialBlackjackState(123)
  );

  const [wager, setWager] = useState(25);
  const [pairBet, setPairBet] = useState(5);
  const [threeBet, setThreeBet] = useState(5);
  const [roundActive, setRoundActive] = useState(false);
  const [roundSettled, setRoundSettled] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(readyAutoStartSeconds);

  const [seats, setSeats] = useState<Seat[]>(
    Array.from({ length: 9 }, (_, i) => ({
      id: `s${i + 1}`,
      label: i === 0 ? account.username : i === 1 ? 'CPU 1' : 'Empty Seat',
      kind: i === 0 ? 'human' : i === 1 ? 'cpu' : 'empty',
      ready: i === 1,
    }))
  );

  const dealerShown = state.revealDealerHoleCard
    ? state.dealerCards
    : state.dealerCards.map((c, i) => (i === 1 ? null : c));

  const activeSeats = seats.filter((s) => s.kind !== 'empty');
  const everyoneReady = activeSeats.length > 0 && activeSeats.every((s) => s.ready);

  useEffect(() => {
    if (!roundActive || state.phase !== 'ROUND_OVER' || roundSettled) return;

    if (state.outcome === 'PLAYER_WIN') addChips(wager * 2);
    if (state.outcome === 'PUSH') addChips(wager);

    if (sameRank(state.playerCards)) addChips(pairBet * 11);
    if (sameSuit([...state.playerCards, ...state.dealerCards.slice(0, 1)])) {
      addChips(threeBet * 10);
    }

    setRoundSettled(true);
  }, [
    roundActive,
    state.phase,
    state.outcome,
    roundSettled,
    addChips,
    wager,
    pairBet,
    threeBet,
    state.playerCards,
    state.dealerCards,
  ]);

  useEffect(() => {
    if (roundActive || !everyoneReady) return;

    setSecondsLeft(readyAutoStartSeconds);

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          startRound();
          return readyAutoStartSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [everyoneReady, roundActive, readyAutoStartSeconds]);

  function startRound() {
    const totalBuy = wager + pairBet + threeBet;
    if (!spendChips(totalBuy)) return;

    setRoundActive(true);
    setRoundSettled(false);
    dispatch({ type: 'NEW_GAME' });
  }

  function resetTable() {
    setRoundActive(false);
    setRoundSettled(false);
    setSeats((prev) => prev.map((s) => ({ ...s, ready: s.kind === 'cpu' })));
  }

  function toggleReady(id: string) {
    setSeats((prev) =>
      prev.map((s) => (s.id === id && s.kind !== 'empty' ? { ...s, ready: !s.ready } : s))
    );
  }

  function fillSeat(id: string, kind: 'human' | 'cpu') {
    setSeats((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              kind,
              label: kind === 'human' ? `Player ${id.slice(1)}` : `CPU ${id.slice(1)}`,
              ready: kind === 'cpu',
            }
          : s
      )
    );
  }

  function emptySeat(id: string) {
    setSeats((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, kind: 'empty', label: 'Empty Seat', ready: false } : s
      )
    );
  }

  return (
    <GameShell
      title="Blackjack"
      subtitle="Full table setup with up to 9 seats, bots or real players, plus side bets and payout references."
      rules={GAME_META.blackjack.rules}
    >
      <div className="space-y-6">
        <BettingPanel
          wager={wager}
          setWager={setWager}
          disabled={roundActive}
          onStart={startRound}
          startLabel="Force Start"
          helperText={`Main $${wager} • Pairs $${pairBet} • 21+3 $${threeBet}`}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold">Side Bets</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => setPairBet(5)}>Pairs $5</button>
              <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => setPairBet(10)}>Pairs $10</button>
              <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => setThreeBet(5)}>21+3 $5</button>
              <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => setThreeBet(10)}>21+3 $10</button>
            </div>
            <p className="mt-3 text-sm text-zinc-300">Pairs Bet: ${pairBet} • 21+3 Bet: ${threeBet}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold">Payout Chart</h3>
            <div className="mt-3 space-y-1 text-sm text-zinc-300">
              <div>Main win: 1:1</div>
              <div>Push: original wager returned</div>
              <div>Pairs side bet demo payout: 11:1</div>
              <div>21+3 side bet demo payout: 10:1</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Blackjack Table</h3>
            {everyoneReady && !roundActive && (
              <div className="text-sm text-emerald-300">Auto-deal in {secondsLeft}s</div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {seats.map((seat) => (
              <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{seat.label}</div>
                    <div className="text-sm text-zinc-400 capitalize">{seat.kind}</div>
                  </div>
                  {seat.kind !== 'empty' && (
                    <button
                      className={`rounded-lg px-3 py-2 text-sm ${seat.ready ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-white'}`}
                      onClick={() => toggleReady(seat.id)}
                    >
                      {seat.ready ? 'Ready' : 'Not Ready'}
                    </button>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  {seat.kind === 'empty' ? (
                    <>
                      <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => fillSeat(seat.id, 'cpu')}>
                        Add CPU
                      </button>
                      <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => fillSeat(seat.id, 'human')}>
                        Add Player
                      </button>
                    </>
                  ) : (
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => emptySeat(seat.id)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(20,83,45,0.95),_rgba(9,9,11,1)_72%)] p-6 shadow-2xl">
          <section>
            <h2 className="text-lg font-medium text-zinc-200">Dealer</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {dealerShown.map((c, idx) =>
                c ? (
                  <span key={c.id} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-6 font-mono text-lg shadow-lg">
                    {renderCard(c)}
                  </span>
                ) : (
                  <span key={`hidden-${idx}`} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-6 font-mono text-lg opacity-70 shadow-lg">
                    ??
                  </span>
                )
              )}
            </div>
            <p className="mt-3 text-sm text-zinc-300">
              Total: {state.dealerTotal}
              {!state.revealDealerHoleCard ? ' (showing)' : ''}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-medium text-zinc-200">Current Seat Hand</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {state.playerCards.map((c) => (
                <span key={c.id} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-6 font-mono text-lg shadow-lg">
                  {renderCard(c)}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-zinc-300">Total: {state.playerTotal}</p>
          </section>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-medium">{state.message}</div>
          <div className="mt-1 text-sm text-zinc-300">
            Phase: {state.phase}
            {state.outcome !== 'NONE' ? ` • Outcome: ${state.outcome}` : ''}
            {` • Main $${wager} • Pairs $${pairBet} • 21+3 $${threeBet}`}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50"
              onClick={() => dispatch({ type: 'HIT' })}
              disabled={!roundActive || state.phase !== 'PLAYER_TURN'}
            >
              Hit
            </button>
            <button
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50"
              onClick={() => dispatch({ type: 'STAND' })}
              disabled={!roundActive || state.phase !== 'PLAYER_TURN'}
            >
              Stand
            </button>
            <button
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800"
              onClick={resetTable}
            >
              Reset Table
            </button>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
