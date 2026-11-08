/**
 * Local soundtrack player for the main menu.
 *
 * The selected file is loaded from the player's own device with a file picker and
 * played from an object URL. It is never uploaded, bundled or committed — which is
 * the only safe way to use a commercial track without a distribution licence.
 */
export class MenuMusic {
  private audio = new Audio();
  private fileInput: HTMLInputElement;
  private toggleBtn: HTMLButtonElement;
  private pickBtn: HTMLButtonElement;
  private nameEl: HTMLElement;
  private objectUrl: string | null = null;
  private suspended = false;
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private usingDefault = false;
  private readonly defaultTrack = new URL('audio/menu.mp3', document.baseURI).href;

  constructor() {
    this.fileInput = document.getElementById('menuTrackFile') as HTMLInputElement;
    this.toggleBtn = document.getElementById('btnMenuTrack') as HTMLButtonElement;
    this.pickBtn = document.getElementById('btnMenuTrackPick') as HTMLButtonElement;
    this.nameEl = document.getElementById('menuTrackName') as HTMLElement;
    if (!this.fileInput || !this.toggleBtn || !this.pickBtn || !this.nameEl) return;

    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.volume = 0.55;

    this.toggleBtn.addEventListener('click', () => {
      if (!this.audio.src) {
        this.fileInput.click();
        return;
      }
      if (this.audio.paused) {
        this.suspended = false;
        void this.audio.play().catch(() => this.error());
      } else {
        this.audio.pause();
      }
    });
    this.pickBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', () => this.loadFile());
    this.audio.addEventListener('play', () => this.updateUI());
    this.audio.addEventListener('pause', () => this.updateUI());
    this.audio.addEventListener('error', () => this.error());

    const saved = localStorage.getItem('adrianscombat.trackName');
    if (saved) this.nameEl.textContent = `LAST: ${saved}`;
    this.updateUI();
    void this.restoreTrack();
  }

  private openDb(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open('adrianscombat', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('files')) request.result.createObjectStore('files');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    return this.dbPromise;
  }

  private async saveTrack(file: File): Promise<void> {
    const db = await this.openDb();
    if (!db) return;
    try {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put(file, 'menuTrack');
    } catch {
      /* storage unavailable or full */
    }
  }

  private async restoreTrack(): Promise<void> {
    const db = await this.openDb();
    if (!db) {
      this.useDefault();
      return;
    }
    try {
      const tx = db.transaction('files', 'readonly');
      const request = tx.objectStore('files').get('menuTrack');
      request.onsuccess = () => {
        const file = request.result as File | undefined;
        if (!file) {
          this.useDefault();
          return;
        }
        this.usingDefault = false;
        this.objectUrl = URL.createObjectURL(file);
        this.audio.src = this.objectUrl;
        this.nameEl.textContent = file.name;
        this.updateUI();
      };
      request.onerror = () => this.useDefault();
    } catch {
      this.useDefault();
    }
  }

  private useDefault(): void {
    if (this.audio.src) return;
    this.usingDefault = true;
    this.audio.src = this.defaultTrack;
    this.nameEl.textContent = 'DAMN IT FEELS GOOD · AI HOMAGE';
    this.updateUI();
  }

  private loadFile(): void {
    const file = this.fileInput.files?.[0];
    if (!file) return;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.usingDefault = false;
    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    this.suspended = false;
    this.nameEl.textContent = file.name;
    try {
      localStorage.setItem('adrianscombat.trackName', file.name);
    } catch {
      /* storage unavailable */
    }
    void this.audio.play().catch(() => this.error());
    void this.saveTrack(file);
    this.updateUI();
  }

  private error(): void {
    this.nameEl.textContent = 'COULD NOT PLAY THAT FILE';
    this.updateUI();
  }

  private updateUI(): void {
    if (!this.nameEl) return;
    const ready = !!this.audio.src;
    const playLabel = this.usingDefault ? '▶ PLAY HOMAGE' : '▶ PLAY YOUR TRACK';
    const pauseLabel = this.usingDefault ? '❚❚ PAUSE HOMAGE' : '❚❚ PAUSE TRACK';
    const resumeLabel = this.usingDefault ? '▶ RESUME HOMAGE' : '▶ RESUME TRACK';
    const pausedLabel = this.audio.currentTime > 0 ? resumeLabel : playLabel;
    this.toggleBtn.textContent = !ready ? playLabel : this.audio.paused ? pausedLabel : pauseLabel;
    this.pickBtn.disabled = false;
    if (!ready && !this.nameEl.textContent) this.nameEl.textContent = 'NO LOCAL TRACK';
  }

  /** Called when a run starts so the menu track does not bleed into gameplay. */
  suspend(): void {
    this.suspended = !this.audio.paused;
    if (this.suspended) this.audio.pause();
  }

  /** Called when returning to the main menu. */
  resume(): void {
    if (!this.suspended) return;
    this.suspended = false;
    if (this.audio.src) void this.audio.play().catch(() => this.error());
  }
}
