'use strict';
/* =====================================================================
   地牢骑士：无尽回响  —  核心工具 / 输入 / 音效 / 粒子
   ===================================================================== */

const VW = 960, VH = 544, TILE = 32, COLS = 30, ROWS = 17;
const TAU = Math.PI * 2, PI = Math.PI;

let canvas = null, ctx = null;
/* 主显示画布与离屏世界画布（世界 960x544，HUD 按实际分辨率绘制） */
let view = null, worldCanvas = null, viewScale = 1;

/* 全局世界容器 */
const world = {
  bullets: [], ebullets: [], enemies: [], pickups: [], summons: [],
  slashes: [], particles: [], texts: [], props: [], orbs: [],
  decor: [], beams: [],
  player: null, room: null, floorData: null, theme: 0,
};

/* ---------------------------- 数学 ---------------------------- */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const chance = p => Math.random() < p;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const sign = v => v < 0 ? -1 : (v > 0 ? 1 : 0);
const approach = (cur, target, delta) => cur < target ? Math.min(cur + delta, target) : Math.max(cur - delta, target);
const smooth = t => t * t * (3 - 2 * t);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
const approachAngle = (cur, target, delta) => cur + clamp(angDiff(target, cur), -delta, delta);
const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
const fmt = n => n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n));

/* 带种子的随机数（地牢生成用） */
class RNG {
  constructor(seed = Date.now()) { this.s = seed >>> 0 || 1; }
  next() {
    let t = this.s += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = this.int(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
}

/* ---------------------------- 存 档 ---------------------------- */
const Save = {
  KEY: 'dungeon_knight_save_v1',
  data: {
    gems: 0, best: 0, bestFloor: 0, runs: 0, kills: 0,
    unlocked: ['knight', 'ranger', 'mage'],
    seenWeapons: [], seenEnemies: [],
    settings: { music: true, sfx: true },
  },
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const d = JSON.parse(raw);
        Object.assign(this.data, d);
        this.data.settings = Object.assign({ music: true, sfx: true }, d.settings || {});
        this.data.seenWeapons = d.seenWeapons || [];
        this.data.seenEnemies = d.seenEnemies || [];
        this.data.unlocked = d.unlocked || ['knight', 'ranger', 'mage'];
      }
    } catch (e) { /* ignore */ }
    return this.data;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  },
  reset() {
    this.data = {
      gems: 0, best: 0, bestFloor: 0, runs: 0, kills: 0,
      unlocked: ['knight', 'ranger', 'mage'], seenWeapons: [], seenEnemies: [],
      settings: { music: true, sfx: true },
    };
    this.save();
  },
};

/* ---------------------------- 输 入 ---------------------------- */
const UI_BUTTONS = [];   // {x,y,r,id,label,down:false, onDown, visible}

/* 设备探测：粗指针 / 多点触控设备开局即进入触屏模式。
   否则手机玩家从 DOM 菜单点「开始冒险」进游戏时没有先在画布上按过，
   touchMode 仍是 false，整套虚拟摇杆与动作按钮都不会出现。 */
const IS_TOUCH_DEVICE = (() => {
  try {
    if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
    if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) return true;
    return typeof window !== 'undefined' && 'ontouchstart' in window;
  } catch (e) { return false; }
})();

