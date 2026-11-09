export type Quality = 'low' | 'medium' | 'high';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'insane';

export interface Settings {
  sensitivity: number;
  volume: number;
  music: boolean;
  invertY: boolean;
  reducedMotion: boolean;
  quality: Quality;
  difficulty: Difficulty;
  primary: string;
  bomb: string;
  fov: number;
  torch: boolean;
  aimAssist: boolean;
  haptics: boolean;
  spatialAudio: boolean;
}

export interface HighRecord {
  score: number;
  wave: number;
  kills: number;
}

const SETTINGS_KEY = 'adrianscombat.settings.v1';
const RECORD_KEY = 'adrianscombat.record.v1';

const defaultSettings: Settings = {
  sensitivity: 1,
  volume: 0.8,
  music: true,
  invertY: false,
  reducedMotion: false,
  quality: 'medium',
  difficulty: 'normal',
  primary: 'pulse',
  bomb: 'frag',
  fov: 68,
  torch: false,
  aimAssist: true,
  haptics: true,
  spatialAudio: true,
};

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export const settings: Settings = readJSON<Settings>(SETTINGS_KEY, defaultSettings);

if (settings.difficulty !== 'easy' && settings.difficulty !== 'normal' && settings.difficulty !== 'hard' && settings.difficulty !== 'insane') {
  settings.difficulty = 'normal';
}

const PRIMARY_IDS = [
  'pulse', 'viper', 'arx', 'scatter', 'longshot', 'rail',
  'vanguard', 'warlord', 'sentinel', 'sidearm', 'magnum', 'wasp',
  'vector', 'breacher', 'vulcan', 'ion', 'plasma', 'disruptor',
];
if (!PRIMARY_IDS.includes(settings.primary)) {
  settings.primary = 'pulse';
}
if (!['frag', 'shock', 'cryo', 'plasma', 'cluster', 'emp', 'incendiary', 'acid', 'flash', 'graviton', 'nuke'].includes(settings.bomb)) {
  settings.bomb = 'frag';
}
if (!Number.isFinite(settings.fov)) settings.fov = 68;
settings.fov = Math.max(50, Math.min(90, settings.fov));

export function saveSettings(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

export function loadRecord(): HighRecord {
  return readJSON<HighRecord>(RECORD_KEY, { score: 0, wave: 0, kills: 0 });
}

/** Saves the run if it beats the previous best score. Returns true on a new record. */
export function submitRecord(record: HighRecord): boolean {
  const current = loadRecord();
  if (record.score <= current.score && record.wave <= current.wave) return false;
  const next: HighRecord = {
    score: Math.max(record.score, current.score),
    wave: Math.max(record.wave, current.wave),
    kills: Math.max(record.kills, current.kills),
  };
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return record.score > current.score;
}

export function resetRecord(): void {
  try {
    localStorage.removeItem(RECORD_KEY);
  } catch {
    /* ignore */
  }
}
