import * as THREE from 'three';
import { settings } from './settings';

/**
 * Camera-first AR controller.
 *
 * - Renders the rear camera feed behind the transparent WebGL canvas.
 * - Uses DeviceOrientation (gyroscope + compass) for 1:1 look control, with
 *   drag-to-look as a fallback and fine-adjustment.
 * - Uses geolocation to translate the player through the real world, so the
 *   arena and enemies stay anchored where they spawned.
 */
export class CameraAR {
  readonly video: HTMLVideoElement;
  active = false;
  cameraOk = false;
  gyroActive = false;
  gpsActive = false;
  gpsAvailable = false;

  private canvas: HTMLElement;
  private stream: MediaStream | null = null;
  private onChange?: () => void;

  private alpha = 0;
  private beta = 0;
  private gamma = 0;
  private hasOrientation = false;
  private screenAngle = 0;

  private euler = new THREE.Euler();
  private dragEuler = new THREE.Euler();
  private q0 = new THREE.Quaternion();
  private q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  private zee = new THREE.Vector3(0, 0, 1);
  private gyroQuat = new THREE.Quaternion();
  private dragQuat = new THREE.Quaternion();

  private dragYaw = 0;
  private dragPitch = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private activePointer: number | null = null;

  private target = new THREE.Vector3(0, 1.6, 0);
  private position = new THREE.Vector3(0, 1.6, 0);
  private geoOrigin: { lat: number; lon: number } | null = null;
  private lastFix: { lat: number; lon: number; accuracy: number } | null = null;
  private watchId: number | null = null;
  private gyroTimer = 0;
  private wakeLock: { release: () => Promise<void> } | null = null;
  private videoResumeBound = false;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    const video = document.getElementById('arVideo') as HTMLVideoElement | null;
    if (!video) throw new Error('Missing #arVideo');
    this.video = video;
  }

  async start(onChange?: () => void): Promise<boolean> {
    if (this.active) return this.cameraOk;
    this.onChange = onChange;
    this.active = true;
    this.cameraOk = false;
    this.gyroActive = false;
    this.gpsActive = false;
    this.gpsAvailable = false;
    this.hasOrientation = false;
    this.dragYaw = 0;
    this.dragPitch = 0;
    this.target.set(0, 1.6, 0);
    this.position.set(0, 1.6, 0);
    this.geoOrigin = null;
    this.lastFix = null;

    document.body.classList.add('camera-ar');
    this.bindPointer();
    this.bindOrientation();
    this.updateScreenAngle();

    // Kick off permission prompts inside the original user gesture.
    await this.requestOrientationPermission();
    await this.startCamera();
    this.bindVideoResume();

    this.startGeo();
    void this.requestWakeLock();

    window.clearTimeout(this.gyroTimer);
    this.gyroTimer = window.setTimeout(() => {
      if (!this.hasOrientation) {
        this.gyroActive = false;
        this.onChange?.();
      }
    }, 2200);

    this.onChange?.();
    return this.cameraOk;
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.cameraOk = false;
    this.gyroActive = false;
    this.gpsActive = false;
    this.gpsAvailable = false;
    this.lastFix = null;

    window.clearTimeout(this.gyroTimer);
    window.removeEventListener('deviceorientation', this.onOrientation, true);
    window.removeEventListener('orientationchange', this.updateScreenAngle, true);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);

    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    this.video.pause();
    this.video.srcObject = null;
    this.video.classList.remove('active');

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.wakeLock) {
      void this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }

    document.body.classList.remove('camera-ar');
    this.onChange?.();
  }

  update(camera: THREE.PerspectiveCamera, dt: number): void {
    if (!this.active) return;

    this.position.lerp(this.target, 1 - Math.exp(-7 * dt));
    camera.position.copy(this.position);

    if (this.gyroActive && this.hasOrientation) {
      // Standard device-orientation → camera quaternion mapping.
      this.euler.set(this.beta, this.alpha, -this.gamma, 'YXZ');
      this.gyroQuat.setFromEuler(this.euler);
      this.gyroQuat.multiply(this.q1);
      this.gyroQuat.multiply(this.q0.setFromAxisAngle(this.zee, -this.screenAngle));

      this.dragEuler.set(this.dragPitch, this.dragYaw, 0, 'YXZ');
      this.dragQuat.setFromEuler(this.dragEuler);
      this.gyroQuat.multiply(this.dragQuat);
      camera.quaternion.copy(this.gyroQuat);
    } else {
      this.dragEuler.set(this.dragPitch, this.dragYaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(this.dragEuler);
    }
  }

  get gear(): { camera: boolean; gyro: boolean; gps: boolean } {
    return { camera: this.cameraOk, gyro: this.gyroActive, gps: this.gpsActive };
  }

  get geo(): { lat: number; lon: number; accuracy: number } | null {
    return this.lastFix;
  }

  /** Turns the rear camera torch on/off when the hardware supports it. */
  async setTorch(on: boolean): Promise<boolean> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return false;
    try {
      const capabilities = (track as unknown as {
        getCapabilities?: () => Record<string, unknown>;
      }).getCapabilities?.();
      if (capabilities && capabilities.torch === false) return false;
      await track.applyConstraints({
        advanced: [{ torch: on }],
      } as unknown as MediaTrackConstraints);
      return true;
    } catch {
      return false;
    }
  }

  private async requestOrientationPermission(): Promise<boolean> {
    const ctor = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (ctor && typeof ctor.requestPermission === 'function') {
      try {
        return (await ctor.requestPermission()) === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  private async startCamera(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.showCameraOffline('camera-api-unavailable');
      return false;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'environment' },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        } catch (error) {
          console.warn('[CameraAR] camera unavailable', error);
          this.showCameraOffline('camera-permission');
          return false;
        }
      }
    }

    this.stream = stream;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('webkit-playsinline', 'true');
    this.video.setAttribute('autoplay', 'true');
    this.video.classList.add('active');
    this.video.srcObject = stream;

    await this.waitForVideo();
    const played = await this.playVideo();
    if (!played || this.video.videoWidth <= 0) {
      // Some Android browsers resolve play() before the first frame exists.
      // Keep the element alive; the first tap/visibility change retries it.
      window.setTimeout(() => {
        void this.playVideo().then((ok) => {
          if (ok) {
            this.cameraOk = true;
            this.video.classList.add('active');
            this.onChange?.();
          }
        });
      }, 450);
    }

    if (settings.torch) void this.setTorch(true);
    this.onChange?.();
    return this.cameraOk;
  }

  private waitForVideo(): Promise<void> {
    if (this.video.readyState >= 2) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const done = (): void => {
        if (settled) return;
        settled = true;
        this.video.removeEventListener('loadedmetadata', done);
        this.video.removeEventListener('canplay', done);
        resolve();
      };
      this.video.addEventListener('loadedmetadata', done, { once: true });
      this.video.addEventListener('canplay', done, { once: true });
      window.setTimeout(done, 1400);
    });
  }

  private async playVideo(): Promise<boolean> {
    try {
      await this.video.play();
    } catch {
      /* autoplay can be blocked on some Android builds */
    }
    const ready = this.video.videoWidth > 0 && !this.video.paused;
    if (ready) {
      this.cameraOk = true;
      this.video.classList.add('active');
      this.onChange?.();
    }
    return ready;
  }

  private bindVideoResume(): void {
    if (this.videoResumeBound) return;
    this.videoResumeBound = true;
    const resume = (): void => {
      if (!this.active || !this.video.srcObject) return;
      if (this.video.paused || this.video.readyState < 2 || this.video.videoWidth === 0) {
        void this.playVideo();
      }
    };
    window.addEventListener('pointerdown', resume, true);
    window.addEventListener('touchstart', resume, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) resume();
    });
  }

  async retryCamera(): Promise<boolean> {
    if (!this.active) return false;
    if (this.cameraOk) return true;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    this.video.srcObject = null;
    return this.startCamera();
  }

  private showCameraOffline(reason: string): void {
    this.cameraOk = false;
    this.video.classList.remove('active');
    document.body.dataset.cameraState = reason;
    this.onChange?.();
  }

  private bindOrientation(): void {
    window.addEventListener('deviceorientation', this.onOrientation, true);
    window.addEventListener('orientationchange', this.updateScreenAngle, true);
  }

  private onOrientation = (event: DeviceOrientationEvent): void => {
    if (event.alpha === null && event.beta === null && event.gamma === null) return;
    this.alpha = THREE.MathUtils.degToRad(event.alpha ?? 0);
    this.beta = THREE.MathUtils.degToRad(event.beta ?? 0);
    this.gamma = THREE.MathUtils.degToRad(event.gamma ?? 0);
    if (!this.hasOrientation) {
      this.hasOrientation = true;
      this.gyroActive = true;
      this.onChange?.();
    }
  };

  private updateScreenAngle = (): void => {
    const angle = window.screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0;
    this.screenAngle = THREE.MathUtils.degToRad(angle);
  };

  private bindPointer(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.active) return;
    this.dragging = true;
    this.activePointer = event.pointerId;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.activePointer) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    const factor = 0.0034 * settings.sensitivity;
    this.dragYaw -= dx * factor;
    this.dragPitch -= dy * factor * (settings.invertY ? -1 : 1);
    this.dragPitch = THREE.MathUtils.clamp(this.dragPitch, -1.25, 1.25);
    this.dragYaw = THREE.MathUtils.euclideanModulo(this.dragYaw + Math.PI, Math.PI * 2) - Math.PI;
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.activePointer !== null && event.pointerId !== this.activePointer) return;
    this.dragging = false;
    this.activePointer = null;
  };

  private startGeo(): void {
    if (!navigator.geolocation) {
      this.gpsAvailable = false;
      this.onChange?.();
      return;
    }
    this.gpsAvailable = true;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy > 40) {
          if (this.gpsActive) {
            this.gpsActive = false;
            this.onChange?.();
          }
          return;
        }

        this.lastFix = { lat: latitude, lon: longitude, accuracy };

        if (!this.geoOrigin) {
          this.geoOrigin = { lat: latitude, lon: longitude };
        }

        const latRad = (this.geoOrigin.lat * Math.PI) / 180;
        const east = (longitude - this.geoOrigin.lon) * 111320 * Math.cos(latRad);
        const north = (latitude - this.geoOrigin.lat) * 110540;

        const max = 14;
        this.target.x = THREE.MathUtils.clamp(east, -max, max);
        this.target.z = THREE.MathUtils.clamp(-north, -max, max);
        this.target.y = 1.6;

        if (!this.gpsActive) {
          this.gpsActive = true;
          this.onChange?.();
        }
      },
      () => {
        if (this.gpsActive) {
          this.gpsActive = false;
          this.onChange?.();
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
  }

  private async requestWakeLock(): Promise<void> {
    const wakeLock = (navigator as unknown as { wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (!wakeLock) return;
    try {
      this.wakeLock = await wakeLock.request('screen');
    } catch {
      this.wakeLock = null;
    }
  }
}
