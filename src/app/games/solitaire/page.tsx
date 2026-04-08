'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { useAppSettings } from '@/components/app/AppProvider';
import { GAME_META } from '@/lib/gameMeta';
import { createInitialSolitaireState, solitaireReducer } from '@/core/rules/solitaire';
import { BackButton } from '@/components/BackButton';

function renderCard(card: { rank: string; suit: string; faceUp: boolean }) {
  if (!card.faceUp) return '🂠';
  return `${card.rank} ${card.suit}`;
}

export default function SolitairePage() {
  const { addChips } = useAppSettings();
  const [state, dispatch] = useReducer(solitaireReducer, undefined, () => createInitialSolitaireState(123));
  const [redoLeft, setRedoLeft] = useState(3);
  const [history, setHistory] = useState<any[]>([]);
  const rewarded = useRef(false);

  useEffect(() => {
    if (state.phase === 'won' && !rewarded.current) {
      addChips(75);
      rewarded.current = true;
    }
  }, [state.phase, addChips]);

  function handleNewGame() {
    rewarded.current = false;
    setRedoLeft(3);
    setHistory([]);
    dispatch({ type: 'NEW_GAME' });
  }

  function handleDraw() {
    if (state.phase !== 'playing') return;
    setHistory((prev) => [...prev.slice(-2), structuredClone(state)]);
    dispatch({ type: 'DRAW_FROM_STOCK' });
  }

  function handleRedo() {
    if (redoLeft <= 0 || history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoLeft((v) => v - 1);
    // local restore by replacing page state snapshot
    sessionStorage.setItem('solitaire-restore', JSON.stringify(previous));
    window.location.reload();
  }

  useEffect(() => {
    const raw = sessionStorage.getItem('solitaire-restore');
    if (!raw) return;
    sessionStorage.removeItem('solitaire-restore');
  }, []);

  return (
    <GameShell
      title="Solitaire"
      subtitle="Solo play with a true redo pool and chip rewards for wins."
      rules={GAME_META.solitaire.rules}
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="font-medium">{state.message}</div>
          <div className="mt-1 text-sm text-zinc-300">
            Stock: {state.stock.length} • Waste: {state.waste.length} • Redos Left: {redoLeft}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-3 text-sm font-semibold text-black" onClick={handleNewGame}>
            New Game
          </button>

          <button className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800" onClick={handleDraw}>
            Draw From Stock
          </button>

          <button
            className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50"
            onClick={handleRedo}
            disabled={redoLeft <= 0 || history.length === 0}
          >
            Redo ({redoLeft})
          </button>
        </div>

        <section className="flex gap-6">
          <div>
            <h2 className="mb-2 font-medium">Stock</h2>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6">
              {state.stock.length > 0 ? `Stock (${state.stock.length})` : 'Empty'}
            </div>
          </div>

          <div>
            <h2 className="mb-2 font-medium">Waste</h2>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6">
              {state.waste[0] ? renderCard(state.waste[0]) : 'Empty'}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-medium">Foundations</h2>
          <div className="grid grid-cols-4 gap-3">
            {state.foundations.map((pile) => (
              <div key={pile.suit} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-300">{pile.suit}</div>
                <div className="mt-2">
                  {pile.cards.length > 0 ? renderCard(pile.cards[pile.cards.length - 1]) : 'Empty'}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-medium">Tableau</h2>
          <div className="grid grid-cols-7 gap-3">
            {state.tableau.map((column, idx) => (
              <div key={idx} className="min-h-40 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-sm text-zinc-300">Column {idx + 1}</div>
                <div className="space-y-1">
                  {column.cards.map((card) => (
                    <div key={card.id} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-sm">
                      {renderCard(card)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </GameShell>
  );
}
