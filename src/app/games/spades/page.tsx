'use client';

import { useEffect, useState } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { Card } from '@/components/ui/Card';
import { TurnBanner } from '@/components/ui/TurnBanner';
import { ActionLog } from '@/components/ui/ActionLog';
import { useAppSettings } from '@/components/app/AppProvider';

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
type SCard = { rank: Rank; suit: Suit };

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function makeDeck(): SCard[] {
  const deck: SCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export default function SpadesPage() {
  const { account, difficulty, addChips } = useAppSettings();
  const displayName = account.username.trim() || 'Guest';

  const [hands, setHands] = useState<SCard[][]>([[], [], [], []]);
  const [bids, setBids] = useState<number[]>([0, 0, 0, 0]);
  const [tricks, setTricks] = useState<number[]>([0, 0, 0, 0]);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<'bidding' | 'playing' | 'roundOver'>('bidding');
  const [trick, setTrick] = useState<{ player: number; card: SCard }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const names = [displayName, 'CPU 1', 'CPU 2', 'CPU 3'];

  useEffect(() => {
    const deck = makeDeck();
    const nextHands = [[], [], [], []] as SCard[][];
    for (let i = 0; i < 13; i += 1) {
      for (let p = 0; p < 4; p += 1) {
        nextHands[p].push(deck.shift()!);
      }
    }
    setHands(nextHands);
    setBids([0, 0, 0, 0]);
    setTricks([0, 0, 0, 0]);
    setTurn(0);
    setPhase('bidding');
    setTrick([]);
    setLogs(['New Spades round started.']);
  }, [displayName]);

  function addLog(text: string) {
    setLogs((prev) => [text, ...prev].slice(0, 12));
  }

  function placeBid(player: number, bid: number) {
    const nextBids = [...bids];
    nextBids[player] = bid;
    setBids(nextBids);
    addLog(`${names[player]} bids ${bid}.`);

    if (player === 3) {
      setPhase('playing');
      setTurn(0);
      return;
    }
    setTurn(player + 1);
  }

  function resolveTrick(nextTrick: { player: number; card: SCard }[]) {
    const leadSuit = nextTrick[0].card.suit;
    let winner = nextTrick[0];

    for (const play of nextTrick.slice(1)) {
      const isTrump = play.card.suit === '♠' && winner.card.suit !== '♠';
      const sameSuitHigher =
        play.card.suit === winner.card.suit &&
        rankValue(play.card.rank) > rankValue(winner.card.rank);
      const trumpHigher =
        play.card.suit === '♠' &&
        winner.card.suit === '♠' &&
        rankValue(play.card.rank) > rankValue(winner.card.rank);
      const leadBetter =
        winner.card.suit !== '♠' &&
        play.card.suit === leadSuit &&
        winner.card.suit === leadSuit &&
        rankValue(play.card.rank) > rankValue(winner.card.rank);

      if (isTrump || sameSuitHigher || trumpHigher || leadBetter) {
        winner = play;
      }
    }

    const nextTricks = [...tricks];
    nextTricks[winner.player] += 1;
    setTricks(nextTricks);
    setTrick([]);
    setTurn(winner.player);
    addLog(`${names[winner.player]} wins the trick.`);

    const cardsLeft = hands.reduce((sum, h) => sum + h.length, 0);
    if (cardsLeft === 0) {
      const team1 = nextTricks[0] + nextTricks[2];
      const team2 = nextTricks[1] + nextTricks[3];
      if (team1 >= bids[0] + bids[2]) {
        const reward = difficulty === 'hard' ? 200 : difficulty === 'medium' ? 125 : 75;
        addChips(reward);
        addLog(`Team 1 wins. You earned $${reward}.`);
      }
      setPhase('roundOver');
    }
  }

  function playCard(player: number, cardIndex: number) {
    if (phase !== 'playing') return;
    const card = hands[player][cardIndex];
    if (!card) return;

    const nextHands = hands.map((h) => [...h]);
    nextHands[player].splice(cardIndex, 1);
    setHands(nextHands);

    const nextTrick = [...trick, { player, card }];
    setTrick(nextTrick);
    addLog(`${names[player]} plays ${card.rank}${card.suit}.`);

    if (nextTrick.length === 4) {
      resolveTrick(nextTrick);
      return;
    }

    setTurn((player + 1) % 4);
  }

  useEffect(() => {
    if (phase === 'bidding' && turn > 0) {
      const timer = setTimeout(() => placeBid(turn, 2 + (turn % 2)), 500);
      return () => clearTimeout(timer);
    }

    if (phase === 'playing' && turn > 0) {
      const timer = setTimeout(() => playCard(turn, 0), 650);
      return () => clearTimeout(timer);
    }
  }, [phase, turn, hands, trick]);

  return (
    <GameShell
      title="Spades"
      subtitle=""
    >
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <TurnBanner
            title={
              phase === 'bidding'
                ? `${names[turn]} bidding`
                : phase === 'playing'
                ? `${names[turn]} to play`
                : 'Round complete'
            }
            subtitle={`Team 1: ${names[0]} + ${names[2]} • Team 2: ${names[1]} + ${names[3]}`}
          />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-lg font-semibold">Current Trick</div>
            <div className="flex flex-wrap gap-2">
              {trick.length ? trick.map((play, i) => <Card key={i} card={play.card} />) : <div className="text-sm text-zinc-400">No cards in this trick yet.</div>}
            </div>
          </div>

          <ActionLog items={logs} />
        </div>

        <div className="space-y-4">
          {names.map((name, playerIndex) => (
            <div key={playerIndex} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold">{name}</div>
              <div className="mt-1 text-sm text-zinc-400">Bid: {bids[playerIndex]} • Tricks: {tricks[playerIndex]}</div>

              {phase === 'bidding' && playerIndex === 0 && turn === 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm" onClick={() => placeBid(0, n)}>
                      {n}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {hands[playerIndex].map((card, i) =>
                  playerIndex === 0 && phase === 'playing' && turn === 0 ? (
                    <button key={i} onClick={() => playCard(0, i)}>
                      <Card card={card} />
                    </button>
                  ) : (
                    <Card key={i} card={card} hidden={playerIndex !== 0 && phase !== 'roundOver'} />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