const Input = {
  keys: {}, pressed: {}, released: {},
  mouse: { x: VW / 2, y: VH / 2, down: false, clicked: false, right: false },
  move: { x: 0, y: 0 },
  aim: { x: 1, y: 0, angle: 0 },
  firing: false,
  touchMode: IS_TOUCH_DEVICE,
  pointers: new Map(),
  stickMove: null, stickAim: null,
  init(cv) {
    canvas = cv;
    addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; this.released[e.code] = true; });
    addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; this.firing = false; this.pointers.clear(); this.stickMove = this.stickAim = null; });

    /* 触摸落在任何位置（含 DOM 菜单按钮）都立刻切到触屏模式；
       之后用鼠标点画布则切回鼠标模式，触屏笔记本两种都能用。 */
    addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') this.touchMode = true;
    }, true);

    const toLocal = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (VW / r.width), y: (e.clientY - r.top) * (VH / r.height) };
    };

    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') this.touchMode = true;
      else if (e.pointerType === 'mouse' && !this.pointers.size) this.touchMode = false;
      const p = toLocal(e);
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      // UI 按钮
      for (const b of UI_BUTTONS) {
        if (b.visible === false) continue;
        if (dist2(p.x, p.y, b.x, b.y) < (b.r + 10) * (b.r + 10)) {
          b.down = true;
          if (b.onDown) b.onDown();
          this.pointers.set(e.pointerId, { role: 'btn', btn: b, x: p.x, y: p.y });
          return;
        }
      }
      if (this.touchMode) {
        if (p.x < VW * 0.5 && !this.stickMove) {
          this.stickMove = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
          this.pointers.set(e.pointerId, { role: 'move', x: p.x, y: p.y });
        } else if (!this.stickAim) {
          this.stickAim = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
          this.pointers.set(e.pointerId, { role: 'aim', x: p.x, y: p.y });
        }
      } else {
        this.pointers.set(e.pointerId, { role: 'mouse', x: p.x, y: p.y });
        this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.down = true; this.mouse.clicked = true;
      }
      if (e.pointerType === 'mouse' && e.button === 2) this.mouse.right = true;
    });
    canvas.addEventListener('pointermove', e => {
      const p = toLocal(e);
      if (e.pointerType === 'mouse' || !this.touchMode) { this.mouse.x = p.x; this.mouse.y = p.y; }
      const st = this.pointers.get(e.pointerId);
      const sm = this.stickMove, sa = this.stickAim;
      if (sm && sm.id === e.pointerId) { sm.x = p.x; sm.y = p.y; }
      if (sa && sa.id === e.pointerId) { sa.x = p.x; sa.y = p.y; }
      if (st) { st.x = p.x; st.y = p.y; }
    });
    const up = e => {
      const st = this.pointers.get(e.pointerId);
      if (st && st.role === 'btn' && st.btn) st.btn.down = false;
      if (this.stickMove && this.stickMove.id === e.pointerId) this.stickMove = null;
      if (this.stickAim && this.stickAim.id === e.pointerId) this.stickAim = null;
      this.pointers.delete(e.pointerId);
      if (e.pointerType !== 'touch') { this.mouse.down = false; if (e.button === 2) this.mouse.right = false; }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('wheel', e => { this.wheel = sign(e.deltaY); e.preventDefault(); }, { passive: false });
  },
  isDown(c) { return !!this.keys[c]; },
  wasPressed(c) { return !!this.pressed[c]; },
  endFrame() { this.pressed = {}; this.released = {}; this.mouse.clicked = false; this.wheel = 0; },
  update() {
    // 移动向量
    let mx = 0, my = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) mx -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) mx += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) my -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) my += 1;
    if (this.stickMove) {
      let dx = this.stickMove.x - this.stickMove.ox, dy = this.stickMove.y - this.stickMove.oy;
      const l = Math.hypot(dx, dy), dead = 8, max = 52;
      if (l > dead) { const k = Math.min(1, (l - dead) / (max - dead)) / l; mx = dx * k; my = dy * k; }
    }
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    this.move.x = mx; this.move.y = my;

    if (this.stickAim) {
      const dx = this.stickAim.x - this.stickAim.ox, dy = this.stickAim.y - this.stickAim.oy;
      if (Math.hypot(dx, dy) > 10) { this.aim.x = dx; this.aim.y = dy; this.aim.angle = Math.atan2(dy, dx); }
      this.firing = Math.hypot(dx, dy) > 10;
    } else {
      this.firing = this.mouse.down;
      if (world.player) {
        this.aim.angle = angleTo(world.player.x, world.player.y - 6, this.mouse.x + camX, this.mouse.y + camY);
        this.aim.x = Math.cos(this.aim.angle); this.aim.y = Math.sin(this.aim.angle);
      }
    }
    if (this.stickAim) {
      this.aim.x = Math.cos(this.aim.angle); this.aim.y = Math.sin(this.aim.angle);
    }
  },
  resetSticks() { this.stickMove = null; this.stickAim = null; this.pointers.clear(); },
};

