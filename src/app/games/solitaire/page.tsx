'use client';

import { useEffect, useState } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { Card } from '@/components/ui/Card';
import { TurnBanner } from '@/components/ui/TurnBanner';
import { ActionLog } from '@/components/ui/ActionLog';

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
type SCard = { rank: Rank; suit: Suit; faceUp: boolean };

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function makeDeck(): SCard[] {
  const deck: SCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceUp: false });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export default function SolitairePage() {
  const [tableau, setTableau] = useState<SCard[][]>([]);
  const [stock, setStock] = useState<SCard[]>([]);
  const [waste, setWaste] = useState<SCard[]>([]);
  const [foundations, setFoundations] = useState<Record<Suit, SCard[]>>({
    '♠': [],
    '♥': [],
    '♦': [],
    '♣': [],
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [redoLeft, setRedoLeft] = useState(3);
  const [score, setScore] = useState(0);

  function addLog(text: string) {
    setLogs((prev) => [text, ...prev].slice(0, 12));
  }

  function newGame() {
    const deck = makeDeck();
    const nextTableau: SCard[][] = [];

    for (let col = 0; col < 7; col += 1) {
      const pile: SCard[] = [];
      for (let row = 0; row <= col; row += 1) {
        const card = deck.shift()!;
        pile.push({ ...card, faceUp: row === col });
      }
      nextTableau.push(pile);
    }

    setTableau(nextTableau);
    setStock(deck);
    setWaste([]);
    setFoundations({ '♠': [], '♥': [], '♦': [], '♣': [] });
    setRedoLeft(3);
    setLogs(['New Solitaire game started.']);
  }

  useEffect(() => {
    newGame();
  }, []);

  function drawFromStock() {
    if (stock.length === 0) {
      if (!waste.length) return;
      const recycled = [...waste].reverse().map((c) => ({ ...c, faceUp: false }));
      setStock(recycled);
      setWaste([]);
      addLog('Recycled waste back into stock.');
      return;
    }

    const nextStock = [...stock];
    const card = { ...nextStock.shift()!, faceUp: true };
    setStock(nextStock);
    setWaste((prev) => [card, ...prev]);
    setScore((s) => s + 5);
    addLog(`Drew ${card.rank}${card.suit}.`);
  }

  function moveWasteToFoundation() {
    const top = waste[0];
    if (!top) return;
    const pile = foundations[top.suit];
    const needed = pile.length === 0 ? 'A' : RANKS[rankIndex(pile[pile.length - 1].rank) + 1];
    if (top.rank !== needed) {
      addLog(`Cannot move ${top.rank}${top.suit} to foundation yet.`);
      return;
    }

    setWaste((prev) => prev.slice(1));
    setFoundations((prev) => ({ ...prev, [top.suit]: [...prev[top.suit], top] }));
    setScore((s) => s + 25);
    addLog(`Moved ${top.rank}${top.suit} to foundation.`);
  }

  function redoDraw() {
    if (redoLeft <= 0 || waste.length === 0) return;
    const [top, ...rest] = waste;
    setWaste(rest);
    setStock((prev) => [{ ...top, faceUp: false }, ...prev]);
    setRedoLeft((prev) => prev - 1);
    addLog('Undid the last draw.');
  }

  return (
    <GameShell
      title="Solitaire"
      subtitle=""
    >
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <TurnBanner
            title="Solitaire"
            subtitle={`Stock: ${stock.length} • Waste: ${waste.length} • Redo draws left: ${redoLeft} • Score: ${score}`}
          />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-lg font-semibold">Controls</div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={newGame}>New Game</button>
              <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={drawFromStock}>Draw</button>
              <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={moveWasteToFoundation}>To Foundation</button>
              <button className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={redoDraw}>Redo Draw</button>
            </div>
          </div>

          <ActionLog items={logs} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-lg font-semibold">Top Area</div>
            <div className="flex gap-4">
              <div>
                <div className="mb-2 text-sm text-zinc-400">Stock</div>
                {stock.length ? <Card hidden /> : <Card hidden />}
              </div>
              <div>
                <div className="mb-2 text-sm text-zinc-400">Waste</div>
                {waste[0] ? <Card card={waste[0]} /> : <Card hidden />}
              </div>
              <div className="ml-auto grid grid-cols-4 gap-3">
                {SUITS.map((suit) => {
                  const top = foundations[suit][foundations[suit].length - 1];
                  return (
                    <div key={suit}>
                      <div className="mb-2 text-sm text-zinc-400">{suit}</div>
                      {top ? <Card card={top} /> : <Card hidden />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-lg font-semibold">Tableau</div>
            <div className="grid grid-cols-7 gap-3">
              {tableau.map((pile, colIndex) => (
                <div key={colIndex} className="min-h-40 rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="mb-2 text-xs text-zinc-400">Column {colIndex + 1}</div>
                  <div className="space-y-2">
                    {pile.map((card, i) => (
                      <Card key={i} card={card} hidden={!card.faceUp} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
