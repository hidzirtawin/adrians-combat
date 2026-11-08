import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { getModel, getModelMetrics, type ModelKey } from './assets';
import type { Player } from './player';
import type { Arena } from './arena';
import type { FX } from './fx';
import type { AudioEngine, SfxName } from './audio';
import { currentDifficulty } from './difficulty';

export type EnemyKind =
  | 'drone' | 'ufo' | 'zombie' | 'brute' | 'alien'
  | 'raptor' | 'imp' | 'voidling' | 'demon' | 'mech' | 'gingerbread'
  | 'spire' | 'banshee' | 'scarecrow' | 'mummy' | 'pumpkin' | 'wendigo'
  | 'jailer' | 'rainmaker' | 'aureole' | 'brood' | 'mirrored' | 'umbra' | 'collector'
  | 'rex' | 'jester' | 'titan' | 'warlord'
  | 'helicopter' | 'jet' | 'striker' | 'omen' | 'phantom' | 'hexer' | 'yeti';

export interface EnemyStats {
  hp: number;
  speed: number;
  hitRadius: number;
  hitOffset: number;
  baseScale: number;
  score: number;
  contact: number;
  hover: number;
  isBoss: boolean;
  name: string;
  color: number;
  projectileColor: number;
}

const STATS: Record<EnemyKind, EnemyStats> = {
  drone: {
    hp: 42, speed: 3.2, hitRadius: 0.8, hitOffset: 0, baseScale: 1, score: 100,
    contact: 4, hover: 2.45, isBoss: false, name: 'HELLWASP', color: 0xff2fa8, projectileColor: 0xff4fc0,
  },
  ufo: {
    hp: 78, speed: 3.6, hitRadius: 1.15, hitOffset: 0, baseScale: 1, score: 190,
    contact: 6, hover: 2.9, isBoss: false, name: 'GRAVE SAUCER', color: 0x57ffa8, projectileColor: 0x8dff5c,
  },
  zombie: {
    hp: 58, speed: 2.85, hitRadius: 0.82, hitOffset: 1.05, baseScale: 1, score: 90,
    contact: 9, hover: 0, isBoss: false, name: 'GRAVEWALKER', color: 0x7dff6a, projectileColor: 0x7dff6a,
  },
  brute: {
    hp: 210, speed: 1.55, hitRadius: 1.05, hitOffset: 1.15, baseScale: 1.55, score: 300,
    contact: 18, hover: 0, isBoss: false, name: 'GOREHULK', color: 0xffc247, projectileColor: 0xffc247,
  },
  alien: {
    hp: 46, speed: 3.1, hitRadius: 0.7, hitOffset: 0.75, baseScale: 0.95, score: 130,
    contact: 7, hover: 0, isBoss: false, name: 'VOID SPAWN', color: 0x86e07a, projectileColor: 0x9dff8a,
  },
  raptor: {
    hp: 62, speed: 4.1, hitRadius: 0.8, hitOffset: 0.85, baseScale: 1, score: 160,
    contact: 12, hover: 0, isBoss: false, name: 'RIPCLAW', color: 0x9ed15c, projectileColor: 0x9ed15c,
  },
  imp: {
    hp: 34, speed: 2.9, hitRadius: 0.55, hitOffset: 0.52, baseScale: 0.9, score: 90,
    contact: 4, hover: 0, isBoss: false, name: 'CACKLER', color: 0xffd75e, projectileColor: 0xffa14a,
  },
  gingerbread: {
    hp: 74, speed: 2.55, hitRadius: 0.72, hitOffset: 0.98, baseScale: 1, score: 130,
    contact: 9, hover: 0, isBoss: false, name: 'CINDERBREAD', color: 0xffb36b, projectileColor: 0xffd7a0,
  },
  spire: {
    hp: 420, speed: 1.05, hitRadius: 1.15, hitOffset: 2.2, baseScale: 1, score: 480,
    contact: 24, hover: 0, isBoss: false, name: 'SCREAM SPIRE', color: 0xff3b4e, projectileColor: 0xff5a6e,
  },
  banshee: {
    hp: 120, speed: 2.9, hitRadius: 0.8, hitOffset: 1.05, baseScale: 1, score: 230,
    contact: 10, hover: 1.35, isBoss: false, name: 'SHRIEK WRAITH', color: 0x8fd4ff, projectileColor: 0x8fd4ff,
  },
  scarecrow: {
    hp: 165, speed: 1.8, hitRadius: 0.85, hitOffset: 1.3, baseScale: 1, score: 240,
    contact: 12, hover: 0, isBoss: false, name: 'STRAW REAPER', color: 0xffc247, projectileColor: 0xff8a3d,
  },
  mummy: {
    hp: 250, speed: 1.2, hitRadius: 0.9, hitOffset: 1.15, baseScale: 1, score: 270,
    contact: 17, hover: 0, isBoss: false, name: 'TOMB BOUND', color: 0xd8c9a8, projectileColor: 0xd8c9a8,
  },
  pumpkin: {
    hp: 110, speed: 2.4, hitRadius: 0.75, hitOffset: 0.95, baseScale: 1, score: 210,
    contact: 8, hover: 1.6, isBoss: false, name: 'HELL LANTERN', color: 0xff8a3d, projectileColor: 0xff8a3d,
  },
  wendigo: {
    hp: 185, speed: 3.25, hitRadius: 0.85, hitOffset: 1.4, baseScale: 1, score: 290,
    contact: 16, hover: 0, isBoss: false, name: 'FROST MAW', color: 0x9fb7c9, projectileColor: 0x8ff8ff,
  },
  helicopter: {
    hp: 210, speed: 2.55, hitRadius: 1.2, hitOffset: 0, baseScale: 1, score: 340,
    contact: 12, hover: 3.4, isBoss: false, name: 'ROTOR REAVER', color: 0xffc247, projectileColor: 0xff8a3d,
  },
  jet: {
    hp: 150, speed: 5.2, hitRadius: 1.0, hitOffset: 0, baseScale: 1, score: 310,
    contact: 15, hover: 3.8, isBoss: false, name: 'SKY SHREDDER', color: 0x8ff8ff, projectileColor: 0x43f3ff,
  },
  striker: {
    hp: 300, speed: 2.8, hitRadius: 1.5, hitOffset: 0, baseScale: 1, score: 450,
    contact: 16, hover: 3.3, isBoss: false, name: 'STARFANG', color: 0xff2fa8, projectileColor: 0xff4fc0,
  },
  omen: {
    hp: 620, speed: 1.7, hitRadius: 2.0, hitOffset: 0, baseScale: 1, score: 680,
    contact: 20, hover: 4.2, isBoss: false, name: 'BLACK OMEN', color: 0x8f5cff, projectileColor: 0xb07dff,
  },
  phantom: {
    hp: 165, speed: 2.6, hitRadius: 0.8, hitOffset: 0.1, baseScale: 1, score: 290,
    contact: 10, hover: 1.5, isBoss: false, name: 'PALE PHANTOM', color: 0x9fd8ff, projectileColor: 0x9fd8ff,
  },
  hexer: {
    hp: 210, speed: 1.9, hitRadius: 0.8, hitOffset: 1.15, baseScale: 1, score: 330,
    contact: 12, hover: 0, isBoss: false, name: 'HEX CASTER', color: 0xc08bff, projectileColor: 0xc08bff,
  },
  yeti: {
    hp: 390, speed: 1.8, hitRadius: 1.0, hitOffset: 1.2, baseScale: 1, score: 390,
    contact: 20, hover: 0, isBoss: false, name: 'RIME TERROR', color: 0xd8f4ff, projectileColor: 0xcfefff,
  },
  voidling: {
    hp: 95, speed: 3.2, hitRadius: 0.8, hitOffset: 0.7, baseScale: 1, score: 210,
    contact: 14, hover: 0, isBoss: false, name: 'VOID LARVA', color: 0x8f5cff, projectileColor: 0xb07dff,
  },
  demon: {
    hp: 120, speed: 2.3, hitRadius: 0.85, hitOffset: 1.05, baseScale: 1.05, score: 240,
    contact: 12, hover: 0, isBoss: false, name: 'HELLBRUTE', color: 0xff4a3d, projectileColor: 0xff7a3d,
  },
  mech: {
    hp: 190, speed: 1.7, hitRadius: 1.1, hitOffset: 1.1, baseScale: 1.05, score: 300,
    contact: 10, hover: 0, isBoss: false, name: 'IRON REAPER', color: 0x9fb7c9, projectileColor: 0x43f3ff,
  },
  jailer: {
    hp: 900, speed: 1.9, hitRadius: 2.5, hitOffset: 0, baseScale: 1, score: 2200,
    contact: 20, hover: 4.7, isBoss: true, name: 'THE JAILER', color: 0xff2f6d, projectileColor: 0xff2f6d,
  },
  rainmaker: {
    hp: 1300, speed: 1.4, hitRadius: 3.25, hitOffset: 0, baseScale: 1, score: 3000,
    contact: 24, hover: 5.4, isBoss: true, name: 'THE RAINMAKER', color: 0x57ffa8, projectileColor: 0x7dff9e,
  },
  aureole: {
    hp: 1000, speed: 2.05, hitRadius: 2.8, hitOffset: 0, baseScale: 1, score: 2600,
    contact: 18, hover: 5.0, isBoss: true, name: 'AUREOLE', color: 0x43f3ff, projectileColor: 0x8ff8ff,
  },
  brood: {
    hp: 1600, speed: 1.15, hitRadius: 2.2, hitOffset: 2.1, baseScale: 1, score: 3600,
    contact: 24, hover: 0, isBoss: true, name: 'THE BROOD QUEEN', color: 0xb45cff, projectileColor: 0xc08bff,
  },
  mirrored: {
    hp: 520, speed: 2.7, hitRadius: 2.2, hitOffset: 0, baseScale: 1, score: 1400,
    contact: 16, hover: 3.9, isBoss: true, name: 'THE MIRRORED', color: 0xffc247, projectileColor: 0xffd76e,
  },
  umbra: {
    hp: 1000, speed: 3.4, hitRadius: 2.3, hitOffset: 0, baseScale: 1, score: 2800,
    contact: 18, hover: 3.6, isBoss: true, name: 'UMBRA', color: 0x8f7dff, projectileColor: 0x7b6bff,
  },
  collector: {
    hp: 1500, speed: 1.25, hitRadius: 3.1, hitOffset: 0, baseScale: 1, score: 3400,
    contact: 22, hover: 5.2, isBoss: true, name: 'THE COLLECTOR', color: 0xffc247, projectileColor: 0xffd76e,
  },
  rex: {
    hp: 1600, speed: 2.1, hitRadius: 3, hitOffset: 1.6, baseScale: 1, score: 3800,
    contact: 30, hover: 0, isBoss: true, name: 'BONE MAW', color: 0x7a9a3a, projectileColor: 0xffc247,
  },
  jester: {
    hp: 1250, speed: 2.7, hitRadius: 2.2, hitOffset: 0, baseScale: 1.15, score: 3000,
    contact: 18, hover: 3.8, isBoss: true, name: 'THE GRINNING ONE', color: 0xff2fa8, projectileColor: 0xffd75e,
  },
  titan: {
    hp: 2300, speed: 1.4, hitRadius: 2.9, hitOffset: 0, baseScale: 1, score: 4400,
    contact: 26, hover: 4.8, isBoss: true, name: 'VOID COLOSSUS', color: 0x9a6bff, projectileColor: 0xc08bff,
  },
  warlord: {
    hp: 1500, speed: 3.1, hitRadius: 1.4, hitOffset: 1.2, baseScale: 1.2, score: 3600,
    contact: 24, hover: 0, isBoss: true, name: 'THE BUTCHER KING', color: 0xff3b5c, projectileColor: 0xff5a7a,
  },
};

export interface CombatContext {
  player: Player;
  arena: Arena;
  fx: FX;
  audio: AudioEngine;
  freezeFactor: number;
  damagePlayer: (amount: number, at: THREE.Vector3) => void;
  onKill: (enemy: Enemy, at: THREE.Vector3) => void;
  summon: (kind: EnemyKind, at: THREE.Vector3) => void;
  playSpatial: (name: SfxName, position: THREE.Vector3, volume?: number) => void;
  enemyVoice?: (kind: EnemyKind, action: 'spawn' | 'attack' | 'death', position: THREE.Vector3) => void;
}

function makeSurfaceTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b8b8b8';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) {
    const shade = 100 + Math.floor(Math.random() * 155);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 24; i++) {
    ctx.strokeStyle = `rgba(230,230,230,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 12);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 1.8);
  return tex;
}

function makeSkinTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d4d4d4';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const r = 2 + Math.random() * 12;
    const shade = 150 + Math.floor(Math.random() * 90);
    const grad = ctx.createRadialGradient(Math.random() * size, Math.random() * size, 0, Math.random() * size, Math.random() * size, r);
    grad.addColorStop(0, `rgba(${shade},${shade},${shade},0.22)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  for (let i = 0; i < 2600; i++) {
    const shade = 140 + Math.floor(Math.random() * 100);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

const surfaceTexture = makeSurfaceTexture();
const skinTexture = makeSkinTexture();

function mat(
  color: number,
  emissive = 0x000000,
  intensity = 0,
  metalness = 0.55,
  roughness = 0.4,
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    metalness,
    roughness,
    clearcoat: metalness > 0.55 ? 0.42 : 0.12,
    clearcoatRoughness: 0.32,
    envMapIntensity: 1,
  });
  if (metalness > 0.45) {
    material.roughnessMap = surfaceTexture;
    material.bumpMap = surfaceTexture;
    material.bumpScale = 0.012;
  } else if (metalness <= 0.35) {
    material.roughnessMap = skinTexture;
    material.bumpMap = skinTexture;
    material.bumpScale = 0.005;
  }
  return material;
}

function glowMat(color: number, opacity = 0.9): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function makeGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const sharedGlowTexture = makeGlowTexture();

function addGlow(
  parent: THREE.Object3D,
  color: number,
  scale: number,
  position: THREE.Vector3,
  opacity = 0.65,
): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: sharedGlowTexture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.setScalar(scale);
  sprite.renderOrder = 2;
  parent.add(sprite);
  return sprite;
}

// ────────────────────────────── Enemy models ──────────────────────────────

interface GlbRig {
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  current: THREE.AnimationAction | null;
  lock: number;
}

interface Built {
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  hitRadius: number;
  hitOffset: number;
  baseScale: number;
  glb?: GlbRig;
}

