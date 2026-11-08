// Cloudflare Worker + Durable Object squad server.
// The game connects to /ws; all rooms live in one Durable Object for simplicity.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 6;

function code4() {
  let code = '';
  for (let i = 0; i < 4; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}

function sanitizeName(value) {
  return String(value || 'PLAYER')
    .replace(/[<>&"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14)
    .toUpperCase() || 'PLAYER';
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function snapshot(room) {
  return {
    code: room.code,
    mode: room.mode,
    hostId: room.hostId,
    players: [...room.players.values()].map(({ ws, ...player }) => ({ ...player })),
  };
}

function nearbyRooms(rooms) {
  return [...rooms.values()].map((room) => ({
    code: room.code,
    mode: room.mode,
    count: room.players.size,
  }));
}

function send(ws, payload) {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function broadcastRoom(room) {
  const payload = JSON.stringify({ type: 'state', room: snapshot(room) });
  for (const player of room.players.values()) {
    if (player.ws.readyState === 1) player.ws.send(payload);
  }
}

function broadcastNearby(rooms, clients) {
  const payload = JSON.stringify({ type: 'rooms', rooms: nearbyRooms(rooms) });
  for (const client of clients.values()) {
    if (!client.roomCode && client.ws.readyState === 1) client.ws.send(payload);
  }
}

export class SquadRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.rooms = new Map();
    this.clients = new Map();
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.attach(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  attach(ws) {
    const client = {
      id: Math.random().toString(36).slice(2, 10),
      ws,
      roomCode: null,
      lastUpdate: 0,
      lastTag: 0,
    };
    this.clients.set(client.id, client);
    send(ws, { type: 'welcome', id: client.id, rooms: nearbyRooms(this.rooms) });

    ws.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!message || typeof message !== 'object') return;

      if (message.type === 'create') {
        this.leaveRoom(client);
        if (this.rooms.size >= 300) {
          send(ws, { type: 'error', message: 'SERVER FULL' });
          return;
        }
        const mode = message.mode === 'teams' ? 'teams' : message.mode === 'tag' ? 'tag' : 'ffa';
        let code = code4();
        while (this.rooms.has(code)) code = code4();
        const player = {
          id: client.id,
          name: sanitizeName(message.name),
          score: 0,
          waveScore: 0,
          tagScore: 0,
          wave: 1,
          kills: 0,
          team: 0,
          tagHealth: 100,
          tags: 0,
          x: 0,
          z: 0,
          hasPos: false,
          ws,
        };
        const room = {
          code,
          mode,
          hostId: client.id,
          players: new Map([[client.id, player]]),
          createdAt: Date.now(),
          origin: null,
        };
        this.rooms.set(code, room);
        client.roomCode = code;
        send(ws, { type: 'joined', youId: client.id, room: snapshot(room) });
        broadcastNearby(this.rooms, this.clients);
      } else if (message.type === 'join') {
        const code = String(message.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        const room = this.rooms.get(code);
        if (!room) {
          send(ws, { type: 'error', message: 'ROOM NOT FOUND' });
          return;
        }
        if (room.players.size >= MAX_PLAYERS) {
          send(ws, { type: 'error', message: 'ROOM FULL' });
          return;
        }
        this.leaveRoom(client);
        let team = 0;
        if (room.mode === 'teams') {
          let a = 0;
          let b = 0;
          for (const player of room.players.values()) {
            if (player.team === 0) a++;
            else b++;
          }
          team = a <= b ? 0 : 1;
        }
        const player = {
          id: client.id,
          name: sanitizeName(message.name),
          score: 0,
          waveScore: 0,
          tagScore: 0,
          wave: 1,
          kills: 0,
          team,
          tagHealth: 100,
          tags: 0,
          x: 0,
          z: 0,
          hasPos: false,
          ws,
        };
        room.players.set(client.id, player);
        client.roomCode = code;
        send(ws, { type: 'joined', youId: client.id, room: snapshot(room) });
        broadcastRoom(room);
        broadcastNearby(this.rooms, this.clients);
      } else if (message.type === 'update') {
        const room = this.rooms.get(client.roomCode);
        const player = room?.players.get(client.id);
        if (!room || !player) return;
        const now = Date.now();
        if (now - client.lastUpdate < 180) return;
        client.lastUpdate = now;
        player.waveScore = clamp(message.score, 0, 99_999_999);
        if (room.mode !== 'tag') player.score = player.waveScore;
        else player.score = player.waveScore + player.tagScore;
        player.wave = clamp(message.wave, 1, 999);
        player.kills = clamp(message.kills, 0, 9_999_999);
        broadcastRoom(room);
      } else if (message.type === 'pos') {
        const room = this.rooms.get(client.roomCode);
        const player = room?.players.get(client.id);
        if (!room || !player || room.mode !== 'tag') return;
        const accuracy = Number(message.accuracy);
        const lat = Number(message.lat);
        const lon = Number(message.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(accuracy) || accuracy > 60) return;
        if (!room.origin) room.origin = { lat, lon };
        const latRad = (room.origin.lat * Math.PI) / 180;
        player.x = (lon - room.origin.lon) * 111320 * Math.cos(latRad);
        player.z = -(lat - room.origin.lat) * 110540;
        player.hasPos = true;
        player.lastPos = Date.now();
        broadcastRoom(room);
      } else if (message.type === 'tag') {
        const room = this.rooms.get(client.roomCode);
        const tagger = room?.players.get(client.id);
        const target = room?.players.get(String(message.target || ''));
        if (!room || !tagger || !target || room.mode !== 'tag' || target.id === tagger.id) return;
        const now = Date.now();
        if (now - (client.lastTag || 0) < 2000) return;
        if (!tagger.hasPos || !target.hasPos) return;
        const distance = Math.hypot(tagger.x - target.x, tagger.z - target.z);
        if (distance > 15) return;
        client.lastTag = now;
        target.tagHealth -= 25;
        tagger.tags += 1;
        const eliminated = target.tagHealth <= 0;
        if (eliminated) {
          target.tagHealth = 100;
          tagger.tagScore += 500;
        } else {
          tagger.tagScore += 100;
        }
        tagger.score = tagger.waveScore + tagger.tagScore;
        broadcastRoom(room);
        send(target.ws, {
          type: 'tagged',
          by: tagger.name,
          health: target.tagHealth,
          eliminated,
          distance: Math.round(distance),
        });
      } else if (message.type === 'leave') {
        this.leaveRoom(client);
        send(ws, { type: 'left' });
      } else if (message.type === 'rename') {
        const room = this.rooms.get(client.roomCode);
        const player = room?.players.get(client.id);
        if (room && player) {
          player.name = sanitizeName(message.name);
          broadcastRoom(room);
        }
      }
    });

    ws.addEventListener('close', () => {
      this.leaveRoom(client);
      this.clients.delete(client.id);
    });
    ws.addEventListener('error', () => {
      /* close handles cleanup */
    });
  }

  leaveRoom(client) {
    if (!client.roomCode) return;
    const room = this.rooms.get(client.roomCode);
    client.roomCode = null;
    if (!room) return;
    room.players.delete(client.id);
    if (room.players.size === 0) {
      this.rooms.delete(room.code);
    } else {
      if (room.hostId === client.id) room.hostId = room.players.keys().next().value;
      broadcastRoom(room);
    }
    broadcastNearby(this.rooms, this.clients);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      const id = env.SQUAD.idFromName('global');
      return env.SQUAD.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
