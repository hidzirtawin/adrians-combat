import * as THREE from 'three';

interface Obstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface CoverSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: number;
}

const COVERS: CoverSpec[] = [
  { x: 0, z: -3, w: 4.2, d: 1.3, h: 2.1, color: 0x43f3ff },
  { x: -12, z: -5, w: 1.3, d: 5.2, h: 2.6, color: 0x43f3ff },
  { x: 12, z: -5, w: 1.3, d: 5.2, h: 2.6, color: 0xff2fa8 },
  { x: -8.5, z: 9, w: 4.2, d: 1.3, h: 2.2, color: 0xff2fa8 },
  { x: 8.5, z: 10, w: 1.3, d: 4.4, h: 2.5, color: 0x43f3ff },
  { x: 0, z: -16, w: 6, d: 1.4, h: 2.3, color: 0x43f3ff },
  { x: -17, z: 7, w: 3.6, d: 1.3, h: 1.9, color: 0xff2fa8 },
  { x: 17, z: 7, w: 3.6, d: 1.3, h: 1.9, color: 0x43f3ff },
  { x: -6.5, z: -12, w: 1.3, d: 3.6, h: 2.0, color: 0xffc247 },
  { x: 6.5, z: -12, w: 1.3, d: 3.6, h: 2.0, color: 0x43f3ff },
];

const PILLARS = 10;
const ARENA_RADIUS = 26;

/** Procedural neon arena: floor, cover, perimeter, sky, stars, dust and holographic decor. */
export class Arena {
  readonly group = new THREE.Group();
  readonly obstacles: Obstacle[] = [];
  readonly radius = ARENA_RADIUS;
  freeRoam = false;

  private scene: THREE.Scene;
  private floorMaterial: THREE.MeshStandardMaterial;
  private grid: THREE.GridHelper;
  private sky: THREE.Mesh;
  private stars: THREE.Points;
  private dust: THREE.Points;
  private dustBase: Float32Array;
  private monoliths: THREE.Group;
  private holoRings: THREE.Mesh[] = [];
  private accentLights: THREE.PointLight[] = [];
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group.name = 'arena';
    scene.add(this.group);