function buildGlbModel(
  key: ModelKey,
  targetSize: number,
  tint?: number,
  forcedHitRadius?: number,
  mode: 'height' | 'longest' = 'height',
  useRig = true,
): Built | null {
  const asset = getModel(key);
  const metrics = getModelMetrics(key);
  if (!asset || !metrics) return null;

  const group = new THREE.Group();
  const model = cloneSkeleton(asset.scene) as THREE.Group;
  const baseSize = mode === 'longest'
    ? Math.max(metrics.width, metrics.height, metrics.depth)
    : metrics.height;
  const scale = targetSize / Math.max(0.001, baseSize);
  model.scale.setScalar(scale);
  model.position.set(
    -metrics.center.x * scale,
    (mode === 'longest' ? -metrics.center.y : -metrics.min.y) * scale,
    -metrics.center.z * scale,
  );
  group.add(model);

  const materials: THREE.MeshStandardMaterial[] = [];
  const tintColor = tint !== undefined ? new THREE.Color(tint) : null;
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    if (mesh.geometry) mesh.geometry = mesh.geometry.clone();
    const entries = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = entries.map((entry) => {
      const material = (entry as THREE.MeshStandardMaterial).clone();
      if (tintColor && material.color) material.color.lerp(tintColor, 0.34);
      material.envMapIntensity = 1.2;
      materials.push(material);
      return material;
    });
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
  });

  const mixer = new THREE.AnimationMixer(model);
  const actions: Record<string, THREE.AnimationAction> = {};
  const find = (needle: string) => {
    const n = needle.toLowerCase();
    return asset.animations.find((clip) => {
      const base = (clip.name.split('|').pop() ?? clip.name).toLowerCase();
      return base === n || base.endsWith(`_${n}`) || base.includes(n);
    });
  };
  const clipFor = (name: string) => {
    if (name === 'hit') return find('hitreact');
    if (name === 'attack') return find('attack') ?? find('punch');
    return find(name);
  };
  for (const name of ['idle', 'walk', 'run', 'attack', 'death', 'hit']) {
    const clip = clipFor(name);
    if (!clip) continue;
    const action = mixer.clipAction(clip);
    if (name === 'idle' || name === 'walk' || name === 'run') {
      action.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    actions[name] = action;
  }
  if (actions.idle) actions.idle.play();

  const radius =
    forcedHitRadius ??
    Math.max(0.35, Math.max(metrics.width, metrics.depth * 0.22) * scale * 0.5);

  return {
    group,
    materials,
    hitRadius: radius,
    hitOffset: mode === 'longest' ? 0 : targetSize * 0.55,
    baseScale: 1,
    glb: useRig ? { mixer, actions, current: actions.idle ?? null, lock: 0 } : undefined,
  };
}

function collectMaterials(group: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const list: THREE.MeshStandardMaterial[] = [];
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      const material = mesh.material;
      if (material instanceof THREE.MeshStandardMaterial) list.push(material);
    }
  });
  return list;
}

/** Free GPU memory for a dead enemy. Shared textures are intentionally kept. */
function disposeGroup(group: THREE.Object3D): void {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      for (const item of material) item.dispose();
    } else if (material) {
      material.dispose();
    }
  });
}

function buildDrone(color: number): Built {
  const group = new THREE.Group();
  const armor = mat(0x0c1822, color, 0.14, 0.95, 0.24);
  const dark = mat(0x050a10, color, 0.05, 0.9, 0.34);
  const trim = glowMat(color, 0.95);
  const bright = glowMat(0xe8ffff, 0.95);

  const chassis = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.2, 0.72, 4, 0.1), armor);
  chassis.position.y = 0.02;
  group.add(chassis);

  const topDome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  topDome.position.y = 0.1;
  topDome.scale.y = 0.5;
  group.add(topDome);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), dark);
  belly.position.y = -0.09;
  belly.scale.y = 0.45;
  group.add(belly);

  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.14, 0.5, 3, 0.04), dark);
    plate.position.set(side * 0.27, 0.02, -0.02);
    plate.rotation.z = side * 0.12;
    group.add(plate);
  }

  const sensor = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.16, 0.2, 3, 0.05), dark);
  sensor.position.set(0, 0.03, 0.38);
  group.add(sensor);

  for (let i = -1; i <= 1; i++) {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), bright);
    lens.position.set(i * 0.09, 0.04, 0.5);
    group.add(lens);
  }
  addGlow(group, color, 0.28, new THREE.Vector3(0, 0.04, 0.51), 0.55);

  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.035, 0.065), armor);
    arm.position.set(cos * 0.39, 0.02, sin * 0.39);
    arm.rotation.y = -angle;
    group.add(arm);

    const rotor = new THREE.Group();
    rotor.position.set(cos * 0.68, 0.04, sin * 0.68);
    rotor.name = 'rotor';

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 6, 28), trim);
    ring.rotation.x = Math.PI / 2;
    rotor.add(ring);

    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.035), dark);
    bladeA.position.y = 0.012;
    rotor.add(bladeA);
    const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.42), dark);
    bladeB.position.y = 0.012;
    rotor.add(bladeB);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.06, 8), bright);
    hub.position.y = 0.02;
    rotor.add(hub);
    group.add(rotor);
  }

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.012, 6, 48), trim);
  halo.rotation.x = Math.PI / 2;
  halo.name = 'drone-halo';
  group.add(halo);

  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.12, 0.3, 3, 0.05), dark);
    pod.position.set(side * 0.36, -0.02, -0.2);
    group.add(pod);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 0.1, 8), trim);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(side * 0.36, -0.02, -0.38);
    group.add(nozzle);
    addGlow(group, color, 0.32, new THREE.Vector3(side * 0.36, -0.02, -0.44), 0.5);
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.26, 6), dark);
  mast.position.set(0.18, 0.25, -0.18);
  group.add(mast);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), bright);
  tip.position.set(0.18, 0.39, -0.18);
  group.add(tip);

  addGlow(group, color, 1.0, new THREE.Vector3(0, 0.04, 0), 0.28);

  return { group, materials: collectMaterials(group), hitRadius: 0.82, hitOffset: 0, baseScale: 1 };
}

function buildUfo(color: number): Built {
  const group = new THREE.Group();
  const hull = mat(0x101a22, color, 0.12, 0.95, 0.22);
  const dark = mat(0x060c12, 0x000000, 0, 0.9, 0.35);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x12352c,
    emissive: color,
    emissiveIntensity: 0.55,
    metalness: 0.15,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 1,
  });

  const profile = [
    new THREE.Vector2(0, 0.18),
    new THREE.Vector2(0.24, 0.16),
    new THREE.Vector2(0.52, 0.11),
    new THREE.Vector2(0.78, 0.035),
    new THREE.Vector2(1.0, -0.05),
    new THREE.Vector2(0.94, -0.14),
    new THREE.Vector2(0.7, -0.2),
    new THREE.Vector2(0.35, -0.27),
    new THREE.Vector2(0, -0.32),
  ];
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), hull);
  group.add(saucer);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.035, 8, 64), glowMat(color, 0.9));
  rim.rotation.x = Math.PI / 2;
  rim.name = 'rim';
  group.add(rim);

  const lowerRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.018, 6, 48), glowMat(0x43f3ff, 0.5));
  lowerRing.rotation.x = Math.PI / 2;
  lowerRing.position.y = -0.24;
  lowerRing.name = 'rim';
  group.add(lowerRing);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  dome.position.y = 0.12;
  dome.scale.y = 0.85;
  group.add(dome);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), glowMat(color, 1));
  core.position.y = 0.18;
  group.add(core);
  addGlow(group, color, 1.3, new THREE.Vector3(0, 0.2, 0), 0.3);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const lightColor = i % 2 === 0 ? color : 0x43f3ff;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), glowMat(lightColor, 1));
    light.position.set(Math.cos(a) * 0.82, -0.03, Math.sin(a) * 0.82);
    group.add(light);
    if (i % 2 === 0) {
      addGlow(group, lightColor, 0.3, new THREE.Vector3(Math.cos(a) * 0.84, -0.03, Math.sin(a) * 0.84), 0.5);
    }
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const panel = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.03, 0.34, 2, 0.04), dark);
    panel.position.set(Math.cos(a) * 0.55, 0.09, Math.sin(a) * 0.55);
    panel.rotation.y = -a;
    group.add(panel);
  }

  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.5, 20, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  beam.position.y = -0.95;
  beam.rotation.x = Math.PI;
  group.add(beam);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.4, 6), dark);
  antenna.position.set(0, 0.45, 0);
  group.add(antenna);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glowMat(0x43f3ff, 1));
  antennaTip.position.set(0, 0.67, 0);
  group.add(antennaTip);

  return { group, materials: collectMaterials(group), hitRadius: 1.15, hitOffset: 0, baseScale: 1 };
}

interface ZombieLimbs {
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

function buildZombie(skin: number, shirt: number, scale = 1, boss = false): Built & { limbs: ZombieLimbs } {
  const group = new THREE.Group();

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(boss ? 1.7 : 0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const skinMat = mat(skin, skin, 0.42, 0.2, 0.6);
  const shirtMat = mat(shirt, 0x000000, 0, 0.12, 0.78);
  const darkMat = mat(0x17121b, 0x000000, 0, 0.35, 0.65);
  const eyeMat = mat(0xff2f4d, 0xff2f4d, 3, 0.2, 0.2);
  const boneMat = mat(0xd8c9a8, 0x000000, 0, 0.1, 0.7);

  const torsoW = boss ? 1.35 : 0.62;
  const torsoH = boss ? 1.45 : 0.82;
  const torsoD = boss ? 0.75 : 0.38;

  const torso = new THREE.Mesh(new RoundedBoxGeometry(torsoW, torsoH, torsoD, 4, boss ? 0.12 : 0.06), shirtMat);
  torso.position.y = boss ? 2.35 : 1.05;
  group.add(torso);

  const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.5, torsoH * 0.5, 0.03), darkMat);
  chestPanel.position.set(0, boss ? 2.45 : 1.08, torsoD / 2 + 0.005);
  group.add(chestPanel);

  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.34, 0.035, 0.03), boneMat);
    rib.position.set(0, (boss ? 2.5 : 1.1) + i * (boss ? 0.13 : 0.07), torsoD / 2 + 0.02);
    group.add(rib);
  }

  const belt = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 1.04, boss ? 0.12 : 0.07, torsoD * 1.06), darkMat);
  belt.position.y = boss ? 1.82 : 0.72;
  group.add(belt);

  for (let i = 0; i < 4; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.17, boss ? 0.45 : 0.24, 0.03), shirtMat);
    strip.position.set((i - 1.5) * torsoW * 0.2, boss ? 1.6 : 0.56, -torsoD / 2 - 0.01);
    strip.rotation.z = (i - 1.5) * 0.12;
    group.add(strip);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(boss ? 0.22 : 0.09, boss ? 0.26 : 0.11, boss ? 0.3 : 0.15, 8), skinMat);
  neck.position.y = boss ? 3.16 : 1.52;
  group.add(neck);

  const headY = boss ? 3.45 : 1.68;
  const head = new THREE.Mesh(new THREE.SphereGeometry(boss ? 0.62 : 0.25, 18, 14), skinMat);
  head.position.y = headY;
  group.add(head);

  const jaw = new THREE.Mesh(new RoundedBoxGeometry(boss ? 0.62 : 0.26, boss ? 0.22 : 0.09, boss ? 0.42 : 0.18, 3, 0.03), skinMat);
  jaw.position.set(0, headY - (boss ? 0.28 : 0.12), boss ? 0.38 : 0.17);
  group.add(jaw);

  for (let i = 0; i < 4; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(boss ? 0.035 : 0.015, boss ? 0.13 : 0.06, 4), boneMat);
    tooth.position.set((i - 1.5) * (boss ? 0.12 : 0.05), headY - (boss ? 0.2 : 0.085), boss ? 0.55 : 0.26);
    tooth.rotation.x = Math.PI;
    group.add(tooth);
  }

  const brow = new THREE.Mesh(new THREE.BoxGeometry(boss ? 0.74 : 0.3, boss ? 0.08 : 0.035, boss ? 0.12 : 0.05), skinMat);
  brow.position.set(0, headY + (boss ? 0.19 : 0.08), boss ? 0.42 : 0.19);
  group.add(brow);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(boss ? 0.09 : 0.04, 8, 6), eyeMat);
    eye.position.set(side * (boss ? 0.2 : 0.09), headY + (boss ? 0.08 : 0.04), boss ? 0.55 : 0.22);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(boss ? 0.035 : 0.016, 6, 6), darkMat);
    pupil.position.set(side * (boss ? 0.2 : 0.09), headY + (boss ? 0.08 : 0.04), boss ? 0.63 : 0.255);
    group.add(pupil);
    addGlow(group, 0xff2f4d, boss ? 0.42 : 0.18, new THREE.Vector3(side * (boss ? 0.2 : 0.09), headY + (boss ? 0.08 : 0.04), boss ? 0.62 : 0.25), 0.45);
  }

  for (let i = 0; i < 3; i++) {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(boss ? 0.12 : 0.05, 6, 5), darkMat);
    tuft.position.set((i - 1) * (boss ? 0.18 : 0.07), headY + (boss ? 0.62 : 0.24), -0.04);
    tuft.scale.y = 0.5;
    group.add(tuft);
  }

  const makeArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (boss ? 0.86 : 0.38), boss ? 2.9 : 1.4, 0);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(boss ? 0.26 : 0.1, 10, 8), shirtMat);
    pivot.add(shoulder);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(boss ? 0.12 : 0.065, boss ? 0.95 : 0.5, 4, 8), skinMat);
    arm.position.y = boss ? -0.55 : -0.29;
    pivot.add(arm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(boss ? 0.16 : 0.075, 8, 6), skinMat);
    hand.position.set(0, boss ? -1.12 : -0.58, 0.02);
    pivot.add(hand);

    if (boss) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 5), mat(0x2e1638, 0xc06bff, 0.7, 0.3, 0.4));
      claw.position.y = -1.32;
      claw.rotation.x = Math.PI;
      pivot.add(claw);
    }
    return pivot;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  leftArm.rotation.x = boss ? -0.7 : -1.25;
  rightArm.rotation.x = boss ? -0.7 : -1.25;
  group.add(leftArm, rightArm);

  const makeLeg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (boss ? 0.42 : 0.18), boss ? 1.6 : 0.64, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(boss ? 0.14 : 0.075, boss ? 1.05 : 0.5, 4, 8), shirtMat);
    leg.position.y = boss ? -0.55 : -0.3;
    pivot.add(leg);

    const boot = new THREE.Mesh(new RoundedBoxGeometry(boss ? 0.4 : 0.19, boss ? 0.2 : 0.11, boss ? 0.55 : 0.27, 3, 0.03), darkMat);
    boot.position.set(0, boss ? -1.2 : -0.63, boss ? 0.1 : 0.05);
    pivot.add(boot);
    return pivot;
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  group.add(leftLeg, rightLeg);

  if (boss) {
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.6, 5),
        mat(0xc06bff, 0xc06bff, 1.2, 0.4, 0.35),
      );
      const a = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.62, 2.8, Math.sin(a) * 0.42);
      spike.rotation.z = Math.cos(a) * 0.5;
      spike.rotation.x = Math.sin(a) * 0.5;
      group.add(spike);
    }
  }

  const built: Built = {
    group,
    materials: collectMaterials(group),
    hitRadius: boss ? 1.55 : 0.82,
    hitOffset: boss ? 2.1 : 1.05,
    baseScale: scale,
  };
  return { ...built, limbs: { leftArm, rightArm, leftLeg, rightLeg } };
}

