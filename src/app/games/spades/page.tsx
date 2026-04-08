'use client';

import { useEffect, useReducer, useRef } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { useAppSettings } from '@/components/app/AppProvider';
import { GAME_META } from '@/lib/gameMeta';
import {
  createInitialSpadesState,
  legalPlays,
  renderSpadesCard,
  spadesReducer,
  type Seat,
} from '@/core/rules/spades';
import { BackButton } from '@/components/BackButton';

const HUMAN_ID = 'spades-p1';
const HUMAN_SEAT: Seat = 0;

export default function SpadesPage() {
  const { addChips } = useAppSettings();
  const [state, dispatch] = useReducer(spadesReducer, undefined, () =>
    createInitialSpadesState(123)
  );
  const settledRound = useRef(0);

  const me = state.players[0];
  const east = state.players[1];
  const south = state.players[2];
  const west = state.players[3];

  const myTurnToBid = state.phase === 'bidding' && state.activePlayerSeat === HUMAN_SEAT;
  const myTurnToPlay = state.phase === 'playing' && state.activePlayerSeat === HUMAN_SEAT;

  const myLegalCards =
    myTurnToPlay
      ? legalPlays(me.hand, state.currentTrick, state.spadesBroken)
      : [];

  const legalIds = new Set(myLegalCards.map((c) => c.id));

  useEffect(() => {
    if (state.phase !== 'bidding') return;
    if (state.activePlayerSeat === HUMAN_SEAT) return;

    const cpu = state.players[state.activePlayerSeat];
    const timer = setTimeout(() => {
      const strongCards = cpu.hand.filter(
        (c) => c.rank === 'A' || c.rank === 'K' || c.rank === 'Q'
      ).length;
      const spades = cpu.hand.filter((c) => c.suit === 'spades').length;
      const bid = Math.max(1, Math.min(6, Math.round((strongCards + spades) / 2.5)));
      dispatch({
        type: 'PLACE_BID',
        playerId: cpu.id,
        amount: bid,
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [state.phase, state.activePlayerSeat, state.players]);

  useEffect(() => {
    if (state.phase !== 'playing' || !state.currentTrick) return;
    if (state.activePlayerSeat === HUMAN_SEAT) return;

    const cpu = state.players[state.activePlayerSeat];
    const legal = legalPlays(cpu.hand, state.currentTrick, state.spadesBroken);

    const timer = setTimeout(() => {
      const chosen = legal[0];
      if (!chosen) return;
      dispatch({
        type: 'PLAY_CARD',
        playerId: cpu.id,
        cardId: chosen.id,
      });
    }, 900);

    return () => clearTimeout(timer);
  }, [state.phase, state.activePlayerSeat, state.currentTrick, state.spadesBroken, state.players]);

  useEffect(() => {
    if ((state.phase === 'roundOver' || state.phase === 'gameOver') && state.roundNumber !== settledRound.current) {
      const nsDelta = state.lastRoundResult?.nsScoreDelta ?? 0;
      if (nsDelta > 0) addChips(Math.max(25, nsDelta));
      settledRound.current = state.roundNumber;
    }
  }, [state.phase, state.roundNumber, state.lastRoundResult, addChips]);

  return (
    <GameShell
      title="Spades"
      subtitle="Team trick-taking with CPU opponents, round scoring, and chip rewards."
      rules={GAME_META.spades.rules}
    >
      <div className="space-y-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Spades Table</h1>
          <div className="flex gap-3">
            <button
              className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-3 text-sm font-semibold text-black"
              onClick={() => dispatch({ type: 'NEW_GAME' })}
            >
              New Game
            </button>

            {state.phase === 'roundOver' && (
              <button
                className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800"
                onClick={() => dispatch({ type: 'NEXT_ROUND' })}
              >
                Next Round
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="font-medium">{state.message}</div>
          <div className="mt-1 text-sm text-zinc-300">
            Phase: {state.phase} • Round: {state.roundNumber} • Dealer Seat: {state.dealerSeat}
          </div>
        </div>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[me, east, south, west].map((player) => (
            <div key={player.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="font-medium">{player.name}</div>
              <div className="mt-1 text-sm text-zinc-300">
                Bid: {player.bid >= 0 ? player.bid : '—'} • Tricks: {player.tricksWon} • Cards: {player.hand.length}
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-4">
          {state.teams.map((team) => (
            <div key={team.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="font-medium">Team {team.id}</div>
              <div className="mt-1 text-sm text-zinc-300">
                Score: {team.score} • Bags: {team.bags} • Bid: {team.combinedBid} • Tricks: {team.tricksTaken}
              </div>
            </div>
          ))}
        </section>

        {state.phase === 'bidding' && myTurnToBid && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Place Your Bid</h2>
            <div className="flex flex-wrap gap-2">
              {[0,1,2,3,4,5,6,7].map((amount) => (
                <button
                  key={amount}
                  className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800"
                  onClick={() =>
                    dispatch({ type: 'PLACE_BID', playerId: HUMAN_ID, amount })
                  }
                >
                  {amount === 0 ? 'Nil' : amount}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Current Trick</h2>
          <div className="flex flex-wrap gap-3">
            {state.currentTrick?.cards.length ? (
              state.currentTrick.cards.map((play) => (
                <div key={`${play.seat}-${play.card.id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-sm text-zinc-300">
                    {state.players[play.seat].name}
                  </div>
                  <div className="font-mono">{renderSpadesCard(play.card)}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-300">No cards played yet.</div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Your Hand</h2>
          <div className="flex flex-wrap gap-2">
            {me.hand.map((card) => (
              <button
                key={card.id}
                disabled={!myTurnToPlay || !legalIds.has(card.id)}
                onClick={() =>
                  dispatch({
                    type: 'PLAY_CARD',
                    playerId: HUMAN_ID,
                    cardId: card.id,
                  })
                }
                className={`rounded-xl border border-white/10 px-3 py-2 font-mono ${
                  legalIds.has(card.id) && myTurnToPlay
                    ? 'bg-white/10 hover:bg-white/15'
                    : 'bg-black/20 opacity-50'
                }`}
              >
                {renderSpadesCard(card)}
              </button>
            ))}
          </div>
        </section>

        {state.lastRoundResult && (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-medium">Last Round Result</h2>
            <div className="mt-2 text-sm text-zinc-300">
              Team 1: {state.lastRoundResult.nsScoreDelta >= 0 ? '+' : ''}{state.lastRoundResult.nsScoreDelta}
              {' '}• Team 2: {state.lastRoundResult.ewScoreDelta >= 0 ? '+' : ''}{state.lastRoundResult.ewScoreDelta}
              {' '}• NS Bags: +{state.lastRoundResult.nsBagsDelta}
              {' '}• EW Bags: +{state.lastRoundResult.ewBagsDelta}
            </div>
          </section>
        )}
      </div>
    </GameShell>
  );
}
