import { settings } from './settings';

export type BombId = 'frag' | 'shock' | 'cryo' | 'plasma' | 'cluster' | 'emp' | 'incendiary' | 'acid' | 'flash' | 'graviton' | 'nuke';

export interface BombDef {
  id: BombId;
  name: string;
  short: string;
  desc: string;
  damage: number;
  radius: number;
  cooldown: number;
  freeze: number;
  burnDps?: number;
  burnDuration?: number;
  pull?: number;
  color: number;
  throwSpeed: number;
  fuse: number;
}

export const BOMB_IDS: BombId[] = ['frag', 'shock', 'cryo', 'incendiary', 'acid', 'flash', 'graviton', 'plasma', 'cluster', 'emp', 'nuke'];

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
  incendiary: {
    id: 'incendiary',
    name: 'INCENDIARY BOMB',
    short: 'FIRE',
    desc: 'Leaves a burning pool that scorches enemies for 5 seconds.',
    damage: 140,
    radius: 8,
    cooldown: 16,
    freeze: 0,
    burnDps: 45,
    burnDuration: 5,
    color: 0xff6a1e,
    throwSpeed: 9,
    fuse: 0.9,
  },
  acid: {
    id: 'acid',
    name: 'ACID BOMB',
    short: 'ACID',
    desc: 'Corrosive pool. Melts armour and keeps burning for 4 seconds.',
    damage: 100,
    radius: 7,
    cooldown: 15,
    freeze: 0,
    burnDps: 65,
    burnDuration: 4,
    color: 0x7dff6a,
    throwSpeed: 9,
    fuse: 0.9,
  },
  flash: {
    id: 'flash',
    name: 'FLASHBANG',
    short: 'FLASH',
    desc: 'Low damage, huge radius, long stun. Crowd control.',
    damage: 35,
    radius: 10,
    cooldown: 14,
    freeze: 4.5,
    color: 0xfff2a0,
    throwSpeed: 9,
    fuse: 0.9,
  },
  graviton: {
    id: 'graviton',
    name: 'GRAVITON BOMB',
    short: 'GRAV',
    desc: 'Yanks nearby enemies into the blast before detonating.',
    damage: 260,
    radius: 7,
    cooldown: 19,
    freeze: 0,
    pull: 2.6,
    color: 0xb06bff,
    throwSpeed: 9,
    fuse: 0.9,
  },
  nuke: {
    id: 'nuke',
    name: 'NUKE',
    short: 'NUKE',
    desc: 'Devastating 14 m blast. Very long cooldown.',
    damage: 800,
    radius: 14,
    cooldown: 35,
    freeze: 0,
    color: 0xffd75e,
    throwSpeed: 9,
    fuse: 0.9,
  },
};

export function currentBomb(): BombDef {
  return BOMBS[settings.bomb as BombId] ?? BOMBS.frag;
}