/* ---------------------------- 镜 头 ---------------------------- */
let camX = 0, camY = 0;
const Camera = {
  shake: 0, shakeX: 0, shakeY: 0, flash: 0, flashColor: '#fff', hitstop: 0,
  kick: 0,
  addShake(a) { this.shake = Math.min(26, this.shake + a); },
  flashScreen(color, a) { this.flashColor = color; this.flash = Math.max(this.flash, a); },
  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 34);
    const s = this.shake;
    this.shakeX = rand(1, -1) * s; this.shakeY = rand(1, -1) * s;
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.hitstop = Math.max(0, this.hitstop - dt);
    this.kick = Math.max(0, this.kick - dt * 6);
  },
};

/* ---------------------------- 音 效 ---------------------------- */
const Sfx = {
  ac: null, master: null, musicGain: null, sfxGain: null,
  enabled: true, musicEnabled: true,
  musicTimer: null, nextNote: 0, step: 0, themeIdx: 0, musicOn: false, bpm: 104,
  init() {
    if (this.ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    try {
      this.ac = new AC();
      this.master = this.ac.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ac.destination);
      this.sfxGain = this.ac.createGain(); this.sfxGain.gain.value = this.enabled ? 0.55 : 0; this.sfxGain.connect(this.master);
      this.musicGain = this.ac.createGain(); this.musicGain.gain.value = this.musicEnabled ? 0.22 : 0; this.musicGain.connect(this.master);
    } catch (e) { this.enabled = false; }
  },
  resume() {
    this.init();
    if (this.ac && this.ac.state === 'suspended') this.ac.resume();
  },
  setSfx(on) {
    this.enabled = on;
    if (this.sfxGain) this.sfxGain.gain.value = on ? 0.55 : 0;
    Save.data.settings.sfx = on; Save.save();
  },
  setMusic(on) {
    this.musicEnabled = on;
    if (this.musicGain) this.musicGain.gain.value = on ? 0.22 : 0;
    Save.data.settings.music = on; Save.save();
    if (on) this.startMusic(); else this.stopMusic();
  },
  tone(freq, dur = 0.1, type = 'square', vol = 0.3, slideTo = 0, delay = 0) {
    if (!this.ac || !this.enabled) return;
    const t0 = this.ac.currentTime + delay;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur = 0.15, vol = 0.3, freq = 1200, type = 'lowpass', delay = 0, q = 1) {
    if (!this.ac || !this.enabled) return;
    const t0 = this.ac.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ac.sampleRate * dur));
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ac.createBufferSource(); src.buffer = buf;
    const f = this.ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ac.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  },
  play(name) {
    if (!this.ac || !this.enabled) return;
    switch (name) {
      case 'shoot': this.tone(680, 0.06, 'square', 0.16, 260); break;
      case 'shoot2': this.tone(420, 0.08, 'sawtooth', 0.14, 160); break;
      case 'shotgun': this.noise(0.16, 0.35, 900); this.tone(160, 0.12, 'square', 0.2, 60); break;
      case 'laser': this.tone(1500, 0.09, 'sawtooth', 0.1, 420); break;
      case 'rail': this.tone(2400, 0.22, 'sawtooth', 0.12, 180); this.noise(0.18, 0.18, 3000, 'highpass'); break;
      case 'rocket': this.noise(0.3, 0.3, 500); this.tone(120, 0.25, 'sawtooth', 0.2, 50); break;
      case 'bow': this.tone(320, 0.09, 'triangle', 0.2, 900); break;
      case 'throw': this.noise(0.08, 0.14, 2600, 'highpass'); break;
      case 'swing': this.noise(0.09, 0.16, 1800, 'bandpass', 0, 2); break;
      case 'hit': this.noise(0.05, 0.16, 2600, 'highpass'); this.tone(240, 0.04, 'square', 0.08, 140); break;
      case 'crit': this.noise(0.07, 0.2, 3400, 'highpass'); this.tone(900, 0.06, 'square', 0.1, 1400); break;
      case 'hurt': this.tone(260, 0.2, 'sawtooth', 0.24, 80); this.noise(0.16, 0.2, 700); break;
      case 'coin': this.tone(1180, 0.05, 'square', 0.1, 0); this.tone(1560, 0.08, 'square', 0.09, 0, 0.05); break;
      case 'pickup': this.tone(520, 0.07, 'triangle', 0.16, 780); this.tone(780, 0.09, 'triangle', 0.12, 1040, 0.06); break;
      case 'heal': this.tone(520, 0.1, 'sine', 0.2, 660); this.tone(660, 0.1, 'sine', 0.2, 880, 0.09); this.tone(880, 0.16, 'sine', 0.16, 1100, 0.18); break;
      case 'energy': this.tone(880, 0.06, 'sine', 0.12, 1320); break;
      case 'door': this.noise(0.35, 0.24, 320); this.tone(90, 0.4, 'sawtooth', 0.14, 60); break;
      case 'clear': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.16, 0, i * 0.09)); break;
      case 'skill': this.tone(300, 0.3, 'sawtooth', 0.2, 900); this.noise(0.3, 0.12, 2200, 'bandpass', 0, 1.4); break;
      case 'explode': this.noise(0.5, 0.5, 420); this.tone(90, 0.45, 'sawtooth', 0.28, 30); break;
      case 'boss': this.tone(70, 1.0, 'sawtooth', 0.34, 40); this.tone(140, 0.9, 'square', 0.12, 90, 0.1); this.noise(1.0, 0.2, 260); break;
      case 'bossdie': this.noise(1.2, 0.5, 300); [300, 240, 180, 120].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.18, f * 0.5, i * 0.18)); break;
      case 'death': [440, 330, 260, 180, 110].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, f * 0.7, i * 0.13)); break;
      case 'select': this.tone(620, 0.05, 'square', 0.12, 860); break;
      case 'error': this.tone(180, 0.08, 'square', 0.16, 120); this.tone(140, 0.12, 'square', 0.14, 90, 0.09); break;
      case 'portal': this.tone(200, 0.6, 'sine', 0.18, 1200); this.noise(0.6, 0.1, 1800, 'bandpass'); break;
      case 'levelup': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'square', 0.12, 0, i * 0.07)); break;
      case 'freeze': this.tone(1700, 0.25, 'sine', 0.12, 2600); this.noise(0.2, 0.1, 5000, 'highpass'); break;
      case 'burn': this.noise(0.3, 0.15, 800, 'bandpass', 0, 1.2); break;
      case 'chain': this.tone(1400, 0.06, 'sawtooth', 0.1, 600); this.tone(1800, 0.05, 'sawtooth', 0.08, 700, 0.04); break;
      case 'summon': this.tone(140, 0.4, 'sawtooth', 0.14, 420); break;
      case 'dash': this.noise(0.15, 0.2, 1600, 'bandpass', 0, 2); break;
      case 'buy': this.tone(880, 0.08, 'square', 0.12, 0); this.tone(1320, 0.12, 'square', 0.1, 0, 0.08); break;
      case 'shield': this.tone(300, 0.2, 'sine', 0.14, 600); break;
      case 'thunder': this.noise(0.5, 0.35, 900, 'highpass'); this.tone(60, 0.4, 'sawtooth', 0.25, 40); break;
    }
  },
  /* --- 程序化 BGM --- */
  scales: [
    [0, 3, 5, 7, 10],   // 地牢 小调五声
    [0, 2, 3, 7, 8],    // 洞窟
    [0, 2, 4, 7, 9],    // 遗迹 大调五声
    [0, 1, 5, 7, 8],    // 冰原
    [0, 2, 3, 6, 7],    // 火山
    [0, 2, 5, 7, 10],   // 异星
  ],
  roots: [110, 98, 130.8, 116.5, 87.3, 103.8],
  startMusic() {
    this.init();
    if (!this.ac || !this.musicEnabled) return;
    this.musicOn = true;
    if (this.musicTimer) return;
    this.nextNote = this.ac.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = setInterval(() => this.schedule(), 60);
  },
  stopMusic() {
    this.musicOn = false;
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  },
  setTheme(i) { this.themeIdx = ((i % 6) + 6) % 6; },
  schedule() {
    if (!this.ac || !this.musicOn || !this.musicEnabled) return;
    const spb = 60 / this.bpm / 2; // 八分音符
    while (this.nextNote < this.ac.currentTime + 0.25) {
      const t = this.nextNote - this.ac.currentTime;
      const s = this.step;
      const scale = this.scales[this.themeIdx % this.scales.length];
      const root = this.roots[this.themeIdx % this.roots.length];
      const deg = scale[(s * 3 + Math.floor(s / 8)) % scale.length];
      const oct = (s % 16 < 8) ? 2 : 4;
      // 低音
      if (s % 4 === 0) this.mtone(root * (s % 8 === 0 ? 1 : 1.5), spb * 1.8, 'triangle', 0.30, t, 0.5);
      // 琶音
      const f = root * 2 * Math.pow(2, (deg + (s % 8 === 6 ? 12 : 0)) / 12) * (oct === 4 ? 1 : 0.5);
      this.mtone(f, spb * 0.9, 'square', 0.075, t, 0.6);
      if (s % 8 === 4) this.mtone(f * 1.5, spb * 0.5, 'triangle', 0.05, t + 0.02, 0.4);
      // 打击
      if (s % 4 === 2) this.mnoise(0.04, 0.06, 6000, t, 0.2);
      if (s % 8 === 0) this.mnoise(0.12, 0.10, 180, t, 0.05);
      this.step = (s + 1) % 64;
      this.nextNote += spb;
    }
  },
  mtone(freq, dur, type, vol, delay, attack) {
    if (!this.ac) return;
    const t0 = this.ac.currentTime + Math.max(0, delay);
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (attack || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  mnoise(dur, vol, freq, delay, q) {
    if (!this.ac) return;
    const t0 = this.ac.currentTime + Math.max(0, delay);
    const len = Math.max(1, Math.floor(this.ac.sampleRate * dur));
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ac.createBufferSource(); src.buffer = buf;
    const f = this.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = this.ac.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.musicGain);
    src.start(t0);
  },
};

