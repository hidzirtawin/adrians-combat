import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { AudioEngine } from './audio';
import { loadModel } from './assets';
import { GUN_VISUALS, createGunModel } from './gunModels';

export type WeaponId =
  | 'pulse' | 'viper' | 'arx' | 'scatter' | 'longshot' | 'rail'
  | 'vanguard' | 'warlord' | 'sentinel'
  | 'sidearm' | 'magnum' | 'wasp'
  | 'vector' | 'breacher' | 'vulcan'
  | 'ion' | 'plasma' | 'disruptor';

export type WeaponCategory = 'RIFLE' | 'SMG' | 'SHOTGUN' | 'PISTOL' | 'SNIPER' | 'LMG' | 'BLASTER';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  tag: string;
  role: string;
  category: WeaponCategory;
  desc: string;
  damage: number;
  pellets: number;
  spread: number;
  interval: number;
  mag: number;
  reload: number;
  range: number;
  auto: boolean;
  color: number;
  recoil: number;
  shake: number;
  pierce: boolean;
}

export const WEAPON_IDS: WeaponId[] = [
  'pulse', 'viper', 'arx', 'scatter', 'longshot', 'rail',
  'vanguard', 'warlord', 'sentinel',
  'sidearm', 'magnum', 'wasp',
  'vector', 'breacher', 'vulcan',
  'ion', 'plasma', 'disruptor',
];

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pulse: {
    id: 'pulse', name: 'PULSE RIFLE', tag: 'AUTO', role: 'BALANCED', category: 'RIFLE',
    desc: 'Reliable automatic rifle. Good at every range.',
    damage: 14, pellets: 1, spread: 0.011, interval: 0.098, mag: 32, reload: 1.2,
    range: 90, auto: true, color: 0x43f3ff, recoil: 0.011, shake: 0.06, pierce: false,
  },
  viper: {
    id: 'viper', name: 'VIPER SMG', tag: 'RAPID', role: 'CLOSE / RAPID', category: 'SMG',
    desc: 'Very high fire rate. Shreds crowds up close.',
    damage: 8, pellets: 1, spread: 0.028, interval: 0.065, mag: 40, reload: 1.3,
    range: 60, auto: true, color: 0x7dff6a, recoil: 0.007, shake: 0.045, pierce: false,
  },
  arx: {
    id: 'arx', name: 'ARX RIFLE', tag: 'AUTO', role: 'HEAVY AUTO', category: 'RIFLE',
    desc: 'Hard-hitting assault rifle with a steady kick.',
    damage: 18, pellets: 1, spread: 0.012, interval: 0.13, mag: 30, reload: 1.6,
    range: 105, auto: true, color: 0xffc247, recoil: 0.016, shake: 0.08, pierce: false,
  },
  scatter: {
    id: 'scatter', name: 'SCATTER BLASTER', tag: 'CLOSE', role: 'SHOTGUN', category: 'SHOTGUN',
    desc: 'Eight-pellet blast. Devastating at point-blank range.',
    damage: 11, pellets: 8, spread: 0.075, interval: 0.78, mag: 6, reload: 1.75,
    range: 34, auto: false, color: 0xffc247, recoil: 0.052, shake: 0.36, pierce: false,
  },
  longshot: {
    id: 'longshot', name: 'LONGSHOT DMR', tag: 'SEMI', role: 'MARKSMAN', category: 'SNIPER',
    desc: 'Semi-auto marksman rifle. Huge damage per shot.',
    damage: 36, pellets: 1, spread: 0.004, interval: 0.35, mag: 14, reload: 1.8,
    range: 150, auto: false, color: 0x8ff8ff, recoil: 0.032, shake: 0.24, pierce: false,
  },
  rail: {
    id: 'rail', name: 'RAIL LANCE', tag: 'PIERCE', role: 'ANTI-ARMOR', category: 'SNIPER',
    desc: 'Charged lance. Penetrates a whole line of enemies.',
    damage: 105, pellets: 1, spread: 0, interval: 1.05, mag: 4, reload: 2.2,
    range: 130, auto: false, color: 0xff2fa8, recoil: 0.062, shake: 0.42, pierce: true,
  },
  vanguard: {
    id: 'vanguard', name: 'VANGUARD AR', tag: 'AUTO', role: 'ASSAULT', category: 'RIFLE',
    desc: 'Fast-handling carbine. Flat recoil and a quick reload.',
    damage: 16, pellets: 1, spread: 0.012, interval: 0.105, mag: 30, reload: 1.35,
    range: 95, auto: true, color: 0x4fa8ff, recoil: 0.012, shake: 0.06, pierce: false,
  },
  warlord: {
    id: 'warlord', name: 'WARLORD AK', tag: 'AUTO', role: 'BATTLE RIFLE', category: 'RIFLE',
    desc: 'Heavy 7.62 rifle. Slow, loud and brutal.',
    damage: 21, pellets: 1, spread: 0.016, interval: 0.145, mag: 30, reload: 1.7,
    range: 100, auto: true, color: 0xff8a3d, recoil: 0.021, shake: 0.12, pierce: false,
  },
  sentinel: {
    id: 'sentinel', name: 'SENTINEL BR', tag: 'SEMI', role: 'BATTLE RIFLE', category: 'RIFLE',
    desc: 'Precision semi-auto rifle. Two clean shots drop most targets.',
    damage: 42, pellets: 1, spread: 0.005, interval: 0.34, mag: 15, reload: 1.9,
    range: 160, auto: false, color: 0xd7e8ff, recoil: 0.038, shake: 0.26, pierce: false,
  },
  sidearm: {
    id: 'sidearm', name: 'SIDEARM 9', tag: 'SEMI', role: 'PISTOL', category: 'PISTOL',
    desc: 'Compact service pistol. Fast draw, crisp single shots.',
    damage: 26, pellets: 1, spread: 0.009, interval: 0.24, mag: 15, reload: 1.05,
    range: 70, auto: false, color: 0xb8c6d6, recoil: 0.026, shake: 0.14, pierce: false,
  },
  magnum: {
    id: 'magnum', name: 'MAGNUM 44', tag: 'SEMI', role: 'REVOLVER', category: 'PISTOL',
    desc: 'Six heavy rounds. Punishing damage and a violent kick.',
    damage: 64, pellets: 1, spread: 0.006, interval: 0.62, mag: 6, reload: 1.95,
    range: 95, auto: false, color: 0xffd27a, recoil: 0.072, shake: 0.46, pierce: false,
  },
  wasp: {
    id: 'wasp', name: 'WASP 93', tag: 'AUTO', role: 'MACHINE PISTOL', category: 'PISTOL',
    desc: 'Machine pistol. Wild recoil, enormous close-range output.',
    damage: 9, pellets: 1, spread: 0.035, interval: 0.062, mag: 24, reload: 1.4,
    range: 52, auto: true, color: 0x9dff5e, recoil: 0.014, shake: 0.07, pierce: false,
  },
  vector: {
    id: 'vector', name: 'VECTOR PDW', tag: 'RAPID', role: 'CLOSE / RAPID', category: 'SMG',
    desc: 'Hyper-cyclic PDW. The fastest trigger in the armory.',
    damage: 7, pellets: 1, spread: 0.03, interval: 0.048, mag: 50, reload: 1.5,
    range: 55, auto: true, color: 0x9be7ff, recoil: 0.006, shake: 0.04, pierce: false,
  },
  breacher: {
    id: 'breacher', name: 'BREACHER 12', tag: 'AUTO', role: 'AUTO SHOTGUN', category: 'SHOTGUN',
    desc: 'Ten-pellet automatic shotgun. Clears a doorway in one burst.',
    damage: 9, pellets: 10, spread: 0.085, interval: 0.5, mag: 8, reload: 2.2,
    range: 30, auto: true, color: 0xff9a3d, recoil: 0.055, shake: 0.38, pierce: false,
  },
  vulcan: {
    id: 'vulcan', name: 'VULCAN LMG', tag: 'AUTO', role: 'SUPPORT', category: 'LMG',
    desc: 'Belt-fed suppression. A hundred rounds of sustained fire.',
    damage: 16, pellets: 1, spread: 0.02, interval: 0.085, mag: 100, reload: 4.2,
    range: 90, auto: true, color: 0xffc247, recoil: 0.017, shake: 0.09, pierce: false,
  },
  ion: {
    id: 'ion', name: 'ION BLASTER', tag: 'SEMI', role: 'HEAVY BLASTER', category: 'BLASTER',
    desc: 'Hand-cannon blaster. Superheated bolts punch through light armor.',
    damage: 38, pellets: 1, spread: 0.011, interval: 0.32, mag: 12, reload: 1.55,
    range: 100, auto: false, color: 0xff5a3d, recoil: 0.044, shake: 0.3, pierce: false,
  },
  plasma: {
    id: 'plasma', name: 'PLASMA CARBINE', tag: 'AUTO', role: 'PLASMA RIFLE', category: 'BLASTER',
    desc: 'Rapid plasma carbine. Green bolts splash and stagger.',
    damage: 15, pellets: 1, spread: 0.014, interval: 0.08, mag: 45, reload: 1.6,
    range: 80, auto: true, color: 0x7dff6a, recoil: 0.012, shake: 0.07, pierce: false,
  },
  disruptor: {
    id: 'disruptor', name: 'DISRUPTOR', tag: 'PIERCE', role: 'PLASMA SNIPER', category: 'BLASTER',
    desc: 'Prototype disruptor. One shot pierces an entire column.',
    damage: 130, pellets: 1, spread: 0, interval: 1.15, mag: 4, reload: 2.35,
    range: 170, auto: false, color: 0xb06bff, recoil: 0.07, shake: 0.5, pierce: true,
  },
};

