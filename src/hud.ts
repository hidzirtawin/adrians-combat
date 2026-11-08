import type { Player } from './player';
import type { WeaponDef, WeaponSystem } from './weapons';
import type { Enemy } from './enemies';
import type { PickupKind } from './pickups';
import type { HighRecord } from './settings';
import type { SquadRoom } from './squad';

export interface BuffDisplay {
  label: string;
  ratio: number;
  className: string;
}

const RADAR_RANGE = 32;

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing UI element #${id}`);
  return node as T;
}

export class HUD {
  private root = el<HTMLDivElement>('hud');
  private waveNum = el<HTMLElement>('waveNum');
  private scoreVal = el<HTMLElement>('scoreVal');
  private bestVal = el<HTMLElement>('bestVal');
  private diffChip = el<HTMLElement>('diffChip');

  private shieldFill = el<HTMLElement>('shieldFill');
  private healthFill = el<HTMLElement>('healthFill');
  private shieldText = el<HTMLElement>('shieldText');
  private healthText = el<HTMLElement>('healthText');
  private shieldMax = el<HTMLElement>('shieldMax');
  private healthMax = el<HTMLElement>('healthMax');
  private vitalsEl = el<HTMLElement>('vitals');
  private lifeStatus = el<HTMLElement>('lifeStatus');
  private trackingChip = el<HTMLElement>('trackingChip');
  private trackCam = el<HTMLElement>('trackCam');
  private trackGyro = el<HTMLElement>('trackGyro');
  private trackGps = el<HTMLElement>('trackGps');

  private weaponName = el<HTMLElement>('weaponName');
  private weaponTag = el<HTMLElement>('weaponTag');
  private ammoNow = el<HTMLElement>('ammoNow');
  private ammoMax = el<HTMLElement>('ammoMax');
  private ammoRow = el<HTMLElement>('ammoRow');
  private ammoPips = el<HTMLElement>('ammoPips');
  private reloadBar = el<HTMLElement>('reloadBar');
  private reloadFill = this.reloadBar.querySelector('i') as HTMLElement;
  private weaponSlots: HTMLButtonElement[] = [];

  private hitmarkerEl = el<HTMLElement>('hitmarker');
  private crosshair = el<HTMLElement>('crosshair');
  private comboBadge = el<HTMLElement>('comboBadge');
  private comboVal = el<HTMLElement>('comboVal');

  private bannerEl = el<HTMLElement>('waveBanner');
  private bannerKicker = el<HTMLElement>('bannerKicker');
  private bannerText = el<HTMLElement>('bannerText');
  private bannerSub = el<HTMLElement>('bannerSub');
  private toastEl = el<HTMLElement>('toast');
  private killfeedEl = el<HTMLElement>('killfeed');
  private buffBar = el<HTMLElement>('buffBar');
  private bossBar = el<HTMLElement>('bossBar');
  private bossName = el<HTMLElement>('bossName');
  private bossHpText = el<HTMLElement>('bossHpText');
  private bossFill = el<HTMLElement>('bossFill');

  private damageVignette = el<HTMLElement>('damageVignette');
  private damageDirection = el<HTMLElement>('damageDirection');
  private damageDirRing = el<HTMLElement>('damageDirRing');
  private radar = el<HTMLCanvasElement>('radar');
  private radarCtx: CanvasRenderingContext2D;
  private menuBest = el<HTMLElement>('menuBest');
  private menuWave = el<HTMLElement>('menuWave');
  private arHint = el<HTMLElement>('arHint');
  private squadHud = el<HTMLElement>('squadHud');
  private sqMode = el<HTMLElement>('sqMode');
  private sqCode = el<HTMLElement>('sqCode');
  private sqRows = el<HTMLElement>('sqRows');
  private squadFinal = el<HTMLElement>('squadFinal');
  private tagPrompt = el<HTMLElement>('tagPrompt');
  private tagName = el<HTMLElement>('tagName');
  private tagDist = el<HTMLElement>('tagDist');

  private bannerTimer = 0;
  private toastTimer = 0;
  private hitmarkerTimer = 0;
  private damageDirectionTimer = 0;
  private damageLevel = 0;

  private lastWave = -1;
  private lastScore = -1;
  private lastBest = -1;
  private lastHealth = -1;
  private lastShield = -1;
  private pipKey = '';
  private pipElements: HTMLElement[] = [];
  private buffKey = '';
  private buffElements: Array<{ root: HTMLElement; fill: HTMLElement }> = [];
  private lastBossName = '';

