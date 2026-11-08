import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { getModel, getModelMetrics, type ModelKey } from './assets';

export type GunId = 'pulse' | 'viper' | 'arx' | 'scatter' | 'longshot' | 'rail';

export interface GunVisual {
  asset: ModelKey;
  /** Longest local dimension after scaling. Keeps every gun the same size. */
  length: number;
  yaw: number;
  pitch: number;
  roll: number;
  offset: [number, number, number];
  muzzle: [number, number, number];
  eject: [number, number, number];
  tint: number;
}

/**
 * Six distinct authored models. The AKM is the heavy rifle, the SCAR-like
 * rifle is the pulse carbine, and the rest fill their own roles.
 */
export const GUN_VISUALS: Record<GunId, GunVisual> = {
  pulse: {
    asset: 'rifle',
    length: 1.75,
    yaw: -Math.PI / 2,
    pitch: 0,
    roll: 0,
    offset: [0, 0, 0],
    muzzle: [0, 0.08, -0.9],
    eject: [0.07, 0.05, 0.02],
    tint: 0x43f3ff,
  },
  viper: {
    asset: 'smg',
    length: 1.55,
    yaw: -Math.PI / 2,
    pitch: 0,
    roll: 0,
    offset: [0, 0, 0],
    muzzle: [0, 0.06, -0.8],
    eject: [0.06, 0.04, 0.04],
    tint: 0x7dff6a,
  },
  arx: {
    asset: 'akm',
    length: 1.75,
    yaw: -Math.PI / 2,
    pitch: 0,
    roll: 0,
    offset: [0, 0, 0],
    muzzle: [0, 0.08, -0.9],
    eject: [0.07, 0.05, 0.02],
    tint: 0xffc247,
  },
  scatter: {
    asset: 'shotgun',
    length: 1.7,
    yaw: -Math.PI / 2,
    pitch: 0,
    roll: 0,
    offset: [0, 0, 0],
    muzzle: [0, 0.06, -0.88],
    eject: [0.06, 0.04, 0.02],
    tint: 0xffc247,
  },
  longshot: {
    asset: 'sniper',
    length: 1.9,
    yaw: -Math.PI / 2,
    pitch: 0,
    roll: 0,
    offset: [0, 0, 0],
    muzzle: [0, 0.08, -1.0],
    eject: [0.07, 0.05, 0.02],
    tint: 0x8ff8ff,
  },
  rail: {
    asset: 'coil',
    length: 1.95,
    yaw: -Math.PI / 2,
    pitch: 0,
    roll: 0,
    offset: [0, 0, 0],
    muzzle: [0, 0.09, -1.02],
    eject: [0.08, 0.06, 0.02],
    tint: 0xff2fa8,
  },
};

export interface BuiltGun {
  root: THREE.Group;
  materials: Array<{ material: THREE.MeshStandardMaterial; name: string; base: THREE.Color }>;
}

/**
 * Builds a centered, normalized gun for either the viewmodel or the Armory
 * studio. Materials are cloned so tinting one weapon never affects another.
 */
export function createGunModel(id: GunId, tint = true): BuiltGun | null {
  const visual = GUN_VISUALS[id];
  const asset = getModel(visual.asset);
  const metrics = getModelMetrics(visual.asset);
  if (!asset || !metrics) return null;

  const model = cloneSkeleton(asset.scene) as THREE.Group;
  const longest = Math.max(metrics.width, metrics.height, metrics.depth);
  const scale = visual.length / Math.max(0.0001, longest);
  // All six authored weapons use +X as the barrel axis.
  const yaw = Math.PI / 2;
  model.scale.setScalar(scale);
  model.rotation.set(visual.pitch, yaw, visual.roll);

  const euler = new THREE.Euler(visual.pitch, yaw, visual.roll);
  const center = metrics.center.clone().multiplyScalar(scale).applyEuler(euler);
  model.position.copy(center).multiplyScalar(-1).add(new THREE.Vector3(...visual.offset));

  const accent = new THREE.Color(visual.tint);
  const materials: BuiltGun['materials'] = [];
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    const entries = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = entries.map((entry) => {
      const material = (entry as THREE.MeshStandardMaterial).clone();
      const name = (entry.name || '').toLowerCase();
      material.envMapIntensity = 1.3;
      if (tint) {
        if (
          name.includes('wood') ||
          name.includes('bakelite') ||
          name.includes('plastic') ||
          name.includes('mag') ||
          name.includes('main') ||
          name.includes('grey') ||
          name.includes('metal')
        ) {
          material.color.lerp(accent, 0.34);
        }
      }
      materials.push({ material, name, base: material.color.clone() });
      return material;
    });
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
  });

  return { root: model, materials };
}
