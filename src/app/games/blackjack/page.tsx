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

        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(20,83,45,0.95),_rgba(9,9,11,1)_72%)] p-6 shadow-2xl">
          <section>
            <h2 className="text-lg font-medium text-zinc-200">Dealer</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {dealerShown.map((c, idx) =>
                c ? (
                  <span
                    key={c.id}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-6 font-mono text-lg shadow-lg"
                  >
                    {renderCard(c)}
                  </span>
                ) : (
                  <span
                    key={`hidden-${idx}`}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-6 font-mono text-lg opacity-70 shadow-lg"
                  >
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
                <span
                  key={c.id}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-6 font-mono text-lg shadow-lg"
                >
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