  constructor() {
    const ctx = this.radar.getContext('2d');
    if (!ctx) throw new Error('Radar canvas unsupported');
    this.radarCtx = ctx;
  }

  show(): void {
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
    this.bossBar.classList.add('hidden');
    this.comboBadge.classList.add('hidden');
    this.bannerEl.classList.remove('show');
    this.toastEl.classList.remove('show');
    this.tagPrompt.classList.add('hidden');
    this.damageDirection.classList.remove('show');
  }

  setMenuRecord(record: HighRecord): void {
    this.menuBest.textContent = record.score.toLocaleString('en-US');
    this.menuWave.textContent = String(record.wave);
    this.bestVal.textContent = `BEST ${record.score.toLocaleString('en-US')}`;
  }

  setWave(wave: number): void {
    if (wave === this.lastWave) return;
    this.lastWave = wave;
    this.waveNum.textContent = String(wave).padStart(2, '0');
  }

  setDifficulty(label: string): void {
    this.diffChip.textContent = label.toUpperCase();
    this.diffChip.className = label.toLowerCase();
  }

  setScore(score: number, best: number): void {
    if (score !== this.lastScore) {
      this.lastScore = score;
      this.scoreVal.textContent = score.toLocaleString('en-US');
    }
    if (best !== this.lastBest) {
      this.lastBest = best;
      this.bestVal.textContent = `BEST ${best.toLocaleString('en-US')}`;
    }
  }

  setVitals(player: Player): void {
    const health = Math.ceil(player.health);
    const shield = Math.ceil(player.shield);
    if (health !== this.lastHealth) {
      this.lastHealth = health;
      this.healthText.textContent = String(health);
      this.healthMax.textContent = `/${player.maxHealth}`;
      this.healthFill.style.transform = `scaleX(${Math.max(0, health / player.maxHealth)})`;

      const ratio = health / player.maxHealth;
      this.vitalsEl.classList.toggle('critical', ratio <= 0.3);
      this.vitalsEl.classList.toggle('warn', ratio > 0.3 && ratio <= 0.6);
      this.lifeStatus.textContent = ratio <= 0.3 ? 'CRITICAL' : ratio <= 0.6 ? 'DAMAGED' : 'STABLE';
    }
    if (shield !== this.lastShield) {
      this.lastShield = shield;
      this.shieldText.textContent = String(shield);
      this.shieldMax.textContent = `/${player.maxShield}`;
      this.shieldFill.style.transform = `scaleX(${Math.max(0, shield / player.maxShield)})`;
    }
    this.damageVignette.style.opacity = String(this.damageLevel);
  }

  setWeapon(system: WeaponSystem): void {
    const def = system.def;
    if (this.pipKey !== `${def.id}:${def.mag}`) {
      this.pipKey = `${def.id}:${def.mag}`;
      this.weaponName.textContent = def.name;
      this.weaponTag.textContent = def.tag;
      this.ammoMax.textContent = String(def.mag);
      this.ammoPips.innerHTML = '';
      this.pipElements = [];
      for (let i = 0; i < def.mag; i++) {
        const pip = document.createElement('i');
        this.ammoPips.appendChild(pip);
        this.pipElements.push(pip);
      }
      for (const slot of this.weaponSlots) {
        slot.classList.toggle('active', slot.dataset.slot === def.id);
      }
    }

    const ammo = system.ammo[def.id];
    const ammoText = String(ammo);
    if (this.ammoNow.textContent !== ammoText) this.ammoNow.textContent = ammoText;
    this.ammoRow.classList.toggle('low', ammo > 0 && ammo <= Math.ceil(def.mag * 0.25));
    this.ammoRow.classList.toggle('empty', ammo <= 0);
    for (let i = 0; i < this.pipElements.length; i++) {
      this.pipElements[i].classList.toggle('spent', i >= ammo);
    }

    const reloading = system.isReloading;
    this.reloadBar.classList.toggle('hidden', !reloading);
    if (reloading) this.reloadFill.style.transform = `scaleX(${system.reloadRatio})`;
  }

