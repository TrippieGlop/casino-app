export type PlayerType = 'human' | 'cpu';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type Player = {
  id: string;
  name: string;
  type: PlayerType;
  difficulty?: Difficulty; // only for cpu
};
