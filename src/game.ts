import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Arena } from './arena';
import { ArmoryPreview } from './armoryPreview';
import { preloadGameAssets } from './assets';
import { AudioEngine, type SfxName } from './audio';
import { BOMBS, BOMB_IDS, currentBomb, type BombDef, type BombId } from './bombs';
import { CameraAR } from './cameraAR';
import { currentDifficulty } from './difficulty';
import { EnemyManager, type CombatContext, type EnemyKind } from './enemies';
import { FX } from './fx';
import { HUD, type BuffDisplay } from './hud';
import { MenuMusic } from './menuMusic';
import { isSectorFinale, isSectorStart, sectorForWave, type SectorDef } from './levels';
import { Input, bindMobileControls, type Action } from './input';
import { PickupManager, PICKUP_COLORS, PICKUP_LABELS, type PickupKind } from './pickups';
import {
  WEAPON_PRICES,
  addSalvage,
  beginDailyRun,
  dailyAvailable,
  cheapestLockedWeapon,
  isWeaponUnlocked,
  progress,
  recordRun,
  saveProgress,
  unlockWeapon,
  weaponPrice,
} from './progression';
import { Player } from './player';
import { loadRecord, resetRecord, saveSettings, settings, submitRecord, type Difficulty } from './settings';
import { SquadClient, type SquadMode, type SquadNotice, type SquadRoom } from './squad';
import { WEAPONS, WEAPON_IDS, WeaponSystem, type WeaponCategory, type WeaponDef, type WeaponId } from './weapons';

type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

interface SpawnTicket {
  kind: EnemyKind;
  at: number;
  scale: number;
}

const BOSS_CYCLE: Array<{ kind: EnemyKind; name: string; scale: number }> = [
  { kind: 'jailer', name: 'THE JAILER', scale: 0.58 },
  { kind: 'rex', name: 'BONE MAW', scale: 1 },
  { kind: 'jester', name: 'THE GRINNING ONE', scale: 0.9 },
  { kind: 'titan', name: 'VOID COLOSSUS', scale: 0.7 },
  { kind: 'warlord', name: 'THE BUTCHER KING', scale: 0.85 },
  { kind: 'rainmaker', name: 'THE RAINMAKER', scale: 0.58 },
  { kind: 'aureole', name: 'AUREOLE', scale: 0.58 },
  { kind: 'brood', name: 'THE BROOD QUEEN', scale: 0.58 },
  { kind: 'mirrored', name: 'THE MIRRORED', scale: 0.58 },
  { kind: 'umbra', name: 'UMBRA', scale: 0.58 },
  { kind: 'collector', name: 'THE COLLECTOR', scale: 0.58 },
];

const WAVE_TAGS = [
  'THEY COME FROM EVERYWHERE',
  'HOLD YOUR GROUND',
  'KEEP TURNING',
  'SECTOR BREACH',
  'THEY KEEP COMING',
  'DEFEND THE ROOM',
];