function buildGingerbread(): Built & { limbs: ZombieLimbs } {
  const group = new THREE.Group();
  const dough = mat(0xb06a3a, 0x000000, 0, 0.04, 0.84);
  const darkDough = mat(0x7d4727, 0x000000, 0, 0.05, 0.9);
  const icing = mat(0xfff4e2, 0xffffff, 0.08, 0.05, 0.62);
  const icingPink = mat(0xffb3c8, 0xff7fa8, 0.18, 0.08, 0.58);
  const gumdrop = [0xff3b5c, 0x57ffa8, 0xffd75e].map((color) => mat(color, color, 0.45, 0.25, 0.45));

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const body = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.92, 0.34, 4, 0.12), dough);
  body.position.y = 1.02;
  group.add(body);

  for (const side of [-1, 1]) {
    const sideIcing = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.86, 0.04, 2, 0.015), icing);
    sideIcing.position.set(side * 0.33, 1.02, 0.17);
    group.add(sideIcing);
  }
  const bottomIcing = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.045, 0.04, 2, 0.015), icing);
  bottomIcing.position.set(0, 0.59, 0.17);
  group.add(bottomIcing);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 14), dough);
  head.position.set(0, 1.75, 0.01);
  head.scale.set(1, 0.96, 0.92);
  group.add(head);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), darkDough);
    eye.position.set(side * 0.13, 1.82, 0.34);
    group.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), icing);
    shine.position.set(side * 0.13 + 0.015, 1.84, 0.38);
    group.add(shine);
  }

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 6, 18, Math.PI), icing);
  smile.position.set(0, 1.66, 0.35);
  smile.rotation.z = Math.PI;
  group.add(smile);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), gumdrop[0]);
  nose.position.set(0, 1.74, 0.38);
  group.add(nose);

  for (let i = 0; i < 3; i++) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), gumdrop[i % gumdrop.length]);
    button.position.set(0, 1.22 - i * 0.24, 0.19);
    group.add(button);
  }

  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 14), icingPink);
  bow.position.set(0, 1.43, 0.19);
  bow.rotation.x = Math.PI / 2;
  group.add(bow);

  const makeArm = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.44, 1.3, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.46, 4, 8), dough);
    arm.position.y = -0.26;
    pivot.add(arm);
    for (let i = 0; i < 2; i++) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.018, 6, 12), icing);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.y = -0.18 - i * 0.16;
      pivot.add(stripe);
    }
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), dough);
    hand.position.y = -0.55;
    pivot.add(hand);
    pivot.rotation.z = side * 0.62;
    group.add(pivot);
    return pivot;
  };

  const makeLeg = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.2, 0.62, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.36, 4, 8), dough);
    leg.position.y = -0.22;
    pivot.add(leg);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 14), icing);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.38;
    pivot.add(cuff);
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.12, 0.38, 3, 0.04), dough);
    foot.position.set(0, -0.49, 0.08);
    pivot.add(foot);
    group.add(pivot);
    return pivot;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const candy = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), icing);
  candy.position.set(0.66, 0.95, 0.08);
  candy.rotation.z = 0.18;
  group.add(candy);
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.012, 6, 10), gumdrop[0]);
    stripe.position.set(0.66 + Math.sin(0.18) * (0.25 - i * 0.16), 0.95 + (0.25 - i * 0.16), 0.08);
    stripe.rotation.x = Math.PI / 2;
    group.add(stripe);
  }

  return {
    group,
    materials: collectMaterials(group),
    hitRadius: 0.72,
    hitOffset: 0.98,
    baseScale: 1,
    limbs: { leftArm, rightArm, leftLeg, rightLeg },
  };
}

function buildSpire(): Built & { limbs: ZombieLimbs } {
  const group = new THREE.Group();
  const rust = mat(0x34373d, 0x000000, 0, 0.72, 0.58);
  const dark = mat(0x15181d, 0x000000, 0, 0.6, 0.72);
  const red = mat(0xff3b4e, 0xff3b4e, 2.4, 0.3, 0.25);
  const bone = mat(0xb8b0a0, 0x000000, 0, 0.2, 0.7);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 26),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.35, 10), rust);
  spine.position.y = 1.65;
  group.add(spine);

  const ribs = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.25, 0.5, 10), dark);
  ribs.position.y = 1.95;
  ribs.scale.z = 0.72;
  group.add(ribs);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 8), rust);
  neck.position.set(0, 2.5, 0);
  group.add(neck);

  const headFrame = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.42, 0.4, 3, 0.06), dark);
  headFrame.position.set(0, 2.82, 0);
  group.add(headFrame);

  for (const side of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.42, 14), rust);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(side * 0.18, 2.82, 0.2);
    group.add(cone);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 12), dark);
    inner.rotation.x = Math.PI / 2;
    inner.position.set(side * 0.18, 2.82, 0.26);
    group.add(inner);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), red);
    light.position.set(side * 0.18, 2.82, 0.4);
    group.add(light);
    addGlow(group, 0xff3b4e, 0.3, new THREE.Vector3(side * 0.18, 2.82, 0.46), 0.45);
  }

  for (let i = 0; i < 3; i++) {
    const beacon = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), red);
    beacon.position.set(-0.22 + i * 0.22, 3.15, 0);
    group.add(beacon);
  }

  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), dark);
  cable.position.set(0.22, 1.8, -0.12);
  cable.rotation.z = 0.18;
  group.add(cable);
  const cable2 = cable.clone();
  cable2.position.set(-0.24, 1.7, -0.08);
  cable2.rotation.z = -0.22;
  group.add(cable2);

  const makeArm = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.3, 2.15, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.35, 4, 8), rust);
    arm.position.y = -0.72;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), bone);
    hand.position.y = -1.5;
    hand.rotation.x = Math.PI;
    pivot.add(hand);
    pivot.rotation.z = side * 0.1;
    group.add(pivot);
    return pivot;
  };

  const makeLeg = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.12, 1.05, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 1.0, 4, 8), rust);
    leg.position.y = -0.55;
    pivot.add(leg);
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.12, 0.45, 3, 0.04), dark);
    foot.position.set(0, -1.1, 0.12);
    pivot.add(foot);
    group.add(pivot);
    return pivot;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  addGlow(group, 0xff3b4e, 2.2, new THREE.Vector3(0, 2.82, 0), 0.16);

  return {
    group,
    materials: collectMaterials(group),
    hitRadius: 1.15,
    hitOffset: 2.2,
    baseScale: 1,
    limbs: { leftArm, rightArm, leftLeg, rightLeg },
  };
}

function buildBanshee(): Built {
  const group = new THREE.Group();
  const ghost = new THREE.MeshPhysicalMaterial({
    color: 0x9fc8dc,
    emissive: 0x3d6f88,
    emissiveIntensity: 0.5,
    metalness: 0.05,
    roughness: 0.3,
    transparent: true,
    opacity: 0.78,
    clearcoat: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pale = mat(0xd9eef7, 0x8fd4ff, 0.7, 0.05, 0.45);
  const dark = mat(0x0a1016, 0x000000, 0, 0.2, 0.8);

  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 18, 1, true), ghost);
  cloak.position.y = -0.05;
  group.add(cloak);

  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), ghost);
  hood.position.y = 0.55;
  group.add(hood);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), pale);
  face.position.set(0, 0.58, 0.12);
  face.scale.set(1, 1.1, 0.8);
  group.add(face);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), dark);
    eye.position.set(side * 0.1, 0.62, 0.31);
    group.add(eye);
    addGlow(group, 0x8fd4ff, 0.22, new THREE.Vector3(side * 0.1, 0.62, 0.33), 0.55);
    const wisp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 8, 1, true), ghost);
    wisp.position.set(side * 0.38, 0.05, -0.05);
    wisp.rotation.z = side * 0.4;
    group.add(wisp);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.55, 4, 8), ghost);
    sleeve.position.set(side * 0.42, 0.1, 0.1);
    sleeve.rotation.z = side * 0.9;
    group.add(sleeve);
    const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.15, 4, 6), pale);
    hand.position.set(side * 0.62, -0.12, 0.14);
    group.add(hand);
  }

  for (let i = 0; i < 6; i++) {
    const tatter = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 5, 1, true), ghost);
    const a = (i / 6) * Math.PI * 2;
    tatter.position.set(Math.cos(a) * 0.36, -0.72, Math.sin(a) * 0.36);
    tatter.rotation.x = Math.PI;
    group.add(tatter);
  }

  addGlow(group, 0x8fd4ff, 1.2, new THREE.Vector3(0, 0.3, 0), 0.18);

  return {
    group,
    materials: collectMaterials(group),
    hitRadius: 0.8,
    hitOffset: 0.1,
    baseScale: 1,
  };
}

function buildScarecrow(): Built {
  const group = new THREE.Group();
  const wood = mat(0x5a3c22, 0x000000, 0, 0.1, 0.85);
  const burlap = mat(0x9c7a4a, 0x000000, 0, 0.05, 0.82);
  const dark = mat(0x1a1410, 0x000000, 0, 0.2, 0.75);
  const straw = mat(0xd8bf72, 0x000000, 0, 0.05, 0.75);
  const glow = mat(0xff8a3d, 0xff8a3d, 2.2, 0.2, 0.3);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.82, 22),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.3, 8), wood);
  pole.position.y = 0.68;
  group.add(pole);

  const body = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.78, 0.34, 3, 0.08), burlap);
  body.position.y = 1.35;
  group.add(body);

  for (let i = 0; i < 5; i++) {
    const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.01), dark);
    stitch.position.set(-0.16 + i * 0.08, 1.28 + (i % 2) * 0.06, 0.18);
    stitch.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.3;
    group.add(stitch);
  }

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.35, 8), wood);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.y = 1.55;
  group.add(crossbar);

  for (const side of [-1, 1]) {
    const sleeve = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.16, 0.22, 3, 0.04), burlap);
    sleeve.position.set(side * 0.45, 1.55, 0);
    group.add(sleeve);
    for (let i = 0; i < 3; i++) {
      const bit = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.35, 5), straw);
      bit.position.set(side * 0.76, 1.55 + (i - 1) * 0.08, 0);
      bit.rotation.z = side * (0.7 + i * 0.2);
      group.add(bit);
    }
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 18, 14), burlap);
  head.position.y = 1.98;
  head.scale.set(1, 1.05, 0.92);
  group.add(head);

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.05, 18), dark);
  hatBrim.position.y = 2.22;
  group.add(hatBrim);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.55, 14), dark);
  hat.position.y = 2.48;
  hat.rotation.z = 0.08;
  group.add(hat);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow);
    eye.position.set(side * 0.12, 2.01, 0.28);
    group.add(eye);
    addGlow(group, 0xff8a3d, 0.2, new THREE.Vector3(side * 0.12, 2.01, 0.31), 0.45);
  }

  for (let i = 0; i < 3; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.02), dark);
    tooth.position.set((i - 1) * 0.08, 1.87, 0.28);
    tooth.rotation.z = (i - 1) * 0.18;
    group.add(tooth);
  }

  return {
    group,
    materials: collectMaterials(group),
    hitRadius: 0.85,
    hitOffset: 1.3,
    baseScale: 1,
  };
}

function buildMummy(): Built & { limbs: ZombieLimbs } {
  const group = new THREE.Group();
  const wrap = mat(0xd8c9a8, 0x000000, 0, 0.05, 0.8);
  const wrapDark = mat(0xa89676, 0x000000, 0, 0.05, 0.85);
  const skin = mat(0x3f3a32, 0x000000, 0, 0.2, 0.7);
  const glow = mat(0xffc247, 0xffc247, 2.5, 0.2, 0.25);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 22),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.58, 1.0, 0.34, 4, 0.08), wrap);
  torso.position.y = 1.05;
  group.add(torso);

  for (let i = 0; i < 9; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3 - i * 0.006, 0.025, 5, 18), wrapDark);
    band.rotation.x = Math.PI / 2;
    band.rotation.z = i * 0.35;
    band.position.y = 0.65 + i * 0.1;
    band.scale.z = 0.7;
    group.add(band);
  }

  for (let i = 0; i < 4; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.02), wrap);
    strip.position.set((i - 1.5) * 0.12, 0.48, 0.18);
    strip.rotation.z = (i - 1.5) * 0.12;
    group.add(strip);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), wrap);
  head.position.y = 1.72;
  head.scale.y = 1.05;
  group.add(head);

  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.27 - i * 0.012, 0.022, 5, 16), wrapDark);
    band.rotation.x = Math.PI / 2;
    band.rotation.z = i * 0.5;
    band.position.y = 1.56 + i * 0.1;
    group.add(band);
  }

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), glow);
    eye.position.set(side * 0.1, 1.76, 0.24);
    group.add(eye);
    addGlow(group, 0xffc247, 0.2, new THREE.Vector3(side * 0.1, 1.76, 0.27), 0.4);
  }

  const makeArm = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.36, 1.38, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.66, 4, 8), wrap);
    arm.position.y = -0.38;
    pivot.add(arm);
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.018, 5, 12), wrapDark);
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.2 - i * 0.2;
      pivot.add(band);
    }
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), wrapDark);
    hand.position.y = -0.8;
    pivot.add(hand);
    pivot.rotation.x = -1.2;
    group.add(pivot);
    return pivot;
  };

  const makeLeg = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.18, 0.6, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.48, 4, 8), wrap);
    leg.position.y = -0.3;
    pivot.add(leg);
    for (let i = 0; i < 2; i++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.018, 5, 12), wrapDark);
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.2 - i * 0.2;
      pivot.add(band);
    }
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.11, 0.34, 3, 0.04), wrapDark);
    foot.position.set(0, -0.62, 0.08);
    pivot.add(foot);
    group.add(pivot);
    return pivot;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  return {
    group,
    materials: collectMaterials(group),
    hitRadius: 0.9,
    hitOffset: 1.15,
    baseScale: 1,
    limbs: { leftArm, rightArm, leftLeg, rightLeg },
  };
}