  setCombo(multiplier: number, active: boolean): void {
    if (!active || multiplier <= 1) {
      this.comboBadge.classList.add('hidden');
      return;
    }
    this.comboBadge.classList.remove('hidden');
    const text = String(multiplier);
    if (this.comboVal.textContent !== text) {
      this.comboVal.textContent = text;
      this.comboBadge.style.animation = 'none';
      void this.comboBadge.offsetWidth;
      this.comboBadge.style.animation = '';
    }
  }

  showBanner(kicker: string, title: string, sub: string, duration = 2.6): void {
    this.bannerKicker.textContent = kicker;
    this.bannerText.textContent = title;
    this.bannerSub.textContent = sub;
    this.bannerEl.classList.add('show');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.bannerEl.classList.remove('show'), duration * 1000);
  }

  toast(text: string, duration = 1.8): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), duration * 1000);
  }

  showHitmarker(kill = false): void {
    this.hitmarkerEl.classList.add('show');
    this.hitmarkerEl.classList.toggle('kill', kill);
    window.clearTimeout(this.hitmarkerTimer);
    this.hitmarkerTimer = window.setTimeout(() => {
      this.hitmarkerEl.classList.remove('show');
    }, kill ? 180 : 80);
  }

  killfeed(name: string, points: number, boss = false): void {
    const item = document.createElement('div');
    item.className = `feed-item${boss ? ' boss' : ''}`;
    item.innerHTML = `ELIMINATED <b>${name}</b><span class="pts">+${points}</span>`;
    this.killfeedEl.appendChild(item);
    while (this.killfeedEl.children.length > 5) this.killfeedEl.firstElementChild?.remove();
    window.setTimeout(() => item.classList.add('out'), 2600);
    window.setTimeout(() => item.remove(), 3100);
  }

  setBoss(enemy: Enemy | null): void {
    if (!enemy) {
      this.bossBar.classList.add('hidden');
      this.lastBossName = '';
      return;
    }
    this.bossBar.classList.remove('hidden');
    if (this.lastBossName !== enemy.name) {
      this.lastBossName = enemy.name;
      this.bossName.textContent = enemy.name;
    }
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    this.bossFill.style.transform = `scaleX(${ratio})`;
    this.bossHpText.textContent = `${Math.ceil(ratio * 100)}%`;
  }

  setBuffs(buffs: BuffDisplay[]): void {
    const key = buffs.map((b) => b.label + b.className).join('|');
    if (key !== this.buffKey) {
      this.buffKey = key;
      this.buffBar.innerHTML = '';
      this.buffElements = [];
      for (const buff of buffs) {
        const item = document.createElement('div');
        item.className = `buff ${buff.className}`;
        const label = document.createElement('span');
        label.textContent = buff.label;
        const fill = document.createElement('i');
        item.appendChild(label);
        item.appendChild(fill);
        this.buffBar.appendChild(item);
        this.buffElements.push({ root: item, fill });
      }
    }
    for (let i = 0; i < buffs.length && i < this.buffElements.length; i++) {
      this.buffElements[i].fill.style.transform = `scaleX(${Math.max(0, Math.min(1, buffs[i].ratio))})`;
    }
  }

  setAR(active: boolean): void {
    document.body.classList.toggle('ar-mode', active);
  }

  setCameraAR(active: boolean): void {
    document.body.classList.toggle('camera-ar', active);
    this.trackingChip.classList.toggle('hidden', !active);
    if (!active) {
      this.trackCam.classList.remove('on');
      this.trackGyro.classList.remove('on');
      this.trackGps.classList.remove('on');
    }
  }

  setSquad(room: SquadRoom | null, youId = ''): void {
    if (!room) {
      this.squadHud.classList.add('hidden');
      return;
    }
    this.squadHud.classList.remove('hidden');
    this.sqMode.textContent = room.mode === 'tag' ? 'GPS TAG' : room.mode === 'teams' ? 'TEAMS' : 'FREE FOR ALL';
    this.sqCode.textContent = room.code;

    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    this.sqRows.innerHTML = '';
    for (const player of sorted) {
      const row = document.createElement('div');
      row.className = `sq-row${player.id === youId ? ' me' : ''}`;

      const name = document.createElement('span');
      name.className = 'sq-name';
      name.textContent = player.name;

      if (room.mode === 'teams') {
        const team = document.createElement('span');
        team.className = `sq-team${player.team === 1 ? ' b' : ''}`;
        team.textContent = player.team === 1 ? 'B' : 'A';
        row.appendChild(team);
      }

      const score = document.createElement('span');
      score.className = 'sq-score';
      score.textContent = player.score.toLocaleString('en-US');

      row.appendChild(name);
      if (room.mode === 'tag') {
        const hp = document.createElement('span');
        hp.className = 'sq-hp';
        hp.textContent = `HP ${Math.max(0, Math.round(player.tagHealth ?? 100))}`;
        row.appendChild(hp);
      }
      row.appendChild(score);
      this.sqRows.appendChild(row);
    }

    if (room.mode === 'teams') {
      const a = room.players.filter((p) => p.team === 0).reduce((sum, p) => sum + p.score, 0);
      const b = room.players.filter((p) => p.team === 1).reduce((sum, p) => sum + p.score, 0);
      const total = document.createElement('div');
      total.className = 'sq-row sq-team-total';
      total.innerHTML = `<span class="sq-name">TEAM A</span><span class="sq-score">${a.toLocaleString('en-US')}</span>`;
      const totalB = document.createElement('div');
      totalB.className = 'sq-row sq-team-total';
      totalB.innerHTML = `<span class="sq-name">TEAM B</span><span class="sq-score">${b.toLocaleString('en-US')}</span>`;
      this.sqRows.appendChild(total);
      this.sqRows.appendChild(totalB);
    }
  }

  showSquadFinal(room: SquadRoom | null, youId = ''): void {
    if (!room) {
      this.squadFinal.classList.add('hidden');
      return;
    }
    this.squadFinal.classList.remove('hidden');
    this.squadFinal.innerHTML = '<h3>SQUAD STANDINGS</h3>';

    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    for (let i = 0; i < sorted.length; i++) {
      const player = sorted[i];
      const row = document.createElement('div');
      row.className = `final-row${player.id === youId ? ' me' : ''}`;
      const rank = document.createElement('span');
      rank.textContent = `#${i + 1}`;
      const name = document.createElement('span');
      name.textContent = player.name;
      if (room.mode === 'teams') {
        const team = document.createElement('span');
        team.className = 'sq-team';
        team.textContent = player.team === 1 ? 'B' : 'A';
        row.appendChild(rank);
        row.appendChild(team);
      } else {
        row.appendChild(rank);
      }
      const score = document.createElement('span');
      score.className = 'final-score';
      score.textContent = player.score.toLocaleString('en-US');
      row.appendChild(name);
      row.appendChild(score);
      this.squadFinal.appendChild(row);
    }

    if (room.mode === 'teams') {
      const a = room.players.filter((p) => p.team === 0).reduce((sum, p) => sum + p.score, 0);
      const b = room.players.filter((p) => p.team === 1).reduce((sum, p) => sum + p.score, 0);
      const row = document.createElement('div');
      row.className = 'final-row';
      row.innerHTML = `<span>TEAM TOTALS</span><span class="final-score">A ${a.toLocaleString('en-US')} · B ${b.toLocaleString('en-US')}</span>`;
      this.squadFinal.appendChild(row);
    }
  }

  setTracking(camera: boolean, gyro: boolean, gps: boolean): void {
    this.trackCam.classList.toggle('on', camera);
    this.trackCam.classList.toggle('off', !camera);
    this.trackGyro.classList.toggle('on', gyro);
    this.trackGyro.classList.toggle('off', !gyro);
    this.trackGps.classList.toggle('on', gps);
    this.trackGps.classList.toggle('off', !gps);
  }

  setTagPrompt(name: string | null, distance: number | null = null): void {
    if (!name) {
      this.tagPrompt.classList.add('hidden');
      return;
    }
    this.tagPrompt.classList.remove('hidden');
    this.tagName.textContent = name;
    this.tagDist.textContent = distance === null ? 'PRESS FIRE TO TAG' : `${Math.round(distance)}m · PRESS FIRE TO TAG`;
  }

  showARHint(text: string): void {
    this.arHint.textContent = text;
    this.arHint.classList.remove('hidden');
  }

  hideARHint(): void {
    this.arHint.classList.add('hidden');
  }

  setCrosshairVisible(visible: boolean): void {
    this.crosshair.style.opacity = visible ? '1' : '0';
  }

  flashDamage(amount: number): void {
    this.damageLevel = Math.min(0.9, this.damageLevel + Math.min(0.4, amount / 70));
  }

  showDamageDirection(angle: number): void {
    this.damageDirRing.style.transform = `rotate(${angle}rad)`;
    this.damageDirection.classList.add('show');
    window.clearTimeout(this.damageDirectionTimer);
    this.damageDirectionTimer = window.setTimeout(() => {
      this.damageDirection.classList.remove('show');
    }, 550);
  }

  update(dt: number): void {
    this.damageLevel = Math.max(0, this.damageLevel - dt * 1.35);
    this.damageVignette.style.opacity = String(this.damageLevel * 0.9);
  }

  drawRadar(player: Player, enemies: Enemy[], pickups: Array<{ kind: PickupKind; x: number; z: number }>): void {
    const ctx = this.radarCtx;
    const size = this.radar.width;
    const center = size / 2;
    const maxPx = size / 2 - 12;
    ctx.clearRect(0, 0, size, size);

    // Backdrop.
    const bg = ctx.createRadialGradient(center, center, 4, center, center, center);
    bg.addColorStop(0, 'rgba(10, 34, 44, 0.55)');
    bg.addColorStop(1, 'rgba(2, 8, 13, 0.2)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(center, center, center - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(67, 243, 255, 0.22)';
    ctx.lineWidth = 1;
    for (const r of [0.33, 0.66, 1]) {
      ctx.beginPath();
      ctx.arc(center, center, (center - 10) * r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(67, 243, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(center, 8);
    ctx.lineTo(center, size - 8);
    ctx.moveTo(8, center);
    ctx.lineTo(size - 8, center);
    ctx.stroke();

    const now = performance.now();
    const sweep = ((now * 0.0006) % (Math.PI * 2)) - Math.PI / 2;
    const sweepGrad = ctx.createLinearGradient(center, center, center + Math.cos(sweep) * maxPx, center + Math.sin(sweep) * maxPx);
    sweepGrad.addColorStop(0, 'rgba(67, 243, 255, 0.35)');
    sweepGrad.addColorStop(1, 'rgba(67, 243, 255, 0)');
    ctx.strokeStyle = sweepGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(sweep) * maxPx, center + Math.sin(sweep) * maxPx);
    ctx.stroke();

    const cos = Math.cos(player.yaw);
    const sin = Math.sin(player.yaw);
    const scale = maxPx / RADAR_RANGE;

    const project = (x: number, z: number): { x: number; y: number; dist: number } => {
      const dx = x - player.pos.x;
      const dz = z - player.pos.z;
      const right = dx * cos - dz * sin;
      const forward = -dx * sin - dz * cos;
      return { x: center + right * scale, y: center - forward * scale, dist: Math.hypot(dx, dz) };
    };

    // FOV cone.
    ctx.strokeStyle = 'rgba(67, 243, 255, 0.09)';
    ctx.lineWidth = 1;
    for (const angle of [-0.6, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + Math.sin(angle) * maxPx, center - Math.cos(angle) * maxPx);
      ctx.stroke();
    }

    for (const pickup of pickups) {
      const p = project(pickup.x, pickup.z);
      if (p.dist > RADAR_RANGE) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = this.pickupColor(pickup.kind);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const p = project(enemy.group.position.x, enemy.group.position.z);
      const dist = Math.hypot(p.x - center, p.y - center);
      let x = p.x;
      let y = p.y;
      if (dist > maxPx) {
        x = center + ((p.x - center) / dist) * maxPx;
        y = center + ((p.y - center) / dist) * maxPx;
      }
      const isBoss = enemy.isBoss;
      ctx.fillStyle = isBoss ? '#ff3b5c' : `#${enemy.stats.color.toString(16).padStart(6, '0')}`;
      ctx.globalAlpha = 0.95;
      if (isBoss) {
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 59, 92, 0.55)';
        ctx.beginPath();
        ctx.arc(x, y, 8.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, enemy.kind === 'brute' ? 3.4 : 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player chevron.
    ctx.save();
    ctx.translate(center, center);
    ctx.fillStyle = '#c9fdff';
    ctx.shadowColor = '#43f3ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-5.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(5.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private pickupColor(kind: PickupKind): string {
    switch (kind) {
      case 'repair': return '#57ffa8';
      case 'shield': return '#43f3ff';
      case 'overcharge': return '#ffc247';
      case 'rapid': return '#ff2fa8';
      case 'freeze': return '#8fd4ff';
    }
  }
}
