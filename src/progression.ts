import type { WeaponId } from './weapons';

export interface ProgressState {
  salvage: number;
  unlocked: WeaponId[];
  lifetimeSalvage: number;
  totalKills: number;
  runs: number;
  bestWave: number;
  lastRunDay: string;
  streak: number;
}

export const WEAPON_PRICES: Record<WeaponId, number> = {
  pulse: 0,
  viper: 600,
  arx: 1200,
  scatter: 1800,
  longshot: 2600,
  rail: 4000,
};

export const WEAPON_ORDER: WeaponId[] = ['pulse', 'viper', 'arx', 'scatter', 'longshot', 'rail'];

const KEY = 'adrianscombat.progress.v1';

const defaults: ProgressState = {
  salvage: 0,
  unlocked: ['pulse'],
  lifetimeSalvage: 0,
  totalKills: 0,
  runs: 0,
  bestWave: 0,
  lastRunDay: '',
  streak: 0,
};

function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function yesterdayKey(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

function normalize(raw: Partial<ProgressState> | null): ProgressState {
  const unlocked = Array.isArray(raw?.unlocked) ? raw!.unlocked.filter((id): id is WeaponId => WEAPON_ORDER.includes(id)) : [];
  return {
    salvage: Math.max(0, Number(raw?.salvage) || 0),
    unlocked: Array.from(new Set<WeaponId>(['pulse', ...unlocked])),
    lifetimeSalvage: Math.max(0, Number(raw?.lifetimeSalvage) || 0),
    totalKills: Math.max(0, Number(raw?.totalKills) || 0),
    runs: Math.max(0, Number(raw?.runs) || 0),
    bestWave: Math.max(0, Number(raw?.bestWave) || 0),
    lastRunDay: typeof raw?.lastRunDay === 'string' ? raw.lastRunDay : '',
    streak: Math.max(0, Number(raw?.streak) || 0),
  };
}

function read(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    return normalize(raw ? (JSON.parse(raw) as Partial<ProgressState>) : null);
  } catch {
    return { ...defaults, unlocked: [...defaults.unlocked] };
  }
}

export const progress: ProgressState = read();

export function saveProgress(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable */
  }
}

export function isWeaponUnlocked(id: WeaponId): boolean {
  return progress.unlocked.includes(id);
}

export function weaponPrice(id: WeaponId): number {
  return WEAPON_PRICES[id] ?? 0;
}

export function addSalvage(amount: number): number {
  const value = Math.max(0, Math.round(amount));
  if (value <= 0) return 0;
  progress.salvage += value;
  progress.lifetimeSalvage += value;
  return value;
}

export function unlockWeapon(id: WeaponId): boolean {
  if (isWeaponUnlocked(id)) return true;
  const price = weaponPrice(id);
  if (progress.salvage < price) return false;
  progress.salvage -= price;
  progress.unlocked.push(id);
  saveProgress();
  return true;
}

/** First run of the day gets double salvage; consecutive days build a streak. */
export function beginDailyRun(): { daily: boolean; streak: number; multiplier: number } {
  const today = dayKey();
  if (progress.lastRunDay === today) {
    return { daily: false, streak: progress.streak, multiplier: 1 };
  }
  progress.streak = progress.lastRunDay === yesterdayKey() ? progress.streak + 1 : 1;
  progress.lastRunDay = today;
  saveProgress();
  return { daily: true, streak: progress.streak, multiplier: 2 };
}

export function dailyAvailable(): boolean {
  return progress.lastRunDay !== dayKey();
}

export function recordRun(wave: number, kills: number): void {
  progress.runs += 1;
  progress.totalKills += Math.max(0, Math.round(kills));
  progress.bestWave = Math.max(progress.bestWave, Math.round(wave));
  saveProgress();
}

export function nextLockedWeapon(): WeaponId | null {
  return WEAPON_ORDER.find((id) => !isWeaponUnlocked(id)) ?? null;
}

export function cheapestLockedWeapon(): WeaponId | null {
  let best: WeaponId | null = null;
  for (const id of WEAPON_ORDER) {
    if (isWeaponUnlocked(id)) continue;
    if (!best || weaponPrice(id) < weaponPrice(best)) best = id;
  }
  return best;
}
