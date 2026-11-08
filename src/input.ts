export type Action = 'dash' | 'reload' | 'nextWeapon' | 'weapon1' | 'weapon2' | 'weapon3' | 'pause';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'Tab',
]);

/** Keyboard + mouse + pointer-lock input, plus the mobile touch layer. */
export class Input {
  readonly keys = new Set<string>();
  readonly touchMode = window.matchMedia('(pointer: coarse)').matches;

  firing = false;
  locked = false;
  enabled = false;

  moveX = 0;
  moveY = 0;

  private mdx = 0;
  private mdy = 0;
  private touchLookX = 0;
  private touchLookY = 0;

  onAction?: (action: Action) => void;
  onLockLost?: () => void;
  onLockGained?: () => void;

  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('click', () => {
      if (!this.enabled || this.touchMode || this.locked) return;
      this.requestLock();
    });
  }

  requestLock(): void {
    if (!this.canvas || this.touchMode || document.pointerLockElement === this.canvas) return;
    const result = this.canvas.requestPointerLock();
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  }

  exitLock(): void {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  trigger(action: Action): void {
    if (!this.enabled) return;
    this.onAction?.(action);
  }

  consumeLook(): { x: number; y: number } {
    const x = this.mdx + this.touchLookX;
    const y = this.mdy + this.touchLookY;
    this.mdx = 0;
    this.mdy = 0;
    this.touchLookX = 0;
    this.touchLookY = 0;
    return { x, y };
  }

  clear(): void {
    this.keys.clear();
    this.firing = false;
    this.moveX = 0;
    this.moveY = 0;
    this.mdx = 0;
    this.mdy = 0;
    this.touchLookX = 0;
    this.touchLookY = 0;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;

    this.keys.add(e.code);

    switch (e.code) {
      case 'ShiftLeft':
      case 'ShiftRight':
        this.trigger('dash');
        break;
      case 'KeyR':
        this.trigger('reload');
        break;
      case 'Digit1':
        this.trigger('weapon1');
        break;
      case 'Digit2':
        this.trigger('weapon2');
        break;
      case 'Digit3':
        this.trigger('weapon3');
        break;
      case 'KeyQ':
        this.trigger('nextWeapon');
        break;
      case 'Escape':
      case 'KeyP':
        if (!this.locked) this.trigger('pause');
        break;
      default:
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.firing = false;
  };

  private onVisibility = (): void => {
    if (document.hidden) {
      this.keys.clear();
      this.firing = false;
    }
  };

  private onPointerLockChange = (): void => {
    const locked = document.pointerLockElement === this.canvas;
    if (locked === this.locked) return;
    this.locked = locked;
    if (locked) {
      this.onLockGained?.();
    } else {
      this.firing = false;
      this.onLockLost?.();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.locked) return;
    this.mdx += e.movementX;
    this.mdy += e.movementY;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.enabled || e.button !== 0) return;
    if (!this.locked && !this.touchMode) return;
    this.firing = true;
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.firing = false;
  };

  private onContextMenu = (e: Event): void => {
    if (this.enabled) e.preventDefault();
  };

  /** Add a look delta from the touch aim zone. */
  addTouchLook(dx: number, dy: number): void {
    this.touchLookX += dx;
    this.touchLookY += dy;
  }
}

/**
 * Wires the on-screen thumbstick, aim zone and action buttons.
 * Safe to call on desktop — the controls simply stay hidden.
 */
export function bindMobileControls(input: Input): void {
  const stick = document.getElementById('stickL');
  const knob = stick?.querySelector('i') as HTMLElement | null;
  const lookZone = document.getElementById('lookZone');
  const fireBtn = document.getElementById('btnFire');
  const dashBtn = document.getElementById('btnDash');
  const reloadBtn = document.getElementById('btnReload');
  const swapBtn = document.getElementById('btnSwap');

  if (stick && knob) {
    let activeId: number | null = null;
    const radius = 44;

    const update = (e: PointerEvent) => {
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > radius) {
        dx = (dx / len) * radius;
        dy = (dy / len) * radius;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      input.moveX = dx / radius;
      input.moveY = -dy / radius;
    };

    stick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      activeId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      update(e);
    });
    stick.addEventListener('pointermove', (e) => {
      if (activeId !== e.pointerId) return;
      e.preventDefault();
      update(e);
    });
    const end = (e: PointerEvent) => {
      if (activeId !== e.pointerId) return;
      activeId = null;
      input.moveX = 0;
      input.moveY = 0;
      knob.style.transform = 'translate(0, 0)';
      try {
        stick.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    stick.addEventListener('lostpointercapture', () => {
      activeId = null;
      input.moveX = 0;
      input.moveY = 0;
      knob.style.transform = 'translate(0, 0)';
    });
  }

  if (lookZone) {
    let activeId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    lookZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      activeId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      lookZone.setPointerCapture(e.pointerId);
    });
    lookZone.addEventListener('pointermove', (e) => {
      if (activeId !== e.pointerId) return;
      e.preventDefault();
      input.addTouchLook((e.clientX - lastX) * 1.35, (e.clientY - lastY) * 1.35);
      lastX = e.clientX;
      lastY = e.clientY;
    });
    const end = (e: PointerEvent) => {
      if (activeId === e.pointerId) activeId = null;
    };
    lookZone.addEventListener('pointerup', end);
    lookZone.addEventListener('pointercancel', end);
    lookZone.addEventListener('lostpointercapture', () => {
      activeId = null;
    });
  }

  if (fireBtn) {
    fireBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.firing = true;
    });
    const stop = (e: PointerEvent) => {
      e.preventDefault();
      input.firing = false;
    };
    fireBtn.addEventListener('pointerup', stop);
    fireBtn.addEventListener('pointercancel', stop);
    fireBtn.addEventListener('pointerleave', () => {
      input.firing = false;
    });
  }

  dashBtn?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.trigger('dash');
  });
  reloadBtn?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.trigger('reload');
  });
  swapBtn?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.trigger('nextWeapon');
  });
}
