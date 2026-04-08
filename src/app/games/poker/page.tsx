'use client';

import { useMemo, useState } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { BettingPanel } from '@/components/app/BettingPanel';
import { useAppSettings } from '@/components/app/AppProvider';
import { GAME_META } from '@/lib/gameMeta';
import { makeStandardDeck } from '@/core/cards/standardFactory';
import { shuffleInPlace } from '@/core/cards/shuffle';
import { mulberry32 } from '@/core/cards/rng';
import type { StandardCard } from '@/core/cards/types';

type PokerSeat = {
  id: string;
  label: string;
  kind: 'human' | 'cpu' | 'empty';
};

function renderCard(c: StandardCard) {
  return `${c.rank}${c.suit}`;
}

export default function PokerPage() {
  const { difficulty, localPlay, spendChips, addChips } = useAppSettings();
  const [buyIn, setBuyIn] = useState(100);
  const [handActive, setHandActive] = useState(false);
  const [seed, setSeed] = useState(123);
  const [pot, setPot] = useState(0);
  const [message, setMessage] = useState('Join the table to begin.');
  const [community, setCommunity] = useState<StandardCard[]>([]);
  const [playerHand, setPlayerHand] = useState<StandardCard[]>([]);
  const [cpuHand, setCpuHand] = useState<StandardCard[]>([]);

  const [seats, setSeats] = useState<PokerSeat[]>(
    Array.from({ length: 9 }, (_, i) => ({
      id: `p${i + 1}`,
      label: i === 0 ? 'You' : i <= 2 ? `CPU ${i}` : 'Empty Seat',
      kind: i === 0 ? 'human' : i <= 2 ? 'cpu' : 'empty',
    }))
  );

  const deck = useMemo(() => {
    const d = makeStandardDeck();
    shuffleInPlace(d, mulberry32(seed));
    return d;
  }, [seed]);

  function fillSeat(id: string, kind: 'human' | 'cpu') {
    setSeats((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, kind, label: kind === 'human' ? `Player ${id.slice(1)}` : `CPU ${id.slice(1)}` }
          : s
      )
    );
  }

  function emptySeat(id: string) {
    setSeats((prev) => prev.map((s) => (s.id === id ? { ...s, kind: 'empty', label: 'Empty Seat' } : s)));
  }

  function startHand() {
    if (!spendChips(buyIn)) return;
    const cards = [...deck];
    const p = [cards.pop()!, cards.pop()!];
    const c = [cards.pop()!, cards.pop()!];
    const board = [cards.pop()!, cards.pop()!, cards.pop()!];
    setPlayerHand(p);
    setCpuHand(c);
    setCommunity(board);
    setPot(buyIn * Math.max(2, seats.filter((s) => s.kind !== 'empty').length));
    setHandActive(true);
    setMessage(`Hand started. Difficulty: ${difficulty}. Seats active: ${seats.filter((s) => s.kind !== 'empty').length}`);
  }

  function revealTurn() {
    if (!handActive) return;
    const cards = makeStandardDeck();
    shuffleInPlace(cards, mulberry32(seed + 1));
    setCommunity((prev) => prev.length === 3 ? [...prev, cards[10]] : prev.length === 4 ? [...prev, cards[11]] : prev);
  }

  function showdown() {
    if (!handActive) return;
    const playerWins = difficulty === 'easy' ? true : seed % 2 === 0;
    if (playerWins) {
      addChips(pot);
      setMessage('Showdown: you win the pot.');
    } else {
      setMessage('Showdown: a CPU wins the pot.');
    }
    setHandActive(false);
    setSeed((s) => s + 1);
  }

  return (
    <GameShell
      title="Poker"
      subtitle="Hold’em table starter with up to 9 seats, CPU support, buy-ins, and staged board reveals."
      rules={GAME_META.poker.rules}
    >
      <div className="space-y-6">
        <BettingPanel
          title="Table Buy-In"
          wager={buyIn}
          setWager={setBuyIn}
          onStart={startHand}
          disabled={handActive}
          startLabel="Join Table"
          helperText={`Mode: ${localPlay ? 'Local Play' : 'CPU Table'} • Difficulty: ${difficulty}`}
        />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-lg font-semibold">Poker Table Seats</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {seats.map((seat) => (
              <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="font-medium">{seat.label}</div>
                <div className="mt-1 text-sm text-zinc-400 capitalize">{seat.kind}</div>
                <div className="mt-3 flex gap-2">
                  {seat.kind === 'empty' ? (
                    <>
                      <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => fillSeat(seat.id, 'cpu')}>Add CPU</button>
                      <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => fillSeat(seat.id, 'human')}>Add Player</button>
                    </>
                  ) : (
                    <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => emptySeat(seat.id)}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="font-medium">{message}</div>
          <div className="mt-1 text-sm text-zinc-300">Pot: ${pot}</div>
        </div>

        <section>
          <h2 className="mb-2 text-lg font-medium">CPU Hand</h2>
          <div className="flex gap-3">
            {cpuHand.length ? cpuHand.map((_, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-black/20 px-4 py-6">??</div>
            )) : <div className="text-sm text-zinc-400">No hand yet.</div>}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium">Community Cards</h2>
          <div className="flex flex-wrap gap-3">
            {community.length ? community.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/10 px-4 py-6 font-mono">
                {renderCard(c)}
              </div>
            )) : <div className="text-sm text-zinc-400">Board empty.</div>}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium">Your Hand</h2>
          <div className="flex gap-3">
            {playerHand.length ? playerHand.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/10 px-4 py-6 font-mono">
                {renderCard(c)}
              </div>
            )) : <div className="text-sm text-zinc-400">No hand yet.</div>}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50" onClick={revealTurn} disabled={!handActive}>
            Reveal Next Board Card
          </button>
          <button className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50" onClick={showdown} disabled={!handActive}>
            Showdown
          </button>
        </div>
      </div>
    </GameShell>
  );
}
