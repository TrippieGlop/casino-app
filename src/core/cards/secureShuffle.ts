export function secureShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  const rand = new Uint32Array(1);

  for (let i = arr.length - 1; i > 0; i--) {
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}
