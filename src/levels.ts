import type { EnemyKind } from './enemies';

/** One level is ten waves. Sectors cycle with escalating multipliers. */
export const SECTOR_WAVES = 10;

export interface SectorDef {
  id: number;
  name: string;
  tagline: string;
  accent: number;
  bias: EnemyKind[];
  hpMul: number;
  countMul: number;
  speedMul: number;
}

export const SECTORS: SectorDef[] = [
  {
    id: 1,
    name: 'NEON OUTSKIRTS',
    tagline: 'THE FIRST BREACH',
    accent: 0x43f3ff,
    bias: ['drone', 'zombie', 'gingerbread', 'alien'],
    hpMul: 1,
    countMul: 1,
    speedMul: 1,
  },
  {
    id: 2,
    name: 'ASHEN FOUNDRY',
    tagline: 'ARMORED RESPONSE',
    accent: 0xff8a3d,
    bias: ['imp', 'scarecrow', 'pumpkin', 'tank', 'apc', 'goblin', 'rhino'],
    hpMul: 1.09,
    countMul: 1.05,
    speedMul: 1.02,
  },
  {
    id: 3,
    name: 'FROZEN DOCKS',
    tagline: 'COLD CONTACT',
    accent: 0x8fd4ff,
    bias: ['banshee', 'wendigo', 'yeti', 'phantom', 'ufo'],
    hpMul: 1.18,
    countMul: 1.08,
    speedMul: 1.04,
  },
  {
    id: 4,
    name: 'VOID GARDENS',
    tagline: 'NOTHING GROWS HERE',
    accent: 0xb06bff,
    bias: ['voidling', 'demon', 'mummy', 'spire', 'reaper', 'symbiote'],
    hpMul: 1.27,
    countMul: 1.1,
    speedMul: 1.06,
  },
  {
    id: 5,
    name: 'BONE CITADEL',
    tagline: 'THE DEAD STAND UP',
    accent: 0xd7e8ff,
    bias: ['zombie', 'mummy', 'raptor', 'brute', 'clown', 'monkey'],
    hpMul: 1.36,
    countMul: 1.12,
    speedMul: 1.08,
  },
  {
    id: 6,
    name: 'HELLGATE',
    tagline: 'BURN IT DOWN',
    accent: 0xff3b5c,
    bias: ['demon', 'imp', 'reaper', 'brute', 'mech', 'artillery', 'rhino', 'monkey'],
    hpMul: 1.45,
    countMul: 1.15,
    speedMul: 1.1,
  },
  {
    id: 7,
    name: 'ORBITAL WOUND',
    tagline: 'NO AIR. NO MERCY.',
    accent: 0x7dff6a,
    bias: ['ufo', 'jet', 'striker', 'helicopter', 'omen', 'phantom', 'goblin'],
    hpMul: 1.54,
    countMul: 1.18,
    speedMul: 1.12,
  },
  {
    id: 8,
    name: 'FINAL DAWN',
    tagline: 'ENDLESS NIGHT',
    accent: 0xffc247,
    bias: ['tank', 'spire', 'reaper', 'clown', 'brute', 'mech', 'symbiote', 'rhino', 'goblin', 'monkey'],
    hpMul: 1.63,
    countMul: 1.2,
    speedMul: 1.14,
  },
];

export interface SectorProgress {
  level: number;
  cycle: number;
  sector: SectorDef;
  hpMul: number;
  countMul: number;
  speedMul: number;
}

export function sectorForWave(wave: number): SectorProgress {
  const level = Math.max(1, Math.ceil(wave / SECTOR_WAVES));
  const sector = SECTORS[(level - 1) % SECTORS.length];
  const cycle = Math.floor((level - 1) / SECTORS.length);
  return {
    level,
    cycle,
    sector,
    hpMul: sector.hpMul * (1 + cycle * 0.22),
    countMul: sector.countMul * (1 + cycle * 0.12),
    speedMul: Math.min(1.8, sector.speedMul * (1 + cycle * 0.08)),
  };
}

export function isSectorStart(wave: number): boolean {
  return wave > 0 && (wave - 1) % SECTOR_WAVES === 0;
}

export function isSectorFinale(wave: number): boolean {
  return wave > 0 && wave % SECTOR_WAVES === 0;
}
