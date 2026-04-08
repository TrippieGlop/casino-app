'use client';

import { useEffect, useReducer, useState } from 'react';
import { GameShell } from '@/components/app/GameShell';
import { BettingPanel } from '@/components/app/BettingPanel';
import { useAppSettings } from '@/components/app/AppProvider';
import { GAME_META } from '@/lib/gameMeta';
import {
  unoReducer,
  createInitialUnoState,
  UNO_COLOURS,
  effectiveColour,
  isWild,
  type UnoCard,
  type UnoColour,
} from '@/core/rules/uno';
import { BackButton } from '@/components/BackButton';

type UnoSeat = {
  id: string;
  label: string;
  kind: 'human' | 'cpu' | 'empty';
};

function renderCard(card: UnoCard) {
  if (isWild(card)) return card.face === 'wild_draw_four' ? 'Wild +4' : 'Wild';
  return `${card.colour} ${String(card.face)}`;
}

function cardBg(card: UnoCard): string {
  if (isWild(card)) return 'bg-black text-white';
  if (card.colour === 'red') return 'bg-red-500 text-white';
  if (card.colour === 'yellow') return 'bg-yellow-400 text-black';
  if (card.colour === 'green') return 'bg-green-600 text-white';
  return 'bg-blue-600 text-white';
}

export default function UnoPage() {
  const { addChips, spendChips, localPlay } = useAppSettings();
  const [state, dispatch] = useReducer(unoReducer, undefined, () => createInitialUnoState(123));
  const [wager, setWager] = useState(25);
  const [roundActive, setRoundActive] = useState(false);
  const [roundSettled, setRoundSettled] = useState(false);

  const [seats, setSeats] = useState<UnoSeat[]>([
    { id: 'u1', label: 'You', kind: 'human' },
    { id: 'u2', label: 'CPU 1', kind: 'cpu' },
    { id: 'u3', label: 'Empty', kind: 'empty' },
    { id: 'u4', label: 'Empty', kind: 'empty' },
    { id: 'u5', label: 'Empty', kind: 'empty' },
    { id: 'u6', label: 'Empty', kind: 'empty' },
  ]);

  const player = state.players[0];
  const cpu = state.players[1];
  const topCard = state.discardPile[0];
  const activePlayer = state.players[state.activePlayerIndex];

  useEffect(() => {
    if (state.phase !== 'gameOver' || roundSettled || !roundActive) return;
    if (state.result?.winnerId === 'p1') addChips(wager * 2);
    setRoundSettled(true);
  }, [state.phase, state.result, roundSettled, roundActive, addChips, wager]);

  function startRound() {
    if (!spendChips(wager)) return;
    setRoundActive(true);
    setRoundSettled(false);
    dispatch({ type: 'NEW_GAME' });
  }

  function closeRound() {
    setRoundActive(false);
    setRoundSettled(false);
  }

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
    setSeats((prev) => prev.map((s) => (s.id === id ? { ...s, kind: 'empty', label: 'Empty' } : s)));
  }

  return (
    <GameShell
      title="UNO"
      subtitle="UNO table with support for up to 6 total seats, including real players and bots."
      rules={GAME_META.uno.rules}
    >
      <div className="space-y-6">
        <BettingPanel
          wager={wager}
          setWager={setWager}
          disabled={roundActive}
          onStart={startRound}
          startLabel="Start UNO Round"
          helperText={`Mode: ${localPlay ? 'Local Play' : 'CPU Table'} • Add up to 6 seats for presentation.`}
        />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-lg font-semibold">UNO Table Seats</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {seats.map((seat) => (
              <div key={seat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="font-medium">{seat.label}</div>
                <div className="mt-1 text-sm capitalize text-zinc-400">{seat.kind}</div>
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
          <div className="font-medium">{state.message}</div>
          <div className="mt-1 text-sm text-zinc-300">
            Phase: {state.phase} • Active Player: {activePlayer.name}
            {state.result ? ` • Winner: ${state.result.winnerId}` : ''} • Wager: ${wager}
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">CPU Hand</h2>
          <div className="flex flex-wrap gap-2">
            {cpu.hand.map((card) => (
              <div key={card.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-5 font-mono opacity-80">
                UNO
              </div>
            ))}
          </div>
          <p className="text-sm text-zinc-300">Cards: {cpu.hand.length}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Center Pile</h2>
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-zinc-300">
              Draw Pile: {state.drawPile.length}
            </div>
            <div className={`rounded-xl border border-white/10 px-4 py-6 font-mono shadow-lg ${cardBg(topCard)}`}>
              {renderCard(topCard)}
              {effectiveColour(topCard) ? ` (${effectiveColour(topCard)})` : ''}
            </div>
          </div>
        </section>

        {state.phase === 'choosingColour' && activePlayer.id === 'p1' && (
          <section className="space-y-2">
            <h2 className="text-lg font-medium">Choose a colour</h2>
            <div className="flex gap-2">
              {UNO_COLOURS.map((colour) => (
                <button
                  key={colour}
                  className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800"
                  onClick={() => dispatch({ type: 'CHOOSE_COLOUR', playerId: 'p1', colour: colour as UnoColour })}
                >
                  {colour}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Your Hand</h2>
          <div className="flex flex-wrap gap-2">
            {player.hand.map((card) => (
              <button
                key={card.id}
                className={`rounded-xl border border-white/10 px-3 py-2 font-mono shadow-lg ${cardBg(card)}`}
                disabled={!roundActive || state.phase !== 'playing' || activePlayer.id !== 'p1'}
                onClick={() => dispatch({ type: 'PLAY_CARD', playerId: 'p1', cardId: card.id })}
              >
                {renderCard(card)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50"
              disabled={!roundActive || state.phase !== 'playing' || activePlayer.id !== 'p1' || state.hasDrawnThisTurn}
              onClick={() => dispatch({ type: 'DRAW_CARD', playerId: 'p1' })}
            >
              Draw Card
            </button>

            <button
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50"
              disabled={!roundActive || state.phase !== 'playing' || activePlayer.id !== 'p1' || !state.hasDrawnThisTurn}
              onClick={() => dispatch({ type: 'PASS_TURN', playerId: 'p1' })}
            >
              Pass Turn
            </button>

            <button className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800" onClick={closeRound}>
              Leave Table
            </button>
          </div>
        </section>
      </div>
    </GameShell>
  );
}
