import * as THREE from 'three';

interface Tracer {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  ttl: number;
  width: number;
}

interface Ring {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  life: number;
  ttl: number;
  from: number;
  to: number;
}

interface DamageNumber {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  life: number;
  ttl: number;
  vy: number;
}

const MAX_PARTICLES = 700;

function makeRadialTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRingTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 5;
  ctx.shadowColor = 'rgba(255,255,255,1)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 12, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Pooled visual effects: tracers, sparks, shockwave rings and floating damage numbers. */
export class FX {
  private scene: THREE.Object3D;
  private camera: THREE.PerspectiveCamera;

  private particleGeo: THREE.BufferGeometry;
  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private baseColors: Float32Array;
  private velocities: Float32Array;
  private lives: Float32Array;
  private ttls: Float32Array;
  private particleCursor = 0;

  private tracers: Tracer[] = [];
  private rings: Ring[] = [];
  private numbers: DamageNumber[] = [];
  private numberCursor = 0;
  private numberCache = new Map<string, THREE.CanvasTexture>();

  private radialTex = makeRadialTexture();
  private ringTex = makeRingTexture();
  private sparkTex = makeRadialTexture();

  constructor(scene: THREE.Object3D, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    this.particlePositions = new Float32Array(MAX_PARTICLES * 3);
    this.particleColors = new Float32Array(MAX_PARTICLES * 3);
    this.baseColors = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.lives = new Float32Array(MAX_PARTICLES);
    this.ttls = new Float32Array(MAX_PARTICLES);
    this.particlePositions.fill(-1000);

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const points = new THREE.Points(
      this.particleGeo,
      new THREE.PointsMaterial({
        size: 0.16,
        map: this.sparkTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    points.frustumCulled = false;
    scene.add(points);

    // Tracer pool.
    const tracerGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
    for (let i = 0; i < 28; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x43f3ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(tracerGeo, material);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.tracers.push({ mesh, material, life: 0, ttl: 0.1, width: 0.02 });
    }

    // Shockwave ring pool.
    for (let i = 0; i < 14; i++) {
      const material = new THREE.SpriteMaterial({
        map: this.ringTex,
        color: 0x43f3ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      scene.add(sprite);
      this.rings.push({ sprite, material, life: 0, ttl: 0.5, from: 0.4, to: 3 });
    }

    // Damage-number pool.
    for (let i = 0; i < 20; i++) {
      const material = new THREE.SpriteMaterial({
        map: makeRadialTexture(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.renderOrder = 20;
      scene.add(sprite);
      this.numbers.push({ sprite, material, life: 0, ttl: 0.75, vy: 0 });
    }
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3, color: number, width = 0.022, life = 0.09): void {
    const entry = this.tracers.find((t) => !t.mesh.visible) ?? this.tracers[0];
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    if (length < 0.001) return;
    dir.normalize();

    entry.mesh.visible = true;
    entry.mesh.position.copy(from).addScaledVector(dir, length / 2);
    entry.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    entry.mesh.scale.set(width, length, width);
    entry.material.color.setHex(color);
    entry.material.opacity = 1;
    entry.life = 0;
    entry.ttl = life;
    entry.width = width;
  }

  burst(pos: THREE.Vector3, color: number, count = 16, speed = 7, life = 0.55, spread = 1): void {
    const colorObj = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const index = this.particleCursor;
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;

      this.particlePositions[index * 3] = pos.x + (Math.random() - 0.5) * 0.2;
      this.particlePositions[index * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.2;
      this.particlePositions[index * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.2;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.25 + Math.random() * 0.9);
      this.velocities[index * 3] = Math.sin(phi) * Math.cos(theta) * s * spread;
      this.velocities[index * 3 + 1] = Math.cos(phi) * s * 0.85;
      this.velocities[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * s * spread;

      this.baseColors[index * 3] = colorObj.r;
      this.baseColors[index * 3 + 1] = colorObj.g;
      this.baseColors[index * 3 + 2] = colorObj.b;

      const ttl = life * (0.5 + Math.random() * 0.9);
      this.lives[index] = ttl;
      this.ttls[index] = ttl;
    }
  }

  ring(pos: THREE.Vector3, color: number, to = 3, life = 0.5, from = 0.4): void {
    const entry = this.rings.find((r) => !r.sprite.visible) ?? this.rings[0];
    entry.sprite.visible = true;
    entry.sprite.position.copy(pos);
    entry.material.color.setHex(color);
    entry.material.opacity = 0.9;
    entry.sprite.scale.setScalar(from);
    entry.life = 0;
    entry.ttl = life;
    entry.from = from;
    entry.to = to;
  }

  damageNumber(pos: THREE.Vector3, amount: number, color = '#9ff8ff', big = false): void {
    const entry = this.numbers[this.numberCursor];
    this.numberCursor = (this.numberCursor + 1) % this.numbers.length;

    const text = String(Math.round(amount));
    const key = `${text}|${color}|${big ? 1 : 0}`;
    let tex = this.numberCache.get(key);
    if (!tex) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 80;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${big ? 900 : 700} ${big ? 56 : 44}px Orbitron, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      if (this.numberCache.size > 160) {
        const first = this.numberCache.keys().next().value;
        if (first) {
          const old = this.numberCache.get(first);
          old?.dispose();
          this.numberCache.delete(first);
        }
      }
      this.numberCache.set(key, tex);
    }

    entry.material.map = tex;
    entry.material.needsUpdate = true;
    entry.material.opacity = 1;
    entry.sprite.visible = true;
    entry.sprite.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.35, 0.25, (Math.random() - 0.5) * 0.35));
    entry.sprite.scale.set(big ? 1.8 : 1.15, big ? 0.9 : 0.58, 1);
    entry.life = 0;
    entry.ttl = big ? 0.95 : 0.7;
    entry.vy = 1.6 + Math.random() * 0.5;
  }

  update(dt: number): void {
    // Particles.
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.lives[i] <= 0) continue;
      const i3 = i * 3;
      this.lives[i] -= dt;
      if (this.lives[i] <= 0) {
        this.particlePositions[i3 + 1] = -1000;
        this.particleColors[i3] = 0;
        this.particleColors[i3 + 1] = 0;
        this.particleColors[i3 + 2] = 0;
        continue;
      }
      const ratio = this.lives[i] / this.ttls[i];
      this.particlePositions[i3] += this.velocities[i3] * dt;
      this.particlePositions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.particlePositions[i3 + 2] += this.velocities[i3 + 2] * dt;
      this.velocities[i3] *= 1 - 2.5 * dt;
      this.velocities[i3 + 1] = this.velocities[i3 + 1] * (1 - 1.6 * dt) - 5.5 * dt;
      this.velocities[i3 + 2] *= 1 - 2.5 * dt;
      this.particleColors[i3] = this.baseColors[i3] * ratio;
      this.particleColors[i3 + 1] = this.baseColors[i3 + 1] * ratio;
      this.particleColors[i3 + 2] = this.baseColors[i3 + 2] * ratio;
    }
    (this.particleGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;

    // Tracers.
    for (const t of this.tracers) {
      if (t.life >= t.ttl) continue;
      t.life += dt;
      const ratio = Math.max(0, 1 - t.life / t.ttl);
      t.material.opacity = ratio;
      t.mesh.scale.x = t.width * (0.55 + ratio * 0.45);
      t.mesh.scale.z = t.mesh.scale.x;
      if (t.life >= t.ttl) t.mesh.visible = false;
    }

    // Rings.
    for (const r of this.rings) {
      if (r.life >= r.ttl) continue;
      r.life += dt;
      const t = Math.min(1, r.life / r.ttl);
      const eased = 1 - Math.pow(1 - t, 3);
      const scale = r.from + (r.to - r.from) * eased;
      r.sprite.scale.set(scale, scale, 1);
      r.material.opacity = 0.85 * (1 - t);
      if (t >= 1) r.sprite.visible = false;
    }

    // Damage numbers.
    for (const n of this.numbers) {
      if (n.life >= n.ttl) continue;
      n.life += dt;
      const t = Math.min(1, n.life / n.ttl);
      n.sprite.position.y += n.vy * dt;
      n.vy *= 1 - 1.8 * dt;
      n.material.opacity = 1 - t * t;
      if (t >= 1) n.sprite.visible = false;
    }
  }

  clear(): void {
    this.lives.fill(0);
    this.particlePositions.fill(-1000);
    this.particleColors.fill(0);
    this.ttls.fill(0);
    for (const t of this.tracers) {
      t.mesh.visible = false;
      t.life = t.ttl;
    }
    for (const r of this.rings) {
      r.sprite.visible = false;
      r.life = r.ttl;
    }
    for (const n of this.numbers) {
      n.sprite.visible = false;
      n.life = n.ttl;
    }
    (this.particleGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
}