/* ---------------------------- 粒 子 ---------------------------- */
const FX = {
  burst(x, y, n, opts = {}) {
    const { color = '#fff', speed = 120, life = 0.4, size = 3, grav = 0, angle = 0, spread = TAU, drag = 2.5, glow = false, shape = 'rect' } = opts;
    for (let i = 0; i < n; i++) {
      const a = angle + rand(spread / 2, -spread / 2);
      const sp = speed * rand(1.2, 0.35);
      world.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: life * rand(1.25, 0.6), maxLife: life, color, size: size * rand(1.3, 0.6),
        grav, drag, glow, shape, rot: rand(TAU), vr: rand(8, -8),
      });
    }
  },
  trail(x, y, color, size = 3, life = 0.25) {
    world.particles.push({ x, y, vx: rand(20, -20), vy: rand(20, -20), life, maxLife: life, color, size, grav: 0, drag: 3, glow: true, shape: 'circle', rot: 0, vr: 0 });
  },
  ring(x, y, color, r0 = 6, r1 = 40, life = 0.35, width = 3) {
    world.particles.push({ x, y, vx: 0, vy: 0, life, maxLife: life, color, size: width, grav: 0, drag: 0, shape: 'ring', r0, r1, rot: 0, vr: 0, glow: true });
  },
  text(x, y, text, color = '#fff', size = 15, opts = {}) {
    world.texts.push({ x, y, text, color, size, life: opts.life || 0.8, maxLife: opts.life || 0.8, vy: opts.vy || -55, vx: opts.vx || rand(16, -16), crit: !!opts.crit, shadow: opts.shadow !== false });
  },
  update(dt) {
    const ps = world.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx -= p.vx * (p.drag || 0) * dt; p.vy -= p.vy * (p.drag || 0) * dt;
      p.vy += (p.grav || 0) * dt;
      p.rot += (p.vr || 0) * dt;
    }
    const ts = world.texts;
    for (let i = ts.length - 1; i >= 0; i--) {
      const t = ts[i];
      t.life -= dt;
      if (t.life <= 0) { ts.splice(i, 1); continue; }
      t.y += t.vy * dt; t.x += t.vx * dt;
      t.vx -= t.vx * 2 * dt; t.vy += 60 * dt;
    }
  },
  drawParticles(g) {
    for (const p of world.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      g.globalAlpha = a;
      if (p.shape === 'ring') {
        const t = 1 - a;
        const r = lerp(p.r0, p.r1, smooth(t));
        g.strokeStyle = p.color; g.lineWidth = Math.max(0.6, p.size * a);
        g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke();
      } else {
        g.fillStyle = p.color;
        if (p.glow) { g.shadowBlur = 10; g.shadowColor = p.color; }
        if (p.shape === 'circle') {
          g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU); g.fill();
        } else {
          const s = p.size * (0.4 + a * 0.6);
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-s / 2, -s / 2, s, s); g.restore();
        }
        g.shadowBlur = 0;
      }
    }
    g.globalAlpha = 1;
  },
  drawTexts(g) {
    for (const t of world.texts) {
      const a = clamp(t.life / t.maxLife * 1.6, 0, 1);
      g.globalAlpha = a;
      g.font = `900 ${t.size}px "Microsoft YaHei", system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (t.shadow) { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillText(t.text, t.x + 1, t.y + 2); }
      g.fillStyle = t.color;
      g.fillText(t.text, t.x, t.y);
    }
    g.globalAlpha = 1;
  },
};

/* ---------------------------- 绘制小工具 ---------------------------- */
function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawText(g, str, x, y, opts = {}) {
  const { size = 16, color = '#fff', align = 'left', baseline = 'middle', weight = 700, alpha = 1, shadow = true, stroke = '', strokeW = 3, font = '"Microsoft YaHei", system-ui, sans-serif' } = opts;
  g.save();
  g.globalAlpha = alpha;
  g.font = `${weight} ${size}px ${font}`;
  g.textAlign = align; g.textBaseline = baseline;
  if (shadow) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(str, x + 1.5, y + 2); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = strokeW; g.lineJoin = 'round'; g.strokeText(str, x, y); }
  g.fillStyle = color;
  g.fillText(str, x, y);
  g.restore();
}

function bar(g, x, y, w, h, pct, color, bgColor = 'rgba(0,0,0,.55)', border = 'rgba(0,0,0,.8)') {
  g.fillStyle = border; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = bgColor; g.fillRect(x, y, w, h);
  const fw = clamp(pct, 0, 1) * w;
  if (fw > 0) {
    const grad = g.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, color); grad.addColorStop(1, shade(color, -0.35));
    g.fillStyle = grad; g.fillRect(x, y, fw, h);
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x, y, fw, Math.max(1, h * 0.28));
  }
}

function shade(hex, amt) {
  // hex #rgb / #rrggbb
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  let r = parseInt(h.slice(0, 2), 16), gg = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  if (amt >= 0) { r = lerp(r, 255, amt); gg = lerp(gg, 255, amt); b = lerp(b, 255, amt); }
  else { r *= (1 + amt); gg *= (1 + amt); b *= (1 + amt); }
  const t = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${t(r)}${t(gg)}${t(b)}`;
}
function withAlpha(hex, a) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g2 = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g2},${b},${a})`;
}

/* 伤害飘字颜色 */
const DMG_COLOR = { normal: '#ffffff', crit: '#ffd257', player: '#ff6b7a', heal: '#7bff9b', shield: '#7cd8ff', poison: '#a6ff6b', burn: '#ffa257', freeze: '#9fe8ff', true: '#d7b6ff' };
