'use client';

import { useReducer } from 'react';
import {
  unoReducer,
  createInitialUnoState,
  UNO_COLOURS,
  effectiveColour,
  isColoured,
  isWild,
  type UnoCard,
  type UnoColour,
} from '@/core/rules/uno';

function renderCard(card: UnoCard) {
  if (isWild(card)) {
    return card.face === 'wild_draw_four' ? 'Wild +4' : 'Wild';
  }
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
  const [state, dispatch] = useReducer(unoReducer, undefined, () =>
    createInitialUnoState(123)
  );

  const player = state.players[0];
  const cpu = state.players[1];
  const topCard = state.discardPile[0];
  const activePlayer = state.players[state.activePlayerIndex];

  return (
    <main className="min-h-screen p-8 space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">UNO</h1>
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
          Phase: {state.phase} • Active Player: {activePlayer.name}
          {state.result ? ` • Winner: ${state.result.winnerId}` : ''}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">CPU Hand</h2>
        <div className="flex flex-wrap gap-2">
          {cpu.hand.map((card) => (
            <div
              key={card.id}
              className="rounded-md border px-3 py-5 font-mono opacity-70"
            >
              UNO
            </div>
          ))}
        </div>
        <p className="text-sm opacity-70">Cards: {cpu.hand.length}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Center Pile</h2>
        <div className="flex items-center gap-4">
          <div className="rounded-md border px-4 py-6 text-sm opacity-70">
            Draw Pile: {state.drawPile.length}
          </div>

          <div className={`rounded-md border px-4 py-6 font-mono ${cardBg(topCard)}`}>
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
                className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                onClick={() =>
                  dispatch({
                    type: 'CHOOSE_COLOUR',
                    playerId: 'p1',
                    colour: colour as UnoColour,
                  })
                }
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
          {player.hand.map((card) => {
            const playable =
              state.phase === 'playing' && activePlayer.id === 'p1'
                ? (() => {
                    try {
                      return isWild(card) ||
                        (topCard ? (
                          isWild(card) ||
                          (isColoured(card) && (
                            card.colour === effectiveColour(topCard) ||
                            (isColoured(topCard) && card.face === topCard.face)
                          ))
                        ) : true);
                    } catch {
                      return false;
                    }
                  })()
                : false;

            return (
              <button
                key={card.id}
                className={`rounded-md border px-3 py-2 font-mono ${cardBg(card)} ${!playable ? 'opacity-70' : ''}`}
                disabled={state.phase !== 'playing' || activePlayer.id !== 'p1'}
                onClick={() =>
                  dispatch({
                    type: 'PLAY_CARD',
                    playerId: 'p1',
                    cardId: card.id,
                  })
                }
              >
                {renderCard(card)}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
            disabled={state.phase !== 'playing' || activePlayer.id !== 'p1' || state.hasDrawnThisTurn}
            onClick={() => dispatch({ type: 'DRAW_CARD', playerId: 'p1' })}
          >
            Draw Card
          </button>

          <button
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
            disabled={state.phase !== 'playing' || activePlayer.id !== 'p1' || !state.hasDrawnThisTurn}
            onClick={() => dispatch({ type: 'PASS_TURN', playerId: 'p1' })}
          >
            Pass Turn
          </button>
        </div>
      </section>
    </main>
  );
}
