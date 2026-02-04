import type { BaseCard } from './types';

export class Deck<T extends BaseCard> {
  private cards: T[];

  constructor(cards: T[]) {
    this.cards = [...cards];
  }

  size(): number {
    return this.cards.length;
  }

  draw(): T | undefined {
    return this.cards.pop();
  }

  drawMany(n: number): T[] {
    if (n < 0) throw new Error('drawMany(n): n must be >= 0');
    const out: T[] = [];
    for (let i = 0; i < n; i++) {
      const c = this.draw();
      if (!c) break;
      out.push(c);
    }
    return out;
  }

  deal(playerCount: number, cardsEach: number): T[][] {
    if (playerCount <= 0) throw new Error('deal: playerCount must be > 0');
    if (cardsEach < 0) throw new Error('deal: cardsEach must be >= 0');

    const hands: T[][] = Array.from({ length: playerCount }, () => []);
    for (let c = 0; c < cardsEach; c++) {
      for (let p = 0; p < playerCount; p++) {
        const card = this.draw();
        if (!card) return hands;
        hands[p].push(card);
      }
    }
    return hands;
  }
}
