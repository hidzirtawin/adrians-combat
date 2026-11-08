import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets';
import { GUN_VISUALS, createGunModel } from './gunModels';
import { WEAPONS, WEAPON_IDS, buildProceduralWeapon, type WeaponId } from './weapons';

/**
 * Small studio renderer used by the Armory. It keeps its own WebGL context and
 * only renders while the Armory screen is open.
 */
export class ArmoryPreview {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private root = new THREE.Group();
  private ring: THREE.Mesh;
  private models = new Map<WeaponId, THREE.Group>();
  private weapon: WeaponId = 'pulse';
  private open = false;
  private raf = 0;
  private lastTime = 0;
  private elapsed = 0;
  private spin = 0;
  private dragging = false;
  private dragX = 0;
  private observer: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
    this.camera.position.set(0.85, 0.42, 1.55);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);

    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.scene.environment = pmrem.fromScene(room, 0.05).texture;
      this.scene.environmentIntensity = 0.9;
      pmrem.dispose();
      (room as unknown as { dispose?: () => void }).dispose?.();
    } catch {
      /* environment is optional */
    }

    const hemi = new THREE.HemisphereLight(0xcfefff, 0x081018, 1.5);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(2.5, 3.4, 3.2);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x43f3ff, 2.6);
    rim.position.set(-3.2, 1.4, -2.4);
    this.scene.add(rim);
    const fill = new THREE.PointLight(0xffc247, 1.4, 7);
    fill.position.set(1.4, -1.2, 2.4);
    this.scene.add(fill);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.006, 8, 72),
      new THREE.MeshBasicMaterial({ color: 0x43f3ff, transparent: true, opacity: 0.5 }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = -0.26;
    this.scene.add(this.ring);

    this.root.position.y = -0.03;
    this.root.rotation.set(0.05, 0, 0);
    this.scene.add(this.root);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);

    void this.load();
  }

  setWeapon(id: WeaponId): void {
    this.weapon = id;
    for (const [key, model] of this.models) model.visible = key === id;
    (this.ring.material as THREE.MeshBasicMaterial).color.setHex(WEAPONS[id].color);
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.lastTime = performance.now();
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  hide(): void {
    this.open = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private async load(): Promise<void> {
    await Promise.all(
      WEAPON_IDS.map(async (id) => {
        const visual = GUN_VISUALS[id];
        if (visual) {
          await loadModel(visual.asset);
          const built = createGunModel(id, true);
          if (!built) return;
          built.root.visible = false;
          this.root.add(built.root);
          this.models.set(id, built.root);
          return;
        }
        const built = buildProceduralWeapon(id);
        built.group.traverse((obj) => {
          if (obj.name === 'viewmodel-hand') obj.visible = false;
        });
        built.group.visible = false;
        this.root.add(built.group);
        this.models.set(id, built.group);
      }),
    );
    this.setWeapon(this.weapon);
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.dragging = true;
    this.dragX = event.clientX;
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.style.cursor = 'grabbing';
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging) return;
    this.spin += (event.clientX - this.dragX) * 0.012;
    this.dragX = event.clientX;
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.dragging = false;
    this.canvas.style.cursor = 'grab';
    try {
      this.canvas.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  };

  private resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private tick = (now: number): void => {
    if (!this.open) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsed += dt;

    const auto = this.dragging ? 0 : Math.sin(this.elapsed * 0.55) * 0.16;
    this.root.rotation.y = this.spin + auto;
    this.root.rotation.x = 0.05 + Math.sin(this.elapsed * 0.8) * 0.015;
    this.ring.rotation.z += dt * 0.25;
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(this.elapsed * 2) * 0.1;

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.tick);
  };
}