function buildPumpkin(): Built {
  const group = new THREE.Group();
  const orange = mat(0xff8a3d, 0xff6a1d, 0.8, 0.1, 0.5);
  const dark = mat(0x1a0d05, 0x000000, 0, 0.1, 0.7);
  const green = mat(0x4d6b2a, 0x000000, 0, 0.1, 0.8);
  const fire = mat(0xffd75e, 0xffc247, 2.8, 0.2, 0.2);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.56, 24, 18), orange);
  body.scale.y = 0.82;
  body.position.y = 0.05;
  group.add(body);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.012, 5, 24), dark);
    ridge.rotation.y = a;
    ridge.scale.y = 0.82;
    group.add(ridge);
  }

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 7), green);
  stem.position.y = 0.62;
  stem.rotation.z = 0.2;
  group.add(stem);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 3), dark);
    eye.rotation.z = Math.PI / 2 + side * 0.2;
    eye.position.set(side * 0.22, 0.15, 0.5);
    group.add(eye);
  }

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.04), dark);
  mouth.position.set(0, -0.12, 0.51);
  group.add(mouth);
  for (let i = -2; i <= 2; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 3), dark);
    tooth.position.set(i * 0.09, -0.06 + (i % 2 === 0 ? 0.04 : -0.01), 0.52);
    group.add(tooth);
  }

  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), fire);
  ember.position.set(0, 0.12, 0.44);
  group.add(ember);
  addGlow(group, 0xff8a3d, 1.8, new THREE.Vector3(0, 0.12, 0.5), 0.45);
  addGlow(group, 0xffc247, 0.7, new THREE.Vector3(0, 0.6, 0), 0.35);

  return {
    group,
    materials: collectMaterials(group),
    hitRadius: 0.75,
    hitOffset: 0.05,
    baseScale: 1,
  };
}

function buildWendigo(): Built & { limbs: ZombieLimbs } {
  const group = new THREE.Group();
  const hide = mat(0x4b5660, 0x000000, 0, 0.1, 0.82);
  const bone = mat(0xd7d2c4, 0x000000, 0, 0.05, 0.7);
  const dark = mat(0x11161a, 0x000000, 0, 0.2, 0.75);
  const glow = mat(0x8ff8ff, 0x8ff8ff, 2.6, 0.2, 0.25);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.52, 1.1, 0.32, 4, 0.08), hide);
  torso.position.y = 1.35;
  group.add(torso);

  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.03), bone);
    rib.position.set(0, 1.15 + i * 0.15, 0.17);
    group.add(rib);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.28, 8), hide);
  neck.position.y = 1.98;
  group.add(neck);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), bone);
  skull.position.y = 2.22;
  skull.scale.set(0.92, 1.1, 0.95);
  group.add(skull);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow);
    eye.position.set(side * 0.1, 2.25, 0.23);
    group.add(eye);
    addGlow(group, 0x8ff8ff, 0.2, new THREE.Vector3(side * 0.1, 2.25, 0.26), 0.5);
    const antler = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.55, 5), bone);
    antler.position.set(side * 0.25, 2.5, 0);
    antler.rotation.z = side * 0.45;
    group.add(antler);
    const branch = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 5), bone);
    branch.position.set(side * 0.38, 2.68, 0.04);
    branch.rotation.z = side * 0.9;
    group.add(branch);
  }

  const makeArm = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.35, 1.72, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.9, 4, 8), hide);
    arm.position.y = -0.5;
    pivot.add(arm);
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 5), bone);
    claw.position.y = -1.05;
    claw.rotation.x = Math.PI;
    pivot.add(claw);
    pivot.rotation.x = -1.4;
    group.add(pivot);
    return pivot;
  };

  const makeLeg = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.18, 0.85, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.68, 4, 8), hide);
    leg.position.y = -0.38;
    pivot.add(leg);
    const foot = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 5), dark);
    foot.position.set(0, -0.8, 0.12);
    foot.rotation.x = Math.PI / 2;
    pivot.add(foot);
    group.add(pivot);
    return pivot;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  return {
    group,
    materials: collectMaterials(group),
    hitRadius: 0.85,
    hitOffset: 1.4,
    baseScale: 1,
    limbs: { leftArm, rightArm, leftLeg, rightLeg },
  };
}

function buildHelicopter(): Built {
  const group = new THREE.Group();
  const armor = mat(0x25292e, 0x000000, 0, 0.78, 0.46);
  const dark = mat(0x0b0e12, 0x000000, 0, 0.72, 0.58);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x12352c,
    emissive: 0x43f3ff,
    emissiveIntensity: 0.35,
    metalness: 0.15,
    roughness: 0.08,
    clearcoat: 1,
    transparent: true,
    opacity: 0.72,
  });
  const hazard = mat(0xffc247, 0xff8a3d, 0.35, 0.4, 0.4);

  const hull = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.5, 1.5, 4, 0.12), armor);
  hull.position.set(0, 0.05, 0);
  group.add(hull);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), armor);
  nose.position.set(0, 0.02, 0.72);
  nose.scale.set(1, 0.82, 1.05);
  group.add(nose);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.position.set(0, 0.22, 0.55);
  canopy.scale.set(1, 0.8, 1.1);
  group.add(canopy);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 1.35, 8), armor);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.08, -1.25);
  group.add(boom);

  const fin = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.45, 0.34, 3, 0.03), dark);
  fin.position.set(0, 0.28, -1.85);
  group.add(fin);

  const tailRotor = new THREE.Group();
  tailRotor.name = 'tail-rotor';
  tailRotor.position.set(0.12, 0.3, -1.95);
  for (const angle of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.035), dark);
    blade.rotation.z = angle;
    tailRotor.add(blade);
  }
  group.add(tailRotor);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.42, 8), dark);
  mast.position.set(0, 0.45, 0.05);
  group.add(mast);

  const mainRotor = new THREE.Group();
  mainRotor.name = 'heli-rotor';
  mainRotor.position.set(0, 0.67, 0.05);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.1, 10), hazard);
  mainRotor.add(hub);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.025, 0.12), dark);
    blade.rotation.y = (i / 4) * Math.PI;
    blade.position.y = 0.02;
    mainRotor.add(blade);
  }
  group.add(mainRotor);

  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6), dark);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(side * 0.38, -0.36, 0.02);
    group.add(skid);
    for (const z of [-0.35, 0.35]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 5), dark);
      strut.position.set(side * 0.38, -0.22, z);
      strut.rotation.z = side * 0.2;
      group.add(strut);
    }

    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 8), armor);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(side * 0.55, -0.05, 0.15);
    group.add(pod);
    for (let i = 0; i < 3; i++) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 6), hazard);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(side * 0.55, -0.05 + (i - 1) * 0.06, 0.42);
      group.add(tube);
    }
    addGlow(group, 0xff8a3d, 0.35, new THREE.Vector3(side * 0.55, -0.05, 0.46), 0.35);
  }

  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), hazard);
  spot.position.set(0, 0.18, 0.92);
  group.add(spot);
  addGlow(group, 0xffc247, 0.4, new THREE.Vector3(0, 0.18, 0.96), 0.5);
  addGlow(group, 0xff2f6d, 0.3, new THREE.Vector3(-0.42, 0.12, -1.9), 0.4);
  addGlow(group, 0x57ffa8, 0.3, new THREE.Vector3(0.42, 0.12, -1.9), 0.4);

  return { group, materials: collectMaterials(group), hitRadius: 1.25, hitOffset: 0, baseScale: 1 };
}

function buildJet(): Built {
  const group = new THREE.Group();
  const skin = mat(0x2b3a44, 0x000000, 0, 0.88, 0.28);
  const dark = mat(0x0b1117, 0x000000, 0, 0.75, 0.5);
  const glow = glowMat(0x43f3ff, 1.1);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0a2028,
    emissive: 0x43f3ff,
    emissiveIntensity: 0.4,
    metalness: 0.2,
    roughness: 0.06,
    clearcoat: 1,
    transparent: true,
    opacity: 0.75,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.2, 12), skin);
  body.rotation.x = Math.PI / 2;
  body.position.z = 0;
  group.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.9, 12), skin);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = 1.5;
  group.add(nose);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.position.set(0, 0.22, 0.55);
  canopy.scale.set(0.8, 0.55, 1.6);
  group.add(canopy);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.07, 0.9, 3, 0.03), skin);
    wing.position.set(side * 0.7, -0.04, -0.1);
    wing.rotation.y = side * 0.42;
    group.add(wing);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 1.0), glow);
    edge.position.set(side * 1.22, -0.04, -0.28);
    edge.rotation.y = side * 0.42;
    group.add(edge);

    const tail = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.42, 0.55, 3, 0.02), dark);
    tail.position.set(side * 0.32, 0.25, -0.95);
    tail.rotation.z = side * 0.3;
    group.add(tail);
  }

  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.32, 10), dark);
  engine.rotation.x = Math.PI / 2;
  engine.position.z = -1.2;
  group.add(engine);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.8, 10, 1, true), glowMat(0x43f3ff, 0.5));
  flame.name = 'jet-flame';
  flame.rotation.x = Math.PI / 2;
  flame.position.z = -1.65;
  group.add(flame);
  addGlow(group, 0x43f3ff, 0.9, new THREE.Vector3(0, 0, -1.85), 0.5);

  return { group, materials: collectMaterials(group), hitRadius: 1.05, hitOffset: 0, baseScale: 1.3 };
}

function buildAlien(): Built {
  const group = new THREE.Group();
  const skin = mat(0x86e07a, 0x5aff7a, 0.55, 0.15, 0.45);
  const suit = mat(0x3b5bff, 0x2a3bd0, 0.45, 0.35, 0.5);
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0 });
  const pupil = new THREE.MeshBasicMaterial({ color: 0x07120a });
  const antennaMat = mat(0xb76bff, 0xb76bff, 1.4, 0.3, 0.4);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const suitBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.34, 18), suit);
  suitBody.position.y = 0.28;
  group.add(suitBody);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.038, 8, 28), mat(0xc06bff, 0xc06bff, 1.2, 0.4, 0.35));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.47;
  group.add(collar);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 14), skin);
  torso.position.y = 0.66;
  torso.scale.y = 1.08;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), skin);
  head.position.y = 1.06;
  group.add(head);

  const eyes: Array<[number, number, number]> = [
    [-0.13, 1.14, 0.23],
    [0.13, 1.14, 0.23],
    [0, 1.0, 0.27],
  ];
  for (const [x, y, z] of eyes) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.076, 10, 8), eyeWhite);
    white.position.set(x, y, z);
    group.add(white);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), pupil);
    dot.position.set(x, y, z + 0.055);
    group.add(dot);
    addGlow(group, 0x9dff8a, 0.2, new THREE.Vector3(x, y, z + 0.06), 0.3);
  }

  for (let i = -1; i <= 1; i++) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.28, 6), antennaMat);
    stalk.position.set(i * 0.09, 1.38, 0);
    stalk.rotation.z = i * 0.16;
    group.add(stalk);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), antennaMat);
    bulb.position.set(i * 0.09 - i * 0.02, 1.53, 0);
    group.add(bulb);
  }

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.25, 4, 8), skin);
    arm.position.set(side * 0.33, 0.68, 0.02);
    arm.rotation.z = side * 0.55;
    group.add(arm);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.11, 0.24), suit);
    foot.position.set(side * 0.13, 0.055, 0.05);
    group.add(foot);
  }

  return { group, materials: collectMaterials(group), hitRadius: 0.7, hitOffset: 0.78, baseScale: 0.95 };
}

function addGroundShadow(group: THREE.Group, radius: number, opacity = 0.28): void {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);
}

function buildDino(big = false): Built {
  const group = new THREE.Group();
  const skin = mat(big ? 0x6f8f35 : 0x8fbc4f, 0x3f6b1d, 0.28, 0.15, 0.62);
  const belly = mat(0xc6b06a, 0x000000, 0, 0.1, 0.8);
  const claw = mat(0x2b2a1f, 0x000000, 0, 0.2, 0.7);
  const eye = mat(0xff3b2f, 0xff3b2f, 2.4, 0.2, 0.2);

  addGroundShadow(group, big ? 2.1 : 0.52, 0.3);

  const body = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.9 : 0.5, 20, 14), skin);
  body.position.set(0, big ? 1.5 : 0.85, big ? -0.45 : -0.25);
  body.scale.set(1.05, 0.92, big ? 1.15 : 1.25);
  group.add(body);

  const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.55 : 0.32, 12, 10), belly);
  bellyMesh.position.set(0, big ? 1.25 : 0.68, big ? 0.55 : 0.32);
  bellyMesh.scale.set(1, 0.85, 0.5);
  group.add(bellyMesh);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.42 : 0.24, big ? 0.5 : 0.28, big ? 0.9 : 0.48, 12), skin);
  neck.position.set(0, big ? 2.0 : 1.12, big ? 0.65 : 0.42);
  neck.rotation.x = 0.42;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.58 : 0.33, 18, 14), skin);
  head.position.set(0, big ? 2.36 : 1.32, big ? 1.0 : 0.65);
  head.scale.set(1, 0.8, 1.3);
  group.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.6 : 0.34, big ? 0.34 : 0.2, big ? 0.78 : 0.46), skin);
  snout.position.set(0, big ? 2.22 : 1.24, big ? 1.58 : 0.93);
  group.add(snout);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.52 : 0.28, big ? 0.16 : 0.08, big ? 0.62 : 0.34), belly);
  jaw.position.set(0, big ? 2.02 : 1.13, big ? 1.4 : 0.8);
  group.add(jaw);

  for (const side of [-1, 1]) {
    const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.09 : 0.05, 8, 6), eye);
    eyeMesh.position.set(side * (big ? 0.24 : 0.14), big ? 2.52 : 1.42, big ? 1.7 : 1.04);
    group.add(eyeMesh);
    addGlow(group, 0xff3b2f, big ? 0.42 : 0.18, new THREE.Vector3(side * (big ? 0.24 : 0.14), big ? 2.52 : 1.42, big ? 1.77 : 1.09), 0.55);

    for (let i = 0; i < 3; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.055 : 0.03, big ? 0.22 : 0.12, 5), claw);
      tooth.position.set((i - 1) * (big ? 0.14 : 0.08), big ? 1.98 : 1.1, big ? 1.96 : 1.12);
      tooth.rotation.x = Math.PI;
      group.add(tooth);
    }
  }

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.5 : 0.28, big ? 0.06 : 0.03, big ? 0.5 : 0.28), mat(0x5e1616, 0x000000, 0, 0.1, 0.8));
  mouth.position.set(0, big ? 2.02 : 1.13, big ? 1.72 : 1.0);
  group.add(mouth);

  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.035 : 0.018, 6, 5), claw);
    nostril.position.set(side * (big ? 0.13 : 0.07), big ? 2.27 : 1.29, big ? 1.92 : 1.13);
    group.add(nostril);
  }

  for (let i = 0; i < 6; i++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.15 : 0.075, big ? 0.65 : 0.32, 5), claw);
    spine.position.set(0, big ? 2.18 - i * 0.08 : 1.32 - i * 0.04, big ? 0.42 - i * 0.28 : 0.28 - i * 0.18);
    spine.rotation.x = -0.35;
    spine.scale.z = 0.7;
    group.add(spine);
  }

  if (big) {
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 6), claw);
      horn.position.set(side * 0.36, 2.74, 1.08);
      horn.rotation.z = side * 0.35;
      group.add(horn);

      for (let i = 0; i < 2; i++) {
        const frill = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 5), claw);
        frill.position.set(side * (0.6 + i * 0.25), 2.0 - i * 0.18, 0.42);
        frill.rotation.z = side * (0.6 + i * 0.2);
        frill.rotation.x = -0.2;
        group.add(frill);
      }

      for (let i = 0; i < 3; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 5), claw);
        spike.position.set(side * 0.82, 1.35 + i * 0.18, 0.15 - i * 0.26);
        spike.rotation.z = side * Math.PI / 2;
        group.add(spike);
      }
    }
    addGlow(group, 0xff5a2f, 1.4, new THREE.Vector3(0, 2.08, 1.76), 0.25);
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.55 : 0.28, big ? 2.6 : 1.4, 9), skin);
  tail.position.set(0, big ? 1.2 : 0.7, big ? -1.1 : -0.75);
  tail.rotation.x = -Math.PI / 2;
  tail.name = 'dino-tail';
  group.add(tail);

  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(big ? 0.32 : 0.14, big ? 1.0 : 0.45, 4, 8), skin);
    thigh.position.set(side * (big ? 0.52 : 0.3), big ? 0.62 : 0.45, big ? -0.2 : -0.12);
    group.add(thigh);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.36 : 0.2, big ? 0.18 : 0.1, big ? 0.65 : 0.36), claw);
    foot.position.set(side * (big ? 0.52 : 0.3), big ? 0.1 : 0.06, big ? 0.2 : 0.12);
    group.add(foot);

    for (let i = 0; i < 3; i++) {
      const toe = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.05 : 0.025, big ? 0.24 : 0.12, 5), claw);
      toe.position.set(side * (big ? 0.52 : 0.3) + (i - 1) * (big ? 0.1 : 0.055), big ? 0.08 : 0.05, big ? 0.55 : 0.31);
      toe.rotation.x = Math.PI / 2;
      group.add(toe);
    }

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(big ? 0.1 : 0.06, big ? 0.5 : 0.28, 4, 6), skin);
    arm.position.set(side * (big ? 0.78 : 0.44), big ? 1.65 : 0.95, big ? 0.55 : 0.32);
    arm.rotation.z = side * 0.6;
    group.add(arm);

    const armClaw = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.055 : 0.028, big ? 0.22 : 0.1, 5), claw);
    armClaw.position.set(side * (big ? 0.86 : 0.48), big ? 1.38 : 0.82, big ? 0.7 : 0.4);
    armClaw.rotation.z = side * 0.5;
    group.add(armClaw);
  }

  const stripeMat = mat(0x2f4a1e, 0x000000, 0, 0.2, 0.7);
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.18 : 0.09, big ? 0.1 : 0.05, big ? 0.4 : 0.22), stripeMat);
    stripe.position.set(0, big ? 1.82 - i * 0.13 : 1.05 - i * 0.08, big ? 0.25 - i * 0.18 : 0.15 - i * 0.1);
    group.add(stripe);
  }

  return {
    group,
    materials: collectMaterials(group),
    hitRadius: big ? 2.9 : 0.82,
    hitOffset: big ? 1.65 : 0.88,
    baseScale: 1,
  };
}

