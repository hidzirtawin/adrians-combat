import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type ModelKey =
  | 'akm'
  | 'rifle'
  | 'smg'
  | 'shotgun'
  | 'sniper'
  | 'coil'
  | 'shipStriker'
  | 'shipOmen'
  | 'phantom'
  | 'hexerRpg'
  | 'yeti'
  | 'zombie'
  | 'alien'
  | 'raptor'
  | 'trex'
  | 'robot';

export interface ModelAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface ModelMetrics {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  width: number;
  height: number;
  depth: number;
}

const base = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

const MODEL_URLS: Record<ModelKey, string> = {
  akm: `${base}models/akm.glb`,
  rifle: `${base}models/rifle.glb`,
  smg: `${base}models/smg.glb`,
  shotgun: `${base}models/shotgun.glb`,
  sniper: `${base}models/sniper.glb`,
  coil: `${base}models/coil.glb`,
  shipStriker: `${base}models/ship-striker.glb`,
  shipOmen: `${base}models/ship-omen.glb`,
  phantom: `${base}models/phantom.glb`,
  hexerRpg: `${base}models/hexer-rpg.glb`,
  yeti: `${base}models/yeti.glb`,
  zombie: `${base}models/zombie.glb`,
  alien: `${base}models/alien.glb`,
  raptor: `${base}models/raptor.glb`,
  trex: `${base}models/trex.glb`,
  robot: `${base}models/robot.glb`,
};

const cache = new Map<ModelKey, ModelAsset>();
const pending = new Map<ModelKey, Promise<ModelAsset | null>>();
const metricsCache = new Map<ModelKey, ModelMetrics>();
const barrelCache = new Map<ModelKey, 1 | -1>();
const loader = new GLTFLoader();

export function getModel(key: ModelKey): ModelAsset | undefined {
  return cache.get(key);
}

export function loadModel(key: ModelKey): Promise<ModelAsset | null> {
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const promise = new Promise<ModelAsset | null>((resolve) => {
    loader.load(
      MODEL_URLS[key],
      (gltf) => {
        const asset: ModelAsset = { scene: gltf.scene, animations: gltf.animations };
        cache.set(key, asset);
        pending.delete(key);
        resolve(asset);
      },
      undefined,
      (error) => {
        console.warn(`[Assets] failed to load ${key}`, error);
        pending.delete(key);
        resolve(null);
      },
    );
  });
  pending.set(key, promise);
  return promise;
}

export function preloadModels(keys: ModelKey[]): void {
  for (const key of keys) void loadModel(key);
}

/**
 * Which end of the longest axis is the barrel? The muzzle end usually has a
 * much smaller cross-section than the stock. +1 means barrel is +X, -1 means -X.
 */
export function getBarrelSign(key: ModelKey): 1 | -1 {
  const cached = barrelCache.get(key);
  if (cached) return cached;
  const asset = cache.get(key);
  if (!asset) return -1;

  asset.scene.updateMatrixWorld(true);
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const v = new THREE.Vector3();
  asset.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const positions = mesh.geometry.attributes.position;
    if (!positions) return;
    const skinned = mesh as THREE.SkinnedMesh;
    const step = Math.max(1, Math.floor(positions.count / 2200));
    for (let i = 0; i < positions.count; i += step) {
      if (skinned.isSkinnedMesh) skinned.getVertexPosition(i, v);
      else v.fromBufferAttribute(positions, i);
      v.applyMatrix4(mesh.matrixWorld);
      xs.push(v.x);
      ys.push(v.y);
      zs.push(v.z);
    }
  });
  if (xs.length < 20) return -1;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;

  // The grip/stock cluster hangs below the receiver. The barrel is on the
  // opposite side of that low cluster.
  let lowX = 0;
  let lowCount = 0;
  const lowThreshold = minY + (maxY - minY) * 0.2;
  for (let i = 0; i < xs.length; i++) {
    if (ys[i] <= lowThreshold) {
      lowX += xs[i];
      lowCount++;
    }
  }
  if (lowCount > 0) {
    const gripX = lowX / lowCount;
    const sign: 1 | -1 = gripX < centerX ? 1 : -1;
    barrelCache.set(key, sign);
    return sign;
  }

  const edge = (maxX - minX) * 0.18;
  const spread = (test: (x: number) => boolean): number => {
    let minY2 = Infinity, maxY2 = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      if (!test(xs[i])) continue;
      minY2 = Math.min(minY2, ys[i]);
      maxY2 = Math.max(maxY2, ys[i]);
      minZ = Math.min(minZ, zs[i]);
      maxZ = Math.max(maxZ, zs[i]);
    }
    return Math.max(maxY2 - minY2, maxZ - minZ);
  };
  const lowSpread = spread((x) => x < minX + edge);
  const highSpread = spread((x) => x > maxX - edge);
  const sign: 1 | -1 = lowSpread < highSpread ? -1 : 1;
  barrelCache.set(key, sign);
  return sign;
}

/**
 * Measures the *skinned* bind pose, not the raw geometry box. Quaternius
 * characters use a 100x armature scale, so a naive Box3 is wildly wrong.
 */
export function getModelMetrics(key: ModelKey): ModelMetrics | null {
  const asset = cache.get(key);
  if (!asset) return null;
  const cached = metricsCache.get(key);
  if (cached) return cached;

  asset.scene.updateMatrixWorld(true);
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const v = new THREE.Vector3();

  asset.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const positions = mesh.geometry.attributes.position;
    if (!positions) return;
    const skinned = mesh as THREE.SkinnedMesh;
    const step = Math.max(1, Math.floor(positions.count / 2500));
    for (let i = 0; i < positions.count; i += step) {
      if (skinned.isSkinnedMesh) skinned.getVertexPosition(i, v);
      else v.fromBufferAttribute(positions, i);
      v.applyMatrix4(mesh.matrixWorld);
      min.min(v);
      max.max(v);
    }
  });

  if (!Number.isFinite(min.x)) return null;
  const metrics: ModelMetrics = {
    min,
    max,
    center: new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5),
    width: max.x - min.x,
    height: max.y - min.y,
    depth: max.z - min.z,
  };
  metricsCache.set(key, metrics);
  return metrics;
}

export function preloadGameAssets(): void {
  preloadModels(['akm', 'rifle', 'smg', 'shotgun', 'sniper', 'coil', 'shipStriker', 'shipOmen', 'phantom', 'hexerRpg', 'yeti', 'zombie', 'alien', 'raptor', 'trex', 'robot']);
}
