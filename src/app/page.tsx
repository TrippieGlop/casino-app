'use client';

import { useMemo, useState } from 'react';
import { makeStandardDeck } from '@/core/cards/standardFactory';
import { Deck } from '@/core/cards/deck';
import { mulberry32 } from '@/core/cards/rng';
import { shuffleInPlace } from '@/core/cards/shuffle';
import type { StandardCard } from '@/core/cards/types';

function formatCard(c: StandardCard) {
  return `${c.rank}${c.suit}`;
}

export default function Home() {
  const [seed, setSeed] = useState(123);

  const deck = useMemo(() => {
    const rng = mulberry32(seed);
    const cards = makeStandardDeck();
    shuffleInPlace(cards, rng);
    return new Deck<StandardCard>(cards);
  }, [seed]);

  const [drawn, setDrawn] = useState<StandardCard[]>([]);

  function reset() {
    setDrawn([]);
    setSeed((s) => s + 1);
  }

  function drawOne() {
    const c = deck.draw();
    if (!c) return;
    setDrawn((prev) => [...prev, c]);
  }

  function drawFive() {
    const cards = deck.drawMany(5);
    if (cards.length) setDrawn((prev) => [...prev, ...cards]);
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Casino Card Engine Smoke Test</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="rounded-lg border px-3 py-2">
          <span className="text-sm opacity-70">Seed:</span>{' '}
          <span className="font-mono">{seed}</span>
        </div>

        <button className="rounded-lg border px-4 py-2 hover:bg-gray-50" onClick={drawOne}>
          Draw 1
        </button>

        <button className="rounded-lg border px-4 py-2 hover:bg-gray-50" onClick={drawFive}>
          Draw 5
        </button>

        <button className="rounded-lg border px-4 py-2 hover:bg-gray-50" onClick={reset}>
          Reset (new shuffle)
        </button>
      </div>

      <div className="mt-6">
        <p className="text-sm opacity-70">Drawn cards:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {drawn.length === 0 ? (
            <span className="opacity-60">None yet</span>
          ) : (
            drawn.map((c) => (
              <span key={c.id} className="rounded-md border px-3 py-1 font-mono">
                {formatCard(c)}
              </span>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