function buildImp(): Built {
  const group = new THREE.Group();
  const skin = mat(0xffd75e, 0xffb347, 0.35, 0.15, 0.5);
  const overalls = mat(0x2e6bff, 0x163b8f, 0.4, 0.3, 0.55);
  const dark = mat(0x141a22, 0x000000, 0, 0.4, 0.5);
  const lens = glowMat(0xdffcff, 0.9);

  addGroundShadow(group, 0.36, 0.26);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), skin);
  body.position.y = 0.45;
  body.scale.y = 0.9;
  group.add(body);

  const pants = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 16), overalls);
  pants.position.y = 0.28;
  group.add(pants);

  const strapGeo = new THREE.BoxGeometry(0.08, 0.32, 0.04);
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(strapGeo, overalls);
    strap.position.set(side * 0.15, 0.5, 0.29);
    group.add(strap);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), skin);
  head.position.y = 0.82;
  group.add(head);

  const goggleBand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.18), dark);
  goggleBand.position.set(0, 0.87, 0.18);
  group.add(goggleBand);
  for (const side of [-1, 1]) {
    const lensMesh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), lens);
    lensMesh.position.set(side * 0.12, 0.87, 0.27);
    group.add(lensMesh);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), dark);
    pupil.position.set(side * 0.12, 0.87, 0.32);
    group.add(pupil);
  }

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.04), dark);
  mouth.position.set(0, 0.7, 0.29);
  group.add(mouth);

  for (let i = 0; i < 3; i++) {
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 5), dark);
    hair.position.set((i - 1) * 0.06, 1.08, 0);
    hair.rotation.z = (i - 1) * 0.3;
    group.add(hair);
  }

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.25, 4, 6), skin);
    arm.position.set(side * 0.32, 0.47, 0.02);
    arm.rotation.z = side * 0.5;
    group.add(arm);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.2), dark);
    foot.position.set(side * 0.13, 0.05, 0.05);
    group.add(foot);
  }

  return { group, materials: collectMaterials(group), hitRadius: 0.56, hitOffset: 0.55, baseScale: 0.9 };
}

function buildVoidling(): Built {
  const group = new THREE.Group();
  const ooze = mat(0x24102f, 0x8f5cff, 0.55, 0.35, 0.45);
  const eye = glowMat(0x9dffdf, 1);

  addGroundShadow(group, 0.58, 0.32);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), ooze);
  core.position.y = 0.72;
  core.scale.set(1, 0.82, 1);
  group.add(core);

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.18 + (i % 3) * 0.05, 10, 8), ooze);
    blob.position.set(Math.cos(a) * 0.48, 0.45 + (i % 2) * 0.25, Math.sin(a) * 0.48);
    group.add(blob);

    const tendril = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.65, 6), ooze);
    tendril.position.set(Math.cos(a) * 0.7, 0.4, Math.sin(a) * 0.7);
    tendril.rotation.z = Math.cos(a) * 0.7;
    tendril.rotation.x = Math.sin(a) * 0.7;
    tendril.name = 'void-tendril';
    group.add(tendril);
  }

  for (const side of [-1, 1]) {
    const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eye);
    eyeMesh.position.set(side * 0.16, 0.82, 0.48);
    group.add(eyeMesh);
    addGlow(group, 0x9dffdf, 0.28, new THREE.Vector3(side * 0.16, 0.82, 0.52), 0.4);
  }
  addGlow(group, 0x8f5cff, 1.5, new THREE.Vector3(0, 0.72, 0), 0.18);

  return { group, materials: collectMaterials(group), hitRadius: 0.82, hitOffset: 0.72, baseScale: 1 };
}

function buildDemon(): Built & { limbs: ZombieLimbs } {
  const built = buildZombie(0xcb3d2f, 0x2a0d12, 1.05);
  const horn = mat(0x281014, 0xff3b2f, 0.35, 0.6, 0.4);
  const wing = mat(0x1d0d13, 0xff3b2f, 0.2, 0.2, 0.7);

  for (const side of [-1, 1]) {
    const hornMesh = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 6), horn);
    hornMesh.position.set(side * 0.17, 1.95, 0);
    hornMesh.rotation.z = -side * 0.32;
    built.group.add(hornMesh);

    const wingMesh = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 4), wing);
    wingMesh.position.set(side * 0.42, 1.2, -0.3);
    wingMesh.rotation.set(0.2, 0, side * 0.8);
    wingMesh.scale.set(1, 1, 0.3);
    wingMesh.name = 'demon-wing';
    built.group.add(wingMesh);
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9, 6), horn);
  tail.position.set(0, 0.6, -0.45);
  tail.rotation.x = -Math.PI / 2;
  built.group.add(tail);

  return {
    ...built,
    materials: collectMaterials(built.group),
    hitRadius: 0.9,
    hitOffset: 1.1,
    baseScale: 1.05,
  };
}

function buildMech(): Built {
  const group = new THREE.Group();
  const steel = mat(0x5c6a78, 0x9fb7c9, 0.18, 0.9, 0.3);
  const dark = mat(0x222c36, 0x000000, 0, 0.8, 0.4);
  const red = mat(0x8a1f2c, 0xff2f4d, 0.6, 0.7, 0.3);
  const visor = glowMat(0x43f3ff, 1);

  addGroundShadow(group, 0.72, 0.3);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1, 1.1, 0.6), steel);
  torso.position.y = 1.3;
  group.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.15), red);
  chest.position.set(0, 1.35, 0.36);
  group.add(chest);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), visor);
  core.position.set(0, 1.35, 0.46);
  group.add(core);
  addGlow(group, 0x43f3ff, 0.9, new THREE.Vector3(0, 1.35, 0.5), 0.5);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.4, 0.42), steel);
  head.position.y = 2.03;
  group.add(head);

  const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.06), visor);
  visorMesh.position.set(0, 2.05, 0.24);
  group.add(visorMesh);
  addGlow(group, 0x43f3ff, 0.55, new THREE.Vector3(0, 2.05, 0.3), 0.45);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.48), red);
    shoulder.position.set(side * 0.7, 1.75, 0);
    group.add(shoulder);

    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.75, 10), dark);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(side * 0.72, 1.72, 0.45);
    group.add(cannon);
    addGlow(group, 0x43f3ff, 0.4, new THREE.Vector3(side * 0.72, 1.72, 0.85), 0.4);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 4, 8), steel);
    arm.position.set(side * 0.76, 1.15, 0.05);
    group.add(arm);

    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.38), dark);
    leg.position.set(side * 0.28, 0.55, 0);
    group.add(leg);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.6), steel);
    foot.position.set(side * 0.28, 0.08, 0.12);
    group.add(foot);
  }

  return { group, materials: collectMaterials(group), hitRadius: 1.08, hitOffset: 1.1, baseScale: 1.05 };
}

function buildJester(): Built {
  const group = new THREE.Group();
  const face = mat(0xffe6d1, 0xffc6dd, 0.2, 0.1, 0.5);
  const suit = mat(0x5b25b8, 0x9b5cff, 0.4, 0.35, 0.5);
  const magenta = mat(0xff2fa8, 0xff2fa8, 0.9, 0.4, 0.35);
  const cyan = mat(0x43f3ff, 0x43f3ff, 0.8, 0.4, 0.35);
  const dark = mat(0x19121f, 0x000000, 0, 0.3, 0.6);
  const eye = glowMat(0x9dffdf, 1);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), suit);
  body.position.y = -0.45;
  group.add(body);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.12, 8, 24), magenta);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.02;
  group.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.82, 22, 16), face);
  head.position.y = 0.65;
  group.add(head);

  for (const side of [-1, 1]) {
    const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), dark);
    eyeMesh.position.set(side * 0.28, 0.78, 0.72);
    group.add(eyeMesh);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eye);
    glint.position.set(side * 0.3, 0.8, 0.82);
    group.add(glint);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), magenta);
  nose.position.set(0, 0.58, 0.82);
  group.add(nose);

  const grin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.05), magenta);
  grin.position.set(0, 0.35, 0.78);
  group.add(grin);
  addGlow(group, 0xff2fa8, 2.6, new THREE.Vector3(0, 0.6, 0.2), 0.14);
  addGlow(group, 0xffd75e, 0.32, new THREE.Vector3(-0.28, 0.78, 0.78), 0.35);
  addGlow(group, 0xffd75e, 0.32, new THREE.Vector3(0.28, 0.78, 0.78), 0.35);

  const hatColors = [magenta, cyan, magenta];
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.85, 8), hatColors[i]);
    cone.position.set((i - 1) * 0.38, 1.42, 0.02);
    cone.rotation.z = (i - 1) * 0.45;
    cone.name = 'jester-hat';
    group.add(cone);

    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), hatColors[(i + 1) % 3]);
    bell.position.set((i - 1) * 0.55, 1.78, 0.02);
    group.add(bell);
  }

  for (const side of [-1, 1]) {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), face);
    hand.position.set(side * 1.0, 0.0, 0.1);
    hand.name = 'jester-hand';
    group.add(hand);
  }

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), dark);
  handle.position.set(1.0, -0.5, 0.1);
  handle.rotation.z = 0.25;
  group.add(handle);

  const mallet = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.42), magenta);
  mallet.position.set(1.0, -1.15, 0.1);
  mallet.rotation.z = 0.25;
  group.add(mallet);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.035, 6, 64), glowMat(0xff2fa8, 0.4));
  ring.rotation.x = Math.PI / 2;
  ring.name = 'bossring0';
  group.add(ring);

  return { group, materials: collectMaterials(group), hitRadius: 2.15, hitOffset: 0, baseScale: 1.15 };
}

function buildTitan(): Built {
  const group = new THREE.Group();
  const armor = mat(0x3d2d63, 0x9a6bff, 0.25, 0.8, 0.35);
  const gold = mat(0xb88a35, 0xffc247, 0.45, 0.8, 0.3);
  const skin = mat(0x7c5aa8, 0xc08bff, 0.2, 0.4, 0.5);
  const core = glowMat(0xc08bff, 1);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 1.5, 12), armor);
  torso.position.y = 0.35;
  group.add(torso);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), core);
  chest.position.set(0, 0.45, 0.72);
  group.add(chest);
  addGlow(group, 0xc08bff, 1.3, new THREE.Vector3(0, 0.45, 0.78), 0.35);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), skin);
  head.position.y = 1.4;
  group.add(head);

  const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.32, 12), gold);
  helmet.position.y = 1.68;
  group.add(helmet);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), core);
    eye.position.set(side * 0.18, 1.45, 0.4);
    group.add(eye);
    addGlow(group, 0xc08bff, 0.35, new THREE.Vector3(side * 0.18, 1.45, 0.45), 0.4);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), armor);
    shoulder.position.set(side * 0.9, 0.85, 0);
    group.add(shoulder);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.85, 4, 8), skin);
    arm.position.set(side * 1.02, 0.15, 0.05);
    arm.rotation.z = side * 0.12;
    group.add(arm);

    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.8, 4, 8), armor);
    leg.position.set(side * 0.34, -0.85, 0);
    group.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.75), gold);
    boot.position.set(side * 0.34, -1.36, 0.15);
    group.add(boot);
  }

  const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.65), gold);
  gauntlet.position.set(-1.05, 0.0, 0.25);
  group.add(gauntlet);
  for (let i = 0; i < 3; i++) {
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), core);
    gem.position.set(-1.05, 0.15 - i * 0.12, 0.58);
    group.add(gem);
  }

  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.04, 6, 72), glowMat(0x9a6bff, 0.35));
  ring.rotation.x = Math.PI / 2;
  ring.name = 'bossring0';
  group.add(ring);

  return { group, materials: collectMaterials(group), hitRadius: 2.9, hitOffset: 0, baseScale: 1 };
}

