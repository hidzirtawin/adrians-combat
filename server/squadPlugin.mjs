import { WebSocketServer } from 'ws';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 6;
const rooms = new Map();
const clients = new Map();

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

function nearbyRooms() {
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

function broadcastNearby() {
  const payload = JSON.stringify({ type: 'rooms', rooms: nearbyRooms() });
  for (const client of clients.values()) {
    if (!client.roomCode && client.ws.readyState === 1) client.ws.send(payload);
  }
}

function leaveRoom(client) {
  if (!client.roomCode) return;
  const room = rooms.get(client.roomCode);
  client.roomCode = null;
  if (!room) return;
  room.players.delete(client.id);
  if (room.players.size === 0) {
    rooms.delete(room.code);
  } else {
    if (room.hostId === client.id) {
      room.hostId = room.players.keys().next().value;
    }
    broadcastRoom(room);
  }
  broadcastNearby();
}

function attach(httpServer) {
  if (!httpServer || httpServer.__adrianSquadServer) return;
  httpServer.__adrianSquadServer = true;

  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

  httpServer.on('upgrade', (request, socket, head) => {
    let pathname = '/';
    try {
      pathname = new URL(request.url || '/', 'http://localhost').pathname;
    } catch {
      return;
    }
    if (pathname !== '/ws') return;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    const client = {
      id: Math.random().toString(36).slice(2, 10),
      ws,
      roomCode: null,
      lastUpdate: 0,
    };
    clients.set(client.id, client);
    send(ws, { type: 'welcome', id: client.id, rooms: nearbyRooms() });

    ws.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (!message || typeof message !== 'object') return;

      if (message.type === 'create') {
        leaveRoom(client);
        if (rooms.size >= 300) {
          send(ws, { type: 'error', message: 'SERVER FULL' });
          return;
        }
        const mode = message.mode === 'teams' ? 'teams' : message.mode === 'tag' ? 'tag' : 'ffa';
        let code = code4();
        while (rooms.has(code)) code = code4();

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
        rooms.set(code, room);
        client.roomCode = code;
        send(ws, { type: 'joined', youId: client.id, room: snapshot(room) });
        broadcastNearby();
      } else if (message.type === 'join') {
        const code = String(message.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        const room = rooms.get(code);
        if (!room) {
          send(ws, { type: 'error', message: 'ROOM NOT FOUND' });
          return;
        }
        if (room.players.size >= MAX_PLAYERS) {
          send(ws, { type: 'error', message: 'ROOM FULL' });
          return;
        }
        leaveRoom(client);

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
        broadcastNearby();
      } else if (message.type === 'update') {
        const room = rooms.get(client.roomCode);
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
        const room = rooms.get(client.roomCode);
        const player = room?.players.get(client.id);
        if (!room || !player || room.mode !== 'tag') return;
        const accuracy = Number(message.accuracy);
        const lat = Number(message.lat);
        const lon = Number(message.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(accuracy) || accuracy > 60) return;
        if (!room.origin) room.origin = { lat, lon };
        if (!room.origin) return;
        const latRad = (room.origin.lat * Math.PI) / 180;
        player.x = (lon - room.origin.lon) * 111320 * Math.cos(latRad);
        player.z = -(lat - room.origin.lat) * 110540;
        player.hasPos = true;
        player.lastPos = Date.now();
        broadcastRoom(room);
      } else if (message.type === 'tag') {
        const room = rooms.get(client.roomCode);
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
        leaveRoom(client);
        send(ws, { type: 'left' });
      } else if (message.type === 'rename') {
        const room = rooms.get(client.roomCode);
        const player = room?.players.get(client.id);
        if (room && player) {
          player.name = sanitizeName(message.name);
          broadcastRoom(room);
        }
      }
    });

    ws.on('close', () => {
      leaveRoom(client);
      clients.delete(client.id);
    });
    ws.on('error', () => {
      /* close handler cleans up */
    });
  });

  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.readyState === 1) ws.ping();
    }
  }, 30_000);
  interval.unref?.();
}

export function squadServer() {
  return {
    name: 'adrians-combat-squad-server',
    configureServer(server) {
      attach(server.httpServer);
    },
    configurePreviewServer(server) {
      attach(server.httpServer);
    },
  };
}
