export const UNO_COLOURS = ['red', 'yellow', 'green', 'blue'] as const;
export type UnoColour = (typeof UNO_COLOURS)[number];

export type UnoNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type UnoActionFace = 'skip' | 'reverse' | 'draw_two';
export type UnoWildFace = 'wild' | 'wild_draw_four';
export type UnoFace = UnoNumber | UnoActionFace | UnoWildFace;

export interface UnoColouredCard {
  readonly kind: 'coloured';
  readonly id: string;
  readonly colour: UnoColour;
  readonly face: UnoNumber | UnoActionFace;
}

export interface UnoWildCard {
  readonly kind: 'wild';
  readonly id: string;
  readonly face: UnoWildFace;
  readonly chosenColour: UnoColour | null;
}

export type UnoCard = UnoColouredCard | UnoWildCard;

export function isWild(card: UnoCard): card is UnoWildCard {
  return card.kind === 'wild';
}

export function isColoured(card: UnoCard): card is UnoColouredCard {
  return card.kind === 'coloured';
}

export function effectiveColour(card: UnoCard): UnoColour | null {
  return isColoured(card) ? card.colour : card.chosenColour;
}

export function isLegalPlay(played: UnoCard, topOfPile: UnoCard): boolean {
  if (isWild(played)) return true;

  const topColour = effectiveColour(topOfPile);
  const playedCard = played as UnoColouredCard;

  if (topColour !== null && playedCard.colour === topColour) return true;

  if (isColoured(topOfPile) && playedCard.face === topOfPile.face) return true;

  return false;
}

let _idCounter = 0;
function uid(prefix: string): string {
  return `${prefix}-${++_idCounter}`;
}

export function buildUnoDeck(): UnoCard[] {
  const cards: UnoCard[] = [];

  for (const colour of UNO_COLOURS) {
    cards.push({ kind: 'coloured', id: uid(`${colour}-0`), colour, face: 0 });

    for (let n = 1; n <= 9; n++) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          kind: 'coloured',
          id: uid(`${colour}-${n}`),
          colour,
          face: n as UnoNumber,
        });
      }
    }

    const actions: UnoActionFace[] = ['skip', 'reverse', 'draw_two'];
    for (const action of actions) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          kind: 'coloured',
          id: uid(`${colour}-${action}`),
          colour,
          face: action,
        });
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ kind: 'wild', id: uid('wild'), face: 'wild', chosenColour: null });
    cards.push({
      kind: 'wild',
      id: uid('wild_draw_four'),
      face: 'wild_draw_four',
      chosenColour: null,
    });
  }

  return cards;
}