function buildWarlord(): Built {
  const group = new THREE.Group();
  const skin = mat(0xb98a63, 0x000000, 0, 0.2, 0.6);
  const uniform = mat(0x9a1d2e, 0xff3b5c, 0.3, 0.55, 0.4);
  const dark = mat(0x19141a, 0x000000, 0, 0.5, 0.5);
  const gold = mat(0xc89a3e, 0xffc247, 0.5, 0.8, 0.3);
  const glow = glowMat(0xff5a7a, 0.9);

  addGroundShadow(group, 0.8, 0.3);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.45), uniform);
  torso.position.y = 1.35;
  group.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.12, 0.48), dark);
  belt.position.y = 0.9;
  group.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), skin);
  head.position.y = 2.0;
  group.add(head);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.48), uniform);
  cap.position.y = 2.26;
  group.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.22), dark);
  brim.position.set(0, 2.18, 0.26);
  group.add(brim);

  const emblem = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 5), gold);
  emblem.position.set(0, 2.27, 0.25);
  group.add(emblem);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), glow);
    eye.position.set(side * 0.11, 2.03, 0.27);
    group.add(eye);
    addGlow(group, 0xff5a7a, 0.2, new THREE.Vector3(side * 0.11, 2.03, 0.3), 0.35);

    const epaulette = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.3), gold);
    epaulette.position.set(side * 0.5, 1.76, 0);
    group.add(epaulette);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.65, 4, 8), uniform);
    arm.position.set(side * 0.58, 1.25, 0);
    arm.rotation.z = side * 0.14;
    group.add(arm);

    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glow);
    fist.position.set(side * 0.66, 0.85, 0.05);
    group.add(fist);
    addGlow(group, 0xff5a7a, 0.55, new THREE.Vector3(side * 0.66, 0.85, 0.08), 0.45);

    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.34), dark);
    leg.position.set(side * 0.22, 0.48, 0);
    group.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.55), dark);
    boot.position.set(side * 0.22, 0.06, 0.12);
    group.add(boot);
  }

  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.06), uniform);
  cape.position.set(0, 1.15, -0.32);
  cape.rotation.x = -0.12;
  group.add(cape);

  const aura = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.018, 6, 48), glowMat(0xff3b5c, 0.4));
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.03;
  group.add(aura);

  return { group, materials: collectMaterials(group), hitRadius: 1.4, hitOffset: 1.2, baseScale: 1.2 };
}

function buildJailer(color = 0xff2f6d, accent = 0x43f3ff): Built {  const group = new THREE.Group();
  const dark = mat(0x120d17, color, 0.12, 0.9, 0.3);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), mat(color, color, 2.2, 0.3, 0.25));
  group.add(core);

  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 0), dark);
  shell.scale.set(1, 0.72, 1);
  group.add(shell);

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4 + i * 0.55, 0.055, 6, 64), glowMat(i === 1 ? accent : color, 0.8));
    ring.rotation.x = Math.PI / 2 + i * 0.5;
    ring.rotation.y = i * 0.4;
    ring.name = `bossring${i}`;
    group.add(ring);
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.2, 4), dark);
    spike.position.set(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6);
    spike.rotation.z = Math.PI / 2;
    spike.rotation.y = -a;
    group.add(spike);
  }

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), glowMat(0xffffff, 1));
  eye.position.y = 2.05;
  group.add(eye);
  addGlow(group, color, 2.8, new THREE.Vector3(0, 0.1, 0), 0.22);
  addGlow(group, 0xffffff, 0.5, new THREE.Vector3(0, 2.05, 0), 0.55);

  return { group, materials: collectMaterials(group), hitRadius: 2.5, hitOffset: 0, baseScale: 1 };
}

function buildAureole(): Built {
  const group = new THREE.Group();
  const color = 0x43f3ff;

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 16), mat(0x0b2230, color, 2.4, 0.3, 0.2));
  group.add(core);

  const inner = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 10, 64), glowMat(color, 0.9));
  inner.rotation.x = Math.PI / 2;
  inner.name = 'bossring0';
  group.add(inner);

  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 + i * 0.42, 0.05, 8, 80), glowMat(i % 2 === 0 ? color : 0x9dffdf, 0.75));
    ring.rotation.x = Math.PI / 2 + (i - 1.5) * 0.34;
    ring.rotation.y = i * 0.5;
    ring.name = `bossring${i + 1}`;
    group.add(ring);
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glowMat(0xffffff, 1));
    node.position.set(Math.cos(a) * 2.2, Math.sin(a * 2) * 0.25, Math.sin(a) * 2.2);
    group.add(node);
  }
  addGlow(group, 0x43f3ff, 3.2, new THREE.Vector3(0, 0, 0), 0.25);

  return { group, materials: collectMaterials(group), hitRadius: 2.8, hitOffset: 0, baseScale: 1 };
}

function buildMothership(color = 0x57ffa8, accent = 0xff2fa8): Built {
  const group = new THREE.Group();
  const hull = mat(0x0e1a16, color, 0.08, 0.95, 0.25);

  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3.2, 0.6, 32), hull);
  group.add(saucer);

  const bottom = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.3, 24), hull);
  bottom.position.y = -0.9;
  bottom.rotation.x = Math.PI;
  group.add(bottom);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x11382b, color, 1.3, 0.2, 0.15));
  dome.position.y = 0.28;
  dome.scale.y = 0.85;
  group.add(dome);

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6 + i * 0.5, 0.045, 6, 64), glowMat(i === 1 ? 0x43f3ff : color, 0.7));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1 * i;
    ring.name = `bossring${i}`;
    group.add(ring);
  }

  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), glowMat(i % 2 === 0 ? color : accent, 1));
    light.position.set(Math.cos(a) * 2.95, -0.15, Math.sin(a) * 2.95);
    group.add(light);
  }

  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(2.1, 3.2, 24, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  beam.position.y = -2.2;
  beam.rotation.x = Math.PI;
  group.add(beam);
  addGlow(group, color, 3.4, new THREE.Vector3(0, 0.2, 0), 0.18);

  return { group, materials: collectMaterials(group), hitRadius: 3.25, hitOffset: 0, baseScale: 1 };
}

function buildHive(): Built {
  const built = buildZombie(0x9b63c9, 0x1d1028, 1, true);
  // Recolor the queen's eyes to acid green.
  built.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) {
      if (mesh.material.emissive.getHex() === 0xff2f4d) {
        mesh.material.emissive.setHex(0x9dff5c);
        mesh.material.emissiveIntensity = 3;
      }
    }
  });
  built.hitRadius = 2.2;
  built.hitOffset = 2.1;
  return built;
}

// ────────────────────────────── Projectiles ──────────────────────────────

interface Projectile {
  mesh: THREE.Mesh;
  glow: THREE.Sprite;
  material: THREE.MeshBasicMaterial;
  glowMaterial: THREE.SpriteMaterial;
  velocity: THREE.Vector3;
  life: number;
  ttl: number;
  damage: number;
  radius: number;
  active: boolean;
}

class ProjectilePool {
  private items: Projectile[] = [];
  private glowTex = makeGlowTexture();
  private readonly poolSize = 90;

  constructor(parent: THREE.Object3D) {
    const geo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < this.poolSize; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xff2fa8,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, material);
      mesh.visible = false;
      mesh.frustumCulled = false;

      const glowMaterial = new THREE.SpriteMaterial({
        map: this.glowTex,
        color: 0xff2fa8,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Sprite(glowMaterial);
      glow.scale.setScalar(0.75);
      mesh.add(glow);

      parent.add(mesh);
      this.items.push({
        mesh,
        glow,
        material,
        glowMaterial,
        velocity: new THREE.Vector3(),
        life: 0,
        ttl: 7,
        damage: 8,
        radius: 0.14,
        active: false,
      });
    }
  }

  fire(origin: THREE.Vector3, direction: THREE.Vector3, speed: number, damage: number, color: number, radius = 0.14): void {
    const item = this.items.find((p) => !p.active);
    if (!item) return;
    item.active = true;
    item.mesh.visible = true;
    item.mesh.position.copy(origin);
    item.mesh.scale.setScalar(radius);
    item.material.color.setHex(color);
    item.material.opacity = 0.95;
    item.glowMaterial.color.setHex(color);
    item.glow.scale.setScalar(radius * 3.1);
    item.velocity.copy(direction).normalize().multiplyScalar(speed);
    item.life = 0;
    item.ttl = 7;
    item.damage = damage;
    item.radius = radius;
  }

  update(dt: number, ctx: CombatContext): void {
    const playerPos = ctx.player.pos;
    for (const item of this.items) {
      if (!item.active) continue;
      item.life += dt;
      item.mesh.position.addScaledVector(item.velocity, dt);
      const pulse = 1 + Math.sin(item.life * 22) * 0.14;
      item.glow.scale.setScalar(item.radius * 3.1 * pulse);

      const pos = item.mesh.position;
      let remove = item.life > item.ttl;
      let hitPlayer = false;

      if (!remove) {
        const dx = pos.x - playerPos.x;
        const dy = pos.y - playerPos.y;
        const dz = pos.z - playerPos.z;
        const r = 0.56 + item.radius;
        if (dx * dx + dy * dy + dz * dz < r * r) {
          hitPlayer = true;
          remove = true;
        }
      }

      if (!remove) {
        if (pos.y < 0.06) {
          remove = true;
          ctx.fx.burst(pos, item.material.color.getHex(), 6, 3, 0.32);
          ctx.fx.ring(new THREE.Vector3(pos.x, 0.06, pos.z), item.material.color.getHex(), 0.9, 0.28);
        } else if (
          !ctx.arena.freeRoam &&
          pos.y < 3.1 &&
          Math.hypot(pos.x, pos.z) < ctx.arena.radius + 1 &&
          ctx.arena.isInsideObstacle(pos.x, pos.z)
        ) {
          remove = true;
          ctx.fx.burst(pos, item.material.color.getHex(), 5, 3, 0.3);
        } else if (!ctx.arena.freeRoam && Math.hypot(pos.x, pos.z) > ctx.arena.radius + 2) {
          remove = true;
        } else if (ctx.arena.freeRoam && Math.hypot(pos.x - playerPos.x, pos.z - playerPos.z) > 35) {
          remove = true;
        }
      }

      if (hitPlayer) {
        ctx.damagePlayer(item.damage, pos.clone());
        ctx.fx.burst(pos, 0xff5577, 14, 5, 0.5);
        ctx.fx.ring(pos.clone(), 0xff5577, 1.2, 0.3);
      }

      if (remove) {
        item.active = false;
        item.mesh.visible = false;
      }
    }
  }

  clear(): void {
    for (const item of this.items) {
      item.active = false;
      item.mesh.visible = false;
    }
  }
}

// ────────────────────────────── Enemy ──────────────────────────────

const UP = new THREE.Vector3(0, 1, 0);

export class Enemy {
  readonly kind: EnemyKind;
  readonly stats: EnemyStats;
  readonly group: THREE.Group;
  readonly isBoss: boolean;
  readonly name: string;

  hp: number;
  maxHp: number;
  dead = false;
  spawnT = 0;
  hitFlash = 0;
  age = 0;

  private attackTimer = 1.4 + Math.random() * 1.8;
  private specialTimer = 2 + Math.random() * 1.5;
  private contactTimer = 0;
  private summonTimer = 6;
  private summonedPhases = new Set<number>();
  private materials: THREE.MeshStandardMaterial[] = [];
  private baseEmissives: THREE.Color[] = [];
  private baseIntensities: number[] = [];
  private flashing = false;
  private orbitDirection = Math.random() < 0.5 ? 1 : -1;
  private baseScale: number;
  private hoverHeight: number;
  private speedMult = 1;
  private localHitRadius: number;
  private localHitOffset: number;
  private limbs?: ZombieLimbs;
  private groundShadow: THREE.Mesh | null = null;
  private spin = 0;
  private glbRig?: GlbRig;
  private moveSpeed = 0;
  public deathT = 0;
  public impacted = false;
  private fallVelocity = 0;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();

  constructor(kind: EnemyKind, wave: number, position: THREE.Vector3, scaleMul = 1) {
    this.kind = kind;
    this.stats = STATS[kind];
    this.name = this.stats.name;
    this.isBoss = this.stats.isBoss;

    const built = this.buildModel(kind);
    this.group = built.group;
    this.limbs = (built as Built & { limbs?: ZombieLimbs }).limbs;
    this.glbRig = built.glb;
    this.materials = built.materials;
    this.localHitRadius = Math.max(built.hitRadius, this.stats.hitRadius * 0.9);
    this.localHitOffset = built.hitOffset;
    this.baseScale = built.baseScale * scaleMul;
    this.hoverHeight = this.stats.hover * scaleMul;

    const cfg = currentDifficulty();
    this.speedMult = cfg.speed;
    const difficulty = this.isBoss
      ? 1 + Math.max(0, wave - 5) * 0.055
      : 1 + Math.max(0, wave - 1) * 0.13;
    this.maxHp = Math.round(this.stats.hp * difficulty * (this.isBoss ? cfg.bossHp : cfg.hp));
    this.hp = this.maxHp;

    this.group.position.copy(position);
    if (this.hoverHeight > 0) this.group.position.y = this.hoverHeight;
    this.group.scale.setScalar(0.01);

    if (this.hoverHeight > 0) {
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(0.55, this.localHitRadius * 1.05), 24),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.name = 'air-shadow';
      shadow.renderOrder = 1;
      this.group.add(shadow);
      this.groundShadow = shadow;
    }

