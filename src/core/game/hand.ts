import type { BaseCard, CardId } from '../cards/types';

export class Hand<T extends BaseCard> {
  private cards: T[];

  constructor(initial: T[] = []) {
    this.cards = [...initial];
  }

  all(): T[] {
    return [...this.cards];
  }

  size(): number {
    return this.cards.length;
  }

  add(cards: T[] | T): void {
    if (Array.isArray(cards)) this.cards.push(...cards);
    else this.cards.push(cards);
  }

  has(cardId: CardId): boolean {
    return this.cards.some((c) => c.id === cardId);
  }

  removeById(cardId: CardId): T {
    const idx = this.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new Error(`Card not found in hand: ${cardId}`);
    const [card] = this.cards.splice(idx, 1);
    return card;
  }
}
