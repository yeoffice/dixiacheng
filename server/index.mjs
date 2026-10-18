/* =====================================================================
   地牢骑士：无尽回响 —— 联机服务端
   零依赖：手写 RFC6455 握手与帧编解码，不引第三方包。
   同一个端口同时提供：静态文件（游戏本体）+ WebSocket（房间转发）。
   启动：node server/index.mjs        （PORT 环境变量可改端口）
   ===================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8080);
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PLAYERS = 4;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/* ============================ 房间 ============================ */
const rooms = new Map();   // code -> { code, host, started, conns: Map<id, Conn> }
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  for (let tries = 0; tries < 500; tries++) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    if (!rooms.has(c)) return c;
  }
  return String(Date.now()).slice(-4);
}

function roomPeers(room, exceptId) {
  const out = [];
  for (const c of room.conns.values()) {
    if (c.id === exceptId) continue;
    out.push({ id: c.id, name: c.name });
  }
  return out;
}

function broadcast(room, obj, exceptId) {
  for (const c of room.conns.values()) {
    if (c.id === exceptId) continue;
    c.send(obj);
  }
}

function leaveRoom(conn) {
  if (!conn.room) return;
  const room = rooms.get(conn.room);
  conn.room = null;
  if (!room) return;
  room.conns.delete(conn.id);
  if (room.conns.size === 0) { rooms.delete(room.code); return; }
  broadcast(room, { t: 'peerLeft', id: conn.id });
  if (room.host === conn.id) {
    const next = room.conns.values().next().value;
    room.host = next.id;
    broadcast(room, { t: 'host', id: next.id });
  }
}

/* ============================ WebSocket ============================ */
class Conn {
  constructor(socket) {
    this.socket = socket;
    this.id = crypto.randomBytes(4).toString('hex');
    this.name = '玩家';
    this.room = null;
    this.buf = Buffer.alloc(0);
    this.closed = false;
    this.frags = [];
    this.fragOp = 0;
    socket.on('data', d => this.onData(d));
    socket.on('close', () => this.onClose());
    socket.on('error', () => this.onClose());
    socket.setNoDelay(true);
  }

  onData(chunk) {
    if (this.closed) return;
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    for (;;) {
      const f = this.readFrame();
      if (!f) break;
      if (f.opcode === 0x8) { this.close(); return; }
      if (f.opcode === 0x9) { this.sendFrame(0xA, f.payload); continue; }
      if (f.opcode === 0xA) continue;
      if (f.opcode === 0x0) {
        this.frags.push(f.payload);
        if (f.fin) { const full = Buffer.concat(this.frags); this.frags = []; this.onMessage(full); }
        continue;
      }
      if (f.opcode === 0x1 || f.opcode === 0x2) {
        if (!f.fin) { this.frags = [f.payload]; this.fragOp = f.opcode; continue; }
        this.onMessage(f.payload);
      }
    }
  }

  readFrame() {
    const b = this.buf;
    if (b.length < 2) return null;
    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0F;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7F;
    let off = 2;
    if (len === 126) {
      if (b.length < off + 2) return null;
      len = b.readUInt16BE(off); off += 2;
    } else if (len === 127) {
      if (b.length < off + 8) return null;
      const big = b.readBigUInt64BE(off); off += 8;
      if (big > 8n * 1024n * 1024n) { this.close(); return null; }
      len = Number(big);
    }
    let mask = null;
    if (masked) {
      if (b.length < off + 4) return null;
      mask = b.subarray(off, off + 4); off += 4;
    }
    if (b.length < off + len) return null;
    const payload = Buffer.from(b.subarray(off, off + len));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    this.buf = b.subarray(off + len);
    return { fin, opcode, payload };
  }

  sendFrame(opcode, payload) {
    if (this.closed || !this.socket.writable) return;
    const len = payload.length;
    let head;
    if (len < 126) {
      head = Buffer.alloc(2); head[1] = len;
    } else if (len < 65536) {
      head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2);
    } else {
      head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2);
    }
    head[0] = 0x80 | opcode;
    try { this.socket.write(Buffer.concat([head, payload])); } catch (e) { this.close(); }
  }

  send(obj) { this.sendFrame(0x1, Buffer.from(JSON.stringify(obj))); }

  onMessage(buf) {
    let msg;
    try { msg = JSON.parse(buf.toString('utf8')); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    handle(this, msg);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    leaveRoom(this);
    try { this.sendFrame(0x8, Buffer.alloc(0)); } catch (e) { /* ignore */ }
    try { this.socket.end(); } catch (e) { /* ignore */ }
  }

  onClose() {
    if (this.closed) return;
    this.closed = true;
    leaveRoom(this);
  }
}

