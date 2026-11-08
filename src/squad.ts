export type SquadMode = 'ffa' | 'teams' | 'tag';

export interface SquadPlayer {
  id: string;
  name: string;
  score: number;
  wave: number;
  kills: number;
  team: number;
  tagHealth?: number;
  tags?: number;
  x?: number;
  z?: number;
  hasPos?: boolean;
}

export interface SquadRoom {
  code: string;
  mode: SquadMode;
  hostId: string;
  players: SquadPlayer[];
}

export interface NearbyRoom {
  code: string;
  mode: SquadMode;
  count: number;
}

export type SquadNotice =
  | { kind: 'joined'; youId: string; room: SquadRoom }
  | { kind: 'state'; room: SquadRoom }
  | { kind: 'rooms'; rooms: NearbyRoom[] }
  | { kind: 'left' }
  | { kind: 'tagged'; by: string; health: number; eliminated: boolean; distance: number }
  | { kind: 'error'; message: string };

/** Thin WebSocket client for same-Wi-Fi squad rooms. */
export class SquadClient {
  room: SquadRoom | null = null;
  nearby: NearbyRoom[] = [];
  youId = '';
  connected = false;

  onNotice?: (notice: SquadNotice) => void;
  onStatus?: (message: string, ok: boolean) => void;

  private ws: WebSocket | null = null;
  private connecting: Promise<boolean> | null = null;

  get inRoom(): boolean {
    return this.room !== null;
  }

  async connect(): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return true;
    if (this.connecting) return this.connecting;

    this.onStatus?.('CONNECTING TO SQUAD SERVER…', true);
    this.connecting = new Promise<boolean>((resolve) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      let settled = false;

      try {
        const ws = new WebSocket(url);
        this.ws = ws;

        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          this.connecting = null;
          this.onStatus?.('SQUAD SERVER OFFLINE · START THE DEV SERVER', false);
          try {
            ws.close();
          } catch {
            /* ignore */
          }
          resolve(false);
        }, 7000);

        ws.onopen = () => {
          window.clearTimeout(timeout);
          this.connected = true;
          this.onStatus?.('CONNECTED · SAME WI-FI', true);
          if (!settled) {
            settled = true;
            this.connecting = null;
            resolve(true);
          }
        };

        ws.onmessage = (event) => {
          let message: { type?: string; [key: string]: unknown };
          try {
            message = JSON.parse(String(event.data));
          } catch {
            return;
          }
          this.handle(message);
        };

        ws.onclose = () => {
          this.connected = false;
          this.room = null;
          this.youId = '';
          this.onStatus?.('DISCONNECTED FROM ROOM', false);
          this.onNotice?.({ kind: 'left' });
          if (!settled) {
            settled = true;
            this.connecting = null;
            resolve(false);
          }
        };

        ws.onerror = () => {
          if (!settled) {
            settled = true;
            this.connecting = null;
            this.onStatus?.('SQUAD SERVER OFFLINE · START THE DEV SERVER', false);
            resolve(false);
          }
        };
      } catch {
        this.connecting = null;
        resolve(false);
      }
    });

    return this.connecting;
  }

  private handle(message: { type?: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'welcome':
        if (Array.isArray(message.rooms)) {
          this.nearby = message.rooms as NearbyRoom[];
          this.onNotice?.({ kind: 'rooms', rooms: this.nearby });
        }
        break;
      case 'joined': {
        this.youId = String(message.youId || '');
        this.room = (message.room as SquadRoom) ?? null;
        if (this.room) this.onNotice?.({ kind: 'joined', youId: this.youId, room: this.room });
        break;
      }
      case 'state': {
        this.room = (message.room as SquadRoom) ?? null;
        if (this.room) this.onNotice?.({ kind: 'state', room: this.room });
        break;
      }
      case 'rooms':
        this.nearby = (message.rooms as NearbyRoom[]) ?? [];
        this.onNotice?.({ kind: 'rooms', rooms: this.nearby });
        break;
      case 'left':
        this.room = null;
        this.youId = '';
        this.onNotice?.({ kind: 'left' });
        break;
      case 'error':
        this.onNotice?.({ kind: 'error', message: String(message.message || 'ROOM ERROR') });
        break;
      case 'tagged':
        this.onNotice?.({
          kind: 'tagged',
          by: String(message.by || 'UNKNOWN'),
          health: Number(message.health ?? 100),
          eliminated: Boolean(message.eliminated),
          distance: Number(message.distance ?? 0),
        });
        break;
      default:
        break;
    }
  }

  private send(payload: Record<string, unknown>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  async create(name: string, mode: SquadMode): Promise<boolean> {
    const ok = await this.connect();
    if (!ok) return false;
    return this.send({ type: 'create', name, mode });
  }

  async join(code: string, name: string): Promise<boolean> {
    const ok = await this.connect();
    if (!ok) return false;
    return this.send({ type: 'join', code: code.toUpperCase(), name });
  }

  update(score: number, wave: number, kills: number): void {
    if (!this.room) return;
    this.send({ type: 'update', score, wave, kills });
  }

  updatePosition(lat: number, lon: number, accuracy: number): void {
    if (!this.room || this.room.mode !== 'tag') return;
    this.send({ type: 'pos', lat, lon, accuracy });
  }

  tag(targetId: string): void {
    if (!this.room || this.room.mode !== 'tag') return;
    this.send({ type: 'tag', target: targetId });
  }

  rename(name: string): void {
    this.send({ type: 'rename', name });
  }

  leave(): void {
    if (!this.room) return;
    this.send({ type: 'leave' });
    this.room = null;
    this.youId = '';
    this.onNotice?.({ kind: 'left' });
  }

  close(): void {
    this.leave();
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}
