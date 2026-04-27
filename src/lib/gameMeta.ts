export type GameId = 'blackjack' | 'poker' | 'uno' | 'spades' | 'solitaire' | 'baccarat';

export type GameMeta = {
  id: GameId;
  name: string;
  route: string;
  description: string;
  betting: boolean;
  localPlaySupported: boolean;
  cpuSupported: boolean;
  status: 'Playable' | 'In Progress' | 'Scaffolded';
  accent: string;
  rules: string[];
};

export const GAME_META: Record<GameId, GameMeta> = {
  blackjack: {
    id: 'blackjack',
    name: 'Blackjack',
    route: '/games/blackjack',
    description: 'Aim to beat the dealer by having a hand total of 21',
    betting: true,
    localPlaySupported: true,
    cpuSupported: true,
    status: 'Playable',
    accent: 'from-emerald-500 to-teal-600',
    rules: [
      'Each active seat receives two cards. The dealer receives two cards with one hidden until resolution.',
      'Number cards are worth face value. Face cards are worth 10. Aces are worth 1 or 11.',
      'Your goal is to Aim to beat the dealer by having a hand total of 21',
      'The main wager pays 1:1. Push returns the main wager.',
      'Pairs side bet pays when your first two cards share a rank.',
      '21+3 side bet uses your first two cards and the dealer up-card.',
      'Dealer draws to 17 or higher after all seats are finished.',
    ],
  },
  poker: {
    id: 'poker',
    name: 'Poker',
    route: '/games/poker',
    description: "Texas Holdem Aim to make the best five card hand",
    betting: true,
    localPlaySupported: true,
    cpuSupported: true,
    status: 'Playable',
    accent: 'from-violet-500 to-fuchsia-600',
    rules: [
      'Each active seat receives two hole cards.',
      'Betting occurs preflop, flop, turn, and river.',
      'Players can fold, check, call, or raise when it is their turn.',
      'Community cards are shared by all remaining players.',
      'At showdown, the best five-card hand from seven total cards wins.',
    ],
  },
  uno: {
    id: 'uno',
    name: 'UNO',
    route: '/games/uno',
    description: 'Match cards by color and disrupt opponents using action cards',
    betting: true,
    localPlaySupported: true,
    cpuSupported: true,
    status: 'Playable',
    accent: 'from-rose-500 to-orange-500',
    rules: [
      'Play a card that matches the top discard by color or symbol, or play a wild card.',
      'If you cannot play, draw a card.',
      'Reverse changes direction. Skip skips the next player. Draw Two forces the next player to draw two cards.',
      'Wild lets you choose the next color. Wild Draw Four also makes the next player draw four cards.',
      'The first player to empty their hand wins the round.',
    ],
  },
  spades: {
    id: 'spades',
    name: 'Spades',
    route: '/games/spades',
    description: 'Bid tricks with your partner and use spades as trump.',
    betting: false,
    localPlaySupported: true,
    cpuSupported: true,
    status: 'Playable',
    accent: 'from-slate-700 to-slate-900',
    rules: [
      'Spades is a trick-taking partnership game played by four players in teams of two.',
      'Each player bids how many tricks they expect to win during the round.',
      'Players must follow suit if possible. If they cannot, they may play another suit or a spade.',
      'Spades are always trump and beat cards of other suits.',
      'Teams score by meeting their bids and managing bags carefully.',
    ],
  },
  solitaire: {
    id: 'solitaire',
    name: 'Solitaire',
    route: '/games/solitaire',
    description: 'Sort the full deck into suit foundations from Ace to King.',
    betting: false,
    localPlaySupported: false,
    cpuSupported: false,
    status: 'Playable',
    accent: 'from-sky-500 to-blue-600',
    rules: [
      'Move all cards to the foundation piles by suit in ascending order from Ace to King.',
      'Cards in the tableau are built downward in alternating colors.',
      'Only Kings can fill empty tableau columns.',
      'You can draw from stock to waste to reveal more playable cards.',
      'Turn face-down cards face-up when uncovered.',
    ],
  },
  baccarat: {
    id: 'baccarat',
    name: 'Baccarat',
    route: '/games/baccarat',
    description: 'Bet on one of two hands the one closest to nine wins',
    betting: true,
    localPlaySupported: true,
    cpuSupported: true,
    status: 'Playable',
    accent: 'from-red-500 to-pink-600',
    rules: [
      'Bet on Player, Banker, or Tie before cards are dealt.',
      'Each side receives two cards and may draw a third according to baccarat drawing rules.',
      'Card values count as their face value, tens and face cards count as 0, and aces count as 1.',
      'Only the last digit of the total counts, so 15 becomes 5.',
      'The hand closest to 9 wins.',
      'Common side bets include Player Pair and Banker Pair based on the first two cards.',
    ],
  },
};

export const GAME_LIST = Object.values(GAME_META);