function fullAmmo(): Record<WeaponId, number> {
  const ammo = {} as Record<WeaponId, number>;
  for (const id of WEAPON_IDS) ammo[id] = WEAPONS[id].mag;
  return ammo;
}

function makeSmokeTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(220,225,230,0.5)');
  grad.addColorStop(0.45, 'rgba(170,175,185,0.22)');
  grad.addColorStop(1, 'rgba(140,145,155,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeFlashTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.45, 'rgba(150,240,255,0.5)');
  grad.addColorStop(1, 'rgba(80,200,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGunSurface(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1800; i++) {
    const shade = 70 + Math.floor(Math.random() * 150);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = `rgba(225,225,225,${0.05 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 34, y + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

const gunSurfaceTexture = makeGunSurface();

function gunMaterial(color: number, emissive = 0x000000, intensity = 0, metalness = 0.62, roughness = 0.48): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    metalness,
    roughness,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
    envMapIntensity: 1,
  });
  if (metalness > 0.5) {
    material.roughnessMap = gunSurfaceTexture;
    material.bumpMap = gunSurfaceTexture;
    material.bumpScale = 0.006;
  }
  return material;
}

function polymerMaterial(color = 0x151a1f, roughness = 0.72): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.06,
    roughness,
    clearcoat: 0.05,
    clearcoatRoughness: 0.85,
    envMapIntensity: 0.65,
    sheen: 0.18,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0x39424c),
  });
}

function gloveMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x1a232d,
    metalness: 0.05,
    roughness: 0.72,
    clearcoat: 0.12,
    clearcoatRoughness: 0.72,
    sheen: 0.45,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0x3b4b59),
  });
}

interface GunRig {
  mixer: THREE.AnimationMixer;
  idle: THREE.AnimationAction | null;
  reload: THREE.AnimationAction | null;
  shoot: THREE.AnimationAction | null;
  current: THREE.AnimationAction | null;
  returnIn: number;
}

interface WeaponModel {
  group: THREE.Group;
  muzzle: THREE.Vector3;
  color: number;
  magazine?: THREE.Object3D;
  bolt?: THREE.Object3D;
  ejectPort?: THREE.Vector3;
  rig?: GunRig;
}

type OpticStyle = 'reddot' | 'holo' | 'scope' | 'iron';

interface RifleStyle {
  accent: number;
  barrel: number;
  handguard: number;
  mag: number;
  optic: OpticStyle;
  stock: boolean;
  pump?: boolean;
  coils?: boolean;
  verticalGrip?: boolean;
}

function buildRifleModel(style: RifleStyle): WeaponModel {
  const group = new THREE.Group();
  const metal = gunMaterial(0x2b333d, 0x000000, 0, 0.94, 0.3);
  const dark = gunMaterial(0x14181e, 0x000000, 0, 0.9, 0.4);
  const steel = gunMaterial(0x3b4550, 0x000000, 0, 0.96, 0.26);
  const polymer = polymerMaterial(0x1b2128, 0.74);
  const glove = gloveMaterial();
  const accent = new THREE.MeshPhysicalMaterial({
    color: 0x101418,
    emissive: style.accent,
    emissiveIntensity: 0.85,
    metalness: 0.6,
    roughness: 0.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  const lens = new THREE.MeshPhysicalMaterial({
    color: 0x061018,
    emissive: style.accent,
    emissiveIntensity: 1.1,
    metalness: 0.1,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });

  // ── Receiver, upper and picatinny rail ──
  const receiver = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.18, 0.46, 4, 0.035), metal);
  receiver.position.set(0, 0.02, 0);
  group.add(receiver);

  const upper = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.07, 0.5, 3, 0.02), dark);
  upper.position.set(0, 0.12, -0.01);
  group.add(upper);

  const rail = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.02, 0.42, 2, 0.006), dark);
  rail.position.set(0, 0.165, -0.04);
  group.add(rail);
  for (let i = 0; i < 10; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.01, 0.016), steel);
    slot.position.set(0, 0.173, -0.23 + i * 0.042);
    group.add(slot);
  }

  const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.18), accent);
  glowStrip.position.set(0.088, 0.02, -0.05);
  group.add(glowStrip);

  // ── Ejection port and charging handle ──
  const port = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.055, 0.14), dark);
  port.position.set(0.086, 0.07, 0);
  group.add(port);

  const bolt = new THREE.Group();
  bolt.name = 'bolt';
  bolt.position.set(0.095, 0.065, 0.05);
  bolt.userData.baseZ = bolt.position.z;
  const boltShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.06, 8), steel);
  boltShaft.rotation.z = Math.PI / 2;
  bolt.add(boltShaft);
  const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), steel);
  boltKnob.position.x = 0.045;
  bolt.add(boltKnob);
  group.add(bolt);

  // ── Handguard with vents and accent strips ──
  const hgLen = Math.max(0.2, style.handguard);
  const hgZ = -0.23 - hgLen / 2;
  const handguard = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.15, hgLen, 4, 0.03), polymer);
  handguard.position.set(0, 0.015, hgZ);
  group.add(handguard);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, 0.055), dark);
      vent.position.set(side * 0.077, 0.02, hgZ - hgLen / 2 + 0.07 + i * 0.088);
      group.add(vent);
    }
    const accentStrip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, hgLen * 0.7), accent);
    accentStrip.position.set(side * 0.078, -0.035, hgZ);
    group.add(accentStrip);
  }

  // ── Barrel, gas block and muzzle brake ──
  const barrelStart = -0.23 - hgLen;
  const barrelLen = Math.max(0.18, style.barrel);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.026, barrelLen, 12), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, barrelStart - barrelLen / 2);
  group.add(barrel);

  const gasBlock = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.07, 0.07, 2, 0.015), dark);
  gasBlock.position.set(0, 0.045, barrelStart - 0.04);
  group.add(gasBlock);

  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.028, 0.08, 12), metal);
  brake.rotation.x = Math.PI / 2;
  brake.position.set(0, 0.035, barrelStart - barrelLen - 0.035);
  group.add(brake);
  for (let i = 0; i < 3; i++) {
    const portSlot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.014), dark);
    portSlot.position.set(0, 0.062, barrelStart - barrelLen - 0.012 - i * 0.02);
    group.add(portSlot);
  }

  if (style.coils) {
    for (let i = 0; i < 4; i++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.012, 8, 24), accent);
      coil.position.set(0, 0.035, barrelStart - barrelLen * 0.35 - i * 0.085);
      group.add(coil);
    }
  }

  if (style.pump) {
    const pump = new THREE.Group();
    pump.name = 'pump';
    pump.position.set(0, 0, hgZ);
    pump.userData.baseZ = hgZ;
    const pumpBody = new THREE.Mesh(new RoundedBoxGeometry(0.155, 0.12, 0.16, 3, 0.03), polymer);
    pumpBody.position.y = -0.02;
    pump.add(pumpBody);
    for (let i = 0; i < 3; i++) {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.018), dark);
      ridge.position.set(0, -0.02, -0.05 + i * 0.05);
      pump.add(ridge);
    }
    group.add(pump);

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, hgLen + 0.2, 10), steel);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, -0.03, hgZ - 0.12);
    group.add(tube);
  }

  // ── Optics ──
  if (style.optic === 'reddot') {
    const mount = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.035, 0.14, 2, 0.01), dark);
    mount.position.set(0, 0.185, -0.04);
    group.add(mount);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 16, 1, true), metal);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.215, -0.05);
    group.add(tube);
    const front = new THREE.Mesh(new THREE.CircleGeometry(0.038, 20), lens);
    front.position.set(0, 0.215, -0.116);
    group.add(front);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), accent);
    dot.position.set(0, 0.215, -0.1);
    group.add(dot);
  } else if (style.optic === 'holo') {
    const mount = new THREE.Mesh(new RoundedBoxGeometry(0.065, 0.03, 0.13, 2, 0.01), dark);
    mount.position.set(0, 0.188, -0.04);
    group.add(mount);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.058, 0.064), lens);
    glass.position.set(0, 0.24, -0.085);
    group.add(glass);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.085, 0.014), dark);
      arm.position.set(side * 0.032, 0.235, -0.085);
      group.add(arm);
    }
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.014), dark);
    topBar.position.set(0, 0.278, -0.085);
    group.add(topBar);
    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.014), dark);
    bottomBar.position.set(0, 0.192, -0.085);
    group.add(bottomBar);
  } else if (style.optic === 'scope') {
    for (const z of [-0.1, 0.06]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.009, 8, 20), dark);
      ring.position.set(0, 0.235, z);
      group.add(ring);
    }
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.27, 18), metal);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.235, -0.03);
    group.add(scope);
    const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.043, 22), lens);
    frontLens.position.set(0, 0.235, -0.166);
    group.add(frontLens);
    const rearLens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 20), lens);
    rearLens.rotation.y = Math.PI;
    rearLens.position.set(0, 0.235, 0.106);
    group.add(rearLens);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.035, 10), dark);
    turret.position.set(0, 0.29, 0.02);
    group.add(turret);
  } else {
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.03), dark);
    rear.position.set(0, 0.19, 0.05);
    group.add(rear);
    const rearNotch = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.02, 0.012), steel);
    rearNotch.position.set(0, 0.2, 0.034);
    group.add(rearNotch);
    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.06, 0.018), dark);
    frontPost.position.set(0, 0.2, barrelStart + 0.02);
    group.add(frontPost);
    const frontTip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), accent);
    frontTip.position.set(0, 0.234, barrelStart + 0.02);
    group.add(frontTip);
  }

  // ── Magazine ──
  const magazine = new THREE.Group();
  magazine.position.set(0, -0.07, -0.03);
  magazine.userData.baseY = magazine.position.y;
  if (style.mag > 0.05) {
    const magBody = new THREE.Mesh(new RoundedBoxGeometry(0.075, style.mag, 0.115, 3, 0.02), polymer);
    magBody.position.set(0, -style.mag / 2, 0);
    magBody.rotation.x = 0.1;
    magazine.add(magBody);
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.02, 0.13, 2, 0.008), dark);
    plate.position.set(0, -style.mag - 0.01, 0.008);
    magazine.add(plate);
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.12), dark);
      rib.position.set(0, -style.mag * 0.3 - i * 0.06, 0);
      magazine.add(rib);
    }
  }
  group.add(magazine);

  // ── Pistol grip, trigger guard and trigger ──
  const grip = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.22, 0.115, 4, 0.03), polymer);
  grip.position.set(0, -0.18, 0.12);
  grip.rotation.x = -0.3;
  group.add(grip);
  for (let i = 0; i < 3; i++) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.012, 0.02), dark);
    ridge.position.set(0, -0.12 - i * 0.05, 0.145 + i * 0.015);
    group.add(ridge);
  }

  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.007, 6, 18), dark);
  guard.rotation.y = Math.PI / 2;
  guard.position.set(0, -0.06, 0.04);
  group.add(guard);

  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.014), steel);
  trigger.position.set(0, -0.055, 0.045);
  trigger.rotation.x = 0.2;
  group.add(trigger);

  // ── Stock ──
  if (style.stock) {
    const buffer = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 10), steel);
    buffer.rotation.x = Math.PI / 2;
    buffer.position.set(0, 0.05, 0.3);
    group.add(buffer);

    const stock = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.22, 0.16, 3, 0.03), polymer);
    stock.position.set(0, -0.02, 0.43);
    group.add(stock);

    const cheek = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.05, 0.2, 2, 0.015), polymer);
    cheek.position.set(0, 0.1, 0.36);
    group.add(cheek);
  }

  if (style.verticalGrip) {
    const vg = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.15, 0.075, 3, 0.02), polymer);
    vg.position.set(0, -0.11, hgZ + 0.02);
    vg.rotation.x = 0.1;
    group.add(vg);
  }

  // ── Gloved hands ──
  const addHand = (position: THREE.Vector3, rotation: THREE.Euler): THREE.Group => {
    const hand = new THREE.Group();
    hand.name = 'viewmodel-hand';
    hand.position.copy(position);
    hand.rotation.copy(rotation);
    const palm = new THREE.Mesh(new RoundedBoxGeometry(0.062, 0.1, 0.085, 3, 0.022), glove);
    hand.add(palm);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.045, 4, 8), glove);
    thumb.position.set(-0.03, 0.035, 0.02);
    thumb.rotation.z = 0.9;
    hand.add(thumb);
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.05, 4, 8), glove);
      finger.position.set(0, 0.042 - i * 0.022, -0.05);
      finger.rotation.x = 1.35;
      hand.add(finger);
    }
    group.add(hand);
    return hand;
  };

  addHand(new THREE.Vector3(0.0, -0.19, 0.13), new THREE.Euler(0.05, 0.08, 0.06));
  if (!style.verticalGrip) {
    addHand(new THREE.Vector3(0, -0.1, hgZ + 0.06), new THREE.Euler(-0.15, 0, 0));
  }

  group.position.set(0, 0.015, 0.03);
  return {
    group,
    muzzle: new THREE.Vector3(0, 0.035, barrelStart - barrelLen - 0.075),
    color: style.accent,
    magazine,
    bolt,
    ejectPort: new THREE.Vector3(0.09, 0.07, 0.02),
  };
}


function buildPistolModel(style: RifleStyle, sciFi = false, auto = false): WeaponModel {
  const group = new THREE.Group();
  const metal = gunMaterial(0x343c46, 0x000000, 0, 0.92, 0.32);
  const dark = gunMaterial(0x14181e, 0x000000, 0, 0.88, 0.42);
  const steel = gunMaterial(0x59636f, 0x000000, 0, 0.96, 0.24);
  const polymer = polymerMaterial(0x1b2128, 0.72);
  const glove = gloveMaterial();
  const accent = new THREE.MeshPhysicalMaterial({
    color: 0x101418,
    emissive: style.accent,
    emissiveIntensity: 0.9,
    metalness: 0.6,
    roughness: 0.28,
    clearcoat: 0.5,
    clearcoatRoughness: 0.22,
  });

  const slide = new THREE.Mesh(new RoundedBoxGeometry(0.095, 0.11, 0.42, 4, 0.025), metal);
  slide.position.set(0, 0.045, -0.04);
  group.add(slide);

  const frame = new THREE.Mesh(new RoundedBoxGeometry(0.082, 0.05, 0.34, 3, 0.016), dark);
  frame.position.set(0, -0.03, 0.0);
  group.add(frame);

  const barrelLen = sciFi ? 0.17 : 0.12;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, barrelLen, 12), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.045, -0.26 - barrelLen / 2);
  group.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.06, 12), metal);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.045, -0.26 - barrelLen - 0.025);
  group.add(muzzle);

  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.014, 0.15), accent);
  glow.position.set(0.047, 0.055, -0.08);
  group.add(glow);

  if (sciFi) {
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 6, 16), accent);
      fin.position.set(0, 0.045, -0.3 - i * 0.045);
      group.add(fin);
    }
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.16, 12), dark);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.125, -0.06);
    group.add(scope);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.023, 16), accent);
    lens.position.set(0, 0.125, -0.14);
    group.add(lens);
  } else if (style.optic !== 'iron') {
    const sight = new THREE.Mesh(new RoundedBoxGeometry(0.036, 0.034, 0.08, 2, 0.008), dark);
    sight.position.set(0, 0.115, -0.05);
    group.add(sight);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.014, 12), accent);
    dot.position.set(0, 0.125, -0.092);
    group.add(dot);
  } else {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.026, 0.014), steel);
    post.position.set(0, 0.112, -0.22);
    group.add(post);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.016), dark);
    rear.position.set(0, 0.112, 0.13);
    group.add(rear);
  }

  const grip = new THREE.Mesh(new RoundedBoxGeometry(0.078, 0.24, 0.11, 4, 0.026), polymer);
  grip.position.set(0, -0.16, 0.115);
  grip.rotation.x = -0.3;
  group.add(grip);
  for (let i = 0; i < 3; i++) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.018), dark);
    ridge.position.set(0, -0.1 - i * 0.045, 0.135 + i * 0.013);
    group.add(ridge);
  }

  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 16), dark);
  guard.rotation.y = Math.PI / 2;
  guard.position.set(0, -0.06, 0.03);
  group.add(guard);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.042, 0.012), steel);
  trigger.position.set(0, -0.055, 0.035);
  trigger.rotation.x = 0.2;
  group.add(trigger);

  if (auto) {
    const mag = new THREE.Mesh(new RoundedBoxGeometry(0.062, 0.2, 0.085, 3, 0.018), polymer);
    mag.position.set(0, -0.26, 0.12);
    mag.rotation.x = -0.25;
    group.add(mag);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.016, 0.09), dark);
    plate.position.set(0, -0.36, 0.145);
    group.add(plate);
  }

  const hand = new THREE.Group();
  hand.name = 'viewmodel-hand';
  hand.position.set(0.012, -0.18, 0.1);
  hand.rotation.set(0.08, 0.04, 0.08);
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.062, 0.1, 0.085, 3, 0.022), glove);
  hand.add(palm);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.045, 4, 8), glove);
  thumb.position.set(-0.03, 0.035, 0.02);
  thumb.rotation.z = 0.9;
  hand.add(thumb);
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.05, 4, 8), glove);
    finger.position.set(0, 0.042 - i * 0.022, -0.05);
    finger.rotation.x = 1.35;
    hand.add(finger);
  }
  group.add(hand);

  group.position.set(0, 0.02, 0.02);
  return {
    group,
    muzzle: new THREE.Vector3(0, 0.045, -0.28 - barrelLen - 0.075),
    color: style.accent,
    ejectPort: new THREE.Vector3(0.052, 0.07, 0.02),
  };
}

function buildRevolverModel(style: RifleStyle): WeaponModel {
  const group = new THREE.Group();
  const metal = gunMaterial(0x4a4f57, 0x000000, 0, 0.94, 0.3);
  const dark = gunMaterial(0x171b20, 0x000000, 0, 0.9, 0.4);
  const steel = gunMaterial(0x6b7078, 0x000000, 0, 0.98, 0.22);
  const wood = new THREE.MeshPhysicalMaterial({
    color: 0x5a321c,
    metalness: 0.05,
    roughness: 0.55,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
    sheen: 0.2,
    sheenColor: new THREE.Color(0x8a5a34),
  });
  const glove = gloveMaterial();
  const accent = new THREE.MeshPhysicalMaterial({
    color: 0x1a1206,
    emissive: style.accent,
    emissiveIntensity: 0.7,
    metalness: 0.7,
    roughness: 0.3,
  });

  const frame = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.12, 0.3, 4, 0.02), metal);
  frame.position.set(0, 0.03, 0.02);
  group.add(frame);

  const top = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.035, 0.34, 3, 0.012), dark);
  top.position.set(0, 0.105, -0.02);
  group.add(top);

  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.17, 12), steel);
  cylinder.rotation.x = Math.PI / 2;
  cylinder.position.set(0, 0.035, -0.04);
  group.add(cylinder);
  for (let i = 0; i < 6; i++) {
    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.175, 8), dark);
    chamber.rotation.x = Math.PI / 2;
    const a = (i / 6) * Math.PI * 2;
    chamber.position.set(Math.cos(a) * 0.036, 0.035 + Math.sin(a) * 0.036, -0.04);
    group.add(chamber);
  }

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.023, 0.32, 12), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.055, -0.29);
  group.add(barrel);
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.015, 0.3), dark);
  rib.position.set(0, 0.085, -0.29);
  group.add(rib);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.012), accent);
  front.position.set(0, 0.1, -0.44);
  group.add(front);

  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), steel);
  hammer.position.set(0, 0.12, 0.16);
  hammer.rotation.x = -0.4;
  group.add(hammer);

  const grip = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.25, 0.105, 4, 0.03), wood);
  grip.position.set(0, -0.14, 0.15);
  grip.rotation.x = -0.42;
  group.add(grip);

  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 16), dark);
  guard.rotation.y = Math.PI / 2;
  guard.position.set(0, -0.05, 0.045);
  group.add(guard);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.012), steel);
  trigger.position.set(0, -0.045, 0.05);
  trigger.rotation.x = 0.2;
  group.add(trigger);

  const hand = new THREE.Group();
  hand.name = 'viewmodel-hand';
  hand.position.set(0.012, -0.16, 0.13);
  hand.rotation.set(0.05, 0.04, 0.08);
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.062, 0.1, 0.085, 3, 0.022), glove);
  hand.add(palm);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.045, 4, 8), glove);
  thumb.position.set(-0.03, 0.035, 0.02);
  thumb.rotation.z = 0.9;
  hand.add(thumb);
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.05, 4, 8), glove);
    finger.position.set(0, 0.042 - i * 0.022, -0.05);
    finger.rotation.x = 1.35;
    hand.add(finger);
  }
  group.add(hand);

  group.position.set(0, 0.02, 0.02);
  return {
    group,
    muzzle: new THREE.Vector3(0, 0.055, -0.47),
    color: style.accent,
    ejectPort: new THREE.Vector3(0.045, 0.06, 0.02),
  };
}

const RIFLE_STYLES: Record<WeaponId, RifleStyle> = {
  pulse: { accent: 0x43f3ff, barrel: 0.36, handguard: 0.4, mag: 0.22, optic: 'reddot', stock: true },
  viper: { accent: 0x7dff6a, barrel: 0.24, handguard: 0.26, mag: 0.28, optic: 'reddot', stock: false, verticalGrip: true },
  arx: { accent: 0xffc247, barrel: 0.46, handguard: 0.46, mag: 0.26, optic: 'holo', stock: true },
  scatter: { accent: 0xffc247, barrel: 0.5, handguard: 0.3, mag: 0, optic: 'iron', stock: true, pump: true },
  longshot: { accent: 0x8ff8ff, barrel: 0.62, handguard: 0.36, mag: 0.16, optic: 'scope', stock: true },
  rail: { accent: 0xff2fa8, barrel: 0.72, handguard: 0.4, mag: 0.18, optic: 'scope', stock: true, coils: true },
  vanguard: { accent: 0x4fa8ff, barrel: 0.42, handguard: 0.4, mag: 0.22, optic: 'reddot', stock: true },
  warlord: { accent: 0xff8a3d, barrel: 0.46, handguard: 0.36, mag: 0.26, optic: 'iron', stock: true },
  sentinel: { accent: 0xd7e8ff, barrel: 0.5, handguard: 0.44, mag: 0.2, optic: 'holo', stock: true },
  sidearm: { accent: 0xb8c6d6, barrel: 0.12, handguard: 0, mag: 0, optic: 'iron', stock: false },
  magnum: { accent: 0xffd27a, barrel: 0.32, handguard: 0, mag: 0, optic: 'iron', stock: false },
  wasp: { accent: 0x9dff5e, barrel: 0.14, handguard: 0, mag: 0, optic: 'reddot', stock: false },
  vector: { accent: 0x9be7ff, barrel: 0.28, handguard: 0.26, mag: 0.3, optic: 'reddot', stock: false, verticalGrip: true },
  breacher: { accent: 0xff9a3d, barrel: 0.5, handguard: 0.32, mag: 0.16, optic: 'iron', stock: true },
  vulcan: { accent: 0xffc247, barrel: 0.56, handguard: 0.5, mag: 0.34, optic: 'reddot', stock: true },
  ion: { accent: 0xff5a3d, barrel: 0.17, handguard: 0, mag: 0, optic: 'reddot', stock: false },
  plasma: { accent: 0x7dff6a, barrel: 0.46, handguard: 0.44, mag: 0.24, optic: 'holo', stock: true, coils: true },
  disruptor: { accent: 0xb06bff, barrel: 0.76, handguard: 0.42, mag: 0.2, optic: 'scope', stock: true, coils: true },
};

const PISTOL_IDS = new Set<WeaponId>(['sidearm', 'wasp', 'ion']);
const REVOLVER_IDS = new Set<WeaponId>(['magnum']);

export function buildProceduralWeapon(id: WeaponId): WeaponModel {
  const style = RIFLE_STYLES[id];
  if (REVOLVER_IDS.has(id)) return buildRevolverModel(style);
  if (PISTOL_IDS.has(id)) return buildPistolModel(style, id === 'ion', id === 'wasp');
  return buildRifleModel(style);
}


export class WeaponSystem {
  current: WeaponId = 'pulse';
  ammo: Record<WeaponId, number> = fullAmmo();

  cooldown = 0;
  switchTimer = 0;
  reloadTime = 0;
  reloadTotal = 0;

  private camera: THREE.PerspectiveCamera;
  private audio: AudioEngine;
  private root = new THREE.Group();
  private models: Record<WeaponId, WeaponModel>;
  private flash: THREE.Sprite;
  private flashLife = 0;
  private flashColor = new THREE.Color(0x8ff8ff);
  private recoil = 0;
  private swayX = 0;
  private swayY = 0;
  private bob = 0;
  private autoReload = -1;
  private basePosition = new THREE.Vector3(0.3, -0.32, -0.84);
  private idle = 0;
  private muzzleWorld = new THREE.Vector3();
  private muzzleFlashTex = makeFlashTexture();
  private muzzleLight: THREE.PointLight;
  private shellGroup: THREE.Group;
  private smokeGroup: THREE.Group;
  private shells: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; spin: THREE.Vector3; life: number }> = [];
  private smokes: Array<{
    sprite: THREE.Sprite;
    material: THREE.SpriteMaterial;
    life: number;
    ttl: number;
    velocity: THREE.Vector3;
    baseScale: number;
  }> = [];
  private readonly smokeTexture = makeSmokeTexture();
  private readonly shellGeo = new THREE.CylinderGeometry(0.008, 0.0065, 0.036, 6);
  private readonly shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xc69d4d,
    metalness: 0.92,
    roughness: 0.28,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1,
  });

  constructor(camera: THREE.PerspectiveCamera, audio: AudioEngine) {
    this.camera = camera;
    this.audio = audio;
    this.root.position.copy(this.basePosition);
    this.root.scale.setScalar(0.45);
    this.root.rotation.y = 0.06;
    camera.add(this.root);

    const gunLight = new THREE.PointLight(0xbfefff, 0.5, 2.2, 2);
    gunLight.position.set(0, 0.3, 0.3);
    this.root.add(gunLight);

    this.muzzleLight = new THREE.PointLight(0xffcf9a, 0, 3.2, 2);
    this.root.add(this.muzzleLight);

    this.shellGroup = new THREE.Group();
    this.smokeGroup = new THREE.Group();
    const parent = camera.parent ?? camera;
    parent.add(this.shellGroup, this.smokeGroup);
    this.initShells();
    this.initSmoke();

    this.models = {} as Record<WeaponId, WeaponModel>;
    for (const id of WEAPON_IDS) this.models[id] = buildProceduralWeapon(id);
    for (const id of WEAPON_IDS) {
      this.models[id].group.visible = id === this.current;
      this.root.add(this.models[id].group);
    }

    const flashMaterial = new THREE.SpriteMaterial({
      map: this.muzzleFlashTex,
      color: 0x8ff8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.flash = new THREE.Sprite(flashMaterial);
    this.flash.scale.setScalar(0.4);
    this.flash.visible = false;
    this.flash.renderOrder = 5;
    this.root.add(this.flash);

    void this.loadRealGun();
  }

  private async loadRealGun(): Promise<void> {
    await Promise.all(
      WEAPON_IDS.map(async (id) => {
        const visual = GUN_VISUALS[id];
        if (!visual) return;
        await loadModel(visual.asset);
        this.applyGunModel(id);
      }),
    );
  }

  private applyGunModel(id: WeaponId): void {
    const visual = GUN_VISUALS[id];
    if (!visual) return;
    const model = this.models[id];
    if (model.group.getObjectByName('glb-gun')) return;

    const built = createGunModel(id, true);
    if (!built) return;

    for (const child of [...model.group.children]) child.visible = false;

    const holder = new THREE.Group();
    holder.name = 'glb-gun';
    holder.add(built.root);
    model.group.add(holder);
    model.group.add(this.buildViewmodelHands());

    model.rig = undefined;
    model.magazine = undefined;
    model.bolt = undefined;
    model.muzzle = new THREE.Vector3(...visual.muzzle);
    model.ejectPort = new THREE.Vector3(...visual.eject);
  }

  private buildViewmodelHands(): THREE.Group {
    const group = new THREE.Group();
    const glove = gloveMaterial();
    const addHand = (
      palmPosition: THREE.Vector3,
      palmRotation: THREE.Euler,
      curl: number,
    ): void => {
      const hand = new THREE.Group();
      hand.position.copy(palmPosition);
      hand.rotation.copy(palmRotation);
      const palm = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.12, 0.11, 4, 0.025), glove);
      hand.add(palm);
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.055, 4, 8), glove);
      thumb.position.set(-0.045, 0.03, 0.04);
      thumb.rotation.z = 0.9;
      hand.add(thumb);
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.055, 4, 8), glove);
        finger.position.set(0, 0.045 - i * 0.023, -0.055);
        finger.rotation.x = curl + i * 0.05;
        hand.add(finger);
      }
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.13, 8), glove);
      cuff.position.set(0, -0.1, 0.06);
      cuff.rotation.x = -0.25;
      hand.add(cuff);
      hand.scale.setScalar(1.6);
      group.add(hand);
    };

    // Trigger hand and support hand, sized for the 1.75-unit viewmodel.
    addHand(new THREE.Vector3(0.055, -0.08, 0.37), new THREE.Euler(0.1, 0, 0), 1.25);
    addHand(new THREE.Vector3(0.0, 0.01, -0.38), new THREE.Euler(0.15, 0, 0), 1.45);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 10), glove);
    forearm.position.set(0.14, -0.34, 0.4);
    forearm.rotation.set(0.3, 0.1, -0.5);
    forearm.scale.setScalar(1.6);
    group.add(forearm);

    const supportForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 10), glove);
    supportForearm.position.set(-0.06, -0.3, -0.24);
    supportForearm.rotation.set(-0.55, 0, 0.5);
    supportForearm.scale.setScalar(1.6);
    group.add(supportForearm);

    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
      }
    });
    return group;
  }

  private resetGunRig(model: WeaponModel): void {
    const rig = model.rig;
    if (!rig) return;
    if (rig.reload) rig.reload.stop();
    if (rig.shoot) rig.shoot.stop();
    if (rig.idle) {
      rig.idle.reset();
      rig.idle.setEffectiveWeight(1);
      rig.idle.play();
    }
    rig.current = rig.idle;
    rig.returnIn = 0;
  }

  private playRigAction(kind: 'reload' | 'shoot', duration?: number): void {
    const rig = this.models[this.current].rig;
    if (!rig) return;
    const action = kind === 'reload' ? rig.reload : rig.shoot;
    if (!action) return;
    const fade = kind === 'reload' ? 0.12 : 0.04;
    if (rig.current && rig.current !== action) rig.current.fadeOut(fade);
    const clip = action.getClip();
    const speed = duration && duration > 0 ? Math.max(0.4, clip.duration / duration) : 1;
    action.reset();
    action.setEffectiveTimeScale(speed);
    action.setEffectiveWeight(1);
    action.fadeIn(fade).play();
    rig.current = action;
    rig.returnIn = duration ?? clip.duration / speed;
  }

  private fadeRigToIdle(rig: GunRig): void {
    if (!rig.idle) return;
    if (rig.current && rig.current !== rig.idle) rig.current.fadeOut(0.18);
    rig.idle.reset();
    rig.idle.setEffectiveWeight(1);
    rig.idle.fadeIn(0.18).play();
    rig.current = rig.idle;
    rig.returnIn = 0;
  }

  private initShells(): void {
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(this.shellGeo, this.shellMat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.shellGroup.add(mesh);
      this.shells.push({
        mesh,
        velocity: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        life: 0,
      });
    }
  }

  private initSmoke(): void {
    for (let i = 0; i < 20; i++) {
      const material = new THREE.SpriteMaterial({
        map: this.smokeTexture,
        color: 0xb7bec5,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.frustumCulled = false;
      this.smokeGroup.add(sprite);
      this.smokes.push({
        sprite,
        material,
        life: 0,
        ttl: 1,
        velocity: new THREE.Vector3(),
        baseScale: 0.06,
      });
    }
  }

  private ejectShell(): void {
    const slot = this.shells.find((shell) => shell.life <= 0);
    if (!slot) return;

    const model = this.models[this.current];
    const local = (model.ejectPort ?? new THREE.Vector3(0.09, 0.07, 0.02)).clone();
    this.root.updateWorldMatrix(true, false);
    slot.mesh.position.copy(model.group.localToWorld(local));
    slot.mesh.visible = true;
    slot.mesh.scale.setScalar(1);
    slot.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    const quat = this.camera.getWorldQuaternion(new THREE.Quaternion());
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);

    slot.velocity.copy(right).multiplyScalar(1.5 + Math.random() * 0.7);
    slot.velocity.addScaledVector(up, 1.6 + Math.random() * 0.5);
    slot.velocity.addScaledVector(forward, -0.15);
    slot.spin.set(
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.5) * 26,
    );
    slot.life = 1.1;
  }

  private ejectSmoke(): void {
    const model = this.models[this.current];
    this.root.updateWorldMatrix(true, false);
    const muzzle = model.group.localToWorld(model.muzzle.clone());
    const quat = this.camera.getWorldQuaternion(new THREE.Quaternion());
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);

    for (let i = 0; i < 3; i++) {
      const slot = this.smokes.find((smoke) => smoke.life <= 0);
      if (!slot) return;
      slot.sprite.position.copy(muzzle).addScaledVector(forward, 0.02);
      slot.sprite.visible = true;
      slot.material.opacity = 0.32;
      slot.material.color.setHex(0xbfc6cc);
      slot.life = 0.55 + Math.random() * 0.35;
      slot.ttl = slot.life;
      slot.baseScale = 0.05 + Math.random() * 0.03;
      slot.sprite.scale.setScalar(slot.baseScale);
      slot.velocity.copy(forward).multiplyScalar(0.45 + Math.random() * 0.45);
      slot.velocity.x += (Math.random() - 0.5) * 0.2;
      slot.velocity.y += 0.16 + Math.random() * 0.2;
      slot.velocity.z += (Math.random() - 0.5) * 0.2;
    }
  }

  private updateEffects(dt: number): void {
    for (const shell of this.shells) {
      if (shell.life <= 0) continue;
      shell.life -= dt;
      if (shell.life <= 0) {
        shell.mesh.visible = false;
        continue;
      }
      shell.velocity.y -= 6.5 * dt;
      shell.mesh.position.addScaledVector(shell.velocity, dt);
      shell.mesh.rotation.x += shell.spin.x * dt;
      shell.mesh.rotation.y += shell.spin.y * dt;
      shell.mesh.rotation.z += shell.spin.z * dt;
      if (shell.mesh.position.y < 0.02) {
        shell.mesh.position.y = 0.02;
        shell.velocity.y *= -0.35;
        shell.velocity.multiplyScalar(0.7);
      }
      if (shell.life < 0.25) shell.mesh.scale.setScalar(Math.max(0.01, shell.life / 0.25));
    }

    for (const smoke of this.smokes) {
      if (smoke.life <= 0) continue;
      smoke.life -= dt;
      if (smoke.life <= 0) {
        smoke.sprite.visible = false;
        smoke.material.opacity = 0;
        continue;
      }
      const k = 1 - smoke.life / Math.max(0.001, smoke.ttl);
      smoke.sprite.position.addScaledVector(smoke.velocity, dt);
      smoke.velocity.multiplyScalar(1 - 1.4 * dt);
      smoke.velocity.y += 0.25 * dt;
      smoke.sprite.scale.setScalar(smoke.baseScale * (1 + k * 4));
      smoke.material.opacity = 0.32 * (1 - k) * (1 - k);
    }
  }

  get def(): WeaponDef {
    return WEAPONS[this.current];
  }

  get isReloading(): boolean {
    return this.reloadTime > 0;
  }

  get reloadRatio(): number {
    return this.reloadTotal > 0 ? 1 - this.reloadTime / this.reloadTotal : 0;
  }

  get isBusy(): boolean {
    return this.switchTimer > 0 || this.reloadTime > 0;
  }

  reset(): void {
    this.current = 'pulse';
    this.ammo = fullAmmo();
    this.cooldown = 0;
    this.switchTimer = 0;
    this.reloadTime = 0;
    this.reloadTotal = 0;
    this.autoReload = -1;
    this.recoil = 0;
    this.swayX = 0;
    this.swayY = 0;
    for (const id of WEAPON_IDS) {
      this.models[id].group.visible = id === this.current;
      this.resetGunRig(this.models[id]);
    }
    this.root.visible = true;
  }

  setPrimary(id: WeaponId): void {
    if (!WEAPONS[id]) return;
    this.current = id;
    this.ammo = fullAmmo();
    this.cooldown = 0;
    this.switchTimer = 0;
    this.reloadTime = 0;
    this.reloadTotal = 0;
    this.autoReload = -1;
    this.recoil = 0;
    for (const weaponId of WEAPON_IDS) this.models[weaponId].group.visible = weaponId === id;
    this.resetGunRig(this.models[id]);
  }

  setAR(active: boolean): void {
    this.root.visible = !active;
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  switchTo(id: WeaponId): void {
    if (id === this.current || this.switchTimer > 0) return;
    this.current = id;
    this.switchTimer = 0.36;
    this.reloadTime = 0;
    this.reloadTotal = 0;
    this.cooldown = Math.max(this.cooldown, 0.18);
    for (const weaponId of WEAPON_IDS) this.models[weaponId].group.visible = weaponId === id;
    this.resetGunRig(this.models[id]);
    this.audio.play('reload');
  }

  next(): void {
    const index = WEAPON_IDS.indexOf(this.current);
    this.switchTo(WEAPON_IDS[(index + 1) % WEAPON_IDS.length]);
  }

  startReload(): void {
    if (this.reloadTime > 0 || this.switchTimer > 0) return;
    const def = this.def;
    if (this.ammo[this.current] >= def.mag) return;
    this.reloadTotal = def.reload;
    this.reloadTime = def.reload;
    this.autoReload = -1;
    this.audio.play('reload');
    this.playRigAction('reload', def.reload);
  }

  update(dt: number, moveAmount: number, lookDX: number, lookDY: number, firing = false): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.switchTimer = Math.max(0, this.switchTimer - dt);

    if (this.reloadTime > 0) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0) {
        this.ammo[this.current] = this.def.mag;
        this.reloadTime = 0;
        this.reloadTotal = 0;
      }
    }

    if (this.autoReload > 0) {
      this.autoReload -= dt;
      if (this.autoReload <= 0) {
        this.autoReload = -1;
        this.startReload();
      }
    }

    // Auto-reload is always enabled: top up after a short pause whenever the
    // magazine drops below 30%, without waiting for a manual reload tap.
    if (
      !firing &&
      this.reloadTime === 0 &&
      this.switchTimer === 0 &&
      this.autoReload < 0 &&
      this.cooldown === 0
    ) {
      const ratio = this.ammo[this.current] / Math.max(1, this.def.mag);
      if (this.ammo[this.current] > 0 && ratio <= 0.3) {
        this.autoReload = 0.4;
      }
    }

    this.recoil *= Math.exp(-13 * dt);
    this.flashLife = Math.max(0, this.flashLife - dt);
    const flashMaterial = this.flash.material as THREE.SpriteMaterial;
    flashMaterial.opacity = this.flashLife > 0 ? Math.min(1, this.flashLife * 18) : 0;
    this.flash.visible = this.flashLife > 0;

    // Weapon sway + walk bob.
    const portrait = window.innerHeight > window.innerWidth * 0.9;
    const targetX = portrait ? 0.2 : 0.3;
    const targetY = portrait ? -0.26 : -0.32;
    const targetZ = portrait ? -0.76 : -0.84;
    const targetScale = portrait ? 0.34 : 0.45;
    const layoutBlend = 1 - Math.exp(-8 * dt);
    this.basePosition.x += (targetX - this.basePosition.x) * layoutBlend;
    this.basePosition.y += (targetY - this.basePosition.y) * layoutBlend;
    this.basePosition.z += (targetZ - this.basePosition.z) * layoutBlend;
    this.root.scale.setScalar(this.root.scale.x + (targetScale - this.root.scale.x) * layoutBlend);

    const swayTargetX = THREE.MathUtils.clamp(-lookDX * 0.00006, -0.035, 0.035);
    const swayTargetY = THREE.MathUtils.clamp(-lookDY * 0.00006, -0.025, 0.025);
    this.swayX = THREE.MathUtils.lerp(this.swayX, swayTargetX, 1 - Math.exp(-10 * dt));
    this.swayY = THREE.MathUtils.lerp(this.swayY, swayTargetY, 1 - Math.exp(-10 * dt));
    this.bob += dt * (2.2 + moveAmount * 7.5);
    this.idle += dt;

    const reloadDip = this.reloadTime > 0 ? Math.sin((1 - this.reloadTime / Math.max(0.001, this.reloadTotal)) * Math.PI) : 0;
    const switchDip = this.switchTimer > 0 ? Math.sin((1 - this.switchTimer / 0.36) * Math.PI) : 0;
    const idleX = Math.sin(this.idle * 1.3) * 0.0025 + Math.sin(this.idle * 0.47) * 0.0015;
    const idleY = Math.cos(this.idle * 1.65) * 0.002 + Math.sin(this.idle * 0.31) * 0.001;

    this.root.position.x = this.basePosition.x + this.swayX + Math.sin(this.bob) * 0.008 * moveAmount + idleX;
    this.root.position.y = this.basePosition.y + this.swayY + Math.abs(Math.sin(this.bob)) * 0.012 * moveAmount - reloadDip * 0.16 - switchDip * 0.22 + idleY;
    this.root.position.z = this.basePosition.z + this.recoil * 0.9;
    this.root.rotation.x = this.recoil * 0.9 + reloadDip * 0.4 + switchDip * 0.5;
    this.root.rotation.z = reloadDip * 0.5 + this.swayX * 1.8;

    // Keep the flash pinned to the active muzzle.
    const model = this.models[this.current];
    if (model.rig) {
      model.rig.mixer.update(dt);
      if (model.rig.returnIn > 0) {
        model.rig.returnIn -= dt;
        if (model.rig.returnIn <= 0) this.fadeRigToIdle(model.rig);
      }
    }
    this.flash.position.copy(model.muzzle);
    if (this.flashLife > 0) {
      this.flash.scale.setScalar(0.3 + (1 - this.flashLife / 0.06) * 0.25);
      flashMaterial.color.copy(this.flashColor);
    }

    // Muzzle light spill across nearby enemies and props.
    this.muzzleLight.position.copy(model.muzzle);
    if (this.flashLife > 0) {
      this.muzzleLight.intensity = 7 * (this.flashLife / 0.06);
      this.muzzleLight.color.copy(this.flashColor);
    } else {
      this.muzzleLight.intensity = 0;
    }

    // Magazine drop and bolt travel during reloads / recoil.
    if (model.magazine) {
      const baseY = (model.magazine.userData.baseY as number | undefined) ?? model.magazine.position.y;
      model.magazine.position.y = baseY - reloadDip * 0.055;
    }
    if (model.bolt) {
      const baseZ = (model.bolt.userData.baseZ as number | undefined) ?? model.bolt.position.z;
      model.bolt.position.z = baseZ + this.recoil * 0.28;
    }
    const pump = model.group.getObjectByName('pump');
    if (pump) {
      const baseZ = (pump.userData.baseZ as number | undefined) ?? pump.position.z;
      pump.position.z = baseZ - reloadDip * 0.07;
    }

    this.updateEffects(dt);
  }

  tryFire(rateMultiplier = 1): WeaponDef | null {
    if (this.switchTimer > 0 || this.reloadTime > 0) return null;
    if (this.cooldown > 0) return null;

    const def = this.def;
    if (this.ammo[this.current] <= 0) {
      this.audio.play('empty');
      this.startReload();
      return null;
    }

    this.ammo[this.current] -= 1;
    this.cooldown = def.interval / rateMultiplier;
    this.recoil = Math.min(0.12, this.recoil + def.recoil + 0.02);
    this.flashLife = 0.06;
    this.flashColor.setHex(def.color);
    this.flash.position.copy(this.models[this.current].muzzle);
    const rig = this.models[this.current].rig;
    if (!rig || rig.current !== rig.shoot || rig.returnIn < 0.055) this.playRigAction('shoot');
    this.ejectShell();
    this.ejectSmoke();

    if (this.ammo[this.current] <= 0) this.autoReload = 0.2;
    return def;
  }

  getMuzzleWorld(out: THREE.Vector3): THREE.Vector3 {
    const model = this.models[this.current];
    out.copy(model.muzzle);
    this.root.updateWorldMatrix(true, false);
    return model.group.localToWorld(out);
  }

  get swayKick(): number {
    return this.recoil;
  }

  /** World-space muzzle in XR mode (viewmodel hidden), used for tracer origins. */
  getXRawMuzzle(camera: THREE.PerspectiveCamera, out: THREE.Vector3): THREE.Vector3 {
    this.muzzleWorld.copy(this.models[this.current].muzzle);
    camera.localToWorld(this.muzzleWorld);
    return out.copy(this.muzzleWorld);
  }
}
