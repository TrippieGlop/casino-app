'use client';

import { useReducer } from 'react';
import type { StandardCard } from '@/core/cards/types';
import { blackjackReducer, createInitialBlackjackState } from '@/core/rules/blackjack/reducer';

function renderCard(c: StandardCard) {
  return `${c.rank}${c.suit}`;
}

export default function BlackjackPage() {
  const [state, dispatch] = useReducer(blackjackReducer, undefined, () =>
    createInitialBlackjackState(123)
  );

  const dealerShown = state.revealDealerHoleCard
    ? state.dealerCards
    : state.dealerCards.map((c, i) => (i === 1 ? null : c));

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Blackjack</h1>
        <div className="text-sm opacity-70 font-mono">seed: {state.seed}</div>
      </div>

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="text-lg font-medium">Dealer</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {dealerShown.map((c, idx) =>
              c ? (
                <span key={c.id} className="rounded-md border px-3 py-1 font-mono">
                  {renderCard(c)}
                </span>
              ) : (
                <span key={`hidden-${idx}`} className="rounded-md border px-3 py-1 font-mono opacity-60">
                  ??
                </span>
              )
            )}
          </div>
          <p className="mt-2 text-sm opacity-70">
            Total: {state.dealerTotal}
            {!state.revealDealerHoleCard ? ' (showing)' : ''}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">You</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.playerCards.map((c) => (
              <span key={c.id} className="rounded-md border px-3 py-1 font-mono">
                {renderCard(c)}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm opacity-70">Total: {state.playerTotal}</p>
        </section>

        <section className="space-y-3">
          <div className="rounded-lg border p-3">
            <div className="font-medium">{state.message}</div>
            <div className="text-sm opacity-70 mt-1">
              Phase: {state.phase} {state.outcome !== 'NONE' ? ` • Outcome: ${state.outcome}` : ''}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => dispatch({ type: 'HIT' })}
              disabled={state.phase !== 'PLAYER_TURN'}
            >
              Hit
            </button>

            <button
              className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => dispatch({ type: 'STAND' })}
              disabled={state.phase !== 'PLAYER_TURN'}
            >
              Stand
            </button>

            <button
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
              onClick={() => dispatch({ type: 'NEW_GAME' })}
            >
              New Game (new shuffle)
            </button>

            <button
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
              onClick={() => dispatch({ type: 'RESET' })}
            >
              Reset (same seed)
            </button>
          </div>

          <div className="text-sm opacity-70">Draw pile remaining: {state.drawPile.length}</div>
        </section>
      </div>
    </main>
  );
}