    scene.fog = new THREE.FogExp2(0x03070d, 0.016);

    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x050a11,
      roughness: 0.52,
      metalness: 0.72,
      transparent: true,
      opacity: 1,
    });

    this.buildLights();
    this.buildFloor();
    this.grid = this.buildGrid();
    this.buildPerimeter();
    this.buildCover();
    this.buildPillars();
    this.buildCenter();
    this.buildHoloRings();
    this.sky = this.buildSky();
    this.stars = this.buildStars();
    this.dust = this.buildDust();
    this.dustBase = (this.dust.geometry.getAttribute('position') as THREE.BufferAttribute).array.slice() as Float32Array;
    this.monoliths = this.buildMonoliths();
  }

  private buildLights(): void {
    const hemi = new THREE.HemisphereLight(0x2c5f75, 0x03050a, 0.85);
    this.group.add(hemi);

    const key = new THREE.DirectionalLight(0x9fefff, 2.1);
    key.position.set(-14, 25, 12);
    this.group.add(key);

    const rim = new THREE.DirectionalLight(0xff2fa8, 1.15);
    rim.position.set(18, 12, -20);
    this.group.add(rim);

    const cyan = new THREE.PointLight(0x43f3ff, 180, 52, 1.7);
    cyan.position.set(-16, 7, 14);
    this.group.add(cyan);
    this.accentLights.push(cyan);

    const magenta = new THREE.PointLight(0xff2fa8, 150, 48, 1.7);
    magenta.position.set(17, 6, -8);
    this.group.add(magenta);
    this.accentLights.push(magenta);

    const amber = new THREE.PointLight(0xffc247, 60, 30, 1.8);
    amber.position.set(0, 3, 0);
    this.group.add(amber);
    this.accentLights.push(amber);
  }

  private buildFloor(): void {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA_RADIUS + 1.6, 96), this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = false;
    this.group.add(floor);

    // Glowing concentric inlays.
    for (const radius of [5, 10, 15, 20, 25]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.035, radius + 0.035, 128),
        new THREE.MeshBasicMaterial({
          color: radius === 25 ? 0x43f3ff : 0x0d3946,
          transparent: true,
          opacity: radius === 25 ? 0.55 : 0.4,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.012;
      this.group.add(ring);
    }

    const crossMat = new THREE.MeshBasicMaterial({
      color: 0x0c3945,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lineGeo = new THREE.PlaneGeometry(ARENA_RADIUS * 2, 0.03);
    for (let i = 0; i < 4; i++) {
      const line = new THREE.Mesh(lineGeo, crossMat);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = (i * Math.PI) / 4;
      line.position.y = 0.014;
      this.group.add(line);
    }
  }

  private buildGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(ARENA_RADIUS * 2, 52, 0x1a7284, 0x0a2c38);
    grid.position.y = 0.018;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    (grid.material as THREE.Material).depthWrite = false;
    this.group.add(grid);
    return grid;
  }

  private buildPerimeter(): void {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(ARENA_RADIUS + 0.6, 0.055, 8, 128),
      new THREE.MeshBasicMaterial({ color: 0x43f3ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.06;
    this.group.add(rim);

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(ARENA_RADIUS + 0.6, ARENA_RADIUS + 0.6, 3.2, 96, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x43f3ff,
        transparent: true,
        opacity: 0.045,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    wall.position.y = 1.6;
    this.group.add(wall);

    // Vertical fence lines.
    const fenceMat = new THREE.LineBasicMaterial({ color: 0x1f8fa3, transparent: true, opacity: 0.22 });
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * (ARENA_RADIUS + 0.6), 0, Math.sin(a) * (ARENA_RADIUS + 0.6)));
      points.push(new THREE.Vector3(Math.cos(a) * (ARENA_RADIUS + 0.6), 3.2, Math.sin(a) * (ARENA_RADIUS + 0.6)));
    }
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * (ARENA_RADIUS + 0.6), 0, Math.sin(a) * (ARENA_RADIUS + 0.6)));
      points.push(new THREE.Vector3(Math.cos(a) * (ARENA_RADIUS + 0.6), 3.2, Math.sin(a) * (ARENA_RADIUS + 0.6)));
    }
    const fenceGeo = new THREE.BufferGeometry().setFromPoints(points);
    this.group.add(new THREE.LineSegments(fenceGeo, fenceMat));

    // Beacon posts.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
      const post = new THREE.Group();
      post.position.set(Math.cos(a) * 26.6, 0, Math.sin(a) * 26.6);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 4.4, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x0a141d, metalness: 0.8, roughness: 0.4 }),
      );
      body.position.y = 2.2;
      post.add(body);

      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 2.8, 0.06),
        new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xff2fa8 : 0x43f3ff }),
      );
      strip.position.set(0, 2.6, 0.1);
      post.add(strip);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.08, 0.34),
        new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xff2fa8 : 0x9ff8ff }),
      );
      cap.position.y = 4.45;
      post.add(cap);
      this.group.add(post);
    }
  }

  private buildCover(): void {
    for (const spec of COVERS) {
      const geo = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x091520,
        roughness: 0.35,
        metalness: 0.9,
        emissive: new THREE.Color(spec.color).multiplyScalar(0.035),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(spec.x, spec.h / 2, spec.z);
      this.group.add(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: spec.color, transparent: true, opacity: 0.35 }),
      );
      edges.position.copy(mesh.position);
      this.group.add(edges);

      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(spec.w * 0.82, 0.045, 0.045),
        new THREE.MeshBasicMaterial({ color: spec.color }),
      );
      strip.position.set(spec.x, spec.h + 0.02, spec.z + spec.d / 2 - 0.03);
      this.group.add(strip);

      this.obstacles.push({
        minX: spec.x - spec.w / 2,
        maxX: spec.x + spec.w / 2,
        minZ: spec.z - spec.d / 2,
        maxZ: spec.z + spec.d / 2,
      });
    }
  }

  private buildPillars(): void {
    for (let i = 0; i < PILLARS; i++) {
      const a = (i / PILLARS) * Math.PI * 2 + Math.PI / PILLARS;
      const x = Math.cos(a) * 22.6;
      const z = Math.sin(a) * 22.6;
      const color = i % 2 === 0 ? 0x43f3ff : 0xff2fa8;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 9, 1.15),
        new THREE.MeshStandardMaterial({ color: 0x071019, metalness: 0.9, roughness: 0.3 }),
      );
      body.position.set(x, 4.5, z);
      this.group.add(body);

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(body.geometry),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }),
      );
      edge.position.copy(body.position);
      this.group.add(edge);

      for (const side of [-1, 1]) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 6.4, 0.05),
          new THREE.MeshBasicMaterial({ color }),
        );
        strip.position.set(x + side * 0.58, 4.6, z + 0.58);
        this.group.add(strip);
      }

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(1.9, 0.02, 6, 40),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending }),
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(x, 8.4, z);
      this.group.add(halo);

      this.obstacles.push({ minX: x - 0.65, maxX: x + 0.65, minZ: z - 0.65, maxZ: z + 0.65 });
    }
  }

  private buildCenter(): void {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 4, 0.14, 64),
      new THREE.MeshStandardMaterial({ color: 0x08131d, metalness: 0.9, roughness: 0.32 }),
    );
    base.position.y = 0.07;
    this.group.add(base);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.1, 3.25, 96),
      new THREE.MeshBasicMaterial({ color: 0x43f3ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    this.group.add(ring);

    const inner = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.2, 64),
      new THREE.MeshBasicMaterial({ color: 0xff2fa8, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.15;
    this.group.add(inner);
  }

  private buildHoloRings(): void {
    const specs = [
      { r: 7, y: 10.5, color: 0x43f3ff, tilt: 0.1 },
      { r: 10.5, y: 13, color: 0xff2fa8, tilt: -0.14 },
      { r: 14, y: 16, color: 0x43f3ff, tilt: 0.18 },
    ];
    for (const spec of specs) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(spec.r, 0.035, 6, 96),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.26,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI / 2 + spec.tilt;
      ring.position.y = spec.y;
      this.group.add(ring);
      this.holoRings.push(ring);
    }
  }

  private buildSky(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(120, 32, 24);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x010209) },
        horizonColor: { value: new THREE.Color(0x061822) },
        glowColor: { value: new THREE.Color(0x0c4f63) },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 glowColor;
        void main() {
          float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(horizonColor, topColor, pow(h, 1.5));
          float horizon = pow(max(0.0, 1.0 - abs(vDir.y) * 3.2), 3.0);
          col += glowColor * horizon * 0.35;
          float band = smoothstep(0.02, 0.0, abs(vDir.y - 0.015));
          col += glowColor * band * 0.5;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.position.y = 6;
    this.group.add(sky);
    return sky;
  }

  private buildStars(): THREE.Points {
    const count = 1100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const radius = 78 + Math.random() * 34;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius + 8;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      color.setHSL(0.52 + Math.random() * 0.12, 0.6, 0.55 + Math.random() * 0.35);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true, depthWrite: false }),
    );
    this.group.add(points);
    return points;
  }

  private buildDust(): THREE.Points {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * ARENA_RADIUS;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.random() * 9 + 0.2;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.045,
        color: 0x8feaff,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.group.add(points);
    return points;
  }

  private buildMonoliths(): THREE.Group {
    const group = new THREE.Group();
    const specs = [
      { a: 0.2, r: 52, w: 7, h: 26, color: 0x0a2a38 },
      { a: 1.15, r: 60, w: 9, h: 38, color: 0x0b2633 },
      { a: 2.05, r: 48, w: 6, h: 20, color: 0x121e32 },
      { a: 3.0, r: 58, w: 8, h: 31, color: 0x0a2a38 },
      { a: 3.9, r: 50, w: 5, h: 22, color: 0x1a1630 },
      { a: 4.8, r: 62, w: 10, h: 42, color: 0x0b2633 },
      { a: 5.6, r: 54, w: 7, h: 28, color: 0x121e32 },
    ];
    for (const spec of specs) {
      const geo = new THREE.BoxGeometry(spec.w, spec.h, spec.w * 0.8);
      const mat = new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.4, roughness: 0.85 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.cos(spec.a) * spec.r, spec.h / 2 - 2, Math.sin(spec.a) * spec.r);
      mesh.rotation.y = spec.a;
      group.add(mesh);

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: spec.a % 2 === 0 ? 0x1c6c80 : 0x7a2360, transparent: true, opacity: 0.3 }),
      );
      edge.position.copy(mesh.position);
      edge.rotation.copy(mesh.rotation);
      group.add(edge);
    }
    this.group.add(group);
    return group;
  }

  update(dt: number): void {
    this.elapsed += dt;
    for (let i = 0; i < this.holoRings.length; i++) {
      const ring = this.holoRings[i];
      ring.rotation.z += dt * (0.05 + i * 0.022) * (i % 2 === 0 ? 1 : -1);
    }

    const attr = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      const baseY = this.dustBase[i * 3 + 1];
      arr[i * 3 + 1] = ((baseY + this.elapsed * 0.16 + i * 0.013) % 9.2) + 0.2;
      arr[i * 3] = this.dustBase[i * 3] + Math.sin(this.elapsed * 0.35 + i) * 0.18;
      arr[i * 3 + 2] = this.dustBase[i * 3 + 2] + Math.cos(this.elapsed * 0.28 + i * 1.7) * 0.18;
    }
    attr.needsUpdate = true;

    for (const light of this.accentLights) {
      light.intensity = light.intensity * 0.98 + (light.userData.base ?? light.intensity) * 0.02;
    }
  }

  setAR(active: boolean): void {
    this.scene.fog = active ? null : new THREE.FogExp2(0x03070d, 0.016);
    this.floorMaterial.opacity = active ? 0.22 : 1;
    this.floorMaterial.transparent = true;
    this.floorMaterial.roughness = active ? 0.9 : 0.52;
    const gridMat = this.grid.material as THREE.Material;
    gridMat.opacity = active ? 0.85 : 0.5;
    this.sky.visible = !active;
    this.stars.visible = !active;
    this.dust.visible = !active;
    this.monoliths.visible = !active;
    for (const ring of this.holoRings) ring.visible = true;
  }

  /** Camera-AR mode: no walls, no cover collision, enemies can surround the player. */
  setFreeRoam(active: boolean): void {
    this.freeRoam = active;
  }

  /** Finds a valid spawn position on the outer ring, away from the player and cover. */
  randomSpawnPoint(playerPos: THREE.Vector3, minDistance = 8, maxRadius = 23): THREE.Vector3 {
    const result = new THREE.Vector3();
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 11 + Math.random() * (maxRadius - 11);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (this.isInsideObstacle(x, z, 1.2)) continue;
      const dx = x - playerPos.x;
      const dz = z - playerPos.z;
      if (Math.hypot(dx, dz) < minDistance) continue;
      result.set(x, 0, z);
      return result;
    }
    const angle = Math.random() * Math.PI * 2;
    result.set(Math.cos(angle) * 19, 0, Math.sin(angle) * 19);
    return result;
  }

  isInsideObstacle(x: number, z: number, pad = 0): boolean {
    if (this.freeRoam) return false;
    for (const o of this.obstacles) {
      if (x > o.minX - pad && x < o.maxX + pad && z > o.minZ - pad && z < o.maxZ + pad) return true;
    }
    return false;
  }

  /** Pushes a capsule/circle out of cover boxes and back inside the arena wall. */
  resolveCollision(pos: THREE.Vector3, radius = 0.5): void {
    if (this.freeRoam) return;
    for (let pass = 0; pass < 2; pass++) {
      for (const o of this.obstacles) {
        const closestX = Math.max(o.minX, Math.min(pos.x, o.maxX));
        const closestZ = Math.max(o.minZ, Math.min(pos.z, o.maxZ));
        let dx = pos.x - closestX;
        let dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq >= radius * radius) continue;

        if (distSq < 0.000001) {
          // Center is inside the box: push out via the nearest edge.
          const left = Math.abs(pos.x - o.minX);
          const right = Math.abs(o.maxX - pos.x);
          const back = Math.abs(pos.z - o.minZ);
          const front = Math.abs(o.maxZ - pos.z);
          const min = Math.min(left, right, back, front);
          if (min === left) pos.x = o.minX - radius;
          else if (min === right) pos.x = o.maxX + radius;
          else if (min === back) pos.z = o.minZ - radius;
          else pos.z = o.maxZ + radius;
          continue;
        }

        const dist = Math.sqrt(distSq);
        dx /= dist;
        dz /= dist;
        const push = radius - dist;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }

    const horizontal = Math.hypot(pos.x, pos.z);
    const limit = this.radius - 0.8;
    if (horizontal > limit) {
      pos.x = (pos.x / horizontal) * limit;
      pos.z = (pos.z / horizontal) * limit;
    }
  }
}
