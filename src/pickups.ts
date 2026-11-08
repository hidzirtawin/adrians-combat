import * as THREE from 'three';
import type { Player } from './player';

export type PickupKind = 'repair' | 'shield' | 'overcharge' | 'rapid' | 'freeze';

export const PICKUP_COLORS: Record<PickupKind, number> = {
  repair: 0x57ffa8,
  shield: 0x43f3ff,
  overcharge: 0xffc247,
  rapid: 0xff2fa8,
  freeze: 0x8fd4ff,
};

export const PICKUP_LABELS: Record<PickupKind, string> = {
  repair: 'HULL REPAIRED',
  shield: 'SHIELD RESTORED',
  overcharge: 'OVERCHARGE — 2× DAMAGE',
  rapid: 'RAPID FIRE',
  freeze: 'CRYO FIELD — ENEMIES SLOWED',
};

interface PickupItem {
  kind: PickupKind;
  group: THREE.Group;
  inner: THREE.Group;
  life: number;
  ttl: number;
  phase: number;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class PickupManager {
  readonly root = new THREE.Group();
  private items: PickupItem[] = [];
  private glowTex = makeGlowTexture();
  private elapsed = 0;
  private attract = false;

  constructor(parent: THREE.Object3D) {
    parent.add(this.root);
  }

  setAttract(active: boolean): void {
    this.attract = active;
  }

  spawn(position: THREE.Vector3, kind?: PickupKind): void {
    const chosen = kind ?? this.randomKind();
    const color = PICKUP_COLORS[chosen];

    const group = new THREE.Group();
    group.position.set(position.x, 0.02, position.z);

    const inner = new THREE.Group();
    inner.position.y = 1.0;
    group.add(inner);

    const icon = this.buildIcon(chosen, color);
    inner.add(icon);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.018, 6, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.name = 'ring';
    inner.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.01, 6, 36),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }),
    );
    ring2.rotation.x = Math.PI / 2;
    ring2.rotation.z = 0.4;
    ring2.name = 'ring2';
    inner.add(ring2);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        color,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(1.5);
    inner.add(glow);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 3, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.055,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    beam.position.y = 1.5;
    group.add(beam);

    const groundRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.03;
    group.add(groundRing);

    this.root.add(group);
    this.items.push({
      kind: chosen,
      group,
      inner,
      life: 0,
      ttl: 24,
      phase: Math.random() * Math.PI * 2,
    });
  }

  private randomKind(): PickupKind {
    const roll = Math.random();
    if (roll < 0.32) return 'repair';
    if (roll < 0.55) return 'shield';
    if (roll < 0.71) return 'overcharge';
    if (roll < 0.87) return 'rapid';
    return 'freeze';
  }

  private buildIcon(kind: PickupKind, color: number): THREE.Object3D {
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.5,
      metalness: 0.4,
      roughness: 0.3,
    });

    switch (kind) {
      case 'repair': {
        const group = new THREE.Group();
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.13), mat);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.13), mat);
        group.add(a, b);
        return group;
      }
      case 'shield':
        return new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), mat);
      case 'overcharge': {
        const group = new THREE.Group();
        const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 4), mat);
        bolt.position.y = 0.1;
        const bolt2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), mat);
        bolt2.position.y = -0.14;
        bolt2.rotation.z = Math.PI;
        group.add(bolt, bolt2);
        return group;
      }
      case 'rapid': {
        const group = new THREE.Group();
        for (let i = -1; i <= 1; i++) {
          const chevron = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.07), mat);
          chevron.position.set(i * 0.12, i * 0.06, 0);
          chevron.rotation.z = 0.5;
          group.add(chevron);
        }
        return group;
      }
      case 'freeze':
        return new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), mat);
    }
  }

  update(dt: number, player: Player, onCollect: (kind: PickupKind, at: THREE.Vector3) => void): void {
    this.elapsed += dt;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life += dt;

      item.inner.position.y = 1.0 + Math.sin(this.elapsed * 2.1 + item.phase) * 0.12;
      item.inner.rotation.y += dt * 1.35;
      for (const child of item.inner.children) {
        if (child.name === 'ring2') child.rotation.z += dt * 1.6;
      }
      item.group.visible = item.life < item.ttl - 4 || Math.sin(item.life * 18) > -0.2;

      const dx = item.group.position.x - player.pos.x;
      const dz = item.group.position.z - player.pos.z;
      const dist = Math.hypot(dx, dz);

      if (this.attract && dist < 11 && dist > 1.2) {
        const pull = Math.min(7, 3.5 + (11 - dist) * 0.9);
        item.group.position.x -= (dx / dist) * pull * dt;
        item.group.position.z -= (dz / dist) * pull * dt;
      }

      if (dx * dx + dz * dz < 2.1 && !player.dead) {
        this.root.remove(item.group);
        this.disposeItem(item);
        this.items.splice(i, 1);
        onCollect(item.kind, item.group.position.clone().setY(1.1));
        continue;
      }

      if (item.life >= item.ttl) {
        this.root.remove(item.group);
        this.disposeItem(item);
        this.items.splice(i, 1);
      }
    }
  }

  getMarkers(): Array<{ kind: PickupKind; x: number; z: number }> {
    return this.items.map((item) => ({
      kind: item.kind,
      x: item.group.position.x,
      z: item.group.position.z,
    }));
  }

  clear(): void {
    for (const item of this.items) {
      this.root.remove(item.group);
      this.disposeItem(item);
    }
    this.items.length = 0;
  }

  /** Free per-pickup GPU resources; the shared glow texture stays alive. */
  private disposeItem(item: PickupItem): void {
    item.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        for (const entry of material) entry.dispose();
      } else if (material) {
        material.dispose();
      }
    });
  }
}
