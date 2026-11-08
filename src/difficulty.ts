import { settings, type Difficulty } from './settings';

export interface DifficultyConfig {
  label: string;
  description: string;
  hp: number;
  bossHp: number;
  damage: number;
  speed: number;
  count: number;
  score: number;
  shieldRegen: number;
}

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'insane'];

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'EASY',
    description: 'For a first run — softer enemies, slower fire, more shield regen.',
    hp: 0.72,
    bossHp: 0.7,
    damage: 0.55,
    speed: 0.88,
    count: 0.8,
    score: 0.8,
    shieldRegen: 23,
  },
  normal: {
    label: 'NORMAL',
    description: 'The intended invasion. Fast, fair, and plenty of bosses.',
    hp: 1,
    bossHp: 1,
    damage: 1,
    speed: 1,
    count: 1,
    score: 1,
    shieldRegen: 18,
  },
  hard: {
    label: 'HARD',
    description: 'Tougher hordes, harder hits, bigger score.',
    hp: 1.4,
    bossHp: 1.35,
    damage: 1.35,
    speed: 1.08,
    count: 1.2,
    score: 1.3,
    shieldRegen: 15,
  },
  insane: {
    label: 'INSANE',
    description: 'Everything at once. Good luck.',
    hp: 2,
    bossHp: 1.9,
    damage: 1.8,
    speed: 1.16,
    count: 1.4,
    score: 1.7,
    shieldRegen: 12,
  },
};

export function currentDifficulty(): DifficultyConfig {
  return DIFFICULTIES[settings.difficulty] ?? DIFFICULTIES.normal;
}
