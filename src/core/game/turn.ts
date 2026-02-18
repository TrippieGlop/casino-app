export type TurnDirection = 1 | -1;

export function nextPlayerIndex(
  playerCount: number,
  currentIndex: number,
  direction: TurnDirection = 1,
  skip = 0
): number {
  if (playerCount <= 0) throw new Error('playerCount must be > 0');
  const steps = 1 + skip;
  let idx = currentIndex;

  for (let i = 0; i < steps; i++) {
    idx = (idx + direction + playerCount) % playerCount;
  }

  return idx;
}