const WEAPON_SFX: Record<WeaponId, SfxName> = {
  pulse: 'pulse',
  viper: 'viper',
  arx: 'arx',
  scatter: 'scatter',
  longshot: 'longshot',
  rail: 'rail',
  vanguard: 'pulse',
  warlord: 'arx',
  sentinel: 'longshot',
  sidearm: 'pistol',
  magnum: 'magnum',
  wasp: 'pistol',
  vector: 'viper',
  breacher: 'scatter',
  vulcan: 'lmg',
  ion: 'blaster',
  plasma: 'plasma',
  disruptor: 'rail',
};

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private lastTime = performance.now();
  private basePixelRatio = 1;
  private qualityScale = 1;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private slowSeconds = 0;
  private fastSeconds = 0;
  private performanceModeAnnounced = false;
  private worldRoot = new THREE.Group();

  private arena: Arena;
  private player: Player;
  private weapons: WeaponSystem;
  private enemies: EnemyManager;
  private pickups: PickupManager;
  private fx: FX;
  private hud: HUD;
  private audio = new AudioEngine();
  private input = new Input();
  private cameraAR: CameraAR;
  private ctx: CombatContext;

  private arGround: THREE.Group;
  private arLights: THREE.Group;
  private cameraActive = false;
  private cameraReady = false;
  private startingAR = false;

  private state: GameState = 'menu';
  private bestScore = 0;
  private score = 0;
  private wave = 0;
  private level = 1;
  private sector: SectorDef = sectorForWave(1).sector;
  private waveModifier: 'standard' | 'armored' | 'air' | 'horde' | 'elite' = 'standard';
  private waveHpMul = 1;
  private kills = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private combo = 0;
  private comboTimer = 0;
  private bestCombo = 1;
  private runTime = 0;
  private triggerLatch = false;

  private overchargeTimer = 0;
  private rapidTimer = 0;
  private freezeTimer = 0;

  private spawnQueue: SpawnTicket[] = [];
  private spawnClock = 0;
  private waveActive = false;
  private intermission = 0;

  private radarAccumulator = 0;
  private menuTime = 0;
  private settingsReturn: 'menu' | 'pause' = 'menu';
  private squad = new SquadClient();
  private squadSyncTimer = 0;
  private geoSyncTimer = 0;
  private tagCooldown = 0;

  private bombCooldown = 0;
  private bombHold = 0;
  private bombHoldLatched = false;
  private bombs: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; def: BombDef; charged?: boolean }> = [];
  private readonly bombGeo = new THREE.SphereGeometry(0.14, 12, 10);
  private readonly bombMats = new Map<number, THREE.MeshBasicMaterial>();
  private lastBombText = '';
  private armoryPreview?: ArmoryPreview;
  private menuMusic: MenuMusic;
  private armorySelection: WeaponId = 'pulse';
  private armoryFilter: WeaponCategory | 'ALL' = 'ALL';
  private aiming = false;
  private runSalvage = 0;
  private pendingSalvage = 0;
  private dailyRun = false;
  private dailyStreak = 0;
  private cameraRecoilPitch = 0;
  private cameraRecoilYaw = 0;
  private torchLight: THREE.PointLight;
  private arHemi!: THREE.HemisphereLight;
  private arKey!: THREE.DirectionalLight;
  private arRim!: THREE.DirectionalLight;
  private arFill!: THREE.DirectionalLight;
  private envBrightness = 0.65;
  private multiKillCount = 0;
  private multiKillTimer = 0;

  // Scratch
  private camDir = new THREE.Vector3();
  private worldInverse = new THREE.Matrix4();
  private aimOrigin = new THREE.Vector3();
  private aimDir = new THREE.Vector3();
  private muzzleLocal = new THREE.Vector3();
  private muzzleWorld = new THREE.Vector3();
  private tmpVec = new THREE.Vector3();
  private tmpVec2 = new THREE.Vector3();

  constructor() {
    const app = document.getElementById('app');
    if (!app) throw new Error('Missing #app');

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.id = 'game-canvas';
    app.appendChild(this.renderer.domElement);
    preloadGameAssets();
    if (!isWeaponUnlocked(settings.primary as WeaponId)) {
      settings.primary = 'pulse';
      saveSettings();
    }
    this.armorySelection = this.selectedGun();
    this.syncSalvageUI();
    window.addEventListener('pagehide', () => this.flushSalvage());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.flushSalvage();
    });

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 260);
    this.scene.add(this.camera);
    this.scene.add(this.worldRoot);

    this.torchLight = new THREE.PointLight(0xffe6c4, 0, 14, 2);
    this.torchLight.position.set(0, 0, -0.1);
    this.camera.add(this.torchLight);

    // Cool fill light for skin, cloth and armour detail on nearby enemies.
    const characterLight = new THREE.PointLight(0xbfeaff, 0.85, 9, 2);
    characterLight.position.set(0.35, 0.25, 0.15);
    this.camera.add(characterLight);

    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.scene.environment = pmrem.fromScene(room, 0.04).texture;
      this.scene.environmentIntensity = 0.55;
      pmrem.dispose();
      (room as unknown as { dispose?: () => void }).dispose?.();
    } catch (error) {
      console.warn('[FX] environment map unavailable', error);
    }

    this.arena = new Arena(this.scene);
    this.scene.remove(this.arena.group);
    this.worldRoot.add(this.arena.group);

    this.player = new Player(this.camera);
    this.fx = new FX(this.worldRoot, this.camera);
    this.enemies = new EnemyManager(this.worldRoot, (enemy) => this.onEnemyImpact(enemy));
    this.pickups = new PickupManager(this.worldRoot);
    this.weapons = new WeaponSystem(this.camera, this.audio);
    this.weapons.setVisible(false);
    this.hud = new HUD();
    this.audio.volume = settings.volume;
    this.cameraAR = new CameraAR(this.renderer.domElement);

    this.squad.onNotice = (notice) => this.handleSquadNotice(notice);
    this.squad.onStatus = (message, ok) => this.setSquadStatus(message, ok);
    window.addEventListener('beforeunload', () => this.squad.close());

    this.arGround = this.buildARGround();
    this.arLights = this.buildARLights();
    this.arGround.visible = false;
    this.arLights.visible = false;

    this.ctx = {
      player: this.player,
      arena: this.arena,
      fx: this.fx,
      audio: this.audio,
      freezeFactor: 1,
      damagePlayer: (amount, at) => this.damagePlayer(amount, at),
      onKill: () => {},
      summon: (kind, at) => this.summonEnemy(kind, at),
      playSpatial: (name, position, volume) => this.playSpatial(name, position, volume),
      enemyVoice: (kind, action, position) => this.enemyVoice(kind, action, position),
    };

    this.input.attach(this.renderer.domElement);
    bindMobileControls(this.input);
    this.input.onAction = this.handleAction;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.62, 0.55, 0.4);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.wireUI();
    this.applyQuality();
    this.syncDifficultyUI();
    this.syncLoadoutMini();
    this.hud.setMenuRecord(loadRecord());
    this.bestScore = loadRecord().score;
    this.camera.position.set(20, 6, 20);
    this.camera.lookAt(0, 2, 0);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });

    this.menuMusic = new MenuMusic();
    this.renderer.setAnimationLoop(this.loop);
  }

  // ───────────────────────────── World decor ─────────────────────────────

  private buildARGround(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    const grid = new THREE.GridHelper(32, 64, 0x3aa8bb, 0x0b3440);
    grid.position.y = 0.006;
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.5;
    gridMat.depthWrite = false;
    group.add(grid);

    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.34 }),
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0.012;
    shadowCatcher.receiveShadow = true;
    shadowCatcher.renderOrder = 2;
    shadowCatcher.name = 'ar-shadow-catcher';
    group.add(shadowCatcher);

    for (const radius of [2, 4, 6, 9, 12]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.025, radius + 0.025, 96),
        new THREE.MeshBasicMaterial({
          color: radius === 4 ? 0x43f3ff : 0x1f6d7c,
          transparent: true,
          opacity: radius === 4 ? 0.6 : 0.32,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.012;
      ring.name = 'ar-ring';
      group.add(ring);
    }

    const center = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 48),
      new THREE.MeshBasicMaterial({
        color: 0x0d5364,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.01;
    group.add(center);

    return group;
  }

  private buildARLights(): THREE.Group {
    const group = new THREE.Group();
    const hemi = new THREE.HemisphereLight(0xbfeaff, 0x080b12, 1.75);
    this.arHemi = hemi;
    group.add(hemi);

    const key = new THREE.DirectionalLight(0xdffcff, 2.9);
    key.position.set(4, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 45;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    this.arKey = key;
    group.add(key);

    const rim = new THREE.DirectionalLight(0xff5fc0, 1.15);
    rim.position.set(-7, 4, -6);
    this.arRim = rim;
    group.add(rim);

    const fill = new THREE.DirectionalLight(0x59ffb0, 0.7);
    fill.position.set(0, 3, 8);
    this.arFill = fill;
    group.add(fill);

    group.visible = false;
    return group;
  }

  // ───────────────────────────── Setup ─────────────────────────────

  private wireUI(): void {
    const on = (id: string, event: string, handler: EventListenerOrEventListenerObject) => {
      document.getElementById(id)?.addEventListener(event, handler);
    };

    on('btnDeploy', 'click', () => void this.startCameraAR());
    on('btnSettings', 'click', () => this.openSettings('menu'));
    on('btnHowto', 'click', () => this.setScreen('howto'));
    on('btnHowtoClose', 'click', () => this.setScreen('menu'));
    on('btnPauseSettings', 'click', () => this.openSettings('pause'));
    on('btnResume', 'click', () => this.resume());
    on('btnAbort', 'click', () => this.returnToMenu());
    on('btnRedeploy', 'click', () => void this.startCameraAR());
    on('btnMenu', 'click', () => this.returnToMenu());
    on('btnSettingsClose', 'click', () => this.closeSettings());
    on('btnReset', 'click', () => {
      resetRecord();
      this.hud.setMenuRecord({ score: 0, wave: 0, kills: 0 });
      const btn = document.getElementById('btnReset');
      if (btn) {
        const old = btn.textContent;
        btn.textContent = 'RECORD CLEARED';
        window.setTimeout(() => (btn.textContent = old), 1400);
      }
    });
    on('pauseBtn', 'click', () => this.togglePause());
    on('btnAim', 'click', () => this.toggleAim());
    on('cameraRetry', 'click', () => void this.retryCamera());

    on('btnSquad', 'click', () => this.openSquad());
    on('btnSquadClose', 'click', () => this.setScreen('menu'));
    on('btnArmory', 'click', () => this.openArmory());
    on('btnArmoryClose', 'click', () => this.setScreen('menu'));
    on('btnBomb', 'click', () => this.throwBomb());
    on('btnCreateRoom', 'click', () => void this.createRoom());
    on('btnJoinRoom', 'click', () => void this.joinRoom());
    on('btnLeaveRoom', 'click', () => {
      this.squad.leave();
      this.renderSquadLobby();
    });
    on('btnSquadPlay', 'click', () => this.startSquadMatch());

    const gunGrid = document.getElementById('armoryGuns');
    gunGrid?.addEventListener('click', (event) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>('.armory-card');
      const id = card?.dataset.gun as WeaponId | undefined;
      if (!id || !WEAPONS[id]) return;
      this.armorySelection = id;
      if (!isWeaponUnlocked(id)) {
        this.renderArmory();
        this.audio.init();
        this.audio.play('empty');
        return;
      }
      settings.primary = id;
      saveSettings();
      this.renderArmory();
      this.audio.init();
      this.audio.play('ui');
    });

    on('btnUnlockWeapon', 'click', () => {
      const id = this.armorySelection;
      if (!WEAPONS[id] || isWeaponUnlocked(id)) return;
      if (!unlockWeapon(id)) {
        this.audio.play('empty');
        return;
      }
      settings.primary = id;
      saveSettings();
      this.audio.play('wave');
      this.renderArmory();
      this.syncSalvageUI();
    });

    const filterBar = document.getElementById('armoryFilters');
    filterBar?.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-filter]');
      const filter = button?.dataset.filter as WeaponCategory | 'ALL' | undefined;
      if (!filter) return;
      this.armoryFilter = filter;
      this.renderArmory();
      this.audio.init();
      this.audio.play('ui');
    });

    const bombGrid = document.getElementById('armoryBombs');
    bombGrid?.addEventListener('click', (event) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>('.armory-card');
      const id = card?.dataset.bomb as BombId | undefined;
      if (!id || !BOMBS[id]) return;
      settings.bomb = id;
      saveSettings();
      this.renderArmory();
      this.audio.init();
      this.audio.play('ui');
    });

    window.addEventListener('pointerdown', () => this.audio.init(), { once: true });
    window.addEventListener('keydown', () => this.audio.init(), { once: true });

    const sensitivity = document.getElementById('sense') as HTMLInputElement | null;
    const senseVal = document.getElementById('senseVal');
    const volume = document.getElementById('vol') as HTMLInputElement | null;
    const volVal = document.getElementById('volVal');
    const music = document.getElementById('music') as HTMLInputElement | null;
    const invert = document.getElementById('invert') as HTMLInputElement | null;
    const motion = document.getElementById('motion') as HTMLInputElement | null;
    const quality = document.getElementById('quality') as HTMLSelectElement | null;

    if (sensitivity) {
      sensitivity.value = String(settings.sensitivity);
      if (senseVal) senseVal.textContent = settings.sensitivity.toFixed(1);
      sensitivity.addEventListener('input', () => {
        settings.sensitivity = Number(sensitivity.value);
        if (senseVal) senseVal.textContent = settings.sensitivity.toFixed(1);
        saveSettings();
      });
    }
    if (volume) {
      volume.value = String(settings.volume);
      if (volVal) volVal.textContent = `${Math.round(settings.volume * 100)}%`;
      volume.addEventListener('input', () => {
        settings.volume = Number(volume.value);
        this.audio.setVolume(settings.volume);
        if (volVal) volVal.textContent = `${Math.round(settings.volume * 100)}%`;
        saveSettings();
      });
    }
    if (music) {
      music.checked = settings.music;
      music.addEventListener('change', () => {
        settings.music = music.checked;
        this.audio.setMusicEnabled(settings.music);
        saveSettings();
      });
    }
    if (invert) {
      invert.checked = settings.invertY;
      invert.addEventListener('change', () => {
        settings.invertY = invert.checked;
        saveSettings();
      });
    }
    if (motion) {
      motion.checked = settings.reducedMotion;
      motion.addEventListener('change', () => {
        settings.reducedMotion = motion.checked;
        saveSettings();
      });
    }
    if (quality) {
      quality.value = settings.quality;
      quality.addEventListener('change', () => {
        settings.quality = quality.value as typeof settings.quality;
        saveSettings();
        this.applyQuality();
      });
    }

    const difficultySelect = document.getElementById('difficulty') as HTMLSelectElement | null;
    if (difficultySelect) {
      difficultySelect.addEventListener('change', () => {
        settings.difficulty = difficultySelect.value as Difficulty;
        saveSettings();
        this.syncDifficultyUI();
      });
    }

    const fov = document.getElementById('fov') as HTMLInputElement | null;
    const fovVal = document.getElementById('fovVal');
    if (fov) {
      fov.value = String(settings.fov);
      if (fovVal) fovVal.textContent = `${Math.round(settings.fov)}°`;
      fov.addEventListener('input', () => {
        settings.fov = Number(fov.value);
        if (fovVal) fovVal.textContent = `${Math.round(settings.fov)}°`;
        saveSettings();
        if (this.cameraActive) {
          this.camera.fov = settings.fov;
          this.camera.updateProjectionMatrix();
        }
      });
    }

    const torch = document.getElementById('torch') as HTMLInputElement | null;
    if (torch) {
      torch.checked = settings.torch;
      torch.addEventListener('change', () => {
        settings.torch = torch.checked;
        saveSettings();
        if (this.cameraActive) this.torchLight.intensity = settings.torch ? 4.5 : 0;
        if (this.cameraAR.active) {
          void this.cameraAR.setTorch(settings.torch).then((ok) => {
            if (!ok) this.hud.toast('TORCH NOT SUPPORTED ON THIS CAMERA', 2.2);
          });
        }
      });
    }

    const aimAssist = document.getElementById('aimAssist') as HTMLInputElement | null;
    if (aimAssist) {
      aimAssist.checked = settings.aimAssist;
      aimAssist.addEventListener('change', () => {
        settings.aimAssist = aimAssist.checked;
        saveSettings();
      });
    }

    const haptics = document.getElementById('haptics') as HTMLInputElement | null;
    if (haptics) {
      haptics.checked = settings.haptics;
      haptics.addEventListener('change', () => {
        settings.haptics = haptics.checked;
        saveSettings();
      });
    }

    const spatialAudio = document.getElementById('spatialAudio') as HTMLInputElement | null;
    if (spatialAudio) {
      spatialAudio.checked = settings.spatialAudio;
      spatialAudio.addEventListener('change', () => {
        settings.spatialAudio = spatialAudio.checked;
        saveSettings();
      });
    }

    document.querySelectorAll<HTMLButtonElement>('.diff-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.diff as Difficulty | undefined;
        if (!value) return;
        settings.difficulty = value;
        saveSettings();
        this.syncDifficultyUI();
        this.audio.init();
        this.audio.play('ui');
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.btn, #pauseBtn').forEach((button) => {
      button.addEventListener('click', () => {
        this.audio.init();
        this.audio.play('ui');
      });
    });

    const squadName = document.getElementById('squadName') as HTMLInputElement | null;
    if (squadName) {
      squadName.value = localStorage.getItem('adrianscombat.callsign') || '';
      squadName.addEventListener('input', () => {
        const clean = squadName.value.replace(/[<>&"'`]/g, '').slice(0, 14);
        if (clean !== squadName.value) squadName.value = clean;
        localStorage.setItem('adrianscombat.callsign', clean);
      });
    }

    const codeInput = document.getElementById('squadCodeInput') as HTMLInputElement | null;
    if (codeInput) {
      codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
      });
      codeInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void this.joinRoom();
        }
      });
    }
  }

  // ───────────────────────────── Squad room ─────────────────────────────

  private setSquadStatus(message: string, ok: boolean): void {
    const status = document.getElementById('squadStatus');
    if (!status) return;
    status.textContent = message;
    status.className = `squad-status ${ok ? 'ok' : 'bad'}`;
  }

  private openSquad(): void {
    this.audio.init();
    this.audio.play('ui');
    this.setScreen('squad');
    this.renderSquadLobby();

    if (this.squad.room) {
      this.setSquadStatus(`IN ROOM ${this.squad.room.code}`, true);
      return;
    }
    if (this.squad.connected) {
      this.setSquadStatus('CONNECTED · SAME WI-FI', true);
      return;
    }

    this.setSquadStatus('CONNECTING TO SQUAD SERVER…', true);
    void this.squad.connect().then(() => {
      this.renderSquadLobby();
      if (this.squad.connected) this.setSquadStatus('CONNECTED · SAME WI-FI', true);
    });
  }

  private renderSquadLobby(): void {
    const setup = document.getElementById('squadSetup');
    const roomPanel = document.getElementById('squadRoom');
    const nearby = document.getElementById('nearbyRooms');
    if (!setup || !roomPanel || !nearby) return;

    const room = this.squad.room;
    if (room) {
      setup.classList.add('hidden');
      roomPanel.classList.remove('hidden');

      const code = document.getElementById('roomCode');
      if (code) code.textContent = room.code;
      const mode = document.getElementById('roomMode');
      if (mode) mode.textContent = room.mode === 'teams' ? 'TEAMS 3V3' : room.mode === 'tag' ? 'GPS TAG' : 'FREE FOR ALL';

      const list = document.getElementById('roomPlayers');
      if (list) {
        list.innerHTML = '';
        const sorted = [...room.players].sort((a, b) => b.score - a.score);
        for (const player of sorted) {
          const row = document.createElement('div');
          row.className = `room-player${player.id === this.squad.youId ? ' me' : ''}`;

          if (room.mode === 'teams') {
            const team = document.createElement('span');
            team.className = `team${player.team === 1 ? ' b' : ''}`;
            team.textContent = player.team === 1 ? 'TEAM B' : 'TEAM A';
            row.appendChild(team);
          }

          const name = document.createElement('span');
          name.textContent = player.name;
          row.appendChild(name);

          if (player.id === room.hostId) {
            const host = document.createElement('span');
            host.className = 'host';
            host.textContent = 'HOST';
            row.appendChild(host);
          }

          const score = document.createElement('span');
          score.className = 'score';
          score.textContent = player.score.toLocaleString('en-US');
          row.appendChild(score);
          list.appendChild(row);
        }
      }
      return;
    }

    setup.classList.remove('hidden');
    roomPanel.classList.add('hidden');
    nearby.innerHTML = '';
    for (const entry of this.squad.nearby) {
      const button = document.createElement('button');
      button.className = 'nearby-room';
      const label = entry.mode === 'teams' ? 'TEAMS 3V3' : entry.mode === 'tag' ? 'GPS TAG' : 'FREE FOR ALL';
      button.innerHTML = `<b>${entry.code}</b><span>${label} · ${entry.count}/6</span><span class="go">JOIN →</span>`;
      button.addEventListener('click', () => {
        const input = document.getElementById('squadCodeInput') as HTMLInputElement | null;
        if (input) input.value = entry.code;
        void this.joinRoom();
      });
      nearby.appendChild(button);
    }
  }

  private squadCallsign(): string {
    const input = document.getElementById('squadName') as HTMLInputElement | null;
    const raw = (input?.value || localStorage.getItem('adrianscombat.callsign') || 'PLAYER').trim();
    const clean = raw.replace(/[<>&"'`]/g, '').slice(0, 14).toUpperCase() || 'PLAYER';
    localStorage.setItem('adrianscombat.callsign', clean);
    if (input) input.value = clean;
    return clean;
  }

  private async createRoom(): Promise<void> {
    const modeSelect = document.getElementById('squadModeSelect') as HTMLSelectElement | null;
    const value = modeSelect?.value;
    const mode: SquadMode = value === 'teams' ? 'teams' : value === 'tag' ? 'tag' : 'ffa';
    this.setSquadStatus('CREATING ROOM…', true);
    const ok = await this.squad.create(this.squadCallsign(), mode);
    if (!ok) this.setSquadStatus('SQUAD SERVER OFFLINE · RUN npm run dev:https', false);
    this.renderSquadLobby();
  }

  private async joinRoom(): Promise<void> {
    const input = document.getElementById('squadCodeInput') as HTMLInputElement | null;
    const code = (input?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (code.length !== 4) {
      this.setSquadStatus('ENTER A FOUR-LETTER ROOM CODE', false);
      return;
    }
    this.setSquadStatus(`JOINING ${code}…`, true);
    const ok = await this.squad.join(code, this.squadCallsign());
    if (!ok) this.setSquadStatus('SQUAD SERVER OFFLINE · RUN npm run dev:https', false);
    this.renderSquadLobby();
  }

  private handleSquadNotice(notice: SquadNotice): void {
    if (notice.kind === 'tagged') {
      this.audio.play('damage');
      this.hud.flashDamage(28);
      this.player.addShake(0.4);
      this.hud.showBanner(
        notice.eliminated ? 'TAGGED OUT' : 'TAGGED',
        `BY ${notice.by}`,
        notice.eliminated ? 'RESPAWN · KEEP MOVING' : `${notice.distance}m · KEEP MOVING`,
        2.2,
      );
      return;
    }
    if (notice.kind === 'error') {
      this.setSquadStatus(notice.message, false);
      return;
    }
    if (notice.kind === 'left') {
      this.hud.setSquad(null);
      this.hud.showSquadFinal(null);
      this.renderSquadLobby();
      return;
    }
    if (notice.kind === 'rooms') {
      this.renderSquadLobby();
      return;
    }

    const room = notice.room;
    this.hud.setSquad(room, this.squad.youId);
    if (this.state === 'gameover') this.hud.showSquadFinal(room, this.squad.youId);
    this.setSquadStatus(`ROOM ${room.code} · ${room.players.length}/6`, true);
    this.renderSquadLobby();
  }

  private startSquadMatch(): void {
    if (!this.squad.room) {
      this.setSquadStatus('CREATE OR JOIN A ROOM FIRST', false);
      return;
    }
    this.setScreen(null);
    void this.startCameraAR();
  }

  private syncSquad(): void {
    if (!this.squad.room) return;
    this.squad.update(this.score, Math.max(1, this.wave), this.kills);
  }

  private updateTagMode(dt: number): void {
    this.tagCooldown = Math.max(0, this.tagCooldown - dt);
    const room = this.squad.room;
    if (!room || room.mode !== 'tag') {
      this.hud.setTagPrompt(null);
      return;
    }

    const fix = this.cameraAR.geo;
    if (fix) {
      this.geoSyncTimer -= dt;
      if (this.geoSyncTimer <= 0) {
        this.geoSyncTimer = 4;
        this.squad.updatePosition(fix.lat, fix.lon, fix.accuracy);
      }
    }

    const me = room.players.find((player) => player.id === this.squad.youId);
    if (!fix || !me?.hasPos) {
      this.hud.setTagPrompt(null);
      return;
    }

    let nearest: typeof room.players[number] | null = null;
    let nearestDistance = Infinity;
    for (const player of room.players) {
      if (player.id === this.squad.youId || !player.hasPos || player.x === undefined || player.z === undefined) continue;
      const distance = Math.hypot(player.x - (me.x ?? 0), player.z - (me.z ?? 0));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = player;
      }
    }

    if (!nearest || nearestDistance > 15) {
      this.hud.setTagPrompt(null);
      return;
    }

    this.hud.setTagPrompt(nearest.name, nearestDistance);
    if (this.input.firing && this.tagCooldown <= 0) {
      this.tagCooldown = 2.5;
      this.squad.tag(nearest.id);
      this.audio.play('hit');
      this.hud.toast(`TAG SENT · ${nearest.name}`, 1.2);
    }
  }

  private onResize = (): void => {    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  };

  private applyQuality(): void {
    const dpr = window.devicePixelRatio || 1;
    this.basePixelRatio = settings.quality === 'low' ? 1 : settings.quality === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.6);
    this.qualityScale = 1;
    this.applyPixelRatio();
    this.bloom.strength = settings.quality === 'low' ? 0 : settings.quality === 'high' ? 0.85 : 0.62;
    this.composer.setSize(window.innerWidth, window.innerHeight);
    const shadows = settings.quality !== 'low';
    this.renderer.shadowMap.enabled = shadows;
    if (this.arKey) this.arKey.castShadow = shadows;
  }

  private syncDifficultyUI(): void {
    const cfg = currentDifficulty();
    this.hud.setDifficulty(cfg.label);
    const select = document.getElementById('difficulty') as HTMLSelectElement | null;
    if (select) select.value = settings.difficulty;
    document.querySelectorAll<HTMLButtonElement>('.diff-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.diff === settings.difficulty);
    });
  }

  // ───────────────────────────── Armory & bombs ─────────────────────────────

  private selectedGun(): WeaponId {
    const id = settings.primary as WeaponId;
    if (!WEAPON_IDS.includes(id) || !isWeaponUnlocked(id)) return 'pulse';
    return id;
  }

  private syncSalvageUI(): void {
    const menu = document.getElementById('menuSalvage');
    if (menu) menu.textContent = progress.salvage.toLocaleString('en-US');
    const armory = document.getElementById('armorySalvage');
    if (armory) armory.textContent = progress.salvage.toLocaleString('en-US');
    const live = document.getElementById('salvageVal');
    if (live) live.textContent = this.runSalvage.toLocaleString('en-US');
    const daily = document.getElementById('dailyHint');
    if (daily) daily.classList.toggle('hidden', !dailyAvailable());
  }

  private addRunSalvage(amount: number): void {
    const value = Math.max(0, Math.round(amount));
    if (value <= 0) return;
    this.runSalvage += value;
    this.pendingSalvage += value;
    this.syncSalvageUI();
  }

  private flushSalvage(): void {
    if (this.pendingSalvage <= 0) return;
    addSalvage(this.pendingSalvage);
    this.pendingSalvage = 0;
    saveProgress();
    this.syncSalvageUI();
  }

  private syncLoadoutMini(): void {
    const mini = document.getElementById('loadoutMini');
    if (!mini) return;
    const gun = WEAPONS[this.selectedGun()].name.split(' ')[0];
    mini.textContent = `${gun} + ${currentBomb().short}`;
  }

  private playSpatial(name: SfxName, position: THREE.Vector3, volumeScale = 1): void {
    if (!settings.spatialAudio) {
      this.audio.play(name, { volume: Math.max(0, Math.min(1, volumeScale)) });
      return;
    }

    this.camera.getWorldDirection(this.tmpVec2);
    const rightX = -this.tmpVec2.z;
    const rightZ = this.tmpVec2.x;
    const dx = position.x - this.player.pos.x;
    const dy = position.y - this.player.pos.y;
    const dz = position.z - this.player.pos.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance < 0.15) {
      this.audio.play(name, { volume: volumeScale });
      return;
    }
    const pan = Math.max(-0.9, Math.min(0.9, (dx * rightX + dz * rightZ) / distance));
    const volume = Math.max(0.16, Math.min(1, 1 - distance / 40)) * volumeScale;
    this.audio.play(name, { pan, volume: Math.max(0, Math.min(1, volume)) });
  }

  private haptic(pattern: number | number[]): void {
    if (!settings.haptics) return;
    if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  }

  private enemyVoice(kind: EnemyKind, action: 'spawn' | 'attack' | 'death', position: THREE.Vector3): void {
    let pan = 0;
    let volume = 1;
    if (settings.spatialAudio) {
      this.camera.getWorldDirection(this.tmpVec2);
      const rightX = -this.tmpVec2.z;
      const rightZ = this.tmpVec2.x;
      const dx = position.x - this.player.pos.x;
      const dz = position.z - this.player.pos.z;
      const distance = Math.max(1, Math.hypot(dx, dz));
      pan = Math.max(-0.9, Math.min(0.9, (dx * rightX + dz * rightZ) / distance));
      volume = Math.max(0.14, Math.min(1, 1 - distance / 34));
    }
    this.audio.playEnemyVoice(kind, action, { pan, volume });
  }

  private updateEnemyBeds(): void {
    if (!this.cameraActive) {
      this.audio.setDroneHum(0, 0);
      return;
    }
    this.camera.getWorldDirection(this.tmpVec2);
    const rightX = -this.tmpVec2.z;
    const rightZ = this.tmpVec2.x;
    let nearest = Infinity;
    let pan = 0;
    for (const enemy of this.enemies.enemies) {
      if (enemy.dead || (enemy.kind !== 'drone' && enemy.kind !== 'ufo')) continue;
      const dx = enemy.group.position.x - this.player.pos.x;
      const dz = enemy.group.position.z - this.player.pos.z;
      const distance = Math.hypot(dx, dz);
      if (distance < nearest) {
        nearest = distance;
        const safe = Math.max(1, distance);
        pan = Math.max(-0.9, Math.min(0.9, (dx * rightX + dz * rightZ) / safe));
      }
    }
    const level = nearest < 28 ? Math.max(0, 1 - nearest / 28) : 0;
    this.audio.setDroneHum(level, pan);
  }

  private onEnemyImpact(enemy: import('./enemies').Enemy): void {
    const at = enemy.group.position.clone().setY(0.12);
    this.fx.burst(at, enemy.stats.color, 28, 7, 0.85);
    this.fx.ring(at, enemy.stats.color, 2.8, 0.55, 0.4);
    this.playSpatial('explosion', at, 0.6);
    this.player.addShake(0.12);
  }

  private openArmory(): void {
    this.audio.init();
    this.audio.play('ui');
    this.armorySelection = this.selectedGun();
    this.setScreen('armory');
    if (!this.armoryPreview) {
      const canvas = document.getElementById('armoryPreview') as HTMLCanvasElement | null;
      if (canvas) {
        try {
          this.armoryPreview = new ArmoryPreview(canvas);
        } catch (error) {
          console.warn('[Armory] 3D preview unavailable', error);
        }
      }
    }
    this.armoryPreview?.show();
    this.renderArmory();
  }

  private renderArmory(): void {
    const gunGrid = document.getElementById('armoryGuns');
    const bombGrid = document.getElementById('armoryBombs');
    const summary = document.getElementById('loadoutSummary');
    if (!gunGrid || !bombGrid) return;

    const bar = (label: string, value: number, max: number, text: string): string => {
      const pct = value <= 0 ? 0 : Math.max(6, Math.min(100, (value / max) * 100));
      return `<div class="armory-stat"><span>${label}</span><i><b style="width:${pct.toFixed(1)}%"></b></i><em>${text}</em></div>`;
    };

    const equippedId = this.selectedGun();
    const gun = this.armorySelection;
    const filterBar = document.getElementById('armoryFilters');
    const categories: Array<WeaponCategory | 'ALL'> = ['ALL', 'RIFLE', 'SMG', 'SHOTGUN', 'PISTOL', 'SNIPER', 'LMG', 'BLASTER'];
    if (filterBar) {
      filterBar.innerHTML = categories.map((category) => {
        const active = category === this.armoryFilter;
        return `<button class="armory-filter${active ? ' active' : ''}" data-filter="${category}">${category}</button>`;
      }).join('');
    }
    const visibleIds = WEAPON_IDS.filter((id) => this.armoryFilter === 'ALL' || WEAPONS[id].category === this.armoryFilter);
    gunGrid.innerHTML = visibleIds.map((id) => {
      const def = WEAPONS[id];
      const selected = id === gun;
      const equipped = id === equippedId;
      const unlocked = isWeaponUnlocked(id);
      const damage = def.damage * def.pellets;
      const rate = 1 / def.interval;
      return `<button class="armory-card${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}" data-gun="${id}">
        ${unlocked ? (equipped ? '<span class="selected-badge">EQUIPPED</span>' : '') : '<span class="lock-badge">LOCKED</span>'}
        <span class="a-role">${def.category} · ${def.role} · ${def.tag}</span>
        <h4>${def.name}</h4>
        <p>${def.desc}</p>
        <div class="armory-stats">
          ${bar('DMG', damage, 120, String(Math.round(damage)))}
          ${bar('RATE', rate, 16, rate.toFixed(1))}
          ${bar('MAG', def.mag, 40, String(def.mag))}
          ${bar('RANGE', def.range, 150, String(def.range))}
        </div>
        ${unlocked ? '' : `<span class="lock-price">${WEAPON_PRICES[id].toLocaleString()} SALVAGE</span>`}
      </button>`;
    }).join('');

    const bomb = currentBomb();
    bombGrid.innerHTML = BOMB_IDS.map((id) => {
      const def = BOMBS[id];
      const selected = id === bomb.id;
      return `<button class="armory-card bomb${selected ? ' selected' : ''}" data-bomb="${id}">
        ${selected ? '<span class="selected-badge">EQUIPPED</span>' : ''}
        <span class="a-role">EXPLOSIVE · ${def.cooldown}s CD</span>
        <h4>${def.name}</h4>
        <p>${def.desc}</p>
        <div class="armory-stats">
          ${bar('DMG', def.damage, 220, String(def.damage))}
          ${bar('RADIUS', def.radius, 9, `${def.radius}m`)}
          ${bar('FREEZE', def.freeze, 5, def.freeze > 0 ? `${def.freeze}s` : '—')}
        </div>
      </button>`;
    }).join('');

    if (summary) {
      summary.innerHTML = `EQUIPPED <b>${WEAPONS[gun].name}</b> <em>+</em> <b>${bomb.name}</b>`;
    }

    const previewName = document.getElementById('armoryPreviewName');
    const previewTag = document.getElementById('armoryPreviewTag');
    if (previewName) previewName.textContent = WEAPONS[gun].name;
    if (previewTag) previewTag.textContent = `${WEAPONS[gun].role} · ${WEAPONS[gun].tag}`;
    this.armoryPreview?.setWeapon(gun);

    const locked = !isWeaponUnlocked(gun);
    document.querySelector('.armory-preview')?.classList.toggle('locked', locked);
    const unlockRow = document.getElementById('armoryUnlock');
    const unlockName = document.getElementById('unlockName');
    const unlockDesc = document.getElementById('unlockDesc');
    const unlockCost = document.getElementById('unlockCost');
    const unlockBtn = document.getElementById('btnUnlockWeapon') as HTMLButtonElement | null;
    if (unlockRow && unlockName && unlockDesc && unlockCost) {
      unlockRow.classList.toggle('hidden', !locked);
      if (locked) {
        const price = weaponPrice(gun);
        const left = Math.max(0, price - progress.salvage);
        unlockName.textContent = WEAPONS[gun].name;
        unlockDesc.textContent = left > 0
          ? `Earn ${left.toLocaleString('en-US')} more salvage to unlock.`
          : 'Unlock cost covered. Claim it now.';
        unlockCost.textContent = `${price.toLocaleString('en-US')} SALVAGE`;
        if (unlockBtn) unlockBtn.disabled = left > 0;
      }
    }
    this.syncSalvageUI();
    this.syncLoadoutMini();
  }

  private updateBombUI(): void {
    const def = currentBomb();
    const ready = this.state === 'playing' && this.cameraReady && this.bombCooldown <= 0.001;
    const button = document.getElementById('btnBomb') as HTMLButtonElement | null;
    if (button) {
      const text = ready ? def.short : this.bombCooldown > 0 ? `${Math.ceil(this.bombCooldown)}s` : def.short;
      if (text !== this.lastBombText) {
        button.textContent = text;
        this.lastBombText = text;
      }
      button.disabled = !ready;
      button.title = `${def.name} — ${def.desc}`;
      button.dataset.bomb = def.id;
    }
    const fire = document.getElementById('btnFire');
    if (fire) {
      fire.classList.toggle('bomb-ready', ready);
      fire.title = ready
        ? `Hold FIRE to throw ${def.name}`
        : `${def.name} recharging · ${Math.ceil(this.bombCooldown)}s`;
    }
  }

  private updateBombHold(dt: number): void {
    const fire = document.getElementById('btnFire');
    if (!this.input.firing) {
      this.bombHold = 0;
      this.bombHoldLatched = false;
      fire?.classList.remove('charging');
      fire?.style.setProperty('--charge', '0deg');
      return;
    }

    if (this.bombHoldLatched) return;

    this.bombHold = Math.min(1, this.bombHold + dt / 0.9);
    fire?.classList.add('charging');
    fire?.style.setProperty('--charge', `${(this.bombHold * 360).toFixed(1)}deg`);
    if (this.bombHold < 1) return;

    this.bombHoldLatched = true;
    this.bombHold = 0;
    fire?.classList.remove('charging');
    fire?.style.setProperty('--charge', '0deg');

    if (this.bombCooldown > 0) {
      this.audio.play('empty');
      this.hud.toast(`BOMB RECHARGING · ${Math.ceil(this.bombCooldown)}s`, 1.2);
      return;
    }

    this.throwBomb(undefined, true);
  }

  private throwBomb(target?: THREE.Vector3, charged = false): void {
    if (this.state !== 'playing' || !this.cameraReady || this.bombCooldown > 0) return;
    const def = currentBomb();
    this.computeAim();

    const dir = target ? target.clone().sub(this.aimOrigin).normalize() : this.aimDir.clone();
    const origin = this.aimOrigin.clone().addScaledVector(dir, 0.4);
    origin.y += 0.05;
    let material = this.bombMats.get(def.color);
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        color: def.color,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.95,
      });
      this.bombMats.set(def.color, material);
    }

    const mesh = new THREE.Mesh(this.bombGeo, material);
    mesh.position.copy(origin);
    mesh.frustumCulled = false;
    this.worldRoot.add(mesh);

    const velocity = dir.multiplyScalar(def.throwSpeed);
    velocity.y += target ? 0.9 : 2.2;
    this.bombs.push({ mesh, velocity, life: 0, def, charged });

    this.haptic(14);
    this.bombCooldown = def.cooldown;
    if (charged) this.audio.play('lightsaber', { volume: 0.7 });
    this.audio.play(charged ? 'boss' : 'dash');
    this.hud.toast(charged ? `${def.name} · SPECIAL` : `${def.name} OUT`, 1.2);
    this.updateBombUI();
  }

  private updateBombs(dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.life += dt;
      bomb.velocity.y -= 12 * dt;
      bomb.mesh.position.addScaledVector(bomb.velocity, dt);
      bomb.mesh.rotation.x += dt * 7;
      bomb.mesh.rotation.y += dt * 5;

      if (bomb.mesh.position.y <= 0.16 || bomb.life >= bomb.def.fuse) {
        this.detonateBomb(bomb);
        this.bombs.splice(i, 1);
      }
    }
  }

  private detonateBomb(bomb: { mesh: THREE.Mesh; def: BombDef; charged?: boolean }): void {
    const def = bomb.def;
    const radius = def.radius * (bomb.charged ? 1.18 : 1);
    const power = bomb.charged ? 1.35 : 1;
    const pos = bomb.mesh.position.clone();
    pos.y = Math.max(0.15, pos.y);
    this.worldRoot.remove(bomb.mesh);

    let kills = 0;
    for (const enemy of this.enemies.enemies) {
      if (enemy.dead) continue;
      const center = enemy.hitCenter(new THREE.Vector3());
      const distance = center.distanceTo(pos);
      if (distance > radius) continue;
      const falloff = 1 - Math.min(1, distance / radius) * 0.45;
      const damage = def.damage * falloff * power;
      const died = enemy.takeDamage(damage);
      this.fx.damageNumber(center, Math.round(damage), '#ffd76e', true);
      if (died) {
        kills++;
        this.handleKill(enemy, center);
      }
    }

    this.fx.burst(pos, def.color, bomb.charged ? 110 : 70, bomb.charged ? 16 : 13, 1.2);
    this.fx.ring(pos, def.color, radius, 0.9, 0.5);
    this.fx.ring(pos, 0xffffff, radius * 0.55, 0.5, 0.4);
    this.playSpatial('explosion', pos, 1.25);
    this.audio.play('force', { volume: 0.5 });
    this.haptic([50, 25, 70]);
    this.player.addShake(0.8);

    if (def.freeze > 0) {
      this.freezeTimer = Math.max(this.freezeTimer, def.freeze);
      this.hud.toast(`${def.short} · ENEMIES FROZEN`, 1.5);
    } else {
      this.hud.toast(`${def.short} BLAST${kills > 0 ? ` · ${kills} KILL${kills > 1 ? 'S' : ''}` : ''}`, 1.4);
    }
  }

  private clearBombs(): void {
    for (const bomb of this.bombs) this.worldRoot.remove(bomb.mesh);
    this.bombs.length = 0;
  }

  // ───────────────────────────── Flow ─────────────────────────────

  private async startCameraAR(): Promise<void> {
    if (this.startingAR) return;
    this.startingAR = true;

    try {
      const root = document.documentElement;
      if (!document.fullscreenElement && root.requestFullscreen) {
        void root.requestFullscreen().catch(() => {});
      }
    } catch {
      /* fullscreen unsupported (iOS) */
    }

    this.audio.init();
    this.audio.setVolume(settings.volume);
    this.audio.setMusicEnabled(settings.music);
    this.audio.startMusic();
    this.audio.setPaused(false);
    this.audio.startAmbience();
    this.menuMusic.setGameplay(true);
    this.audio.play('hyperspace', { volume: 0.55 });

    this.worldRoot.position.set(0, 0, 0);
    this.worldRoot.rotation.set(0, 0, 0);
    this.worldRoot.scale.setScalar(1);
    this.arena.group.visible = false;
    this.arena.setFreeRoam(true);
    this.arena.setAR(true);
    this.arGround.visible = true;
    this.arLights.visible = true;
    this.scene.fog = null;
    this.scene.background = null;
    this.envBrightness = 0.65;

    this.resetRun();
    this.player.pos.set(0, 1.6, 0);
    this.camera.fov = settings.fov;
    this.camera.updateProjectionMatrix();
    this.setAiming(false, false);
    this.requestLandscape();
    this.weapons.setVisible(true);
    this.weapons.setPrimary(this.selectedGun());
    this.pickups.setAttract(true);
    this.bombCooldown = 0;
    this.bombHold = 0;
    this.bombHoldLatched = false;
    this.lastBombText = '';
    this.cameraRecoilPitch = 0;
    this.cameraRecoilYaw = 0;
    this.torchLight.intensity = settings.torch ? 4.5 : 0;
    this.updateBombUI();

    this.hud.showSquadFinal(null);
    this.hud.setTagPrompt(null);
    if (this.squad.room) {
      this.squadSyncTimer = 0;
      this.squad.update(0, 1, 0);
      this.hud.setSquad(this.squad.room, this.squad.youId);
    } else {
      this.hud.setSquad(null);
    }

    this.state = 'playing';
    this.cameraActive = true;
    this.cameraReady = false;
    this.setScreen(null);
    this.hud.show();
    this.hud.setCameraAR(true);
    this.hud.setCrosshairVisible(true);
    this.hud.setTracking(false, false, false);
    this.hud.showARHint('REQUESTING CAMERA & MOTION…');
    this.input.clear();
    this.input.enabled = true;
    this.triggerLatch = false;
    this.bestScore = loadRecord().score;
    this.hud.setScore(0, Math.max(this.bestScore, 0));

    try {
      if (!this.cameraAR.active) {
        await this.cameraAR.start(() => this.refreshTracking());
      }
      this.refreshTracking();

      if (!window.isSecureContext) {
        this.hud.toast('CAMERA NEEDS HTTPS · OPEN THE SECURE LINK', 4);
      } else if (!this.cameraAR.cameraOk) {
        this.hud.toast('CAMERA OFFLINE · DRAG TO AIM', 3.2);
      }

      const hint = this.cameraAR.gyroActive
        ? 'POINT AT THE INVASION · HOLD FIRE'
        : 'DRAG TO AIM · HOLD FIRE';
      this.hud.showARHint(hint);
      window.setTimeout(() => this.hud.hideARHint(), 3600);
    } catch (error) {
      console.warn('[AR] camera start failed', error);
      this.hud.toast('CAMERA FAILED · DRAG TO AIM', 3.2);
    }

    this.cameraReady = true;
    this.startingAR = false;
    this.lastTime = performance.now();
    this.updateBombUI();
    this.beginWave(1);
  }

  private resetRun(): void {
    this.player.reset();
    this.weapons.reset();
    this.enemies.clear();
    this.pickups.clear();
    this.fx.clear();
    this.clearBombs();
    this.bombCooldown = 0;
    this.lastBombText = '';
    this.score = 0;
    this.wave = 0;
    this.level = 1;
    this.sector = sectorForWave(1).sector;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 1;
    this.runTime = 0;
    this.overchargeTimer = 0;
    this.rapidTimer = 0;
    this.freezeTimer = 0;
    this.spawnQueue = [];
    this.spawnClock = 0;
    this.waveActive = false;
    this.waveModifier = 'standard';
    this.waveHpMul = 1;
    this.intermission = 0;
    this.triggerLatch = false;
    this.radarAccumulator = 0;
    this.squadSyncTimer = 0;
    this.geoSyncTimer = 0;
    this.tagCooldown = 0;
    this.multiKillCount = 0;
    this.multiKillTimer = 0;
    this.runSalvage = 0;
    this.pendingSalvage = 0;
    this.setAiming(false, false);
    const daily = beginDailyRun();
    this.dailyRun = daily.daily;
    this.dailyStreak = daily.streak;
    this.syncSalvageUI();
    this.hud.setWave(1);
    this.hud.setLevel(1, this.sector.name, this.sector.accent);
    this.hud.setScore(0, this.bestScore);
    this.hud.setCombo(1, false);
    this.hud.setBoss(null);
    this.hud.setBuffs([]);
    this.hud.hideARHint();
  }

  private beginWave(n: number): void {
    this.wave = n;
    this.waveActive = true;
    this.spawnQueue = [];
    this.spawnClock = 0;
    this.hud.setWave(n);
    const sector = sectorForWave(n);
    this.level = sector.level;
    this.sector = sector.sector;
    this.hud.setLevel(sector.level, sector.sector.name, sector.sector.accent);
    this.applySectorTheme(sector.sector);

    const modRoll = Math.random();
    this.waveModifier = n >= 4 && n % 3 === 0
      ? (modRoll < 0.3 ? 'armored' : modRoll < 0.55 ? 'air' : modRoll < 0.8 ? 'horde' : 'elite')
      : 'standard';
    this.waveHpMul = (this.waveModifier === 'elite' ? 1.5 : 1) * sector.hpMul;

    const isBoss = n % 5 === 0;
    const finale = isSectorFinale(n);
    if (isBoss) {
      const index = (Math.floor(n / 5) - 1) % BOSS_CYCLE.length;
      const boss = BOSS_CYCLE[index];
      const mirrored = boss.kind === 'mirrored';

      this.spawnQueue.push({ kind: boss.kind, at: 1.5, scale: boss.scale * (1 + (sector.level - 1) * 0.04) });
      if (mirrored) this.spawnQueue.push({ kind: boss.kind, at: 2.1, scale: boss.scale * (1 + (sector.level - 1) * 0.04) });
      if (finale) {
        const second = BOSS_CYCLE[(index + 4) % BOSS_CYCLE.length];
        this.spawnQueue.push({ kind: second.kind, at: 2.6, scale: second.scale * 0.82 });
      }

      const escorts = Math.max(1, Math.min(7, Math.round((1 + Math.floor(n / 5)) * currentDifficulty().count)));
      for (let i = 0; i < escorts; i++) {
        this.spawnQueue.push({ kind: i % 2 === 0 ? 'ufo' : 'drone', at: 2.5 + i * 0.7, scale: 1 });
      }

      this.hud.showBanner(finale ? 'SECTOR BOSS' : '⚠ WARNING', boss.name, finale ? `${sector.sector.name} · FINAL GUARDIAN` : mirrored ? 'TWO SIGNATURES INBOUND' : 'BOSS WAVE — DESTROY IT', 3.2);
      this.audio.play('klaxon', { volume: 0.7 });
      this.audio.play('boss');
    } else {
      const modifierCount = this.waveModifier === 'horde' ? 1.45 : this.waveModifier === 'elite' ? 0.8 : this.waveModifier === 'armored' ? 0.9 : 1;
      const count = Math.max(2, Math.min(30, Math.round((3 + (n - 1) * 1.1) * currentDifficulty().count * modifierCount * sector.countMul)));
      for (let i = 0; i < count; i++) {
        this.spawnQueue.push({ kind: this.pickKind(n), at: 0.8 + i * 0.6, scale: 1 });
      }
      if (isSectorStart(n)) {
        this.hud.showBanner(`SECTOR ${sector.level}`, sector.sector.name, sector.sector.tagline, 3.2);
      } else {
        const sub = this.waveModifier === 'armored'
          ? 'ARMORED COLUMN · TANKS INBOUND'
          : this.waveModifier === 'air'
            ? 'AIR SUPERIORITY · FIGHTERS INBOUND'
            : this.waveModifier === 'horde'
              ? 'HORDE SURGE · HOLD THE LINE'
              : this.waveModifier === 'elite'
                ? 'ELITE GUARD · HARDER TARGETS'
                : WAVE_TAGS[n % WAVE_TAGS.length];
        this.hud.showBanner('INCOMING', `WAVE ${String(n).padStart(2, '0')}`, sub, 2.6);
      }
      this.audio.play('wave');
    }
  }

  private pickKind(wave: number): EnemyKind {
    if (Math.random() < 0.26) {
      const bias = this.sector.bias;
      if (bias.length > 0) return bias[Math.floor(Math.random() * bias.length)];
    }
    if (this.waveModifier === 'armored') {
      const pool: EnemyKind[] = ['tank', 'apc', 'artillery', 'brute', 'mech', 'tank', 'apc'];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (this.waveModifier === 'air') {
      const pool: EnemyKind[] = ['helicopter', 'jet', 'striker', 'omen', 'ufo', 'drone', 'phantom', 'helicopter', 'jet'];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (this.waveModifier === 'horde') {
      const pool: EnemyKind[] = ['zombie', 'gingerbread', 'imp', 'alien', 'zombie', 'gingerbread', 'raptor'];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const early: EnemyKind[] = ['drone', 'zombie', 'gingerbread'];
    const wave2: EnemyKind[] = [
      'drone', 'zombie', 'gingerbread', 'alien', 'imp', 'scarecrow', 'pumpkin',
    ];
    const wave4: EnemyKind[] = [
      ...wave2, 'raptor', 'ufo', 'banshee', 'clown',
    ];
    const wave7: EnemyKind[] = [
      ...wave4, 'voidling', 'mummy', 'demon', 'wendigo', 'reaper',
    ];
    const late: EnemyKind[] = [
      ...wave7, 'mech', 'brute', 'spire',
    ];
    const pool = wave < 2 ? early : wave < 4 ? wave2 : wave < 7 ? wave4 : wave < 11 ? wave7 : late;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private spawnEnemy(kind: EnemyKind, scale = 1): void {
    let position: THREE.Vector3;
    if (this.cameraActive) {
      this.camera.getWorldDirection(this.camDir);
      const forwardAngle = Math.atan2(this.camDir.x, this.camDir.z);
      const isBoss = BOSS_CYCLE.some((entry) => entry.kind === kind);
      const frontBias = isBoss || Math.random() < 0.55;
      const angle = frontBias
        ? forwardAngle + (Math.random() - 0.5) * (isBoss ? 1.2 : 1.8)
        : Math.random() * Math.PI * 2;
      const distance = isBoss ? 7 + Math.random() * 2 : 5.5 + Math.random() * 5;
      position = new THREE.Vector3(
        this.player.pos.x + Math.sin(angle) * distance,
        0,
        this.player.pos.z + Math.cos(angle) * distance,
      );
    } else {
      position = this.arena.randomSpawnPoint(this.player.pos, 8, 22.5);
    }

    if (kind === 'alien') {
      // Little green visitors arrive in pairs.
      this.spawnSpecific(kind, position, scale);
      const extra = position.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 1.8, 0, (Math.random() - 0.5) * 1.8),
      );
      this.spawnSpecific(kind, extra, scale);
      return;
    }

    if (kind === 'imp') {
      // Minion-style troublemakers always arrive in a pack.
      for (let i = 0; i < 3; i++) {
        const at = position.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 2.2, 0, (Math.random() - 0.5) * 2.2),
        );
        this.spawnSpecific(kind, at, scale);
      }
      return;
    }

    this.spawnSpecific(kind, position, scale);
  }

  private spawnSpecific(kind: EnemyKind, position: THREE.Vector3, scale = 1): void {
    const enemy = this.enemies.spawn(kind, this.wave, position, scale, this.waveHpMul);
    this.enemyVoice(kind, 'spawn', position.clone().setY(enemy.stats.hover > 0 ? enemy.stats.hover : 1.1));
    const ringPos = position.clone().setY(0.08);
    this.fx.ring(ringPos, enemy.stats.color, enemy.isBoss ? 4 : 1.8, enemy.isBoss ? 0.8 : 0.45);
    this.fx.burst(
      position.clone().setY(enemy.stats.hover > 0 ? enemy.stats.hover : 1.1),
      enemy.stats.color,
      enemy.isBoss ? 40 : 12,
      enemy.isBoss ? 9 : 4,
      enemy.isBoss ? 1 : 0.5,
    );
    if (enemy.isBoss) {
      this.hud.showBanner('BOSS DEPLOYED', enemy.name, 'DESTROY IT', 2.6);
      this.audio.play('force', { volume: 0.55 });
      this.audio.play('boss');
    }
  }

  private summonEnemy(kind: EnemyKind, at: THREE.Vector3): void {
    const position = at.clone();
    position.y = 0;
    position.x += (Math.random() - 0.5) * 1.2;
    position.z += (Math.random() - 0.5) * 1.2;
    this.spawnSpecific(kind, position, 0.9);
  }

  private updateWaves(dt: number): void {
    this.spawnClock += dt;

    if (this.waveActive) {
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.spawnClock) {
        const ticket = this.spawnQueue.shift()!;
        this.spawnEnemy(ticket.kind, ticket.scale);
      }

      if (this.spawnQueue.length === 0 && this.enemies.aliveCount === 0 && this.wave > 0) {
        this.waveActive = false;
        const sectorClear = isSectorFinale(this.wave);
        this.intermission = sectorClear ? 5 : 4;
        const bonus = 200 + this.wave * 100 + (sectorClear ? 500 + this.level * 250 : 0);
        this.score += bonus;
        this.addRunSalvage(25 + this.wave * 6 + (sectorClear ? 150 : 0));
        this.flushSalvage();
        if (sectorClear) {
          this.hud.showBanner('SECTOR CLEAR', `LEVEL ${this.level} COMPLETE`, `+${bonus.toLocaleString('en-US')} BONUS · NEXT SECTOR INBOUND`, 3.6);
          this.hud.toast('SECTOR BONUS BANKED', 2.2);
          this.audio.play('boss');
        } else {
          this.hud.showBanner('SECTOR CLEAR', `WAVE ${this.wave} CLEARED`, `+${bonus.toLocaleString('en-US')} BONUS`, 3);
          this.hud.toast('SUPPLY DROP INBOUND', 2.2);
          this.audio.play('wave');
        }
        this.player.addShield(20);
        this.player.heal(10);
        this.syncSquad();
        this.pickups.spawn(
          new THREE.Vector3(this.player.pos.x + (Math.random() - 0.5) * 3, 0, this.player.pos.z + (Math.random() - 0.5) * 3),
          Math.random() < 0.55 ? 'shield' : 'repair',
        );
        this.fx.ring(new THREE.Vector3(this.player.pos.x, 0.08, this.player.pos.z), 0x43f3ff, 6, 1);
      }
    } else if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.beginWave(this.wave + 1);
    }
  }

  // ───────────────────────────── Main loop ─────────────────────────────

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.cameraActive) {
      this.cameraAR.update(this.camera, dt);
      if (this.cameraRecoilPitch !== 0 || this.cameraRecoilYaw !== 0) {
        this.camera.rotateX(this.cameraRecoilPitch);
        this.camera.rotateY(this.cameraRecoilYaw);
        this.cameraRecoilPitch *= Math.exp(-9 * dt);
        this.cameraRecoilYaw *= Math.exp(-9 * dt);
        if (Math.abs(this.cameraRecoilPitch) < 0.0001) this.cameraRecoilPitch = 0;
        if (Math.abs(this.cameraRecoilYaw) < 0.0001) this.cameraRecoilYaw = 0;
      }
      this.applyLightEstimate(dt);
      this.player.pos.copy(this.camera.position);
      this.camera.getWorldDirection(this.camDir);
      this.player.yaw = Math.atan2(-this.camDir.x, -this.camDir.z);
      this.applyARRoam(dt);

      this.player.shake *= Math.exp(-6 * dt);
      if (this.player.shake > 0.002 && !settings.reducedMotion) {
        const s = Math.min(1, this.player.shake);
        this.camera.position.x += Math.sin(now * 0.061) * 0.012 * s;
        this.camera.position.y += Math.cos(now * 0.053) * 0.012 * s;
        this.camera.rotateZ(Math.sin(now * 0.047) * 0.012 * s);
      }
    }

    if (this.state === 'playing') this.updatePlaying(dt);
    else if (this.state === 'menu') this.updateMenu(dt);
    else this.fx.update(Math.min(dt, 0.016));

    this.monitorPerformance(dt);
    this.render();
  };

  private monitorPerformance(dt: number): void {
    if (!this.cameraActive) return;
    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum < 2) return;

    const fps = this.fpsFrames / this.fpsAccum;
    this.fpsAccum = 0;
    this.fpsFrames = 0;

    if (fps < 40) {
      this.fastSeconds = 0;
      this.slowSeconds += 2;
      if (this.slowSeconds >= 4 && this.qualityScale > 0.7) {
        this.qualityScale = Math.max(0.7, this.qualityScale - 0.1);
        this.applyPixelRatio();
        this.slowSeconds = 0;
        if (!this.performanceModeAnnounced) {
          this.performanceModeAnnounced = true;
          this.hud.toast('PERFORMANCE MODE · SHARPER AIM, SMOOTHER FRAMES', 2.2);
        }
      }
    } else if (fps > 55) {
      this.slowSeconds = 0;
      this.fastSeconds += 2;
      if (this.fastSeconds >= 8 && this.qualityScale < 1) {
        this.qualityScale = Math.min(1, this.qualityScale + 0.05);
        this.applyPixelRatio();
        this.fastSeconds = 0;
      }
    } else {
      this.slowSeconds = 0;
      this.fastSeconds = 0;
    }
  }

  private applyPixelRatio(): void {
    const ratio = this.basePixelRatio * this.qualityScale;
    this.renderer.setPixelRatio(ratio);
    this.composer.setPixelRatio(ratio);
  }

  private updatePlaying(dt: number): void {
    if (!this.cameraReady) {
      this.hud.update(dt);
      return;
    }

    this.runTime += dt;
    this.tickPlayerPassive(dt);
    this.weapons.update(dt, 0, 0, 0, this.input.firing);

    this.handleFiring();
    this.updateBombHold(dt);
    this.updateBuffs(dt);

    this.bombCooldown = Math.max(0, this.bombCooldown - dt);
    this.updateBombs(dt);
    this.updateBombUI();

    this.ctx.freezeFactor = this.freezeTimer > 0 ? 0.45 : 1;
    this.enemies.update(dt, this.ctx);
    this.updateEnemyBeds();
    this.pickups.update(dt, this.player, (kind, at) => this.collectPickup(kind, at));
    this.fx.update(dt);
    this.updateARGround(dt);
    this.updateWaves(dt);

    if (this.squad.room) {
      this.squadSyncTimer -= dt;
      if (this.squadSyncTimer <= 0) {
        this.squadSyncTimer = 1.6;
        this.syncSquad();
      }
    }
    this.updateTagMode(dt);

    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0 && this.combo > 0) this.combo = 0;

    this.multiKillTimer = Math.max(0, this.multiKillTimer - dt);
    if (this.multiKillTimer <= 0) this.multiKillCount = 0;

    this.hud.setVitals(this.player);
    this.hud.setWeapon(this.weapons);
    const squadMe = this.squad.room?.mode === 'tag'
      ? this.squad.room.players.find((player) => player.id === this.squad.youId)
      : null;
    const displayScore = squadMe ? Math.max(this.score, squadMe.score) : this.score;
    this.hud.setScore(displayScore, Math.max(this.bestScore, displayScore));
    this.hud.setCombo(this.comboMultiplier, this.comboTimer > 0);
    this.hud.setBoss(this.enemies.boss);
    this.hud.setBuffs(this.collectBuffs());
    this.hud.update(dt);

    this.radarAccumulator += dt;
    if (this.radarAccumulator >= 0.033) {
      this.radarAccumulator = 0;
      this.hud.drawRadar(this.player, this.enemies.enemies, this.pickups.getMarkers());
    }
  }

  private updateMenu(dt: number): void {
    this.menuTime += dt;
    if (this.cameraActive) return;
    const t = this.menuTime * 0.07;
    const radius = 18 + Math.sin(t * 0.7) * 4;
    this.camera.position.set(Math.cos(t) * radius, 4.6 + Math.sin(t * 1.3) * 1.4, Math.sin(t) * radius);
    this.camera.lookAt(0, 2.2, 0);
    if (this.camera.fov !== 66) {
      this.camera.fov = 66;
      this.camera.updateProjectionMatrix();
    }
    this.arena.update(dt);
    this.fx.update(Math.min(dt, 0.02));
  }

  private updateARGround(dt: number): void {
    for (const child of this.arGround.children) {
      if (child.name === 'ar-ring') {
        child.rotation.z += dt * 0.05;
      }
    }
  }

  private applyLightEstimate(dt: number): void {
    const estimate = this.cameraAR.lightEstimate;
    if (!estimate.ready) return;
    const blend = 1 - Math.exp(-2.5 * dt);
    this.envBrightness = THREE.MathUtils.lerp(this.envBrightness, estimate.brightness, blend);
    const tint = estimate.color.clone().lerp(new THREE.Color(1, 1, 1), 0.42);
    this.arHemi.color.lerp(tint, blend);
    this.arHemi.intensity = THREE.MathUtils.lerp(this.arHemi.intensity, 0.75 + this.envBrightness * 1.45, blend);
    this.arKey.intensity = THREE.MathUtils.lerp(this.arKey.intensity, 1.1 + this.envBrightness * 2.2, blend);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(this.scene.environmentIntensity, 0.32 + this.envBrightness * 0.85, blend);
  }

  private applySectorTheme(sector: SectorDef): void {
    if (this.arRim) this.arRim.color.setHex(sector.accent);
    if (this.arFill) this.arFill.color.setHex(sector.accent);
    this.arena.setTheme(sector.accent);
  }

  private applyARRoam(dt: number): void {
    if (this.state !== 'playing') return;
    const mx = this.input.moveX;
    const my = this.input.moveY;
    if (Math.hypot(mx, my) < 0.08) return;
    const yaw = this.player.yaw;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const speed = 2.8;
    const dx = (forwardX * my + rightX * mx) * speed * dt;
    const dz = (forwardZ * my + rightZ * mx) * speed * dt;
    this.cameraAR.moveBy(dx, dz);
    this.camera.position.x += dx;
    this.camera.position.z += dz;
    this.player.pos.copy(this.camera.position);
  }

  private tickPlayerPassive(dt: number): void {
    this.player.timeSinceDamage += dt;
    this.player.invuln = Math.max(0, this.player.invuln - dt);
    if (this.player.shield < this.player.maxShield && this.player.timeSinceDamage > 5) {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + currentDifficulty().shieldRegen * dt);
    }
  }

  private updateBuffs(dt: number): void {
    this.overchargeTimer = Math.max(0, this.overchargeTimer - dt);
    this.rapidTimer = Math.max(0, this.rapidTimer - dt);
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);
  }

  private get comboMultiplier(): number {
    return Math.min(8, 1 + Math.floor(this.combo / 2));
  }

  private collectBuffs(): BuffDisplay[] {
    const buffs: BuffDisplay[] = [];
    if (this.overchargeTimer > 0) buffs.push({ label: 'OVERCHARGE 2×', ratio: this.overchargeTimer / 10, className: 'overcharge' });
    if (this.rapidTimer > 0) buffs.push({ label: 'RAPID FIRE', ratio: this.rapidTimer / 10, className: '' });
    if (this.freezeTimer > 0) buffs.push({ label: 'CRYO FIELD', ratio: this.freezeTimer / 6, className: 'freeze' });
    return buffs;
  }

  private refreshTracking(): void {
    const gear = this.cameraAR.gear;
    this.hud.setTracking(gear.camera, gear.gyro, gear.gps);
    this.hud.setCameraRetry(this.cameraActive && !gear.camera);
  }

  private async retryCamera(): Promise<void> {
    if (!this.cameraActive) return;
    this.hud.toast('RETRYING CAMERA…', 1.2);
    const ok = await this.cameraAR.retryCamera();
    this.refreshTracking();
    this.hud.setCameraRetry(!ok);
    this.hud.toast(ok ? 'CAMERA ONLINE' : 'CAMERA BLOCKED · ALLOW ACCESS IN BROWSER', 2.4);
  }

  // ───────────────────────────── Weapons ─────────────────────────────

  private handleFiring(): void {
    if (!this.input.firing) {
      this.triggerLatch = false;
      return;
    }
    if (this.triggerLatch) return;

    const fired = this.weapons.tryFire(this.rapidTimer > 0 ? 1.6 : 1);
    if (!fired) return;

    this.triggerLatch = true;
    this.fireWeapon(fired);
    if (this.weapons.def.auto) this.triggerLatch = false;
  }

  private fireWeapon(def: WeaponDef): void {
    this.computeAim();
    const origin = this.aimOrigin;
    const baseDir = this.aimDir;

    const muzzle = this.muzzleLocal;
    if (this.cameraActive) {
      muzzle.copy(origin).addScaledVector(baseDir, 0.3);
    } else {
      this.weapons.getMuzzleWorld(this.muzzleWorld);
      this.muzzleLocal.copy(this.muzzleWorld).applyMatrix4(this.worldInverse);
    }

    const spreadScale = this.cameraActive ? (this.aiming ? 0.12 : 0.35) : 1;
    const overcharge = this.overchargeTimer > 0;
    let anyHit = false;

    for (let pellet = 0; pellet < def.pellets; pellet++) {
      const dir = baseDir.clone();
      if (def.spread > 0) {
        const s = def.spread * spreadScale;
        dir.x += (Math.random() - 0.5) * s * 2;
        dir.y += (Math.random() - 0.5) * s * 2;
        dir.z += (Math.random() - 0.5) * s * 2;
        dir.normalize();
      }

      const assist = this.cameraActive ? (settings.aimAssist ? 1.75 : 1.08) : 1;
      const hits = this.enemies.raycast(origin, dir, def.range, def.pierce, assist);
      this.shotsFired++;
      const end = origin.clone().addScaledVector(dir, def.range);

      if (hits.length > 0) {
        this.shotsHit++;
        anyHit = true;
        end.copy(hits[hits.length - 1].point);

        for (const hit of hits) {
          const damage = def.damage * (overcharge ? 2 : 1);
          const died = hit.enemy.takeDamage(damage);
          this.fx.burst(hit.point, def.color, 5, 4, 0.32);
          this.fx.damageNumber(hit.point, damage, overcharge ? '#ffd76e' : '#9ff8ff', def.pierce);
          this.audio.play('hit');
          if (died) this.handleKill(hit.enemy, hit.point);
        }
      }

      const width = def.pierce ? 0.035 : 0.018;
      const life = def.pierce ? 0.16 : 0.085;
      this.fx.tracer(muzzle, end, def.color, width, life);
    }

    if (def.pierce) this.audio.play('ion', { volume: 0.35 });
    this.audio.play(WEAPON_SFX[def.id] ?? 'pulse');
    this.hud.showHitmarker(anyHit);
    this.haptic(def.pellets > 1 ? 18 : def.pierce ? 28 : 6);
    if (this.cameraActive) {
      this.cameraRecoilPitch += def.recoil * 0.9;
      this.cameraRecoilYaw += (Math.random() - 0.5) * def.recoil * 0.8;
    }
    this.player.addShake(def.shake);
  }

  private computeAim(): void {
    this.camera.updateWorldMatrix(true, false);
    this.worldRoot.updateMatrixWorld(true);
    this.worldInverse.copy(this.worldRoot.matrixWorld).invert();
    this.camera.getWorldPosition(this.aimOrigin);
    this.camera.getWorldDirection(this.camDir);
    this.aimOrigin.applyMatrix4(this.worldInverse);
    this.aimDir.copy(this.camDir).transformDirection(this.worldInverse).normalize();
  }

  // ───────────────────────────── Scoring & damage ─────────────────────────────

  private handleKill(enemy: import('./enemies').Enemy, at: THREE.Vector3): void {
    this.kills++;
    this.enemyVoice(enemy.kind, 'death', at);
    this.combo = Math.min(80, this.combo + 1);
    this.comboTimer = 3.6;
    this.multiKillCount++;
    this.multiKillTimer = 1.5;
    if (this.multiKillCount >= 2) {
      const callouts = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE'];
      const callout = callouts[Math.min(this.multiKillCount, callouts.length - 1)] ?? 'RAMPAGE';
      this.hud.toast(callout, 1.2);
    }
    const multiplier = this.comboMultiplier;
    this.bestCombo = Math.max(this.bestCombo, multiplier);

    const points = Math.round(enemy.stats.score * multiplier * currentDifficulty().score);
    this.score += points;
    this.addRunSalvage(
      Math.round((enemy.isBoss ? 140 : enemy.kind === 'brute' ? 14 : 8) * currentDifficulty().score),
    );
    this.syncSquad();

    this.hud.killfeed(enemy.name, points, enemy.isBoss);
    this.hud.showHitmarker(true);
    this.fx.burst(at, enemy.stats.color, enemy.isBoss ? 70 : 20, enemy.isBoss ? 13 : 8, enemy.isBoss ? 1.2 : 0.6);
    this.fx.ring(at, enemy.stats.color, enemy.isBoss ? 10 : 2.8, enemy.isBoss ? 1 : 0.45);
    const killSound = enemy.isBoss || Math.random() < 0.4 ? 'explosion' : 'kill';
    this.playSpatial(killSound, at, enemy.isBoss ? 1.25 : 0.95);
    this.haptic(enemy.isBoss ? [60, 30, 90] : 8);
    this.player.addShake(enemy.isBoss ? 0.9 : 0.1);

    if (enemy.isBoss) {
      this.score += Math.round((1200 + this.wave * 220) * currentDifficulty().score);
      this.hud.showBanner('BOSS ELIMINATED', enemy.name, 'SECTOR SECURED', 2.8);
      this.fx.burst(at, 0xff2fa8, 36, 11, 1.1);
      this.fx.burst(at, 0x43f3ff, 36, 11, 1.1);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        this.pickups.spawn(at.clone().add(new THREE.Vector3(Math.cos(angle) * 1.3, 0, Math.sin(angle) * 1.3)));
      }
    } else if (Math.random() < 0.24) {
      this.pickups.spawn(at.clone().setY(0));
    }
  }

  private collectPickup(kind: PickupKind, at: THREE.Vector3): void {
    const color = PICKUP_COLORS[kind];
    this.hud.toast(PICKUP_LABELS[kind], 2.1);
    this.playSpatial('pickup', at, 0.9);
    this.audio.play('droid', { volume: 0.42 });
    this.haptic(10);
    this.fx.ring(at, color, 2.2, 0.55);
    this.fx.burst(at, color, 20, 6, 0.7);

    switch (kind) {
      case 'repair':
        this.player.heal(35);
        break;
      case 'shield':
        this.player.addShield(50);
        break;
      case 'overcharge':
        this.overchargeTimer = 10;
        break;
      case 'rapid':
        this.rapidTimer = 10;
        break;
      case 'freeze':
        this.freezeTimer = 6;
        this.fx.ring(new THREE.Vector3(this.player.pos.x, 0.1, this.player.pos.z), 0x8fd4ff, 6, 1.2, 0.5);
        break;
    }
  }

  private damagePlayer(amount: number, at: THREE.Vector3): void {
    if (this.state !== 'playing') return;
    const scaled = amount * currentDifficulty().damage;
    const hadShield = this.player.shield > 0;
    const result = this.player.damage(scaled);
    if (result.absorbed + result.hull <= 0) return;
    if (hadShield && this.player.shield <= 0) this.hud.toast('SHIELD BREAK', 1.3);

    this.hud.flashDamage(scaled);
    this.audio.play('damage');
    this.haptic([30, 20, 40]);

    this.camera.getWorldDirection(this.tmpVec2);
    const rightX = -this.tmpVec2.z;
    const rightZ = this.tmpVec2.x;
    const dx = at.x - this.player.pos.x;
    const dz = at.z - this.player.pos.z;
    const angle = Math.atan2(dx * rightX + dz * rightZ, dx * this.tmpVec2.x + dz * this.tmpVec2.z);
    this.hud.showDamageDirection(angle);

    if (result.hull > 0) {
      this.combo = 0;
      this.comboTimer = 0;
      this.player.addShake(0.35);
    }

    if (result.died) this.gameOver();
  }

  // ───────────────────────────── Screens & input ─────────────────────────────

  private toggleAim(): void {
    if (this.state !== 'playing' || !this.cameraReady) return;
    this.setAiming(!this.aiming, true);
    this.audio.play('ui');
  }

  private setAiming(active: boolean, announce: boolean): void {
    this.aiming = active;
    document.body.classList.toggle('aiming', active);
    const button = document.getElementById('btnAim');
    if (button) button.setAttribute('aria-pressed', String(active));
    const fov = active ? Math.max(30, settings.fov * 0.6) : settings.fov;
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    if (announce) {
      this.audio.play(active ? 'lock' : 'ui');
      if (active) this.audio.play('lightsaber', { volume: 0.38 });
      this.hud.toast(active ? 'AIM LOCK · ZOOM' : 'AIM RELEASED', 0.9);
    }
  }

  private requestLandscape(): void {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      void orientation.lock?.('landscape').catch(() => {});
    } catch {
      /* orientation lock unavailable (iOS Safari) */
    }
  }

  private setScreen(name: 'menu' | 'pause' | 'gameover' | 'settings' | 'howto' | 'squad' | 'armory' | null): void {
    const mapping: Record<string, string> = {
      menu: 'menu',
      pause: 'pause',
      gameover: 'gameover',
      settings: 'settings',
      howto: 'howto',
      squad: 'squad',
      armory: 'armory',
    };
    for (const key of Object.keys(mapping)) {
      document.getElementById(mapping[key])?.classList.toggle('hidden', key !== name);
    }
    if (name !== 'armory') this.armoryPreview?.hide();
  }

  private openSettings(returnTo: 'menu' | 'pause'): void {
    this.settingsReturn = returnTo;
    this.setScreen('settings');
  }

  private closeSettings(): void {
    this.setScreen(this.settingsReturn);
  }

  private handleAction = (action: Action): void => {
    if (action === 'pause') {
      this.togglePause();
      return;
    }
    if (this.state !== 'playing') return;
    if (action === 'reload') this.weapons.startReload();
  };

  private togglePause(): void {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  private pause(): void {
    if (this.state !== 'playing' || !this.cameraReady) return;
    this.state = 'paused';
    this.input.enabled = false;
    this.input.firing = false;
    this.input.clear();
    this.audio.setPaused(true);
    this.hud.setCrosshairVisible(false);
    this.hud.setTagPrompt(null);
    this.setScreen('pause');
  }

  private resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.input.enabled = true;
    this.triggerLatch = true;
    this.setScreen(null);
    this.hud.setCrosshairVisible(true);
    this.audio.setPaused(false);
    this.lastTime = performance.now();
    if (this.wave === 0 && this.cameraReady) this.beginWave(1);
  }

  private gameOver(): void {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    this.setAiming(false, false);
    this.input.enabled = false;
    this.input.firing = false;
    this.audio.play('gameover');
    this.audio.play('force', { volume: 0.45 });
    this.audio.setPaused(true);
    this.clearBombs();
    this.bombCooldown = 0;

    const at = this.player.pos.clone();
    this.fx.burst(at, 0xff3b5c, 50, 10, 1.1);
    this.fx.ring(new THREE.Vector3(at.x, 0.1, at.z), 0xff3b5c, 8, 0.9);
    this.player.addShake(1);

    this.addRunSalvage(20 + this.wave * 4);
    if (this.dailyRun) this.addRunSalvage(this.runSalvage);
    this.flushSalvage();
    recordRun(this.wave, this.kills);

    const newRecord = submitRecord({ score: this.score, wave: this.wave, kills: this.kills });
    const record = loadRecord();
    this.bestScore = record.score;
    this.hud.setMenuRecord(record);
    this.hud.hide();
    const kicker = document.getElementById('overKicker');
    if (kicker) kicker.textContent = `${currentDifficulty().label} · SIGNAL TERMINATED`;

    const set = (id: string, value: string) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };
    const squadMe = this.squad.room?.mode === 'tag'
      ? this.squad.room.players.find((player) => player.id === this.squad.youId)
      : null;
    const displayScore = squadMe ? Math.max(this.score, squadMe.score) : this.score;
    set('statScore', displayScore.toLocaleString('en-US'));
    set('statWave', `${this.wave} / ${this.level}`);
    set('statKills', String(this.kills));
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    set('statAcc', `${accuracy}%`);
    set('statCombo', `x${this.bestCombo}`);
    const minutes = Math.floor(this.runTime / 60);
    const seconds = Math.floor(this.runTime % 60);
    set('statTime', `${minutes}:${String(seconds).padStart(2, '0')}`);
    set('statSalvage', `+${this.runSalvage.toLocaleString('en-US')}`);
    document.getElementById('dailyBonus')?.classList.toggle('hidden', !this.dailyRun);
    const next = cheapestLockedWeapon();
    if (next) {
      const price = weaponPrice(next);
      set('nextUnlockName', WEAPONS[next].name);
      set('nextUnlockCost', `${progress.salvage.toLocaleString('en-US')} / ${price.toLocaleString('en-US')}`);
      const fill = document.getElementById('nextUnlockFill');
      if (fill) fill.style.width = `${Math.min(100, (progress.salvage / price) * 100).toFixed(1)}%`;
    } else {
      set('nextUnlockName', 'ALL WEAPONS UNLOCKED');
      set('nextUnlockCost', 'ARSENAL COMPLETE');
      const fill = document.getElementById('nextUnlockFill');
      if (fill) fill.style.width = '100%';
    }
    this.syncSalvageUI();
    document.getElementById('recordBadge')?.classList.toggle('hidden', !newRecord);
    this.syncSquad();
    this.hud.showSquadFinal(this.squad.room, this.squad.youId);
    this.setScreen('gameover');
  }

  private returnToMenu(): void {
    this.flushSalvage();
    this.cameraAR.stop();
    this.cameraActive = false;
    this.cameraReady = false;
    this.startingAR = false;
    this.state = 'menu';
    this.setAiming(false, false);
    try {
      sessionStorage.removeItem('adrianscombat.run');
    } catch {
      /* private mode */
    }
    this.input.enabled = false;
    this.input.clear();
    this.bombHold = 0;
    this.bombHoldLatched = false;
    this.audio.setPaused(false);
    this.audio.stopAmbience();
    this.hud.hide();
    this.hud.setCameraAR(false);
    this.hud.setCameraRetry(false);
    this.hud.setTracking(false, false, false);
    this.hud.hideARHint();
    this.hud.setSquad(null);
    this.hud.showSquadFinal(null);
    this.menuMusic.setGameplay(false);
    this.hud.setTagPrompt(null);
    this.enemies.clear();
    this.pickups.clear();
    this.fx.clear();
    this.clearBombs();
    this.bombCooldown = 0;
    this.lastBombText = '';
    this.arena.setFreeRoam(false);
    this.arena.setAR(false);
    this.arena.group.visible = true;
    this.arGround.visible = false;
    this.arLights.visible = false;
    this.scene.environmentIntensity = 0.55;
    this.pickups.setAttract(false);
    this.weapons.setVisible(false);
    this.worldRoot.position.set(0, 0, 0);
    this.worldRoot.rotation.set(0, 0, 0);
    this.worldRoot.scale.setScalar(1);

    this.setScreen('menu');
    const record = loadRecord();
    this.hud.setMenuRecord(record);
    this.bestScore = record.score;
    this.camera.fov = 66;
    this.camera.updateProjectionMatrix();
    this.torchLight.intensity = 0;
    this.lastTime = performance.now();
  }

  // ───────────────────────────── Render ─────────────────────────────

  private render(): void {
    if (this.cameraActive) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (settings.quality === 'low') this.renderer.render(this.scene, this.camera);
    else this.composer.render();
  }
}