    for (const material of this.materials) {
      this.baseEmissives.push(material.emissive.clone());
      this.baseIntensities.push(material.emissiveIntensity);
    }
  }

  private buildModel(kind: EnemyKind): Built {
    switch (kind) {
      case 'drone': return buildDrone(this.stats.color);
      case 'ufo': return buildUfo(this.stats.color);
      case 'zombie':
        return buildGlbModel('zombie', 1.78) ?? buildZombie(0x6f9c5c, 0x2a2438);
      case 'brute':
        return buildGlbModel('zombie', 2.15, 0xb5793f) ?? buildZombie(0xb5793f, 0x33221d, 1.55);
      case 'alien':
        return buildGlbModel('alien', 1.92) ?? buildAlien();
      case 'raptor':
        return buildGlbModel('raptor', 1.62) ?? buildDino(false);
      case 'imp': return buildImp();
      case 'gingerbread': return buildGingerbread();
      case 'spire': return buildSpire();
      case 'banshee': return buildBanshee();
      case 'scarecrow': return buildScarecrow();
      case 'mummy': return buildMummy();
      case 'pumpkin': return buildPumpkin();
      case 'wendigo': return buildWendigo();
      case 'helicopter': return buildHelicopter();
      case 'jet': return buildJet();
      case 'striker': return buildGlbModel('shipStriker', 5.0, undefined, 1.8, 'longest', false) ?? buildJet();
      case 'omen': return buildGlbModel('shipOmen', 4.6, undefined, 2.2, 'longest', false) ?? buildMothership(0x8f5cff, 0x43f3ff);
      case 'phantom': return buildGlbModel('phantom', 1.8, undefined, 0.8) ?? buildBanshee();
      case 'hexer': return buildGlbModel('hexerRpg', 1.9, undefined, 0.8) ?? buildScarecrow();
      case 'yeti': return buildGlbModel('yeti', 2.25, undefined, 1.0) ?? buildWendigo();
      case 'voidling': return buildVoidling();
      case 'demon': return buildDemon();
      case 'mech':
        return buildGlbModel('robot', 2.06) ?? buildMech();
      case 'rex':
        return buildGlbModel('trex', 3.15, undefined, 1.9) ?? buildDino(true);
      case 'jester': return buildJester();
      case 'titan': return buildTitan();
      case 'warlord': return buildWarlord();
      case 'jailer': return buildJailer();
      case 'rainmaker': return buildMothership(0x57ffa8, 0xff2fa8);
      case 'aureole': return buildAureole();
      case 'brood': return buildHive();
      case 'mirrored': return buildJailer(0xffc247, 0xffd76e);
      case 'umbra': return buildJailer(0x8f7dff, 0x6b4dff);
      case 'collector': return buildMothership(0xffc247, 0x43f3ff);
    }
  }

  get worldHitRadius(): number {
    return this.localHitRadius * this.group.scale.x;
  }

  get deathDuration(): number {
    if (this.glbRig) return 1.15;
    if (this.hoverHeight > 0) return 1.9;
    return 0;
  }

  hitCenter(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.group.position).addScaledVector(UP, this.localHitOffset * this.group.scale.y);
  }

  takeDamage(amount: number): boolean {
    if (this.dead) return false;
    this.hp -= amount;
    this.hitFlash = 0.09;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.deathT = 0;
      this.fallVelocity = 0.25;
      if (this.groundShadow) this.groundShadow.visible = false;
      this.playGlbClip('death', 0.08, true);
      return true;
    }
    return false;
  }

  update(dt: number, ctx: CombatContext, manager: EnemyManager): void {
    if (this.dead) return;

    const adt = dt * ctx.freezeFactor;
    this.age += adt;
    this.spin += adt;
    const prevX = this.group.position.x;
    const prevZ = this.group.position.z;

    if (this.spawnT < 1) {
      this.spawnT = Math.min(1, this.spawnT + dt * 2.6);
      const ease = 1 - Math.pow(1 - this.spawnT, 3);
      this.group.scale.setScalar(this.baseScale * (0.02 + 0.98 * ease));
    }

    // Hit flash.
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.flashing = true;
      for (const material of this.materials) {
        material.emissive.setHex(0xffffff);
        material.emissiveIntensity = 1.6;
      }
    } else if (this.flashing) {
      this.flashing = false;
      for (let i = 0; i < this.materials.length; i++) {
        this.materials[i].emissive.copy(this.baseEmissives[i]);
        this.materials[i].emissiveIntensity = this.baseIntensities[i];
      }
    }

    this.attackTimer -= adt;
    this.specialTimer -= adt;
    this.contactTimer -= adt;
    this.summonTimer -= adt;

    switch (this.kind) {
      case 'drone':
        this.updateFlyer(adt, ctx, 10.5, 0.7);
        this.shootAtPlayer(ctx, manager, 11.5, 5, 3.0, 0.025);
        break;
      case 'ufo':
        this.updateFlyer(adt, ctx, 8.5, 1.1);
        this.shootAtPlayer(ctx, manager, 10, 6, 3.1, 0.02, 3);
        break;
      case 'zombie':
        this.updateWalker(adt, ctx, 1.3);
        break;
      case 'brute':
        this.updateWalker(adt, ctx, 1.8);
        break;
      case 'alien':
        this.updateWalker(adt, ctx, 0.95);
        this.shootAtPlayer(ctx, manager, 9, 4, 4.2, 0.03);
        break;
      case 'raptor':
        this.updateWalker(adt, ctx, 1.0);
        break;
      case 'imp':
        this.updateWalker(adt, ctx, 3.0);
        this.shootAtPlayer(ctx, manager, 8, 4, 3.6, 0.03);
        break;
      case 'gingerbread':
        this.updateWalker(adt, ctx, 1.5);
        this.shootAtPlayer(ctx, manager, 7.2, 5, 3.4, 0.035);
        break;
      case 'spire':
        this.updateWalker(adt, ctx, 3.5);
        this.updateSpire(ctx, manager);
        break;
      case 'banshee':
        this.updateFlyer(adt, ctx, 8.5, 0.8);
        this.shootAtPlayer(ctx, manager, 9, 7, 3.8, 0.03);
        break;
      case 'scarecrow':
        this.updateWalker(adt, ctx, 2.2);
        this.shootAtPlayer(ctx, manager, 8, 6, 3.6, 0.04);
        break;
      case 'mummy':
        this.updateWalker(adt, ctx, 1.1);
        break;
      case 'pumpkin':
        this.updateFlyer(adt, ctx, 7.5, 0.7);
        this.shootAtPlayer(ctx, manager, 8.5, 6, 3.3, 0.035, 2);
        break;
      case 'wendigo':
        this.updateWalker(adt, ctx, 1.0);
        break;
      case 'helicopter':
        this.updateFlyer(adt, ctx, 9.5, 0.7);
        this.shootAtPlayer(ctx, manager, 8, 8, 3.1, 0.03, 2);
        break;
      case 'jet':
        this.updateFlyer(adt, ctx, 11.5, 1.7);
        this.shootAtPlayer(ctx, manager, 12, 5, 2.2, 0.022, 2);
        break;
      case 'striker':
        this.updateFlyer(adt, ctx, 10, 1.0);
        this.shootAtPlayer(ctx, manager, 10, 7, 2.7, 0.026, 3);
        break;
      case 'omen':
        this.updateFlyer(adt, ctx, 12, 0.5, true);
        this.updateOmen(ctx, manager);
        break;
      case 'phantom':
        this.updateFlyer(adt, ctx, 8, 0.9);
        this.shootAtPlayer(ctx, manager, 9, 6, 3.4, 0.03);
        break;
      case 'hexer':
        this.updateWalker(adt, ctx, 2.3);
        this.shootAtPlayer(ctx, manager, 8.5, 6, 3.6, 0.035);
        break;
      case 'yeti':
        this.updateWalker(adt, ctx, 1.0);
        break;
      case 'voidling':
        this.updateWalker(adt, ctx, 1.0);
        break;
      case 'demon':
        this.updateWalker(adt, ctx, 1.6);
        this.shootAtPlayer(ctx, manager, 9, 6, 3.8, 0.02);
        break;
      case 'mech':
        this.updateWalker(adt, ctx, 4.5);
        this.shootAtPlayer(ctx, manager, 12, 7, 2.8, 0.02, 3);
        break;
      case 'jailer':
        this.updateFlyer(adt, ctx, 12, 0.4, true);
        this.updateJailer(ctx, manager);
        break;
      case 'rainmaker':
        this.updateFlyer(adt, ctx, 14, 0.35, true);
        this.updateRainmaker(ctx, manager);
        break;
      case 'aureole':
        this.updateFlyer(adt, ctx, 10.5, 0.7, true);
        this.updateAureole(ctx, manager);
        break;
      case 'brood':
        this.updateBrood(ctx, manager, adt);
        break;
      case 'mirrored':
        this.updateFlyer(adt, ctx, 8.5, 1.5, true);
        this.updateMirrored(ctx, manager);
        break;
      case 'umbra':
        this.updateFlyer(adt, ctx, 7.5, 2.0, true);
        this.updateUmbra(ctx, manager);
        break;
      case 'collector':
        this.updateFlyer(adt, ctx, 13, 0.4, true);
        this.updateCollector(ctx, manager);
        break;
      case 'rex':
        this.updateWalker(adt, ctx, 2.6);
        this.updateRex(ctx, manager);
        break;
      case 'jester':
        this.updateFlyer(adt, ctx, 9.5, 0.8, true);
        this.updateJester(ctx, manager);
        break;
      case 'titan':
        this.updateFlyer(adt, ctx, 13, 0.4, true);
        this.updateTitan(ctx, manager);
        break;
      case 'warlord':
        this.updateWalker(adt, ctx, 1.8);
        this.updateWarlord(ctx, manager);
        break;
    }

    this.moveSpeed = Math.hypot(this.group.position.x - prevX, this.group.position.z - prevZ) / Math.max(0.0001, adt);
    this.animate(adt);

    if (this.hoverHeight > 0) {
      this.group.position.y = this.hoverHeight + Math.sin(this.age * 1.4 + this.group.position.x) * 0.28 * this.group.scale.x;
    }
    if (this.groundShadow) {
      this.groundShadow.position.y = -(this.group.position.y - 0.02) / Math.max(0.0001, this.group.scale.y);
    }
  }

  private updateFlyer(dt: number, ctx: CombatContext, desiredRadius: number, speedScale: number, boss = false): void {
    const toPlayer = this.tmp.copy(ctx.player.pos).sub(this.group.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();
    if (distance < 0.001) return;
    toPlayer.divideScalar(distance);

    // Tangent strafe around the player.
    const tangent = this.tmp2.set(-toPlayer.z, 0, toPlayer.x).multiplyScalar(this.orbitDirection);
    const radial = (distance - desiredRadius) / Math.max(desiredRadius, 1);
    const speed = this.stats.speed * speedScale * this.speedMult * (boss ? 1 : 1 + Math.sin(this.age * 0.8 + 1.3) * 0.18);

    this.group.position.addScaledVector(tangent, speed * dt);
    this.group.position.addScaledVector(toPlayer, radial * speed * dt * 1.4);
    this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

    const horizontal = Math.hypot(this.group.position.x, this.group.position.z);
    const limit = ctx.arena.radius - (boss ? 3 : 3.5);
    if (!ctx.arena.freeRoam && horizontal > limit) {
      this.group.position.x = (this.group.position.x / horizontal) * limit;
      this.group.position.z = (this.group.position.z / horizontal) * limit;
    }
  }

  private updateWalker(dt: number, ctx: CombatContext, stopRange: number): void {
    const dx = ctx.player.pos.x - this.group.position.x;
    const dz = ctx.player.pos.z - this.group.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.0001) return;

    const dirX = dx / distance;
    const dirZ = dz / distance;
    const shamble = 0.78 + Math.sin(this.age * 7 + this.group.position.x) * 0.22;
    const speed = this.stats.speed * this.speedMult * (this.kind === 'zombie' ? shamble : 1);

    if (distance > stopRange) {
      this.group.position.x += dirX * speed * dt;
      this.group.position.z += dirZ * speed * dt;
    }

    this.group.rotation.y = Math.atan2(dirX, dirZ);
    ctx.arena.resolveCollision(this.group.position, 0.6);

    if (distance < 2 + this.worldHitRadius && this.contactTimer <= 0) {
      this.contactTimer = 1.6;
      this.playAttack();
      ctx.enemyVoice?.(this.kind, 'attack', this.group.position);
      ctx.damagePlayer(this.stats.contact, this.group.position.clone().add(new THREE.Vector3(0, 1, 0)));
      ctx.fx.burst(this.group.position.clone().add(new THREE.Vector3(0, 1.1, 0)), 0xff3355, 8, 4, 0.35);
    }
  }

  private updateOmen(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.55) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 3.4;
      this.radialBarrage(ctx, manager, 14, 8, 8, 0.17);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 2.6;
      this.fireAimed(ctx, manager, 3, 10, 7, 0.02, 0.2);
    }
  }

  private updateSpire(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.6) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 4.2;
      this.radialBarrage(ctx, manager, 10, 7.5, 9, 0.2);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 5.5;
      this.fireAimed(ctx, manager, 2, 10, 8, 0.03);
    }
  }

  private updateJailer(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.55) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 3.1;
      this.radialBarrage(ctx, manager, 12, 9.5, 8, 0.16);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 2.2;
      this.fireAimed(ctx, manager, 3, 12, 7, 0.02, 0.22);
    }
  }

  private updateRainmaker(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.55) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 3.7;
      this.radialBarrage(ctx, manager, 16, 8.5, 8, 0.17);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 2.6;
      this.fireAimed(ctx, manager, 4, 10, 7, 0.015, 0.2);
    }

    if (this.hp / this.maxHp <= 0.5 && !this.summonedPhases.has(50)) {
      this.summonedPhases.add(50);
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const at = this.group.position.clone().add(new THREE.Vector3(Math.cos(angle) * 4, -2.2, Math.sin(angle) * 4));
        at.y = 0;
        ctx.summon('ufo', at);
      }
      this.fxRing(ctx, 0x57ffa8, 7);
      ctx.playSpatial('boss', this.group.position, 1);
    }
  }

  private updateAureole(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.55) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 2.9;
      this.radialBarrage(ctx, manager, 12, 9, 7, 0.15);
      this.radialBarrage(ctx, manager, 12, 6.8, 7, 0.13);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 2.1;
      this.fireAimed(ctx, manager, 5, 12, 7, 0.008, 0.16);
    }
  }

  private updateMirrored(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.5) return;
    if (this.specialTimer <= 0) {
      this.specialTimer = 1.15;
      this.fireAimed(ctx, manager, 4, 14, 7, 0.02, 0.18);
    }
    if (this.attackTimer <= 0) {
      this.attackTimer = 4.2;
      this.radialBarrage(ctx, manager, 10, 8, 7, 0.16);
    }
  }

  private updateUmbra(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.45) return;
    if (this.specialTimer <= 0) {
      this.specialTimer = 0.95;
      this.fireAimed(ctx, manager, 3, 16, 7, 0.012, 0.12);
    }
  }

  private updateCollector(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.55) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 3.4;
      this.radialBarrage(ctx, manager, 12, 8, 8, 0.17);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 6.2;
      const angle = Math.random() * Math.PI * 2;
      const at = this.group.position.clone().add(new THREE.Vector3(Math.cos(angle) * 4, -2, Math.sin(angle) * 4));
      at.y = 0;
      ctx.summon('ufo', at);
      this.fxRing(ctx, 0xffc247, 5.5);
      ctx.playSpatial('boss', this.group.position, 1);
    }
  }

  private updateRex(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.55) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 4.3;
      this.radialBarrage(ctx, manager, 14, 8, 9, 0.2);
      this.fxRing(ctx, 0xffc247, 7.5);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 2.6;
      this.fireAimed(ctx, manager, 3, 11, 10, 0.02, 0.22);
    }
  }

  private updateJester(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.45) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 2.9;
      this.radialBarrage(ctx, manager, 12, 7, 7, 0.16);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 1.8;
      this.fireAimed(ctx, manager, 3, 10, 8, 0.04, 0.35);
    }

    const ratio = this.hp / this.maxHp;
    for (const threshold of [0.66, 0.33]) {
      if (ratio <= threshold && !this.summonedPhases.has(threshold)) {
        this.summonedPhases.add(threshold);
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          const at = this.group.position.clone().add(new THREE.Vector3(Math.cos(angle) * 3.5, -3, Math.sin(angle) * 3.5));
          at.y = 0;
          ctx.summon('imp', at);
        }
        this.fxRing(ctx, 0xff2fa8, 5);
        ctx.playSpatial('boss', this.group.position, 1);
      }
    }
  }

  private updateTitan(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.5) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 3.5;
      this.radialBarrage(ctx, manager, 18, 8.5, 9, 0.18);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 2.2;
      this.fireAimed(ctx, manager, 5, 11, 9, 0.01, 0.16);
    }

    if (this.hp / this.maxHp <= 0.5 && !this.summonedPhases.has(50)) {
      this.summonedPhases.add(50);
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const at = this.group.position.clone().add(new THREE.Vector3(Math.cos(angle) * 4, -3, Math.sin(angle) * 4));
        at.y = 0;
        ctx.summon('voidling', at);
      }
      this.fxRing(ctx, 0x9a6bff, 6.5);
      ctx.playSpatial('boss', this.group.position, 1);
    }
  }

  private updateWarlord(ctx: CombatContext, manager: EnemyManager): void {
    if (this.spawnT < 0.5) return;
    if (this.attackTimer <= 0) {
      this.attackTimer = 2.8;
      this.fireAimed(ctx, manager, 4, 14, 8, 0.02, 0.22);
    }
    if (this.specialTimer <= 0) {
      this.specialTimer = 4.2;
      this.radialBarrage(ctx, manager, 12, 8, 8, 0.18);
    }
  }

  private updateBrood(ctx: CombatContext, manager: EnemyManager, dt: number): void {
    const dx = ctx.player.pos.x - this.group.position.x;
    const dz = ctx.player.pos.z - this.group.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001 && distance > 7) {
      this.group.position.x += (dx / distance) * this.stats.speed * this.speedMult * dt;
      this.group.position.z += (dz / distance) * this.stats.speed * this.speedMult * dt;
    }
    this.group.rotation.y = Math.atan2(dx, dz);
    ctx.arena.resolveCollision(this.group.position, 1.4);

    if (distance < 4.2 && this.contactTimer <= 0) {
      this.contactTimer = 1.8;
      ctx.damagePlayer(this.stats.contact, this.group.position.clone().add(new THREE.Vector3(0, 2, 0)));
    }

    if (this.summonTimer <= 0 && this.spawnT >= 0.9) {
      this.summonTimer = 6.5;
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const at = this.group.position.clone().add(new THREE.Vector3(Math.cos(angle) * 3.5, 0.2, Math.sin(angle) * 3.5));
        at.y = 0;
        ctx.summon('zombie', at);
      }
      this.fxRing(ctx, 0xb45cff, 5.5);
      ctx.playSpatial('boss', this.group.position, 1);
    }

    if (this.attackTimer <= 0) {
      this.attackTimer = 4.4;
      this.radialBarrage(ctx, manager, 8, 7, 7, 0.15);
    }
  }

  private fxRing(ctx: CombatContext, color: number, size: number): void {
    ctx.fx.ring(this.group.position.clone(), color, size, 0.7);
  }

  private fireAimed(
    ctx: CombatContext,
    manager: EnemyManager,
    count: number,
    speed: number,
    damage: number,
    spread: number,
    fan = 0,
  ): void {
    const origin = this.group.position.clone();
    origin.y += this.localHitOffset * this.group.scale.y;
    const base = new THREE.Vector3().subVectors(ctx.player.pos, origin).normalize();

    for (let i = 0; i < count; i++) {
      const dir = base.clone();
      if (fan > 0) dir.applyAxisAngle(UP, (i - (count - 1) / 2) * fan);
      dir.x += (Math.random() - 0.5) * spread;
      dir.y += (Math.random() - 0.5) * spread;
      dir.z += (Math.random() - 0.5) * spread;
      dir.normalize();
      manager.fireProjectile(origin, dir, speed, damage, this.stats.projectileColor, this.isBoss ? 0.24 : 0.14);
    }
    ctx.playSpatial('enemyShot', origin, 1);
  }

  private shootAtPlayer(
    ctx: CombatContext,
    manager: EnemyManager,
    speed: number,
    damage: number,
    interval: number,
    spread: number,
    count = 1,
  ): void {
    if (this.attackTimer > 0 || this.spawnT < 0.7) return;
    this.attackTimer = interval + Math.random() * 0.9;
    this.playAttack();
    this.fireAimed(ctx, manager, count, speed, damage, spread, count > 1 ? 0.16 : 0);
  }

  private radialBarrage(ctx: CombatContext, manager: EnemyManager, count: number, speed: number, damage: number, radius: number): void {
    const origin = this.group.position.clone();
    origin.y += this.localHitOffset * this.group.scale.y;
    const base = new THREE.Vector3().subVectors(ctx.player.pos, origin).normalize();
    for (let i = 0; i < count; i++) {
      const dir = base.clone().applyAxisAngle(UP, (i / count) * Math.PI * 2 + this.age * 0.2);
      dir.y += (Math.random() - 0.5) * 0.06;
      dir.normalize();
      manager.fireProjectile(origin, dir, speed, damage, this.stats.projectileColor, radius);
    }
    ctx.playSpatial('enemyShot', origin, 1);
    ctx.enemyVoice?.(this.kind, 'attack', origin);
    ctx.fx.ring(this.group.position.clone(), this.stats.projectileColor, 3, 0.4);
  }

  updateDeath(dt: number): void {
    this.deathT += dt;
    if (this.glbRig) {
      this.glbRig.mixer.update(dt);
      if (this.deathT > 0.8) this.group.position.y -= dt * 0.22;
      return;
    }

    if (this.hoverHeight > 0) {
      const ground = 0.16;
      if (this.group.position.y > ground + 0.01) {
        this.fallVelocity -= 11.5 * dt;
        this.group.position.y = Math.max(ground, this.group.position.y + this.fallVelocity * dt);
        const spin = this.kind === 'drone' ? 5.4 : this.kind === 'ufo' ? 2.6 : 1.8;
        this.group.rotation.z += dt * spin;
        this.group.rotation.x += dt * spin * 0.55;
        this.group.position.x += (Math.random() - 0.5) * dt * 0.7;
        this.group.position.z += (Math.random() - 0.5) * dt * 0.7;
      } else {
        this.group.position.y = ground;
        if (!this.impacted) this.impacted = true;
        this.group.rotation.z += dt * 0.35;
        if (this.deathT > 1.45) this.group.scale.multiplyScalar(Math.max(0.01, 1 - dt * 1.4));
      }
      return;
    }

    this.group.scale.multiplyScalar(Math.max(0, 1 - dt * 5));
  }

  private playGlbClip(name: string, fade = 0.2, once = false): void {
    const rig = this.glbRig;
    if (!rig) return;
    const action = rig.actions[name];
    if (!action || rig.current === action) return;
    if (rig.current) rig.current.fadeOut(fade);
    action.reset();
    action.setEffectiveWeight(1);
    if (once) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    action.fadeIn(fade).play();
    rig.current = action;
    if (once) rig.lock = action.getClip().duration * 0.85;
  }

  private playAttack(): void {
    if (!this.glbRig) return;
    this.playGlbClip('attack', 0.08, true);
  }

  private animate(dt: number): void {
    if (this.glbRig) {
      this.glbRig.mixer.update(dt);
      if (this.glbRig.lock > 0) {
        this.glbRig.lock -= dt;
      } else {
        const desired = this.moveSpeed > 3 ? 'run' : this.moveSpeed > 0.25 ? 'walk' : 'idle';
        this.playGlbClip(desired, 0.22);
      }
    }
    if (this.kind === 'alien') {
      this.group.rotation.z = Math.sin(this.age * 9) * 0.09;
    }
    if (this.kind === 'imp') {
      this.group.rotation.z = Math.sin(this.age * 10) * 0.1;
    }
    if (this.kind === 'raptor') {
      this.group.rotation.z = Math.sin(this.age * 7) * 0.05;
    }
    if (this.kind === 'scarecrow') {
      this.group.rotation.z = Math.sin(this.age * 3.6) * 0.045;
    }
    if (this.kind === 'pumpkin') {
      this.group.rotation.z = Math.sin(this.age * 2.2) * 0.07;
    }
    if (this.kind === 'spire') {
      this.group.rotation.z = Math.sin(this.age * 1.2) * 0.02;
    }

    for (const child of this.group.children) {
      if (child.name === 'dino-tail') {
        child.rotation.z = Math.sin(this.age * 4.5) * 0.14;
      } else if (child.name === 'void-tendril') {
        child.rotation.y += dt * 1.8;
      } else if (child.name === 'demon-wing') {
        child.rotation.z += dt * 0.45;
      } else if (child.name === 'jester-hat') {
        child.rotation.y += dt * 0.6;
      } else if (child.name === 'jester-hand') {
        child.position.y = Math.sin(this.age * 2.8 + (child.position.x > 0 ? 0 : 1.4)) * 0.14;
      } else if (child.name === 'rotor') {
        child.rotation.y += dt * 19;
      } else if (child.name === 'drone-halo') {
        child.rotation.z += dt * 0.8;
      } else if (child.name === 'heli-rotor') {
        child.rotation.y += dt * 26;
      } else if (child.name === 'tail-rotor') {
        child.rotation.x += dt * 42;
      } else if (child.name === 'jet-flame') {
        child.scale.set(1 + Math.sin(this.age * 34) * 0.12, 1 + Math.sin(this.age * 27) * 0.18, 1);
      }
    }

    if (this.limbs) {
      const swing = this.kind === 'brood' ? 2.2 : 6.5;
      const speed = this.kind === 'brute' ? 0.6 : 1;
      if (this.kind !== 'brood') {
        this.limbs.leftLeg.rotation.x = Math.sin(this.age * swing) * 0.55 * speed;
        this.limbs.rightLeg.rotation.x = -Math.sin(this.age * swing) * 0.55 * speed;
        this.limbs.leftArm.rotation.x = -1.1 + Math.sin(this.age * swing) * 0.12;
        this.limbs.rightArm.rotation.x = -1.1 - Math.sin(this.age * swing) * 0.12;
      } else {
        this.limbs.leftArm.rotation.z = Math.sin(this.age * 1.4) * 0.18;
        this.limbs.rightArm.rotation.z = -Math.sin(this.age * 1.4) * 0.18;
      }
    }

    for (const child of this.group.children) {
      if (child.name === 'ring' || child.name === 'rim') child.rotation.z += dt * 2.4;
      else if (child.name === 'ring2') child.rotation.z -= dt * 3.2;
      else if (child.name.startsWith('bossring')) {
        child.rotation.z += dt * (0.5 + Number(child.name.slice(-1)) * 0.2);
        child.rotation.y += dt * 0.15;
      }
    }

    if (this.kind === 'ufo') {
      this.group.children[0].rotation.y += dt * 1.1;
    }
  }
}

