'use strict';
/* =====================================================================
   联机模块（可选，单机完全不触发）
   模型：房主权威 —— 房主跑完整模拟并广播世界快照，成员上报输入。
   - 地图：generateFloor 用 RNG(floor*7919+1337)，同层天然一致
   - 敌人：房主生成并广播（带唯一 nid），成员不本地刷怪，只跟随快照
   - 玩家：各自本地即时操作，位置/血量通过快照互相同步
   - 队友开火：房主端为每个成员维护一个真实 Player，注入其输入驱动，
     所以队友的子弹在房主端真实结算，伤害与掉落天然一致
   ===================================================================== */
const Net = {
  on: false,
  ws: null,
  id: null,
  code: '',
  name: '',
  charId: 'knight',
  isHost: false,
  started: false,
  peers: new Map(),      // id -> { id, name }
  ghosts: new Map(),     // 房主：id -> Player
  remote: new Map(),     // 成员：id -> { p, tx, ty, a, hp, mhp, name }
  stateT: 0,
  sendT: 0,
  hostFloor: 1,
  connecting: false,
  lastErr: '',
  tx: 0,
  rx: 0,
  ticks: 0,
  states: 0,
  _savedInput: null,
  lobbyTick: 0,
  roomList: [],
  listErr: '',
  listTimer: null,
  taken: new Set(),
  timedOut: false,
  _sentDown: false,
  _downToast: 0,

  /* ---------------- 地址与工具 ---------------- */
  savedUrl() {
    try {
      if (typeof localStorage === 'undefined') return '';
      return localStorage.getItem('dungeon_knight_net_url') || '';
    } catch (e) { return ''; }
  },

  saveUrl(url) {
    try {
      if (typeof localStorage !== 'undefined' && url) localStorage.setItem('dungeon_knight_net_url', String(url));
    } catch (e) { /* ignore */ }
  },

  defaultUrl() {
    const saved = this.savedUrl();
    if (saved) return saved;
    try {
      if (typeof location === 'undefined' || location.protocol === 'file:') return 'ws://localhost:8080';
      const host = location.hostname || '';
      // GitHub Pages 这类纯静态托管没有 WebSocket 服务，留空让玩家手填
      if (/\.github\.io$/i.test(host) || /\.githubusercontent\.com$/i.test(host)) return '';
      // 其余情况说明页面就是服务器托管的（Render / VPS / 局域网），直接同源
      return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    } catch (e) { /* ignore */ }
    return '';
  },

  send(obj) {
    if (!this.ws || this.ws.readyState !== 1) return;
    try { this.ws.send(JSON.stringify(obj)); } catch (e) { /* ignore */ }
  },

  sendRelay(d) { this.tx++; this.send({ t: 'relay', d }); },

  /* ---------------- 大厅 ---------------- */
  openLobby() {
    Game.state = 'lobby';
    Input.resetSticks();
    this.renderLobby();
    this.startListPolling();
  },

  currentUrl() {
    const el = this.root() && this.root().querySelector('#netUrl');
    const v = el ? String(el.value || '').trim() : '';
    return v || this._url || this.defaultUrl();
  },

  /* ---------------- 房间列表 ---------------- */
  roomsHttpBase(url) {
    return String(url || '').replace(/^ws/, 'http').replace(/\/+$/, '');
  },

  async refreshRooms(url) {
    const base = this.roomsHttpBase(url || this.currentUrl());
    try {
      const r = await fetch(base + '/api/rooms', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      this.roomList = Array.isArray(data.rooms) ? data.rooms : [];
      this.listErr = '';
    } catch (e) {
      this.roomList = [];
      this.listErr = '无法获取房间列表（服务器未启动或地址不对）';
    }
    return this.roomList;
  },

  roomListHtml() {
    if (this.listErr) return '<div class="net-empty bad">' + escapeHtml(this.listErr) + '</div>';
    if (!this.roomList.length) return '<div class="net-empty">暂无房间，创建一个吧</div>';
    return this.roomList.map(r => `<div class="net-room">
      <span class="rc">${escapeHtml(r.code)}</span>
      <span class="rp">${r.players}/${r.max}</span>
      <span class="rs ${r.started ? 'busy' : ''}">${r.started ? '游戏中' : '等待中'}</span>
      <button class="btn small" data-join="${escapeHtml(r.code)}">加入</button>
    </div>`).join('');
  },

  bindRoomList() {
    const box = this.root() && this.root().querySelector('#netRooms');
    if (!box) return;
    box.querySelectorAll('[data-join]').forEach(btn => {
      btn.onclick = () => {
        const code = btn.dataset.join;
        Sfx.play('select');
        this.joinRoom(this.currentUrl(), code, this.currentName());
      };
    });
  },

  currentName() {
    const el = this.root() && this.root().querySelector('#netName');
    const v = el ? String(el.value || '').trim() : '';
    return v || this.name || '骑士';
  },

  updateRoomListDom() {
    const box = this.root() && this.root().querySelector('#netRooms');
    if (!box) return;
    box.innerHTML = this.roomListHtml();
    this.bindRoomList();
  },

  startListPolling() {
    this.stopListPolling();
    const tick = async () => {
      this.listTimer = null;
      if (Game.state === 'lobby' && !this.code) {
        await this.refreshRooms(this.currentUrl());
        if (Game.state === 'lobby' && !this.code) this.updateRoomListDom();
      }
      if (Game.state === 'lobby' && !this.code) this.listTimer = setTimeout(tick, 4000);
    };
    this.listTimer = setTimeout(tick, 0);
  },

  stopListPolling() {
    if (this.listTimer) { clearTimeout(this.listTimer); this.listTimer = null; }
  },

  renderLobby(statusText) {
    const url = (this._url || this.defaultUrl());
    const peers = [...this.peers.values()];
    const list = peers.length
      ? peers.map(p => `<div class="net-peer"><span class="dot"></span>${escapeHtml(p.name)}</div>`).join('')
      : '<div class="net-empty">还没有队友加入</div>';
    const inRoom = !!this.code;
    const me = this.isHost ? '房主' : '成员';
    const roomsBlock = `<div class="net-rooms">
      <div class="net-ptitle">公开房间 <span id="netRefresh" class="net-refresh">刷新</span></div>
      <div id="netRooms">${this.roomListHtml()}</div>
    </div>`;
    const membersBlock = `<div class="net-players"><div class="net-ptitle">房间成员 (${peers.length + 1}/4)</div>
      <div class="net-peer me"><span class="dot"></span>${escapeHtml(this.name || '我')}（你${this.isHost ? ' · 房主' : ''}）</div>${list}</div>`;
    UI.mount(`<div class="layer"><div class="panel net-panel">
      <h1 class="title" style="font-size:28px;letter-spacing:5px">联 机 大 厅</h1>
      <div class="sub">${inRoom ? '房间码 <b style="color:#ffd257;letter-spacing:4px;font-size:16px">' + this.code + '</b> · 你是' + me : '创建房间，或输入房间码加入'}</div>
      <div class="net-body">
        <label class="net-row"><span>昵称</span><input class="inp" id="netName" maxlength="12" value="${escapeHtml(this.name || '骑士' + (100 + Math.floor(Math.random() * 900)))}" ${inRoom ? 'disabled' : ''}></label>
        <label class="net-row"><span>服务器</span><input class="inp" id="netUrl" value="${escapeHtml(url)}" ${inRoom ? 'disabled' : ''} placeholder="wss://你的服务器域名"></label>
        ${inRoom ? '' : `<div class="net-row"><span>房间码</span><input class="inp" id="netCode" maxlength="4" placeholder="4 位" style="text-transform:uppercase"></div>`}
      </div>
      ${inRoom ? membersBlock : roomsBlock}
      ${statusText ? `<div class="net-status">${statusText}</div>` : ''}
      <div class="row" style="margin-top:18px">
        ${inRoom
          ? (this.isHost
            ? '<button class="btn primary" id="netStart">开始游戏</button>'
            : '<button class="btn" id="netWait" disabled>等待房主开始…</button>')
          : '<button class="btn primary" id="netCreate">创建房间</button><button class="btn" id="netJoin">加入房间</button>'}
        <button class="btn ghost" id="netLeave">${inRoom ? '离开房间' : '返 回'}</button>
      </div>
      <div class="hint">同一房间最多 4 人 · 手机与电脑可混连 · 房主负责怪物与掉落</div>
    </div></div>`);

    const q = s => this.root().querySelector(s);
    const val = s => { const el = q(s); return el ? String(el.value || '').trim() : ''; };
    if (!inRoom) {
      const c = q('#netCreate');
      if (c) c.onclick = () => this.createRoom(val('#netUrl'), val('#netName'));
      const j = q('#netJoin');
      if (j) j.onclick = () => this.joinRoom(val('#netUrl'), val('#netCode').toUpperCase(), val('#netName'));
    } else if (this.isHost) {
      const s = q('#netStart');
      if (s) s.onclick = () => { Sfx.play('select'); this.send({ t: 'start' }); this.beginGame(); };
    }
    const l = q('#netLeave');
    if (l) l.onclick = () => { Sfx.play('select'); this.leave(); };
    const rf = q('#netRefresh');
    if (rf) rf.onclick = async () => {
      rf.textContent = '刷新中…';
      await this.refreshRooms(val('#netUrl'));
      this.updateRoomListDom();
      rf.textContent = '刷新';
    };
    this.bindRoomList();
  },

  root() { return document.getElementById('domui'); },

  /* ---------------- 连接 ---------------- */
  connect(url, onOpen) {
    if (this.connecting) return;
    this.connecting = true;
    this.lastErr = '';
    let ws;
    try { ws = new WebSocket(url); } catch (e) {
      this.connecting = false;
      this.lastErr = '地址无效：' + url;
      this.renderLobby('<span class="bad">' + this.lastErr + '</span>');
      return;
    }
    this.ws = ws;
    const timeout = setTimeout(() => {
      if (ws.readyState !== 1) {
        this.connecting = false;
        this.lastErr = '连接超时，检查服务器是否已启动';
        try { ws.close(); } catch (e) { /* ignore */ }
        this.renderLobby('<span class="bad">' + this.lastErr + '</span>');
      }
    }, 6000);

    ws.onopen = () => {
      clearTimeout(timeout);
      this.connecting = false;
      this.on = true;
      onOpen();
    };
    ws.onmessage = e => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      this.onMessage(msg);
    };
    ws.onclose = () => {
      clearTimeout(timeout);
      this.connecting = false;
      const wasOn = this.on;
      this.on = false;
      this.started = false;
      this.ghosts.clear();
      this.remote.clear();
      this.ws = null;
      if (wasOn) {
        UI.toast('与服务器断开连接', '#ff8a8a');
        this.code = '';
        this.peers.clear();
        if (Game.state === 'playing') Game.togglePause();
        this.openLobby();
      }
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      this.connecting = false;
      this.lastErr = '无法连接服务器：' + url;
      this.renderLobby('<span class="bad">' + this.lastErr + '</span>');
    };
  },

  createRoom(url, name) {
    if (!url) { this.renderLobby('<span class="bad">先填联机服务器地址，例如 wss://你的服务器域名</span>'); return; }
    this.name = (name || '骑士').slice(0, 12);
    this._url = url;
    this.saveUrl(url);
    this.connect(url, () => this.send({ t: 'create', name: this.name }));
    this.renderLobby('正在连接…');
  },

  joinRoom(url, code, name) {
    if (!url) { this.renderLobby('<span class="bad">先填联机服务器地址，例如 wss://你的服务器域名</span>'); return; }
    if (!code || code.length < 4) { this.renderLobby('<span class="bad">请输入 4 位房间码</span>'); return; }
    this.name = (name || '骑士').slice(0, 12);
    this._url = url;
    this.saveUrl(url);
    this.connect(url, () => this.send({ t: 'join', code, name: this.name }));
    this.renderLobby('正在加入 ' + code + '…');
  },

  leave() {
    if (this.ws && this.ws.readyState === 1) this.send({ t: 'leave' });
    this.close();
    UI.showTitle();
  },

  close() {
    this.stopListPolling();
    try { if (this.ws) this.ws.close(); } catch (e) { /* ignore */ }
    this.on = false;
    this.started = false;
    this.ws = null;
    this.code = '';
    this.isHost = false;
    this.peers.clear();
    this.ghosts.clear();
    this.remote.clear();
    this.taken.clear();
  },

  /* ---------------- 消息 ---------------- */
  onMessage(msg) {
    switch (msg.t) {
      case 'room': {
        this.id = msg.id;
        this.code = msg.code;
        this.isHost = !!msg.host;
        this.stopListPolling();
        this.peers.clear();
        for (const p of (msg.peers || [])) this.peers.set(p.id, p);
        this.renderLobby();
        if (msg.started) {
          UI.toast('房间已开局，正在同步…', '#ffd257');
          this.beginGame();
        }
        break;
      }
      case 'peer': {
        this.peers.set(msg.id, { id: msg.id, name: msg.name });
        Sfx.play('select');
        UI.toast(msg.name + ' 加入了房间', '#8fe6ff');
        this.renderLobby();
        break;
      }
      case 'peerLeft': {
        const p = this.peers.get(msg.id);
        this.peers.delete(msg.id);
        this.ghosts.delete(msg.id);
        this.remote.delete(msg.id);
        if (p) UI.toast(p.name + ' 离开了房间', '#a9a2c4');
        if (Game.state === 'lobby') this.renderLobby();
        break;
      }
      case 'host': {
        this.isHost = msg.id === this.id;
        if (this.isHost) UI.toast('你成为新房主', '#ffd257');
        if (Game.state === 'lobby') this.renderLobby();
        break;
      }
      case 'left': break;
      case 'err': {
        this.lastErr = msg.msg || '发生错误';
        this.renderLobby('<span class="bad">' + escapeHtml(this.lastErr) + '</span>');
        break;
      }
      case 'relay': {
        this.rx++;
        const d = msg.d || {};
        if (d.t === 'start') { this.beginGame(); break; }
        if (this.isHost) this.onHostRelay(msg.from, d);
        else this.onClientRelay(msg.from, d);
        break;
      }
      default: break;
    }
  },

  /* ---------------- 开局 ---------------- */
  beginGame() {
    if (this.started) return;
    this.started = true;
    this.ghosts.clear();
    this.remote.clear();
    this.taken.clear();
    this.timedOut = false;
    this._sentDown = false;
    this._downToast = 0;
    Game.startRun(this.charId);
    this.hostFloor = Game.floor;
    if (!this.isHost) {
      // 成员：告诉房主自己的角色，便于房主端建立代理
      this.sendRelay({ t: 'hello', c: this.charId });
    } else {
      UI.toast('房间已开局 · ' + this.code, '#8fe6ff');
    }
  },

  /* ---------------- 房主：接收成员输入 ---------------- */
  onHostRelay(from, d) {
    if (d.t === 'hello') {
      if (!this.ghosts.has(from)) {
        const p = world.player;
        const g = new Player(d.c || 'knight', p ? p.x + 36 : VW / 2, p ? p.y + 20 : VH / 2);
        g.spawnT = 0;
        g._inp = { mx: 0, my: 0, a: 0, f: 0, d: 0, q: 0, x: g.x, y: g.y };
        this.ghosts.set(from, g);
      }
      return;
    }
    if (d.t === 'take') {
      const pk = world.pickups.find(x => x.nid === d.i);
      if (pk) pk.dead = true;
      return;
    }
    if (d.t === 'coin') { Game.addCoins(d.v || 0); return; }
    if (d.t === 'spend') { Game.coins = Math.max(0, Game.coins - (d.v || 0)); return; }
    if (d.t === 'down') {
      const g = this.ghosts.get(from);
      if (g && !g.dead) { g.dead = true; g.downT = 20; g.hp = 0; }
      return;
    }
    if (d.t === 'giveup') { this.ghosts.delete(from); return; }
    if (d.t === 'revivehost') {
      const p = world.player;
      if (p && p.dead && (p.downT || 0) > 0) {
        p.dead = false; p.hp = Math.round(p.maxHp * .5); p.invuln = 2;
        p.downT = 0; p.deathT = 0;
        this.sendRelay({ t: 'revive', i: this.id });
        UI.toast('队友把你救了起来', '#7bff9b');
        Sfx.play('heal');
      }
      return;
    }
    if (d.t === 'input') {
      const g = this.ghosts.get(from);
      if (!g) return;
      g._inp.mx = d.mx || 0;
      g._inp.my = d.my || 0;
      g._inp.a = d.a || 0;
      g._inp.f = d.f ? 1 : 0;
      if (d.d) g._inp.d = 1;
      if (d.q) g._inp.q = 1;
      if (typeof d.x === 'number') g._inp.x = d.x;
      if (typeof d.y === 'number') g._inp.y = d.y;
      return;
    }
  },

  /* ---------------- 成员：接收房主快照 ---------------- */
  onClientRelay(from, d) {
    if (d.t === 'state') { this.last = d; this.applyState(d); return; }
    if (d.t === 'buff') {
      const b = (typeof BUFFS !== 'undefined') ? BUFFS.find(x => x.id === d.id) : null;
      if (b && world.player) {
        b.apply(world.player);
        UI.toast('全队获得祝福：' + b.name, '#ffd257');
        Sfx.play('levelup');
      }
      return;
    }
    if (d.t === 'over') { Game.finishRun(false); return; }
    if (d.t === 'dead') {
      if (d.i === this.id) { UI.toast('你已阵亡', '#ff5d6c'); Game.finishRun(false); }
      return;
    }
    if (d.t === 'revive') {
      if (d.i === this.id && world.player) {
        const p = world.player;
        p.dead = false; p.hp = Math.round(p.maxHp * .5); p.invuln = 2;
        p.downT = 0; p.deathT = 0;
        this.timedOut = false;
        this._sentDown = false;
        Sfx.play('heal');
        UI.toast('队友把你救了起来', '#7bff9b');
      } else {
        const r = this.remote.get(d.i);
        if (r) r.down = false;
      }
      return;
    }
  },

  applyState(s) {
    // 金币池全队共用，以房主账本为准
    if (typeof s.cn === 'number' && s.cn !== Game.coins) Game.coins = s.cn;
    // 楼层跟随
    if (typeof s.f === 'number' && s.f !== Game.floor) {
      Game.floor = s.f;
      world.floorData = generateFloor(s.f);
      world.room = null;
      if (typeof Sfx !== 'undefined' && Sfx.setTheme) Sfx.setTheme(world.floorData.theme);
    }
    // 房间跟随：房主过门，成员一起过
    if (s.r && world.floorData) {
      const cur = world.room;
      const changed = !cur || cur.gx !== s.r[0] || cur.gy !== s.r[1];
      if (changed) {
        const target = world.floorData.rooms.find(r => r.gx === s.r[0] && r.gy === s.r[1]);
        if (target) {
          enterRoom(target, null);
          // 落点跟随房主，别把队友扔在房间正中央
          const host = (s.p || []).find(x => x.i !== this.id);
          const p = world.player;
          if (host && p) {
            p.x = clamp(host.x + 26, 40, VW - 40);
            p.y = clamp(host.y + 16, 40, VH - 40);
            p._px = p.x; p._py = p.y;
            p.invuln = Math.max(p.invuln, .5);
          }
        }
      }
      // 房间状态同步：怪物已刷、门已开、传送门已出现
      const room = world.room;
      if (room) {
        if (s.sp) room.spawned = true;
        if (s.cl && !room.cleared) {
          room.cleared = true;
          setDoors(room, true);
          Sfx.play('clear');
        }
        if (s.po && !world.portal) {
          Game.spawnPortal(room);
          UI.toast('传送门已开启', '#c8aaff');
        }
      }
    }
    // 队友投影
    if (Array.isArray(s.p)) {
      for (const pp of s.p) {
        if (pp.i === this.id) continue;
        let r = this.remote.get(pp.i);
        if (!r) {
          const proj = new Player(pp.c || 'knight', pp.x, pp.y);
          proj.spawnT = 0;
          proj.invuln = 0;
          r = { p: proj, tx: pp.x, ty: pp.y, a: pp.a || 0, hp: pp.h, mhp: pp.m, name: (this.peers.get(pp.i) || {}).name || '队友' };
          this.remote.set(pp.i, r);
        }
        r.tx = pp.x; r.ty = pp.y; r.a = pp.a || 0;
        r.hp = pp.h; r.mhp = pp.m || r.mhp;
        r.down = !!pp.d;
        r.p.dead = !!pp.d;
        r.p.downT = pp.dn || 0;
        r.p.moving = true;
      }
      for (const id of [...this.remote.keys()]) {
        if (!s.p.some(x => x.i === id)) this.remote.delete(id);
      }
    }
    // 敌人
    this.applyEnemies(s.e);
    // 掉落物
    this.applyPickups(s.k);
  },

  applyEnemies(list) {
    if (!Array.isArray(list)) return;
    const seen = new Set();
    for (const x of list) {
      seen.add(x.i);
      let e = world.enemies.find(en => en.nid === x.i);
      if (!e) {
        if (x.z) continue;
        const def = (typeof ENEMY_BY_ID !== 'undefined') ? ENEMY_BY_ID[x.d] : null;
        if (!def) continue;
        e = new Enemy(def, x.x, x.y, Game.floor, false);
        e.nid = x.i;
        e.spawnT = 0;
        e.alpha = typeof x.a === 'number' ? x.a : 1;
        world.enemies.push(e);
      }
      e._nx = x.x; e._ny = x.y;
      e.maxHp = x.m || e.maxHp;
      e.hp = Math.min(e.maxHp, x.h);
      if (x.z && !e.dead) { e.dead = true; }
    }
    for (const e of world.enemies) {
      if (e.nid && !seen.has(e.nid) && !e.dead) e.dead = true;
    }
  },

  /* 成员端：按房主快照维护掉落物 */
  applyPickups(list) {
    if (!Array.isArray(list)) return;
    const seen = new Set();
    for (const d of list) {
      seen.add(d.i);
      if (this.taken.has(d.i)) continue;
      let pk = world.pickups.find(x => x.nid === d.i);
      if (!pk) {
        let weapon = null;
        if (d.w && typeof WEAPON_BY_ID !== 'undefined' && WEAPON_BY_ID[d.w]) {
          weapon = makeWeaponInstance(WEAPON_BY_ID[d.w], Math.max(1, d.tr || 1), 0);
        }
        pk = new Pickup(d.t, d.x, d.y, {
          value: d.v, heal: d.h, energy: d.e, weapon, vx: 0, vy: 0,
        });
        pk.nid = d.i;
        pk.spawnT = 0;
        world.pickups.push(pk);
      }
      pk._nx = d.x; pk._ny = d.y;
    }
    for (let i = world.pickups.length - 1; i >= 0; i--) {
      const pk = world.pickups[i];
      if (!pk.nid) continue;
      if (!seen.has(pk.nid) && !this.taken.has(pk.nid)) pk.dead = true;
    }
  },

  /* 本地拾取：成员要告诉房主，否则快照会把东西刷回来 */
  onLocalPickup(pk) {
    if (!this.on || !this.started) return;
    if (this.isHost) return;
    if (!pk || !pk.nid) return;
    this.taken.add(pk.nid);
    this.sendRelay({ t: 'take', i: pk.nid });
  },

  /* 金币共享：房主记账，成员上报 */
  onCoinPickup(v) {
    if (!this.on || !this.started) return;
    if (this.isHost) { Game.addCoins(v || 0); return; }
    this.sendRelay({ t: 'coin', v: v || 0 });
  },

  /* 倒地救援：靠近倒地队友按 E */
  tryRevive() {
    if (!this.on || !this.started) return false;
    const p = world.player;
    if (!p || p.dead) return false;
    if (this.isHost) {
      for (const [id, g] of this.ghosts) {
        if (!g || !g.dead) continue;
        if (dist2(p.x, p.y, g.x, g.y) > 80 * 80) continue;
        g.dead = false;
        g.hp = Math.round(g.maxHp * .5);
        g.invuln = 2;
        g.downT = 0;
        g.deathT = 0;
        this.sendRelay({ t: 'revive', i: id });
        UI.toast('救起了队友', '#7bff9b');
        Sfx.play('heal');
        return true;
      }
      return false;
    }
    for (const r of this.remote.values()) {
      if (!r || !r.down) continue;
      if (dist2(p.x, p.y, r.p.x, r.p.y) > 80 * 80) continue;
      this.sendRelay({ t: 'revivehost' });
      return true;
    }
    return false;
  },

  /* 倒地读秒结束 */
  onPlayerTimedOut() {
    if (this.timedOut) return;
    this.timedOut = true;
    if (this.isHost) this.sendRelay({ t: 'over' });
    else this.sendRelay({ t: 'giveup' });
    Game.finishRun(false);
  },

  /* 倒地倒计时 HUD（画在显示分辨率层） */
  drawHud(g) {
    if (!this.on || !this.started) return;
    const p = world.player;
    if (!p || !p.dead) return;
    const left = Math.ceil(p.downT == null ? 20 : p.downT);
    drawText(g, '倒地 ' + left + 's', VW / 2, VH / 2 - 64, {
      size: 26, color: '#ff5d6c', align: 'center', weight: 900, stroke: '#2a0008', strokeW: 5,
    });
    drawText(g, '队友靠近按 E 救援', VW / 2, VH / 2 - 38, {
      size: 12, color: '#ffb0b8', align: 'center', weight: 700,
    });
  },

  /* ---------------- 每帧 ---------------- */
  tick(dt) {
    if (!this.on || !this.started) return;
    this.ticks++;
    const p = world.player;

    if (!this.isHost && p) {
      // 倒地通知（只发一次）
      if (p.dead && !this._sentDown) { this._sentDown = true; this.sendRelay({ t: 'down' }); }
      if (!p.dead && this._sentDown) { this._sentDown = false; this.timedOut = false; }
      this.sendT += dt;
      if (this.sendT >= 0.05) {
        this.sendT = 0;
        this.sendRelay({
          t: 'input',
          mx: +(+Input.move.x).toFixed(2),
          my: +(+Input.move.y).toFixed(2),
          a: +(+p.aimAngle).toFixed(3),
          f: Input.firing ? 1 : 0,
          d: Input.wasPressed('Space') ? 1 : 0,
          q: Input.wasPressed('KeyQ') ? 1 : 0,
          x: Math.round(p.x),
          y: Math.round(p.y),
        });
      }
      // 敌人位置向房主快照靠拢
      for (const e of world.enemies) {
        if (e._nx == null || e.dead) continue;
        e.x += (e._nx - e.x) * 0.35;
        e.y += (e._ny - e.y) * 0.35;
      }
      // 掉落物位置校正（不做强插值，避免金币被磁吸时抽搐）
      for (const pk of world.pickups) {
        if (pk._nx == null || pk.dead) continue;
        pk.x += (pk._nx - pk.x) * 0.2;
        pk.y += (pk._ny - pk.y) * 0.2;
      }
      // 队友插值
      for (const r of this.remote.values()) {
        r.p.x += (r.tx - r.p.x) * 0.3;
        r.p.y += (r.ty - r.p.y) * 0.3;
        r.p.aimAngle = r.a;
        r.p.walkT = (r.p.walkT || 0) + dt * 8;
        r.p.moving = Math.hypot(r.tx - r.p.x, r.ty - r.p.y) > 1.2;
      }
      return;
    }

    if (this.isHost) {
      this.stepGhosts(dt);
      // 成员倒地读秒：超时移除代理并通知本人阵亡
      for (const [id, g] of [...this.ghosts]) {
        if (!g || !g.dead) continue;
        g.downT = Math.max(0, (g.downT == null ? 20 : g.downT) - dt);
        if (g.downT <= 0) {
          this.ghosts.delete(id);
          this.sendRelay({ t: 'dead', i: id });
        }
      }
      this.stateT += dt;
      if (this.stateT >= 0.05) { this.stateT = 0; this.broadcastState(); }
    }
  },

  _saveInput() {
    return {
      mx: Input.move.x, my: Input.move.y,
      ax: Input.aim.x, ay: Input.aim.y, angle: Input.aim.angle,
      firing: Input.firing, pressed: Input.pressed, keys: Input.keys,
    };
  },

  _restoreInput(s) {
    Input.move.x = s.mx; Input.move.y = s.my;
    Input.aim.x = s.ax; Input.aim.y = s.ay; Input.aim.angle = s.angle;
    Input.firing = s.firing;
    Input.pressed = s.pressed;
    Input.keys = s.keys;
  },

  /* 房主端：用成员上报的输入驱动其代理角色，队友的子弹因此真实参与结算 */
  stepGhosts(dt) {
    for (const g of this.ghosts.values()) {
      if (!g || g.dead) continue;
      const inp = g._inp;
      if (!inp) continue;
      if (typeof inp.x === 'number') {
        g.x += (inp.x - g.x) * 0.22;
        g.y += (inp.y - g.y) * 0.22;
      }
      const s = this._saveInput();
      Input.move.x = inp.mx; Input.move.y = inp.my;
      Input.aim.angle = inp.a;
      Input.aim.x = Math.cos(inp.a); Input.aim.y = Math.sin(inp.a);
      Input.firing = !!inp.f;
      Input.pressed = {};
      Input.keys = {};
      if (inp.d) Input.pressed['Space'] = true;
      if (inp.q) Input.pressed['KeyQ'] = true;
      try { g.update(dt); } catch (e) { /* 单个代理异常不影响主循环 */ }
      this._restoreInput(s);
      inp.d = 0; inp.q = 0;
    }
  },

  broadcastState() {
    const p = world.player;
    const players = [];
    if (p) {
      players.push({
        i: this.id, c: p.charId, x: Math.round(p.x), y: Math.round(p.y),
        a: +(+p.aimAngle).toFixed(2), h: Math.round(p.hp), m: Math.round(p.maxHp),
        r: Math.round(p.armor), d: p.dead ? 1 : 0,
        dn: p.dead ? Math.ceil(p.downT || 0) : 0,
      });
    }
    for (const [id, g] of this.ghosts) {
      if (!g) continue;
      players.push({
        i: id, c: g.charId, x: Math.round(g.x), y: Math.round(g.y),
        a: +(+g.aimAngle).toFixed(2), h: Math.round(g.hp), m: Math.round(g.maxHp),
        r: Math.round(g.armor), d: g.dead ? 1 : 0,
        dn: g.dead ? Math.ceil(g.downT || 0) : 0,
      });
    }
    const enemies = [];
    for (const e of world.enemies) {
      if (!e || !e.nid || !e.def) continue;
      enemies.push({
        i: e.nid, d: e.def.id, x: Math.round(e.x), y: Math.round(e.y),
        h: Math.round(e.hp), m: Math.round(e.maxHp), z: e.dead ? 1 : 0,
        a: +(e.alpha == null ? 1 : e.alpha).toFixed(2),
      });
    }
    // 掉落物：队友也要能看见房主打出来的金币和武器
    const drops = [];
    for (const pk of world.pickups) {
      if (!pk || pk.dead || !pk.nid) continue;
      if (pk.price > 0) continue;            // 商店商品各端自理
      if (drops.length >= 40) break;
      drops.push({
        i: pk.nid, t: pk.type, x: Math.round(pk.x), y: Math.round(pk.y),
        v: pk.value, h: pk.heal, e: pk.energy,
        w: pk.weapon ? pk.weapon.baseId : '', tr: pk.weapon ? pk.weapon.tier : 0,
      });
    }
    this.sendRelay({
      t: 'state', f: Game.floor,
      r: world.room ? [world.room.gx, world.room.gy] : null,
      cl: world.room && world.room.cleared ? 1 : 0,
      sp: world.room && world.room.spawned ? 1 : 0,
      po: world.portal ? 1 : 0,
      cn: Game.coins,
      p: players, e: enemies, k: drops,
    });
    this.states++;
  },

  /* 进入房间时：房主把成员代理一起带到入口，避免队友卡在上一个房间 */
  onEnterRoom(fromDir) {
    if (!this.on || !this.started || !this.isHost) return;
    const pos = this.entryPos(fromDir);
    for (const g of this.ghosts.values()) {
      if (!g) continue;
      g.x = clamp(pos.x + rand(26, -26), 40, VW - 40);
      g.y = clamp(pos.y + rand(20, -20), 40, VH - 40);
      g._px = g.x; g._py = g.y;
      if (g._inp) { g._inp.x = g.x; g._inp.y = g.y; }
    }
  },

  entryPos(dir) {
    if (dir === 'n') return { x: VW / 2, y: VH - 170 };
    if (dir === 's') return { x: VW / 2, y: 170 };
    if (dir === 'w') return { x: VW - 170, y: VH / 2 };
    if (dir === 'e') return { x: 170, y: VH / 2 };
    return { x: VW / 2, y: VH / 2 - 62 };
  },

  /* 成员端：是否要跳过本地刷怪（房主统一生成） */
  skipLocalSpawn() {
    return this.on && this.started && !this.isHost;
  },

  /* ---------------- 渲染远端玩家 ---------------- */
  draw(g) {
    if (!this.on || !this.started) return;
    if (this.isHost) {
      for (const [id, p] of this.ghosts) {
        if (!p || p.dead) continue;
        this.drawPeer(g, p, (this.peers.get(id) || {}).name || '队友', p.hp, p.maxHp);
      }
    } else {
      for (const r of this.remote.values()) {
        this.drawPeer(g, r.p, r.name, r.hp, r.mhp);
      }
    }
  },

  drawPeer(g, p, name, hp, maxHp) {
    if (!p) return;
    p.draw(g);
    if (p.dead) {
      // 倒地队友：显示救援倒计时
      g.save();
      g.font = '700 9px "Microsoft YaHei", sans-serif';
      g.textAlign = 'center';
      g.fillStyle = '#ff8a8a';
      g.fillText('倒地 ' + Math.ceil(p.downT == null ? 20 : p.downT) + 's', p.x, p.y - 22);
      g.restore();
      return;
    }
    // 名字 + 血条
    const label = name || '队友';
    g.save();
    g.font = '700 8px "Microsoft YaHei", sans-serif';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(0,0,0,.55)';
    const w = Math.max(30, g.measureText(label).width + 8);
    roundRect(g, p.x - w / 2, p.y - 34, w, 11, 3);
    g.fill();
    g.fillStyle = '#cfe6ff';
    g.fillText(label, p.x, p.y - 26);
    g.restore();
    if (typeof maxHp === 'number' && maxHp > 0) {
      const bw = 30, bh = 3, bx = p.x - bw / 2, by = p.y - 21;
      g.save();
      g.fillStyle = 'rgba(0,0,0,.6)';
      g.fillRect(bx, by, bw, bh);
      g.fillStyle = '#54e08a';
      g.fillRect(bx, by, bw * Math.max(0, Math.min(1, hp / maxHp)), bh);
      g.restore();
    }
  },
};

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