/* ============================ 协议 ============================ */
function handle(conn, msg) {
  switch (msg.t) {
    case 'create': {
      leaveRoom(conn);
      if (typeof msg.name === 'string' && msg.name.trim()) conn.name = msg.name.trim().slice(0, 12);
      const code = makeCode();
      const room = { code, host: conn.id, started: false, conns: new Map() };
      room.conns.set(conn.id, conn);
      rooms.set(code, room);
      conn.room = code;
      conn.send({ t: 'room', code, id: conn.id, host: true, peers: [], started: false });
      break;
    }
    case 'join': {
      const code = String(msg.code || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) { conn.send({ t: 'err', msg: '房间不存在' }); break; }
      if (room.conns.size >= MAX_PLAYERS) { conn.send({ t: 'err', msg: '房间已满（最多 ' + MAX_PLAYERS + ' 人）' }); break; }
      leaveRoom(conn);
      if (typeof msg.name === 'string' && msg.name.trim()) conn.name = msg.name.trim().slice(0, 12);
      const peers = roomPeers(room, conn.id);
      room.conns.set(conn.id, conn);
      conn.room = code;
      conn.send({
        t: 'room', code, id: conn.id, host: room.host === conn.id,
        peers, started: room.started,
      });
      broadcast(room, { t: 'peer', id: conn.id, name: conn.name }, conn.id);
      break;
    }
    case 'start': {
      const room = rooms.get(conn.room);
      if (!room || room.host !== conn.id) break;
      room.started = true;
      broadcast(room, { t: 'relay', from: conn.id, d: { t: 'start' } }, conn.id);
      break;
    }
    case 'relay': {
      const room = rooms.get(conn.room);
      if (!room) break;
      broadcast(room, { t: 'relay', from: conn.id, d: msg.d }, conn.id);
      break;
    }
    case 'leave': {
      leaveRoom(conn);
      conn.send({ t: 'left' });
      break;
    }
    case 'ping': {
      conn.send({ t: 'pong', ts: msg.ts });
      break;
    }
    default: break;
  }
}

/* ============================ 静态文件 ============================ */
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: [...rooms.values()].reduce((n, r) => n + r.conns.size, 0) }));
  }
  // 房间列表：大厅用它显示谁在等人
  if (url.pathname === '/api/rooms') {
    const list = [...rooms.values()].map(r => {
      const hostConn = r.conns.get(r.host);
      return {
        code: r.code,
        players: r.conns.size,
        max: MAX_PLAYERS,
        started: !!r.started,
        host: hostConn ? hostConn.name : '',
      };
    }).sort((a, b) => (a.started - b.started) || (b.players - a.players));
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    });
    return res.end(JSON.stringify({ ok: true, rooms: list }));
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(data);
  });
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
  new Conn(socket);
});

setInterval(() => {
  for (const room of rooms.values()) {
    for (const c of room.conns.values()) {
      if (!c.closed) { try { c.sendFrame(0x9, Buffer.alloc(0)); } catch (e) { /* ignore */ } }
    }
  }
}, 20000).unref();

function lanAddresses() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address);
    }
  }
  return out;
}

server.on('error', err => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('');
    console.error('  [X] 端口 ' + PORT + ' 已被占用');
    console.error('');
    console.error('      很可能已经有一个服务器在运行了。先打开浏览器看看：');
    console.error('        http://localhost:' + PORT + '/');
    console.error('');
    console.error('      想确认是谁占着这个端口，在另一个窗口运行：');
    console.error('        netstat -ano | findstr :' + PORT);
    console.error('      再结束对应进程（把 <pid> 换成查到的数字）：');
    console.error('        taskkill /PID <pid> /F');
    console.error('');
    console.error('      或者换个端口启动：');
    console.error('        set PORT=8081 && node server\\index.mjs');
    console.error('');
    process.exit(1);
    return;
  }
  console.error('');
  console.error('  [X] 服务器启动失败：' + (err && err.message ? err.message : err));
  console.error('');
  process.exit(1);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  地牢骑士联机服务已启动');
  console.log('');
  console.log('    本机游戏 : http://localhost:' + PORT + '/');
  const ips = lanAddresses();
  for (const ip of ips) {
    console.log('    局域网   : http://' + ip + ':' + PORT + '/   <- 同一 WiFi 的朋友打开这个');
  }
  if (ips.length > 1) {
    console.log('               (检测到多个网卡，选朋友能访问的那个；虚拟网卡/VPN 的通常不是)');
  }
  if (ips.length === 0) {
    console.log('    局域网   : 未检测到局域网地址，跨网络请用 公网联机.bat');
  }
  console.log('    WebSocket: ws://localhost:' + PORT + '/');
  console.log('    房间上限 : ' + MAX_PLAYERS + ' 人/房');
  console.log('');
  console.log('  关闭这个窗口 = 停止服务器');
  console.log('');
});