// ────────────────────────────── Manager ──────────────────────────────

export class EnemyManager {
  readonly root = new THREE.Group();
  readonly enemies: Enemy[] = [];
  private projectiles: ProjectilePool;

  constructor(parent: THREE.Object3D, private onImpact?: (enemy: Enemy) => void) {
    parent.add(this.root);
    this.projectiles = new ProjectilePool(this.root);
  }

  spawn(kind: EnemyKind, wave: number, position: THREE.Vector3, scaleMul = 1): Enemy {
    const enemy = new Enemy(kind, wave, position, scaleMul);
    this.enemies.push(enemy);
    this.root.add(enemy.group);
    return enemy;
  }

  update(dt: number, ctx: CombatContext): void {
    for (const enemy of this.enemies) {
      if (!enemy.dead) enemy.update(dt, ctx, this);
      else {
        enemy.updateDeath(dt);
        if (enemy.impacted) {
          enemy.impacted = false;
          this.onImpact?.(enemy);
        }
      }
    }

    // Lightweight separation so the horde does not stack into one pixel.
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.dead) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.dead) continue;
        const dx = b.group.position.x - a.group.position.x;
        const dz = b.group.position.z - a.group.position.z;
        const dist = Math.hypot(dx, dz);
        const min = a.worldHitRadius + b.worldHitRadius;
        if (dist > 0.001 && dist < min) {
          const push = (min - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          a.group.position.x -= nx * push * 0.6;
          a.group.position.z -= nz * push * 0.6;
          b.group.position.x += nx * push * 0.6;
          b.group.position.z += nz * push * 0.6;
        }
      }
    }

    this.projectiles.update(dt, ctx);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.dead && enemy.deathT >= enemy.deathDuration) {
        this.root.remove(enemy.group);
        disposeGroup(enemy.group);
        this.enemies.splice(i, 1);
      }
    }
  }

  fireProjectile(origin: THREE.Vector3, direction: THREE.Vector3, speed: number, damage: number, color: number, radius: number): void {
    this.projectiles.fire(origin, direction, speed, damage, color, radius);
  }

  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number, piercing = false, radiusScale = 1): Array<{ enemy: Enemy; point: THREE.Vector3; distance: number }> {
    const hits: Array<{ enemy: Enemy; point: THREE.Vector3; distance: number }> = [];
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.spawnT < 0.3) continue;
      const center = enemy.hitCenter(new THREE.Vector3());
      const ox = center.x - origin.x;
      const oy = center.y - origin.y;
      const oz = center.z - origin.z;
      const t = ox * direction.x + oy * direction.y + oz * direction.z;
      if (t < 0 || t > maxDistance) continue;

      const px = origin.x + direction.x * t - center.x;
      const py = origin.y + direction.y * t - center.y;
      const pz = origin.z + direction.z * t - center.z;
      const distSq = px * px + py * py + pz * pz;
      const radius = enemy.worldHitRadius * radiusScale;
      if (distSq <= radius * radius) {
        hits.push({
          enemy,
          point: new THREE.Vector3(origin.x + direction.x * t, origin.y + direction.y * t, origin.z + direction.z * t),
          distance: t,
        });
      }
    }

    hits.sort((a, b) => a.distance - b.distance);
    if (!piercing) return hits.length > 0 ? [hits[0]] : [];
    return hits;
  }

  get boss(): Enemy | null {
    for (const enemy of this.enemies) {
      if (enemy.isBoss && !enemy.dead) return enemy;
    }
    return null;
  }

  get aliveCount(): number {
    let count = 0;
    for (const enemy of this.enemies) if (!enemy.dead) count++;
    return count;
  }

  clear(): void {
    for (const enemy of this.enemies) {
      this.root.remove(enemy.group);
      disposeGroup(enemy.group);
    }
    this.enemies.length = 0;
    this.projectiles.clear();
  }
}
