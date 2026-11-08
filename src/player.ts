import * as THREE from 'three';
import { settings } from './settings';
import type { Arena } from './arena';

const EYE_HEIGHT = 1.7;
const BASE_SPEED = 6.6;
const DASH_SPEED = 18;
const DASH_TIME = 0.16;
const DASH_COOLDOWN = 2.2;

export class Player {
  readonly camera: THREE.PerspectiveCamera;
  readonly pos = new THREE.Vector3(0, EYE_HEIGHT, 16);
  readonly velocity = new THREE.Vector3();

  yaw = 0;
  pitch = -0.02;

  health = 100;
  maxHealth = 100;
  shield = 50;
  maxShield = 50;

  dashCooldown = 0;
  dashTimer = 0;
  invuln = 0;
  timeSinceDamage = 99;

  dead = false;
  shake = 0;

  onDash?: () => void;

  private dashDir = new THREE.Vector3();
  private bobTime = 0;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private fov = 76;
  private strafeRoll = 0;
  private moveAmount = 0;
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private tmp = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.rotation.order = 'YXZ';
    this.camera.position.copy(this.pos);
    this.applyCamera();
  }

  reset(): void {
    this.pos.set(0, EYE_HEIGHT, 16);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = -0.02;
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.invuln = 1.2;
    this.timeSinceDamage = 99;
    this.dead = false;
    this.shake = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.fov = 76;
    this.camera.fov = 76;
    this.camera.updateProjectionMatrix();
    this.applyCamera();
  }

  look(dx: number, dy: number): void {
    if (this.dead) return;
    const factor = 0.0022 * settings.sensitivity;
    this.yaw -= dx * factor;
    this.pitch -= dy * factor * (settings.invertY ? -1 : 1);
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }

  update(dt: number, moveX: number, moveY: number, arena: Arena): void {
    if (this.dead) {
      this.updateCameraShake(dt);
      return;
    }

    this.timeSinceDamage += dt;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    if (this.shield < this.maxShield && this.timeSinceDamage > 5 && this.shield > 0) {
      this.shield = Math.min(this.maxShield, this.shield + 8 * dt);
    }

    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    let ix = moveX;
    let iy = moveY;
    const inputLength = Math.hypot(ix, iy);
    if (inputLength > 1) {
      ix /= inputLength;
      iy /= inputLength;
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.velocity.copy(this.dashDir).multiplyScalar(DASH_SPEED);
      if (this.dashTimer <= 0) this.velocity.multiplyScalar(0.45);
    } else {
      const desired = this.tmp
        .copy(this.forward)
        .multiplyScalar(iy)
        .addScaledVector(this.right, ix);
      if (desired.lengthSq() > 0.0001) desired.normalize().multiplyScalar(BASE_SPEED);
      else desired.set(0, 0, 0);

      const blend = 1 - Math.exp(-11 * dt);
      this.velocity.lerp(desired, blend);
      if (this.velocity.lengthSq() < 0.002) this.velocity.set(0, 0, 0);
    }

    this.pos.addScaledVector(this.velocity, dt);
    this.pos.y = EYE_HEIGHT;
    arena.resolveCollision(this.pos, 0.46);

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.moveAmount = Math.min(1, speed / BASE_SPEED);
    this.bobTime += dt * (3.4 + this.moveAmount * 6.2);

    this.strafeRoll = THREE.MathUtils.lerp(this.strafeRoll, -ix * 0.022, 1 - Math.exp(-8 * dt));

    const targetFov = this.dashTimer > 0 ? 84 : 76;
    this.fov = THREE.MathUtils.lerp(this.fov, targetFov, 1 - Math.exp(-10 * dt));
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    this.recoilPitch *= Math.exp(-10 * dt);
    this.recoilYaw *= Math.exp(-10 * dt);
    this.shake *= Math.exp(-7 * dt);

    this.applyCamera();
  }

  private updateCameraShake(dt: number): void {
    this.shake *= Math.exp(-4 * dt);
    this.applyCamera();
  }

  private applyCamera(): void {
    const motion = settings.reducedMotion ? 0 : 1;
    const bobX = Math.sin(this.bobTime * 0.5) * 0.022 * this.moveAmount * motion;
    const bobY = Math.abs(Math.sin(this.bobTime)) * 0.035 * this.moveAmount * motion;

    const shake = this.shake * motion;
    const shakeX = Math.sin(this.bobTime * 37.1 + 1.7) * shake * 0.06;
    const shakeY = Math.cos(this.bobTime * 31.7) * shake * 0.06;

    this.camera.position.set(this.pos.x + bobX + shakeX, this.pos.y + bobY + shakeY, this.pos.z);
    this.camera.rotation.set(
      this.pitch + this.recoilPitch + shake * 0.01,
      this.yaw + this.recoilYaw,
      this.strafeRoll + shakeX * 0.3,
    );
  }

  getAimDirection(out: THREE.Vector3): THREE.Vector3 {
    return this.camera.getWorldDirection(out);
  }

  getAimOrigin(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.camera.position);
  }

  addRecoil(pitch: number, yaw: number): void {
    this.recoilPitch += pitch;
    this.recoilYaw += yaw;
  }

  addShake(amount: number): void {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  tryDash(moveX: number, moveY: number): boolean {
    if (this.dead || this.dashCooldown > 0 || this.dashTimer > 0) return false;

    const dir = this.tmp.copy(this.forward).multiplyScalar(moveY);
    dir.addScaledVector(this.right, moveX);
    if (dir.lengthSq() < 0.01) dir.copy(this.forward);
    dir.normalize();

    this.dashDir.copy(dir);
    this.dashTimer = DASH_TIME;
    this.dashCooldown = DASH_COOLDOWN;
    this.invuln = Math.max(this.invuln, 0.42);
    this.addShake(0.22);
    this.onDash?.();
    return true;
  }

  get dashRatio(): number {
    return 1 - this.dashCooldown / DASH_COOLDOWN;
  }

  get isDashing(): boolean {
    return this.dashTimer > 0;
  }

  damage(amount: number): { absorbed: number; hull: number; died: boolean } {
    if (this.dead || this.invuln > 0) return { absorbed: 0, hull: 0, died: false };

    this.timeSinceDamage = 0;

    // A quarter of every hit punches through the shield, so sustained fire
    // always threatens the LIFE bar instead of being erased by regeneration.
    const bypass = amount * 0.25;
    let shieldDamage = amount - bypass;
    let absorbed = 0;

    if (this.shield > 0) {
      absorbed = Math.min(this.shield, shieldDamage);
      this.shield -= absorbed;
      shieldDamage -= absorbed;
    }

    const hull = bypass + shieldDamage;
    this.health -= hull;

    this.addShake(0.35 + amount * 0.012);

    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }

    return { absorbed, hull, died: this.dead };
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addShield(amount: number): void {
    this.shield = Math.min(this.maxShield, this.shield + amount);
  }
}
