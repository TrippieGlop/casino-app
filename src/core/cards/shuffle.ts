export function shuffleInPlace<T>(array: T[], _rng?: () => number): T[] {
  const rand = new Uint32Array(1);

  for (let i = array.length - 1; i > 0; i--) {
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
