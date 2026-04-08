'use client';

import { useReducer } from 'react';
import { createInitialSolitaireState, solitaireReducer } from '@/core/rules/solitaire';
import { BackButton } from '@/components/BackButton';

function renderCard(card: { rank: string; suit: string; faceUp: boolean }) {
  if (!card.faceUp) return '🂠';
  return `${card.rank} ${card.suit}`;
}

export default function SolitairePage() {
  const [state, dispatch] = useReducer(solitaireReducer, undefined, () =>
    createInitialSolitaireState(123)
  );

  return (
    <main className="min-h-screen p-8 space-y-8">
      <div className="mb-4">
        <BackButton />
      </div>
      
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Solitaire</h1>
        <button
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
          onClick={() => dispatch({ type: 'NEW_GAME' })}
        >
          New Game
        </button>
      </div>

      <div className="rounded-xl border p-4">
        <div className="font-medium">{state.message}</div>
        <div className="mt-1 text-sm opacity-70">
          Stock: {state.stock.length} • Waste: {state.waste.length}
        </div>
      </div>

      <section className="flex gap-6">
        <div>
          <h2 className="mb-2 font-medium">Stock</h2>
          <button
            className="rounded-md border px-4 py-6 hover:bg-gray-50"
            onClick={() => dispatch({ type: 'DRAW_FROM_STOCK' })}
          >
            {state.stock.length > 0 ? `Stock (${state.stock.length})` : 'Recycle'}
          </button>
        </div>

        <div>
          <h2 className="mb-2 font-medium">Waste</h2>
          <div className="rounded-md border px-4 py-6">
            {state.waste[0] ? renderCard(state.waste[0]) : 'Empty'}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Foundations</h2>
        <div className="grid grid-cols-4 gap-3">
          {state.foundations.map((pile) => (
            <div key={pile.suit} className="rounded-md border p-4">
              <div className="text-sm opacity-70">{pile.suit}</div>
              <div className="mt-2">{pile.cards.length > 0 ? renderCard(pile.cards[pile.cards.length - 1]) : 'Empty'}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Tableau</h2>
        <div className="grid grid-cols-7 gap-3">
          {state.tableau.map((column, idx) => (
            <div key={idx} className="rounded-md border p-3 min-h-40">
              <div className="text-sm opacity-70 mb-2">Column {idx + 1}</div>
              <div className="space-y-1">
                {column.cards.map((card) => (
                  <div key={card.id} className="rounded border px-2 py-1 text-sm">
                    {renderCard(card)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
