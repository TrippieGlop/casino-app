export type GameId = 'blackjack' | 'poker' | 'uno' | 'spades' | 'solitaire';

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
    description: 'Beat the dealer without going over 21.',
    betting: true,
    localPlaySupported: true,
    cpuSupported: true,
    status: 'Playable',
    accent: 'from-emerald-500 to-teal-600',
    rules: [
      'Each player starts with two cards. The dealer also gets two cards, with one hidden.',
      'Number cards are worth face value. Face cards are worth 10. Aces are worth 1 or 11.',
      'Your goal is to get closer to 21 than the dealer without going over.',
      'Choose Hit to take another card or Stand to keep your current total.',
      'If you go over 21, you bust and lose the round immediately.',
      'After players stand, the dealer reveals the hidden card and draws until reaching at least 17.',
      'If your final total is higher than the dealer, you win. Equal totals are a push.',
    ],
  },
  poker: {
    id: 'poker',
    name: 'Poker',
    route: '/games/poker',
    description: 'Outplay the table with betting, reads, and hand strength.',
    betting: true,
    localPlaySupported: true,
    cpuSupported: true,
    status: 'In Progress',
    accent: 'from-violet-500 to-fuchsia-600',
    rules: [
      'Each player receives hole cards and uses them with community cards to make the best five-card hand.',
      'Rounds of betting happen before and after community cards are revealed.',
      'Players can check, call, raise, or fold depending on the game state.',
      'The strongest hand at showdown wins the pot unless everyone else folds first.',
      'Standard hand rankings apply from high card up to royal flush.',
    ],
  },
  uno: {
    id: 'uno',
    name: 'UNO',
    route: '/games/uno',
    description: 'Match color or face first and empty your hand.',
    betting: true,
    localPlaySupported: true,
    cpuSupported: true,
    status: 'Playable',
    accent: 'from-rose-500 to-orange-500',
    rules: [
      'On your turn, play a card that matches the top discard by color or symbol, or play a wild card.',
      'If you cannot play, draw a card. If it is playable, you may play it immediately.',
      'Reverse changes direction. Skip skips the next player. Draw Two forces the next player to draw two cards.',
      'Wild lets you choose the next color. Wild Draw Four also makes the next player draw four cards.',
      'The first player to empty their hand wins the round.',
      'Say UNO when you are down to one card.',
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
      'The team that meets or exceeds its combined bid scores points. Missing the bid loses points.',
      'Extra tricks beyond the bid become bags and can create penalties over time.',
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
      'Clear the entire board into foundations to win.',
    ],
  },
};

export const GAME_LIST = Object.values(GAME_META);
