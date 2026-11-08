import { settings } from './settings';

export type BombId = 'frag' | 'shock' | 'cryo' | 'plasma' | 'cluster' | 'emp';

export interface BombDef {
  id: BombId;
  name: string;
  short: string;
  desc: string;
  damage: number;
  radius: number;
  cooldown: number;
  freeze: number;
  color: number;
  throwSpeed: number;
  fuse: number;
}

export const BOMB_IDS: BombId[] = ['frag', 'shock', 'cryo', 'plasma', 'cluster', 'emp'];

export const BOMBS: Record<BombId, BombDef> = {
  frag: {
    id: 'frag',
    name: 'FRAG BOMB',
    short: 'FRAG',
    desc: 'Heavy blast. Big damage in a 6 m radius.',
    damage: 220,
    radius: 6,
    cooldown: 12,
    freeze: 0,
    color: 0xffa14a,
    throwSpeed: 9,
    fuse: 0.9,
  },
  shock: {
    id: 'shock',
    name: 'SHOCK BOMB',
    short: 'SHOCK',
    desc: 'Wide electric blast. Damages and briefly freezes.',
    damage: 120,
    radius: 8,
    cooldown: 14,
    freeze: 2.5,
    color: 0x8fd4ff,
    throwSpeed: 9,
    fuse: 0.9,
  },
  cryo: {
    id: 'cryo',
    name: 'CRYO BOMB',
    short: 'CRYO',
    desc: 'Freezing burst. Huge radius and a long freeze.',
    damage: 80,
    radius: 9,
    cooldown: 13,
    freeze: 5,
    color: 0x43f3ff,
    throwSpeed: 9,
    fuse: 0.9,
  },
  plasma: {
    id: 'plasma',
    name: 'PLASMA BOMB',
    short: 'PLASMA',
    desc: 'Superheated plasma. Highest damage of any bomb.',
    damage: 340,
    radius: 7,
    cooldown: 18,
    freeze: 0,
    color: 0xb45bff,
    throwSpeed: 9,
    fuse: 0.9,
  },
  cluster: {
    id: 'cluster',
    name: 'CLUSTER BOMB',
    short: 'CLUSTER',
    desc: 'Wide fragmentation blast. Clears entire swarms.',
    damage: 150,
    radius: 11,
    cooldown: 17,
    freeze: 0,
    color: 0xffd75e,
    throwSpeed: 9,
    fuse: 0.9,
  },
  emp: {
    id: 'emp',
    name: 'EMP BOMB',
    short: 'EMP',
    desc: 'Electromagnetic pulse. Long freeze across a wide radius.',
    damage: 90,
    radius: 10,
    cooldown: 15,
    freeze: 4.5,
    color: 0x8fd4ff,
    throwSpeed: 9,
    fuse: 0.9,
  },
};

export function currentBomb(): BombDef {
  return BOMBS[settings.bomb as BombId] ?? BOMBS.frag;
}
