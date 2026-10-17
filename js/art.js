'use strict';
/* =====================================================================
   程序化像素美术：所有贴图均由代码绘制，无外部资源
   ===================================================================== */

/* 调色板：a=亮 b=中 c=暗 e=发光眼/装饰 */
const PALS = {
  bone:     { a: '#f1ecd6', b: '#c9c2a0', c: '#8b8464', e: '#67e8ff' },
  rustbone: { a: '#e8d8b0', b: '#b89f6c', c: '#7a6440', e: '#ff7a4d' },
  green:    { a: '#b6ff9a', b: '#6fdc5a', c: '#2f7a2c', e: '#fff36b' },
  slime:    { a: '#c8ffd6', b: '#6ee7a0', c: '#2a8f63', e: '#12251f' },
  toxic:    { a: '#dcff8a', b: '#a8e02c', c: '#5b8212', e: '#2a1d06' },
  purple:   { a: '#d8b4ff', b: '#a86bff', c: '#5b2b9e', e: '#ffe066' },
  night:    { a: '#8f86c9', b: '#5a4f8f', c: '#2c2450', e: '#ffd257' },
  crimson:  { a: '#ff9a9a', b: '#e0434f', c: '#7c1520', e: '#ffe066' },
  blood:    { a: '#ff7a86', b: '#c22a3a', c: '#5c0f1a', e: '#ffd257' },
  ice:      { a: '#e8fbff', b: '#8fdcff', c: '#3c7fb8', e: '#ffffff' },
  frost:    { a: '#c4ecff', b: '#6cb8e8', c: '#2b5f8c', e: '#b6f1ff' },
  fire:     { a: '#fff0a3', b: '#ffa63d', c: '#c43b16', e: '#fff' },
  lava:     { a: '#ffd166', b: '#ff6b2c', c: '#8c1e0e', e: '#ffe9b0' },
  rock:     { a: '#b6a894', b: '#8a7a66', c: '#54483c', e: '#ffcf4d' },
  cave:     { a: '#c2b096', b: '#8d7a5e', c: '#4e4130', e: '#9dff7a' },
  moss:     { a: '#b8d8a0', b: '#6f9a5a', c: '#3a5632', e: '#e8ff8a' },
  sand:     { a: '#f4e2b8', b: '#d4b878', c: '#8f7440', e: '#54e0ff' },
  gold:     { a: '#ffeeb0', b: '#ffc93c', c: '#a9761a', e: '#fff' },
  steel:    { a: '#dbe4f0', b: '#94a3bb', c: '#4c576e', e: '#67e8ff' },
  iron:     { a: '#c9d2e2', b: '#7d8798', c: '#3d4554', e: '#ff5d6c' },
  mech:     { a: '#b9c8e8', b: '#6b7fb0', c: '#2f3a5c', e: '#ff4d6d' },
  alien:    { a: '#b6ffef', b: '#54e0c8', c: '#1c6b6b', e: '#ff5ce0' },
  void:     { a: '#b79cff', b: '#6b3fd4', c: '#26124d', e: '#ff5ce0' },
  toxicgreen:{ a: '#d6ff6b', b: '#86c21a', c: '#3f5f0a', e: '#2a1d06' },
  robeBlue: { a: '#b8d8ff', b: '#5b7fe0', c: '#242f6e', e: '#ffe066' },
  robeRed:  { a: '#ffb8b8', b: '#d45b5b', c: '#6e2020', e: '#ffe066' },
  robeGreen:{ a: '#b8ffd0', b: '#5bd484', c: '#206e3c', e: '#ffe066' },
  dark:     { a: '#8b82a8', b: '#514a68', c: '#221e30', e: '#ff5d6c' },
  white:    { a: '#ffffff', b: '#e0dff0', c: '#9b9ab0', e: '#54e0ff' },
  pink:     { a: '#ffd3f0', b: '#ff8fd8', c: '#a3307f', e: '#fff36b' },
  orange:   { a: '#ffd9a8', b: '#ff9a3c', c: '#a3500f', e: '#fff' },
  cyan:     { a: '#c8fbff', b: '#4be0f0', c: '#16748a', e: '#fff' },
  emerald:  { a: '#a8ffd8', b: '#3fd894', c: '#136b4a', e: '#ffe066' },
  shadow:   { a: '#a89fc4', b: '#5b5378', c: '#241f36', e: '#c86bff' },
  desert:   { a: '#ffe9b8', b: '#d9b877', c: '#8a6a34', e: '#54e0ff' },
};

/* 主题：地板/墙壁/环境光/装饰色 */
const THEMES = [
  {
    id: 'dungeon', name: '腐朽地牢',
    floor: ['#262233', '#2c2740', '#221e2e'], floorLight: '#3a3354',
    wall: ['#413a5c', '#2f2a45', '#544b74'], wallGlow: '#7b5cff',
    fog: '#0b0a12', ambient: 'rgba(80,60,160,0.07)', light: '#a78bff',
    deco: ['crack', 'moss', 'bones'], accent: '#8f74ff',
  },
  {
    id: 'cave', name: '幽暗洞窟',
    floor: ['#2a231b', '#332a20', '#241e17'], floorLight: '#4a3c2a',
    wall: ['#4a3a28', '#372b1d', '#5e4a32'], wallGlow: '#9dff7a',
    fog: '#0a0806', ambient: 'rgba(120,90,30,0.06)', light: '#c8a86a',
    deco: ['mushroom', 'water', 'bones'], accent: '#9dff7a',
  },
  {
    id: 'ruins', name: '黄沙遗迹',
    floor: ['#3a3125', '#443a2b', '#332b20'], floorLight: '#6a5a3c',
    wall: ['#6b5a3c', '#4e4129', '#846c48'], wallGlow: '#ffcf4d',
    fog: '#0e0b06', ambient: 'rgba(180,140,60,0.08)', light: '#ffd27a',
    deco: ['sand', 'crack', 'bones'], accent: '#ffc93c',
  },
  {
    id: 'ice', name: '永冻冰原',
    floor: ['#1e2b38', '#263645', '#1a2530'], floorLight: '#3d5f7a',
    wall: ['#39607a', '#2a4a60', '#4a7f9e'], wallGlow: '#8fdcff',
    fog: '#060c12', ambient: 'rgba(80,180,255,0.08)', light: '#a8e8ff',
    deco: ['ice', 'crack', 'snow'], accent: '#8fdcff',
  },
  {
    id: 'volcano', name: '熔火深渊',
    floor: ['#2a1414', '#331a18', '#211010'], floorLight: '#5e2a20',
    wall: ['#4e221c', '#381713', '#6e3024'], wallGlow: '#ff6b2c',
    fog: '#0c0505', ambient: 'rgba(255,90,30,0.09)', light: '#ff9a4d',
    deco: ['lava', 'crack', 'ash'], accent: '#ff6b2c',
  },
  {
    id: 'alien', name: '异星母巢',
    floor: ['#1a2430', '#213040', '#15202a'], floorLight: '#345064',
    wall: ['#2a4a52', '#1d363c', '#3c6a72'], wallGlow: '#ff5ce0',
    fog: '#050a0c', ambient: 'rgba(60,255,220,0.06)', light: '#54e0c8',
    deco: ['bio', 'water', 'crystal'], accent: '#54e0c8',
  },
];

/* ------------------------- 画布与缓存 ------------------------- */
const _spriteCache = new Map();
const _whiteCache = new Map();
function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
}
function sprite(key, w, h, fn) {
  let s = _spriteCache.get(key);
  if (s) return s;
  const { c, g } = mkCanvas(w, h);
  g.save();
  try { fn(g, w, h); } catch (e) { /* ignore */ }
  g.restore();
  _spriteCache.set(key, c);
  return c;
}
function whiteSprite(key, src) {
  if (_whiteCache.has(key)) return _whiteCache.get(key);
  const { c, g } = mkCanvas(src.width, src.height);
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  _whiteCache.set(key, c);
  return c;
}
const _tintCache = new Map();
function tintedSprite(key, src, color) {
  const k = key + '|' + color;
  if (_tintCache.has(k)) return _tintCache.get(k);
  const { c, g } = mkCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  _tintCache.set(k, c);
  return c;
}
function drawSpriteKey(g, key, x, y, w, h, alpha = 1) {
  const s = _spriteCache.get(key);
  if (!s) return;
  g.globalAlpha = alpha;
  g.drawImage(s, x, y, w, h);
  g.globalAlpha = 1;
}

/* ------------------------- 绘制原语 ------------------------- */
const OUT = '#0a0812';
function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function circ(g, x, y, r, c, outline = true) {
  g.beginPath(); g.arc(x, y, r, 0, TAU);
  g.fillStyle = c; g.fill();
  if (outline) { g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke(); }
}
function poly(g, pts, c, outline = true) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillStyle = c; g.fill();
  if (outline) { g.strokeStyle = OUT; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke(); }
}
function rrect(g, x, y, w, h, r, c, outline = true) {
  roundRect(g, x, y, w, h, r);
  g.fillStyle = c; g.fill();
  if (outline) { g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke(); }
}
function eyes(g, x, y, gap, r, color, cross = false) {
  g.fillStyle = color;
  if (cross) {
    g.fillRect(x - gap / 2 - r, y - 1, r * 2, 2); g.fillRect(x - gap / 2 - 1, y - r, 2, r * 2);
    g.fillRect(x + gap / 2 - r, y - 1, r * 2, 2); g.fillRect(x + gap / 2 - 1, y - r, 2, r * 2);
  } else {
    g.beginPath(); g.arc(x - gap / 2, y, r, 0, TAU); g.arc(x + gap / 2, y, r, 0, TAU); g.fill();
  }
}
function glowEye(g, x, y, gap, r, color) {
  g.save();
  g.shadowBlur = 6; g.shadowColor = color;
  eyes(g, x, y, gap, r, color);
  g.restore();
}

/* =====================================================================
   敌人美术（32x32 逻辑像素）
   ===================================================================== */
const ART = {};

ART.skeleton = (g, P, o = {}) => {
  const cx = 16;
  // 腿 / 骨
  px(g, 11, 23, 3, 7, P.c); px(g, 18, 23, 3, 7, P.c);
  px(g, 10, 29, 5, 2, P.b); px(g, 17, 29, 5, 2, P.b);
  // 躯干肋骨
  rrect(g, 10, 14, 12, 10, 3, P.b);
  for (let i = 0; i < 3; i++) px(g, 12, 16 + i * 3, 8 - (i % 2) * 2, 1.5, P.c);
  // 手臂
  px(g, 7, 16, 3, 8, P.b); px(g, 22, 16, 3, 8, P.b);
  // 头骨
  circ(g, cx, 10, 6.4, P.a);
  px(g, cx - 4, 12, 8, 3, P.b);
  // 眼窝
  g.fillStyle = P.c;
  g.fillRect(cx - 4.5, 8, 3.4, 3.4); g.fillRect(cx + 1.2, 8, 3.4, 3.4);
  glowEye(g, cx, 9.6, 6, 1.15, P.e);
  px(g, cx - 1, 13, 2, 1.4, P.c);
  // 颚
  px(g, cx - 3, 14, 6, 1, P.c);
  // 武器
  const wp = o.weapon;
  if (wp === 'bow') {
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 2;
    g.beginPath(); g.arc(25, 16, 6, -1.1, 1.1); g.stroke();
    g.strokeStyle = P.a; g.lineWidth = 1;
    g.beginPath(); g.moveTo(25 + Math.cos(-1.1) * 6, 16 + Math.sin(-1.1) * 6); g.lineTo(25 + Math.cos(1.1) * 6, 16 + Math.sin(1.1) * 6); g.stroke();
  } else if (wp === 'staff') {
    px(g, 25, 10, 2, 17, '#7a5a3a');
    circ(g, 26, 8, 3.2, P.e);
    g.save(); g.globalAlpha = .5; circ(g, 26, 8, 5, P.e, false); g.restore();
  } else if (wp === 'sword') {
    px(g, 24, 12, 2.4, 11, P.a);
    px(g, 22, 22, 6, 2, P.c);
  } else if (wp === 'axe') {
    px(g, 25, 12, 2, 13, '#6b4a2a');
    poly(g, [26, 10, 31, 13, 31, 18, 26, 20], P.b);
  }
  if (o.helm) {
    rrect(g, cx - 7, 4, 14, 7, 3, P.b);
    px(g, cx - 7, 9, 14, 2, P.c);
    px(g, cx - 1, 2, 2, 4, P.e);
  }
  if (o.hood) {
    poly(g, [4, 14, 8, 2, 24, 2, 28, 14, 24, 22, 8, 22], P.c);
    // 露出脸
    circ(g, cx, 11, 5, P.a);
    glowEye(g, cx, 11, 5, 1.1, P.e);
  }
  if (o.shield) {
    g.save(); g.translate(4, 17);
    poly(g, [0, -6, 5, -4, 5, 5, 0, 9, -5, 5, -5, -4], P.b);
    px(g, -1.5, -3, 3, 7, P.c);
    g.restore();
  }
  if (o.crown) {
    poly(g, [cx - 7, 4, cx - 5, -1, cx - 2, 3, cx, -2, cx + 2, 3, cx + 5, -1, cx + 7, 4], P.e);
  }
};

ART.knight = (g, P, o = {}) => {
  const cx = 16;
  px(g, 11, 23, 4, 7, P.c); px(g, 17, 23, 4, 7, P.c);
  px(g, 10, 29, 5, 2, P.c); px(g, 17, 29, 5, 2, P.c);
  rrect(g, 9, 13, 14, 12, 3, P.b);
  px(g, 13, 15, 6, 8, P.a);
  px(g, 14, 17, 4, 1, P.c); px(g, 14, 20, 4, 1, P.c);
  // 肩甲
  circ(g, 9, 15, 4, P.a); circ(g, 23, 15, 4, P.a);
  // 头盔
  rrect(g, 9, 3, 14, 12, 4, P.a);
  px(g, 12, 8, 9, 3, P.c);
  glowEye(g, cx, 9.6, 5, 1.15, P.e);
  px(g, 15, 2, 2, 3, P.e);
  if (o.horns) {
    poly(g, [9, 5, 4, -1, 8, 1, 10, 4], P.a);
    poly(g, [23, 5, 28, -1, 24, 1, 22, 4], P.a);
  }
  // 武器
  if (o.weapon === 'shield') {
    poly(g, [2, 12, 8, 9, 8, 22, 2, 26, -4, 22, -4, 9].map(v => v), P.b);
  } else if (o.weapon === 'spear') {
    px(g, 24, 4, 2, 24, '#8a6a3a');
    poly(g, [25, 1, 29, 6, 25, 10, 21, 6], P.a);
  } else if (o.weapon === 'hammer') {
    px(g, 25, 8, 2, 20, '#6b4a2a');
    rrect(g, 21, 4, 10, 7, 2, P.b);
  }
  if (o.cape) {
    poly(g, [8, 15, 24, 15, 27, 30, 16, 26, 5, 30], P.c);
  }
};

ART.mage = (g, P, o = {}) => {
  const cx = 16;
  // 长袍
  poly(g, [16, 8, 25, 30, 7, 30], P.b);
  poly(g, [16, 12, 21, 30, 11, 30], P.a);
  // 肩/手臂
  px(g, 7, 16, 4, 7, P.b); px(g, 21, 16, 4, 7, P.b);
  // 兜帽
  circ(g, cx, 9, 7, P.b);
  poly(g, [7, 12, 25, 12, 23, 20, 9, 20], P.c);
  circ(g, cx, 11, 4.6, P.a);
  glowEye(g, cx, 11, 4, 1.1, P.e);
  // 法杖
  px(g, 25, 8, 2, 22, '#7a5a3a');
  const orb = o.orb || P.e;
  g.save(); g.globalAlpha = .35; circ(g, 26, 6, 6.5, orb, false); g.restore();
  circ(g, 26, 6, 3.4, orb);
  // 帽尖
  poly(g, [10, 6, 16, -3, 22, 6], P.b);
  if (o.horns) {
    poly(g, [8, 8, 3, 2, 7, 5], P.c); poly(g, [24, 8, 29, 2, 25, 5], P.c);
  }
};

ART.goblin = (g, P, o = {}) => {
  const cx = 16;
  px(g, 12, 24, 3, 6, P.c); px(g, 17, 24, 3, 6, P.c);
  rrect(g, 10, 15, 12, 10, 3, P.b);
  circ(g, cx, 11, 7, P.a);
  // 大耳朵
  poly(g, [9, 10, 1, 6, 2, 13, 9, 14], P.a);
  poly(g, [23, 10, 31, 6, 30, 13, 23, 14], P.a);
  glowEye(g, cx, 10.5, 5.5, 1.3, P.e);
  // 牙
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(13, 15); g.lineTo(14.5, 18); g.lineTo(16, 15); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(17, 15); g.lineTo(18.5, 18); g.lineTo(20, 15); g.closePath(); g.fill();
  // 武器
  if (o.weapon === 'club') {
    px(g, 23, 14, 3, 14, '#7a5a3a');
    rrect(g, 21, 6, 8, 8, 3, P.c);
  } else if (o.weapon === 'pickaxe') {
    px(g, 25, 10, 2, 18, '#7a5a3a');
    poly(g, [19, 8, 31, 8, 29, 12, 21, 12], P.b);
  } else {
    px(g, 24, 16, 2, 9, P.a);
  }
};

ART.mummy = (g, P) => {
  const cx = 16;
  px(g, 11, 24, 4, 6, P.c); px(g, 17, 24, 4, 6, P.c);
  rrect(g, 9, 12, 14, 13, 3, P.a);
  circ(g, cx, 8, 7, P.a);
  // 绷带纹
  g.strokeStyle = P.c; g.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(8, 14 + i * 2.6); g.lineTo(24, 13 + i * 2.6); g.stroke(); }
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx, 8, 6, -2 + i, -.6 + i); g.stroke(); }
  glowEye(g, cx, 8, 5, 1.15, P.e);
  // 手臂前伸
  px(g, 5, 16, 9, 3, P.a);
  px(g, 20, 16, 8, 3, P.a);
};

ART.ghost = (g, P) => {
  const cx = 16;
  g.save();
  g.globalAlpha = 0.92;
  poly(g, [16, 2, 25, 12, 26, 24, 22, 28, 18, 24, 14, 28, 10, 24, 6, 28, 6, 12], P.b);
  circ(g, cx, 11, 8, P.b);
  g.globalAlpha = 0.5;
  circ(g, cx - 2, 9, 4, P.a);
  g.restore();
  glowEye(g, cx, 11, 6, 1.8, P.e);
  // 嘴
  g.fillStyle = P.c; g.beginPath(); g.ellipse(cx, 17, 3, 2, 0, 0, TAU); g.fill();
};

ART.bat = (g, P) => {
  // 翅膀
  poly(g, [16, 12, 2, 5, 0, 14, 5, 13, 4, 20, 13, 17], P.b);
  poly(g, [16, 12, 30, 5, 32, 14, 27, 13, 28, 20, 19, 17], P.b);
  circ(g, 16, 15, 7, P.a);
  // 耳
  poly(g, [11, 10, 10, 2, 14, 8], P.a);
  poly(g, [21, 10, 22, 2, 18, 8], P.a);
  glowEye(g, 16, 14, 5, 1.1, P.e);
  px(g, 14, 18, 4, 1, '#fff');
  px(g, 15, 19, 1, 2, '#fff'); px(g, 17, 19, 1, 2, '#fff');
};

ART.slime = (g, P, o = {}) => {
  const cx = 16, base = 27;
  g.beginPath();
  g.moveTo(4, base);
  g.bezierCurveTo(3, 18, 8, 8, 16, 8);
  g.bezierCurveTo(24, 8, 29, 18, 28, base);
  g.closePath();
  g.fillStyle = P.b; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
  // 高光
  g.save(); g.globalAlpha = .55; circ(g, 11, 13, 3.2, P.a, false); g.restore();
  glowEye(g, cx, 19, 7, 1.5, P.e);
  // 嘴
  g.strokeStyle = P.c; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, 21, 3, .2, PI - .2); g.stroke();
  if (o.spikes) {
    poly(g, [8, 11, 6, 2, 12, 8], P.a);
    poly(g, [24, 11, 26, 2, 20, 8], P.a);
    poly(g, [16, 8, 16, 0, 20, 7], P.a);
  }
  if (o.crown) poly(g, [9, 8, 11, 2, 14, 6, 16, 1, 18, 6, 21, 2, 23, 8], P.e);
};

ART.spider = (g, P) => {
  const cx = 16, cy = 17;
  g.strokeStyle = P.c; g.lineWidth = 2.2; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const y = 13 + i * 3;
    g.beginPath(); g.moveTo(cx - 5, y); g.lineTo(cx - 13, y - 6 + i * 2); g.lineTo(cx - 16, y + 5); g.stroke();
    g.beginPath(); g.moveTo(cx + 5, y); g.lineTo(cx + 13, y - 6 + i * 2); g.lineTo(cx + 16, y + 5); g.stroke();
  }
  circ(g, cx, cy, 5, P.c);
  circ(g, cx, cy + 3, 7, P.b);
  // 眼
  glowEye(g, cx, cy - 1, 3, 1, P.e);
  g.fillStyle = P.e;
  g.fillRect(cx - 5, cy - 3, 1.6, 1.6); g.fillRect(cx + 3.4, cy - 3, 1.6, 1.6);
  // 毒牙
  px(g, cx - 2, cy + 8, 1.4, 3, '#fff'); px(g, cx + 1, cy + 8, 1.4, 3, '#fff');
};

ART.worm = (g, P) => {
  const cx = 16;
  for (let i = 4; i >= 0; i--) {
    const x = cx + Math.sin(i * 1.2) * 6, y = 24 - i * 4;
    circ(g, x, y, 5 - i * 0.35, i === 0 ? P.a : P.b);
  }
  circ(g, cx, 6, 5.2, P.a);
  glowEye(g, cx, 5, 4, 1, P.e);
  g.strokeStyle = P.c; g.lineWidth = 1;
  g.beginPath(); g.arc(cx, 9, 3, .3, PI - .3); g.stroke();
};

ART.golem = (g, P) => {
  const cx = 16;
  // 腿
  rrect(g, 8, 23, 6, 8, 2, P.c); rrect(g, 18, 23, 6, 8, 2, P.c);
  // 躯干
  poly(g, [7, 12, 16, 8, 25, 12, 27, 23, 16, 27, 5, 23], P.b);
  // 岩块
  px(g, 10, 14, 5, 4, P.a); px(g, 17, 17, 6, 5, P.c); px(g, 12, 21, 3, 3, P.a);
  // 头
  rrect(g, 9, 2, 14, 10, 3, P.a);
  glowEye(g, cx, 7, 6, 1.3, P.e);
  // 核心
  g.save(); g.shadowBlur = 8; g.shadowColor = P.e;
  circ(g, cx, 17, 3.4, P.e); g.restore();
  // 拳头
  circ(g, 4, 19, 4, P.b); circ(g, 28, 19, 4, P.b);
  // 苔藓
  px(g, 8, 12, 3, 2, P.c);
};

ART.turtle = (g, P) => {
  const cx = 16;
  // 壳
  g.beginPath(); g.ellipse(cx, 17, 14, 11, 0, 0, TAU);
  g.fillStyle = P.c; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
  g.beginPath(); g.ellipse(cx, 16, 11, 8, 0, 0, TAU);
  g.fillStyle = P.b; g.fill();
  g.strokeStyle = P.a; g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    g.beginPath(); g.moveTo(cx, 16); g.lineTo(cx + Math.cos(a) * 10, 16 + Math.sin(a) * 8); g.stroke();
  }
  // 头
  circ(g, cx, 29, 5, P.a);
  glowEye(g, cx, 28, 4, 1, P.e);
  // 腿
  px(g, 2, 24, 5, 3, P.a); px(g, 25, 24, 5, 3, P.a);
};

ART.mushroom = (g, P, o = {}) => {
  const cx = 16;
  // 菌柄
  rrect(g, 11, 16, 10, 12, 3, P.a);
  // 菌盖
  g.beginPath(); g.ellipse(cx, 15, 15, 9, 0, PI, TAU); g.closePath();
  g.fillStyle = P.b; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
  // 斑点
  circ(g, 9, 10, 2.2, P.a, false); circ(g, 21, 9, 2.6, P.a, false); circ(g, 16, 6.5, 1.8, P.a, false);
  glowEye(g, cx, 21, 5, 1.3, P.e);
  // 孢子
  g.save(); g.globalAlpha = .6; g.fillStyle = P.e;
  g.beginPath(); g.arc(28, 3, 1.6, 0, TAU); g.arc(3, 16, 1.2, 0, TAU); g.fill(); g.restore();
  if (o.spikes) {
    poly(g, [4, 14, 0, 6, 8, 10], P.a); poly(g, [28, 14, 32, 6, 24, 10], P.a);
  }
};

ART.scorpion = (g, P) => {
  const cx = 16, cy = 20;
  // 尾
  g.strokeStyle = P.b; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx + 6, cy); g.quadraticCurveTo(28, 18, 27, 8); g.quadraticCurveTo(26, 2, 20, 3); g.stroke();
  // 尾刺
  poly(g, [20, 3, 25, 0, 23, 7], P.c);
  // 身
  g.beginPath(); g.ellipse(cx, cy, 9, 6, 0, 0, TAU); g.fillStyle = P.b; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
  px(g, cx - 6, cy - 2, 3, 2, P.a); px(g, cx + 2, cy + 1, 4, 2, P.a);
  // 螯
  g.strokeStyle = P.b; g.lineWidth = 3;
  g.beginPath(); g.moveTo(cx - 7, cy + 2); g.lineTo(cx - 13, cy + 7); g.stroke();
  g.beginPath(); g.moveTo(cx + 7, cy + 2); g.lineTo(cx + 13, cy + 7); g.stroke();
  circ(g, cx - 13, cy + 7, 3, P.c); circ(g, cx + 13, cy + 7, 3, P.c);
  glowEye(g, cx, cy - 2, 4, 1.1, P.e);
};

ART.beetle = (g, P) => {
  const cx = 16;
  // 腿
  g.strokeStyle = P.c; g.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(8, 14 + i * 5); g.lineTo(1, 12 + i * 6); g.stroke();
    g.beginPath(); g.moveTo(24, 14 + i * 5); g.lineTo(31, 12 + i * 6); g.stroke();
  }
  // 甲壳
  g.beginPath(); g.ellipse(cx, 18, 11, 12, 0, 0, TAU);
  g.fillStyle = P.b; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
  g.strokeStyle = P.c; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx, 7); g.lineTo(cx, 29); g.stroke();
  px(g, 9, 11, 4, 3, P.a); px(g, 18, 20, 4, 3, P.a);
  // 头
  circ(g, cx, 7, 5, P.c);
  glowEye(g, cx, 6, 4, 1, P.e);
  // 角
  poly(g, [13, 4, 10, -1, 15, 3], P.a);
};

ART.eye = (g, P) => {
  const cx = 16, cy = 15;
  g.save(); g.shadowBlur = 10; g.shadowColor = P.e;
  circ(g, cx, cy, 11, P.a); g.restore();
  // 血丝
  g.strokeStyle = P.b; g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
    g.quadraticCurveTo(cx + Math.cos(a + .3) * 6, cy + Math.sin(a + .3) * 6, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10); g.stroke();
  }
  circ(g, cx, cy, 6, P.b);
  circ(g, cx, cy, 4.4, P.c);
  circ(g, cx - 1.4, cy - 1.4, 2, P.e, false);
  circ(g, cx + 1.2, cy + 1.6, 1.2, '#fff', false);
  // 触手
  g.strokeStyle = P.b; g.lineWidth = 2.4; g.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const a = PI * 0.35 + i * 0.55;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
    g.quadraticCurveTo(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15 + 2, cx + Math.cos(a) * 16, cy + Math.sin(a) * 17);
    g.stroke();
  }
};

ART.drone = (g, P) => {
  // 机体
  poly(g, [16, 4, 25, 12, 23, 24, 16, 27, 9, 24, 7, 12], P.b);
  px(g, 12, 13, 8, 5, P.a);
  glowEye(g, 16, 16, 5, 2, P.e);
  // 螺旋桨
  g.strokeStyle = P.a; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(2, 6); g.lineTo(12, 8); g.moveTo(30, 6); g.lineTo(20, 8); g.stroke();
  circ(g, 2, 6, 3, P.c); circ(g, 30, 6, 3, P.c);
  // 炮口
  px(g, 14, 26, 4, 5, P.c);
  px(g, 13, 30, 6, 2, P.e);
};

ART.turret = (g, P) => {
  // 底座
  rrect(g, 6, 24, 20, 6, 2, P.c);
  // 炮塔
  circ(g, 16, 18, 8, P.b);
  px(g, 15, 3, 4, 12, P.a);
  px(g, 12, 8, 10, 3, P.c);
  glowEye(g, 16, 18, 6, 1.6, P.e);
  px(g, 8, 20, 4, 2, P.a); px(g, 20, 20, 4, 2, P.a);
};

ART.mech = (g, P) => {
  const cx = 16;
  rrect(g, 8, 22, 7, 9, 2, P.c); rrect(g, 17, 22, 7, 9, 2, P.c);
  rrect(g, 7, 10, 18, 14, 3, P.b);
  px(g, 10, 13, 5, 5, P.a); px(g, 18, 14, 4, 3, P.c);
  // 头
  rrect(g, 10, 2, 12, 9, 3, P.a);
  px(g, 12, 5, 8, 3, P.c);
  glowEye(g, cx, 6.5, 5, 1.2, P.e);
  // 肩炮
  rrect(g, 1, 11, 7, 6, 2, P.b); rrect(g, 24, 11, 7, 6, 2, P.b);
  px(g, 0, 13, 4, 2, P.e); px(g, 28, 13, 4, 2, P.e);
  // 核心
  g.save(); g.shadowBlur = 8; g.shadowColor = P.e; circ(g, cx, 19, 2.6, P.e); g.restore();
};

ART.wolf = (g, P) => {
  const cx = 16;
  // 身体
  g.beginPath(); g.ellipse(cx, 19, 12, 7, 0, 0, TAU); g.fillStyle = P.b; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
  // 腿
  g.strokeStyle = P.c; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(8, 24); g.lineTo(6, 30); g.moveTo(13, 25); g.lineTo(12, 31);
  g.moveTo(20, 25); g.lineTo(21, 31); g.moveTo(25, 24); g.lineTo(27, 30); g.stroke();
  // 头
  circ(g, 6, 13, 6, P.a);
  poly(g, [2, 10, 0, 2, 6, 8], P.a); poly(g, [9, 9, 11, 2, 12, 9], P.a);
  // 眼睛 + 嘴
  glowEye(g, 5, 12, 3.4, 1, P.e);
  px(g, 1, 15, 6, 1.4, P.c);
  // 尾巴
  g.strokeStyle = P.b; g.lineWidth = 3;
  g.beginPath(); g.moveTo(28, 17); g.quadraticCurveTo(33, 14, 31, 8); g.stroke();
};

ART.yeti = (g, P) => {
  const cx = 16;
  // 毛腿
  rrect(g, 8, 23, 7, 8, 3, P.b); rrect(g, 17, 23, 7, 8, 3, P.b);
  // 毛身
  circ(g, cx, 17, 12, P.b);
  g.strokeStyle = P.c; g.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 8, 17 + Math.sin(a) * 8); g.lineTo(cx + Math.cos(a) * 12, 17 + Math.sin(a) * 12); g.stroke();
  }
  // 头
  circ(g, cx, 11, 8, P.a);
  glowEye(g, cx, 10, 6, 1.4, P.e);
  // 角
  poly(g, [9, 6, 5, -1, 11, 4], P.c); poly(g, [23, 6, 27, -1, 21, 4], P.c);
  // 牙
  px(g, 13, 15, 2, 3, '#fff'); px(g, 17, 15, 2, 3, '#fff');
  // 拳
  circ(g, 3, 21, 4, P.a); circ(g, 29, 21, 4, P.a);
};

ART.imp = (g, P) => {
  const cx = 16;
  // 翅膀
  poly(g, [12, 12, 1, 4, 3, 16, 9, 17], P.c);
  poly(g, [20, 12, 31, 4, 29, 16, 23, 17], P.c);
  // 身体
  rrect(g, 11, 14, 10, 10, 3, P.b);
  px(g, 13, 17, 6, 4, P.a);
  // 腿
  px(g, 11, 23, 4, 6, P.c); px(g, 17, 23, 4, 6, P.c);
  // 头
  circ(g, cx, 10, 7, P.b);
  // 角
  poly(g, [10, 6, 7, -1, 13, 4], P.a); poly(g, [22, 6, 25, -1, 19, 4], P.a);
  glowEye(g, cx, 9, 6, 1.4, P.e);
  // 尖牙
  px(g, 13, 14, 1.6, 2.4, '#fff'); px(g, 17, 14, 1.6, 2.4, '#fff');
  // 尾巴
  g.strokeStyle = P.a; g.lineWidth = 2;
  g.beginPath(); g.moveTo(20, 22); g.quadraticCurveTo(28, 25, 26, 30); g.stroke();
  poly(g, [26, 30, 21, 30, 25, 27], P.c);
};

ART.elemental = (g, P, o = {}) => {
  const cx = 16, cy = 17;
  // 外焰
  g.save(); g.globalAlpha = .85;
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + .3;
    poly(g, [cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, cx + Math.cos(a + .3) * 13, cy + Math.sin(a + .3) * 13 - 4, cx + Math.cos(a + .5) * 6, cy + Math.sin(a + .5) * 6], P.c);
  }
  g.restore();
  circ(g, cx, cy, 8, P.b);
  circ(g, cx, cy - 2, 5.5, P.a);
  glowEye(g, cx, cy - 2, 5, 1.4, P.e);
  // 漂浮碎屑
  g.fillStyle = P.a;
  g.fillRect(4, 6, 2, 2); g.fillRect(26, 9, 2, 2); g.fillRect(24, 27, 2, 2);
};

ART.crystal = (g, P) => {
  const cx = 16;
  poly(g, [16, 1, 24, 12, 20, 30, 12, 30, 8, 12], P.b);
  poly(g, [16, 4, 20, 13, 17, 27, 13, 14], P.a);
  poly(g, [8, 12, 3, 22, 10, 28], P.b);
  poly(g, [24, 12, 29, 22, 22, 28], P.b);
  glowEye(g, cx, 16, 6, 1.4, P.e);
  g.save(); g.globalAlpha = .3; g.fillStyle = P.a;
  g.beginPath(); g.moveTo(16, 1); g.lineTo(24, 12); g.lineTo(16, 20); g.closePath(); g.fill(); g.restore();
};

ART.snake = (g, P) => {
  const cx = 16;
  g.strokeStyle = P.b; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(4, 28);
  g.quadraticCurveTo(10, 20, 18, 25);
  g.quadraticCurveTo(26, 30, 26, 20);
  g.quadraticCurveTo(26, 12, 18, 12);
  g.stroke();
  g.strokeStyle = P.c; g.lineWidth = 2;
  g.beginPath();
  g.moveTo(4, 28); g.quadraticCurveTo(10, 20, 18, 25); g.quadraticCurveTo(26, 30, 26, 20); g.quadraticCurveTo(26, 12, 18, 12);
  g.stroke();
  // 头
  circ(g, 18, 10, 6, P.a);
  glowEye(g, 18, 9, 4, 1.1, P.e);
  // 吐信
  g.strokeStyle = '#ff5d6c'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(21, 13); g.lineTo(25, 15); g.moveTo(25, 15); g.lineTo(28, 14); g.stroke();
};

ART.plant = (g, P) => {
  const cx = 16;
  // 藤蔓
  g.strokeStyle = P.c; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, 31); g.quadraticCurveTo(10, 24, 14, 18); g.stroke();
  g.beginPath(); g.moveTo(cx, 31); g.quadraticCurveTo(24, 26, 20, 20); g.stroke();
  // 花头
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    circ(g, cx + Math.cos(a) * 7, 11 + Math.sin(a) * 7, 4.4, P.b);
  }
  circ(g, cx, 11, 5.4, P.a);
  glowEye(g, cx, 11, 5, 1.2, P.e);
  // 牙齿
  g.fillStyle = '#fff';
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * 2, 13.5); g.lineTo(cx + i * 2 + 1, 16.5); g.lineTo(cx + i * 2 + 2, 13.5); g.fill(); }
};

ART.voidling = (g, P) => {
  const cx = 16, cy = 16;
  g.save(); g.shadowBlur = 12; g.shadowColor = P.e;
  circ(g, cx, cy, 7, P.c); g.restore();
  // 触须
  g.strokeStyle = P.b; g.lineWidth = 2.4; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
    g.quadraticCurveTo(cx + Math.cos(a + .4) * 11, cy + Math.sin(a + .4) * 11, cx + Math.cos(a + .1) * 15, cy + Math.sin(a + .1) * 15);
    g.stroke();
  }
  glowEye(g, cx, cy, 4, 1.8, P.e);
};

ART.sentry = (g, P) => {
  const cx = 16;
  // 底座
  rrect(g, 8, 26, 16, 5, 2, P.c);
  // 悬浮身体
  poly(g, [16, 3, 24, 10, 22, 22, 16, 26, 10, 22, 8, 10], P.b);
  px(g, 12, 12, 8, 6, P.c);
  glowEye(g, cx, 15, 5, 1.7, P.e);
  // 光环
  g.strokeStyle = P.e; g.lineWidth = 1.2; g.globalAlpha = .7;
  g.beginPath(); g.ellipse(cx, 22, 12, 3.5, 0, 0, TAU); g.stroke();
  g.globalAlpha = 1;
};

ART.wisp = (g, P) => {
  circ(g, 16, 16, 5, P.a);
  g.save(); g.globalAlpha = .45; circ(g, 16, 16, 9, P.b, false); g.restore();
  g.fillStyle = P.e;
  g.fillRect(12, 4, 2, 2); g.fillRect(22, 8, 2, 2); g.fillRect(8, 24, 2, 2); g.fillRect(24, 22, 2, 2);
  glowEye(g, 16, 16, 3, 1, P.e);
};

ART.penguin = (g, P) => {
  const cx = 16;
  rrect(g, 9, 10, 14, 18, 7, P.c);
  circ(g, cx, 9, 8, P.c);
  // 白肚
  g.beginPath(); g.ellipse(cx, 20, 6, 8, 0, 0, TAU); g.fillStyle = P.a; g.fill();
  glowEye(g, cx, 8, 5, 1.2, P.e);
  // 喙
  poly(g, [16, 10, 22, 12, 16, 14], P.b);
  // 翅
  poly(g, [8, 14, 3, 22, 8, 24], P.b); poly(g, [24, 14, 29, 22, 24, 24], P.b);
  // 脚
  px(g, 10, 28, 5, 3, P.b); px(g, 17, 28, 5, 3, P.b);
};

ART.tentacle = (g, P) => {
  g.strokeStyle = P.b; g.lineWidth = 5; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    g.beginPath(); g.moveTo(6 + i * 6, 31);
    g.quadraticCurveTo(6 + i * 6 + Math.sin(i) * 8, 18, 10 + i * 5, 8 + (i % 2) * 4);
    g.stroke();
  }
  for (let i = 0; i < 4; i++) {
    circ(g, 10 + i * 5, 7 + (i % 2) * 4, 3.4, P.a);
    px(g, 9 + i * 5, 6 + (i % 2) * 4, 2, 2, P.e);
  }
};

ART.ghoul = (g, P) => {
  const cx = 16;
  px(g, 10, 24, 4, 7, P.c); px(g, 18, 24, 4, 7, P.c);
  rrect(g, 9, 13, 14, 12, 4, P.b);
  // 破烂皮肤
  px(g, 12, 16, 8, 5, P.a);
  circ(g, cx, 9, 7, P.a);
  // 裂口
  px(g, cx - 4, 11, 8, 1.4, P.c);
  glowEye(g, cx, 8, 5, 1.2, P.e);
  g.strokeStyle = P.c; g.lineWidth = 1;
  g.beginPath(); g.moveTo(5, 18); g.lineTo(10, 20); g.moveTo(27, 17); g.lineTo(22, 19); g.stroke();
  px(g, 6, 20, 4, 2, P.b); px(g, 22, 20, 4, 2, P.b);
};

ART.aberrant = (g, P) => {
  // 异形虫
  const cx = 16;
  g.strokeStyle = P.b; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(4, 30); g.quadraticCurveTo(8, 14, 18, 20); g.quadraticCurveTo(28, 26, 26, 10); g.stroke();
  circ(g, 26, 9, 6, P.a);
  glowEye(g, 26, 8, 3.6, 1.1, P.e);
  g.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(21 + i * 2.6, 13); g.lineTo(22.3 + i * 2.6, 16.5); g.lineTo(23.6 + i * 2.6, 13); g.fill(); }
  px(g, 12, 20, 3, 2, P.c); px(g, 17, 24, 3, 2, P.c);
};

ART.psion = (g, P) => {
  const cx = 16, cy = 16;
  circ(g, cx, cy, 6.5, P.b);
  // 大脑袋
  g.beginPath(); g.ellipse(cx, cy - 2, 9, 7, 0, 0, TAU); g.fillStyle = P.a; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
  glowEye(g, cx, cy - 2, 5, 1.4, P.e);
  // 触手 / 手
  g.strokeStyle = P.b; g.lineWidth = 2.4; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = PI * .25 + i * .5;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 8, cy + 2 + Math.sin(a) * 6);
    g.lineTo(cx + Math.cos(a) * 13, cy + 6 + Math.sin(a) * 10); g.stroke();
  }
  // 漂浮球
  g.save(); g.shadowBlur = 8; g.shadowColor = P.e;
  circ(g, 4, 6, 2, P.e); circ(g, 28, 5, 2, P.e); circ(g, 29, 25, 2, P.e); g.restore();
};

/* ------------------------- 敌人贴图装配 ------------------------- */
function enemySprite(def) {
  const key = 'e_' + def.id;
  if (_spriteCache.has(key)) return key;
  const P = PALS[def.pal] || PALS.green;
  const size = def.big ? 48 : 32;
  sprite(key, size, size, (g) => {
    g.save();
    if (def.big) g.scale(1.5, 1.5);
    (ART[def.art] || ART.slime)(g, P, def.opts || {});
    g.restore();
  });
  return key;
}

/* =====================================================================
   Boss 美术（64x64）
   ===================================================================== */
const BOSS_ART = {};

BOSS_ART.boneKing = (g, P) => {
  const cx = 32;
  // 披风
  poly(g, [32, 18, 58, 34, 62, 62, 32, 54, 2, 62, 6, 34], P.c);
  poly(g, [32, 22, 50, 36, 52, 58, 32, 50, 12, 58, 14, 36], P.b);
  // 身体
  rrect(g, 22, 32, 20, 22, 6, P.b);
  for (let i = 0; i < 4; i++) px(g, 26, 36 + i * 4.4, 12 - (i % 2) * 3, 2, P.c);
  // 手臂
  px(g, 14, 34, 6, 16, P.b); px(g, 44, 34, 6, 16, P.b);
  circ(g, 16, 52, 5, P.a); circ(g, 47, 52, 5, P.a);
  // 头骨
  circ(g, cx, 24, 13, P.a);
  px(g, cx - 8, 28, 16, 7, P.b);
  g.fillStyle = P.c;
  g.fillRect(cx - 9, 20, 7, 7); g.fillRect(cx + 2, 20, 7, 7);
  glowEye(g, cx, 23, 11.5, 2.6, P.e);
  px(g, cx - 2, 30, 4, 3, P.c);
  // 牙齿
  for (let i = -3; i <= 3; i++) px(g, cx + i * 2.4 - .6, 33, 1.2, 3, '#fff');
  // 王冠
  poly(g, [cx - 14, 14, cx - 11, 1, cx - 5, 9, cx, -2, cx + 5, 9, cx + 11, 1, cx + 14, 14], P.e);
  circ(g, cx, 9, 2.2, '#ff5d6c', false);
  // 巨剑
  px(g, 56, 12, 3, 32, P.a);
  px(g, 52, 42, 11, 3, P.c);
  poly(g, [57.5, 4, 62, 11, 57.5, 14, 53, 11], P.a);
};

BOSS_ART.golem = (g, P) => {
  const cx = 32;
  rrect(g, 14, 40, 13, 22, 4, P.c); rrect(g, 37, 40, 13, 22, 4, P.c);
  poly(g, [10, 22, 32, 14, 54, 22, 58, 44, 32, 52, 6, 44], P.b);
  px(g, 16, 26, 12, 8, P.a); px(g, 36, 34, 14, 9, P.c); px(g, 20, 42, 8, 6, P.a);
  // 头
  rrect(g, 18, 2, 28, 18, 5, P.a);
  px(g, 24, 8, 16, 5, P.c);
  glowEye(g, cx, 11, 12, 2.6, P.e);
  // 核心
  g.save(); g.shadowBlur = 14; g.shadowColor = P.e;
  circ(g, cx, 32, 6, P.e); g.restore();
  // 拳头
  circ(g, 5, 38, 7, P.b); circ(g, 59, 38, 7, P.b);
  // 苔藓
  px(g, 12, 21, 8, 3, '#6f9a5a'); px(g, 44, 43, 6, 2, '#6f9a5a');
};

BOSS_ART.frost = (g, P) => {
  const cx = 32;
  // 冰晶裙
  poly(g, [32, 20, 56, 56, 32, 46, 8, 56], P.c);
  poly(g, [32, 24, 48, 52, 32, 42, 16, 52], P.b);
  // 身体
  circ(g, cx, 26, 13, P.b);
  circ(g, cx, 22, 10, P.a);
  // 头
  circ(g, cx, 14, 9, P.a);
  glowEye(g, cx, 14, 8, 2, P.e);
  // 冰冠
  poly(g, [cx - 16, 10, cx - 9, -6, cx - 3, 8, cx, -10, cx + 3, 8, cx + 9, -6, cx + 16, 10], P.a);
  // 冰臂
  poly(g, [6, 30, 2, 56, 14, 48, 16, 30], P.b);
  poly(g, [58, 30, 62, 56, 50, 48, 48, 30], P.b);
  // 浮游碎冰
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU;
    poly(g, [32 + Math.cos(a) * 24, 28 + Math.sin(a) * 20, 32 + Math.cos(a) * 28, 26 + Math.sin(a) * 24, 32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26], P.a);
  }
};

BOSS_ART.magma = (g, P) => {
  const cx = 32;
  // 熔岩池
  g.beginPath(); g.ellipse(cx, 56, 26, 8, 0, 0, TAU); g.fillStyle = P.b; g.fill();
  // 身体
  poly(g, [14, 22, 32, 12, 50, 22, 54, 44, 32, 56, 10, 44], P.b);
  g.strokeStyle = P.a; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    g.beginPath(); g.moveTo(20 + i * 6, 24); g.quadraticCurveTo(24 + i * 5, 36, 18 + i * 7, 46); g.stroke();
  }
  // 头
  poly(g, [32, 0, 46, 12, 42, 26, 22, 26, 18, 12], P.a);
  // 角
  poly(g, [18, 10, 8, -4, 21, 2], P.c); poly(g, [46, 10, 56, -4, 43, 2], P.c);
  glowEye(g, cx, 14, 11, 2.8, P.e);
  // 嘴
  g.fillStyle = P.c;
  g.beginPath(); g.ellipse(32, 22, 9, 4, 0, 0, PI); g.fill();
  // 火焰
  for (let i = 0; i < 5; i++) {
    const x = 8 + i * 12;
    g.save(); g.globalAlpha = .8;
    poly(g, [x, 52, x + 3, 40 + (i % 2) * 5, x + 6, 52], i % 2 ? P.a : P.b);
    g.restore();
  }
  // 拳
  circ(g, 6, 38, 7, P.b); circ(g, 58, 38, 7, P.b);
};

BOSS_ART.core = (g, P) => {
  const cx = 32, cy = 30;
  // 外环
  g.strokeStyle = P.b; g.lineWidth = 5;
  g.beginPath(); g.ellipse(cx, cy, 27, 14, -.2, 0, TAU); g.stroke();
  g.strokeStyle = P.a; g.lineWidth = 2;
  g.beginPath(); g.ellipse(cx, cy, 20, 22, .5, 0, TAU); g.stroke();
  // 中心
  g.save(); g.shadowBlur = 18; g.shadowColor = P.e;
  circ(g, cx, cy, 12, P.b); g.restore();
  circ(g, cx, cy, 8, P.c);
  glowEye(g, cx, cy, 0, 5, P.e);
  // 炮口
  rrect(g, 2, 24, 12, 8, 2, P.c); rrect(g, 50, 24, 12, 8, 2, P.c);
  px(g, 0, 26, 4, 4, P.e); px(g, 56, 26, 4, 4, P.e);
  // 天线
  px(g, 30, 0, 4, 12, P.a);
  circ(g, 32, 1, 2.4, P.e);
  // 铆钉
  g.fillStyle = P.a;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    g.beginPath(); g.arc(cx + Math.cos(a) * 26, cy + Math.sin(a) * 14, 2, 0, TAU); g.fill();
  }
};

BOSS_ART.abyss = (g, P) => {
  const cx = 32, cy = 30;
  // 虚空漩涡
  g.save(); g.globalAlpha = .55;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    poly(g, [cx, cy, cx + Math.cos(a) * 30, cy + Math.sin(a) * 26, cx + Math.cos(a + .4) * 26, cy + Math.sin(a + .4) * 24], P.c);
  }
  g.restore();
  // 触须
  g.strokeStyle = P.b; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
    g.quadraticCurveTo(cx + Math.cos(a + .5) * 24, cy + Math.sin(a + .5) * 22, cx + Math.cos(a) * 31, cy + Math.sin(a) * 30);
    g.stroke();
  }
  // 眼球
  g.save(); g.shadowBlur = 16; g.shadowColor = P.e;
  circ(g, cx, cy, 15, P.a); g.restore();
  circ(g, cx, cy, 11, P.b);
  circ(g, cx, cy, 7.5, P.c);
  circ(g, cx - 2, cy - 2, 3.6, P.e, false);
  circ(g, cx + 2.4, cy + 2.6, 1.8, '#fff', false);
  // 尖牙
  g.fillStyle = '#fff';
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
    g.lineTo(cx + Math.cos(a + .12) * 19, cy + Math.sin(a + .12) * 19);
    g.lineTo(cx + Math.cos(a + .24) * 14, cy + Math.sin(a + .24) * 14);
    g.fill();
  }
};

function bossSprite(def) {
  const key = 'b_' + def.id;
  if (_spriteCache.has(key)) return key;
  sprite(key, 64, 64, g => (BOSS_ART[def.art] || BOSS_ART.boneKing)(g, PALS[def.pal] || PALS.purple));
  return key;
}

/* =====================================================================
   玩家美术（8 角色，32x32，2 帧）
   ===================================================================== */
const PLAYER_STYLE = {
  knight:   { pal: { a: '#e8ecf7', b: '#8f9bc4', c: '#3d4666', e: '#67e8ff' }, kind: 'knight', hat: '#ffd257' },
  ranger:   { pal: { a: '#d8f5c8', b: '#6ba85a', c: '#2f5a34', e: '#ffe066' }, kind: 'ranger' },
  mage:     { pal: { a: '#e0d0ff', b: '#8b6fe0', c: '#3b2a6e', e: '#ffe066' }, kind: 'mage' },
  alchemist:{ pal: { a: '#f0e2c0', b: '#c09a5a', c: '#6e4a22', e: '#a6ff6b' }, kind: 'alchemist' },
  engineer: { pal: { a: '#ffe2a8', b: '#e0a040', c: '#6e4614', e: '#67e8ff' }, kind: 'engineer' },
  assassin: { pal: { a: '#d8d0f0', b: '#6a5b9e', c: '#2b2342', e: '#ff5d6c' }, kind: 'assassin' },
  paladin:  { pal: { a: '#fff2c0', b: '#e8c463', c: '#8a6420', e: '#fff' }, kind: 'paladin' },
  gunner:   { pal: { a: '#ffd8b8', b: '#c4703c', c: '#5e2f14', e: '#ff9a4d' }, kind: 'gunner' },
};

function playerSprite(charId, frame) {
  const key = `p_${charId}_${frame}`;
  if (_spriteCache.has(key)) return key;
  const st = PLAYER_STYLE[charId] || PLAYER_STYLE.knight;
  const P = st.pal;
  sprite(key, 32, 32, (g) => {
    const cx = 16;
    const sw = frame ? 1 : 0;
    // 影子
    g.save(); g.globalAlpha = .25; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(cx, 30, 9, 3, 0, 0, TAU); g.fill(); g.restore();
    // 腿
    px(g, 11 - sw, 23, 4, 6, P.c);
    px(g, 17 + sw, 23, 4, 6, P.c);
    px(g, 10 - sw, 28, 5, 2, '#241f36');
    px(g, 17 + sw, 28, 5, 2, '#241f36');
    // 身体
    rrect(g, 9, 13, 14, 12, 4, P.b);
    // 胸甲/衣饰
    if (st.kind === 'knight' || st.kind === 'paladin') {
      px(g, 12, 15, 8, 8, P.a);
      px(g, 15, 15, 2, 8, st.hat || P.c);
      px(g, 11, 14, 10, 2, P.c);
    } else if (st.kind === 'mage' || st.kind === 'alchemist') {
      poly(g, [16, 14, 22, 25, 10, 25], P.a);
      px(g, 15, 17, 2, 6, P.c);
    } else {
      px(g, 11, 15, 10, 2, P.a);
      px(g, 13, 18, 6, 5, P.c);
    }
    // 肩
    circ(g, 9, 15, 3.4, P.a); circ(g, 23, 15, 3.4, P.a);
    // 头
    circ(g, cx, 9, 6.4, st.kind === 'assassin' ? P.b : P.a);
    // 面部
    if (st.kind !== 'knight' && st.kind !== 'assassin') {
      eyes(g, cx, 9, 4.4, 1.25, '#1a1428');
      // 头发
      px(g, 10, 3.4, 12, 2.6, st.kind === 'ranger' ? '#6ba85a' : (st.kind === 'gunner' ? '#c4703c' : '#3b2a6e'));
    }
    // 头部装备
    if (st.kind === 'knight') {
      rrect(g, 9, 3, 14, 8, 3, P.a);
      px(g, 11, 7, 10, 2.4, P.c);
      glowEye(g, cx, 8.2, 5, 1.1, P.e);
      px(g, st.hat === '#ffd257' ? 16 : 16, 1, 2, 3, st.hat || '#fff');
    } else if (st.kind === 'ranger') {
      // 兜帽
      poly(g, [8, 9, 10, 2, 22, 2, 24, 9, 22, 13, 10, 13], P.b);
      poly(g, [10, 6, 16, 0, 22, 6], P.c);
      eyes(g, cx, 9, 4.4, 1.2, P.e);
    } else if (st.kind === 'mage') {
      // 尖帽
      poly(g, [8, 7, 24, 7, 20, 2, 16, -3, 12, 2], P.b);
      px(g, 7, 6, 18, 2.4, P.c);
      glowEye(g, cx, 10, 4.4, 1.2, P.e);
    } else if (st.kind === 'alchemist') {
      // 护目镜
      px(g, 10, 6, 12, 4, '#3a2a16');
      circ(g, 13.4, 8, 2.2, P.e); circ(g, 18.6, 8, 2.2, P.e);
      px(g, 9, 4, 14, 2, '#6e4a22');
    } else if (st.kind === 'engineer') {
      // 安全帽
      g.beginPath(); g.arc(cx, 8, 7, PI, 0); g.fillStyle = '#e8b83c'; g.fill();
      px(g, 7, 7, 18, 2.4, '#a87c1c');
      eyes(g, cx, 11, 4.6, 1.2, '#1a1428');
    } else if (st.kind === 'assassin') {
      // 面罩
      px(g, 10, 8, 12, 5, P.c);
      glowEye(g, cx, 10, 4.6, 1.1, P.e);
      poly(g, [8, 10, 4, 16, 9, 14], P.c);
    } else if (st.kind === 'paladin') {
      rrect(g, 9, 2, 14, 9, 3, P.a);
      px(g, 15, 0, 2, 5, P.e);
      glowEye(g, cx, 8, 5, 1.1, '#fff');
      // 光环
      g.save(); g.globalAlpha = .6; g.strokeStyle = P.e; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(cx, 0, 7, 2, 0, 0, TAU); g.stroke(); g.restore();
    } else if (st.kind === 'gunner') {
      // 牛仔帽
      px(g, 6, 4, 20, 3, '#5e2f14');
      px(g, 10, 0, 12, 5, '#8a4a22');
      eyes(g, cx, 9, 4.4, 1.2, '#1a1428');
      px(g, 12, 12, 8, 1.6, '#8a4a22');
    }
    // 手
    circ(g, 24, 19, 2.6, P.a);
    circ(g, 8, 19, 2.6, P.a);
  });
  return key;
}

/* =====================================================================
   武器图标（自动绘制）
   ===================================================================== */
function weaponIconKey(w) {
  const key = 'w_' + w.id;
  if (_spriteCache.has(key)) return key;
  const c1 = w.c1 || '#8f9bc4', c2 = w.c2 || '#e8ecf7', c3 = w.c3 || '#3d4666';
  const acc = w.c4 || w.color || '#ffd257';
  sprite(key, 40, 24, (g) => {
    const shape = w.shape || 'pistol';
    if (shape === 'pistol' || shape === 'revolver' || shape === 'smg' || shape === 'rifle' || shape === 'sniper' || shape === 'shotgun' || shape === 'minigun' || shape === 'railgun') {
      const len = { pistol: 16, revolver: 17, smg: 20, rifle: 28, sniper: 32, shotgun: 26, minigun: 30, railgun: 34 }[shape] || 20;
      const x0 = 6, y = 9;
      // 枪身
      rrect(g, x0, y, len, 6, 1.5, c1);
      px(g, x0 + 3, y + 2, len - 6, 2, c2);
      // 枪管
      px(g, x0 + len, y + 2, 6, 3, c3);
      px(g, x0 + len + 5, y + 2.4, 2, 2, acc);
      // 握把
      poly(g, [x0 + 4, y + 6, x0 + 10, y + 6, x0 + 8, y + 13, x0 + 3, y + 13], c3);
      // 弹匣
      if (shape !== 'sniper' && shape !== 'revolver') px(g, x0 + 11, y + 6, 4, 5, c3);
      if (shape === 'revolver') { circ(g, x0 + 9, y + 5, 3.4, c3); circ(g, x0 + 9, y + 5, 1.6, acc, false); }
      if (shape === 'shotgun') { px(g, x0 + 3, y + 6, 8, 2, c3); }
      if (shape === 'sniper') { rrect(g, x0 + 12, y - 4, 9, 4, 1, c3); }
      if (shape === 'minigun') {
        for (let i = 0; i < 3; i++) px(g, x0 + len, y + 1 + i * 2, 7, 1.2, c3);
        circ(g, x0 + 8, y + 8, 3, c3);
      }
      if (shape === 'railgun') { px(g, x0 + 10, y - 2, 6, 3, acc); px(g, x0 + len, y + 3, 8, 1, acc); }
    } else if (shape === 'bow' || shape === 'crossbow') {
      if (shape === 'bow') {
        g.strokeStyle = c1; g.lineWidth = 3;
        g.beginPath(); g.arc(26, 12, 9, -1.15, 1.15); g.stroke();
        g.strokeStyle = c2; g.lineWidth = 1;
        g.beginPath(); g.moveTo(26 + Math.cos(-1.15) * 9, 12 + Math.sin(-1.15) * 9); g.lineTo(26 + Math.cos(1.15) * 9, 12 + Math.sin(1.15) * 9); g.stroke();
        px(g, 6, 11, 20, 2, c3);
        poly(g, [6, 9, 2, 12, 6, 15], acc);
      } else {
        px(g, 6, 11, 26, 2.4, c3);
        px(g, 16, 6, 12, 2, c1); px(g, 16, 16, 12, 2, c1);
        px(g, 16, 6, 1.6, 12, c2);
        g.strokeStyle = c2; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(16, 4); g.lineTo(16, 20); g.stroke();
        poly(g, [2, 9.6, 7, 12, 2, 14.4], acc);
      }
    } else if (shape === 'staff' || shape === 'wand') {
      px(g, 8, 4, 3, 18, c3);
      g.save(); g.translate(9.5, 4);
      g.rotate(-.3);
      g.strokeStyle = c1; g.lineWidth = 2.4;
      g.beginPath(); g.arc(0, -4, 4.2, PI * .6, PI * 2.1); g.stroke();
      g.restore();
      g.save(); g.shadowBlur = 8; g.shadowColor = acc; circ(g, 10, 3, 3.4, acc); g.restore();
      if (shape === 'wand') { px(g, 12, 8, 4, 2, c2); }
    } else if (shape === 'sword' || shape === 'greatsword' || shape === 'dagger' || shape === 'katana') {
      const len = { sword: 24, greatsword: 28, dagger: 16, katana: 25 }[shape] || 24;
      const wdt = { sword: 4, greatsword: 7, dagger: 3, katana: 3.4 }[shape] || 4;
      poly(g, [4, 12, 8, 12 - wdt / 2, 8 + len, 12 - wdt / 2 - 1, 12 + len, 12, 8 + len, 12 + wdt / 2 + 1, 8, 12 + wdt / 2], c2);
      px(g, 8, 11, len - 2, 1, c1);
      // 护手
      px(g, 6, 8, 3, 8, c3);
      px(g, 2, 11.5, 6, 2.4, c3);
      if (shape === 'greatsword') px(g, 10, 10, len - 4, 1.6, c1);
      if (shape === 'katana') { g.strokeStyle = c1; g.lineWidth = 1; g.beginPath(); g.moveTo(9, 11.6); g.quadraticCurveTo(20, 8, 32, 10); g.stroke(); }
    } else if (shape === 'axe' || shape === 'hammer' || shape === 'scythe') {
      px(g, 8, 4, 3, 18, c3);
      if (shape === 'axe') poly(g, [11, 4, 20, 5, 22, 12, 11, 14], c1);
      else if (shape === 'hammer') { rrect(g, 10, 2, 14, 9, 2, c1); px(g, 12, 4, 10, 2, c2); }
      else {
        g.strokeStyle = c1; g.lineWidth = 3.4; g.beginPath(); g.arc(16, 12, 11, -0.3, 1.9); g.stroke();
        px(g, 17, 6, 2, 14, c3);
      }
    } else if (shape === 'spear' || shape === 'halberd') {
      px(g, 2, 11, 26, 2.4, c3);
      poly(g, [28, 8, 38, 12, 28, 16, 30, 12], c1);
      if (shape === 'halberd') poly(g, [26, 6, 31, 8, 30, 11, 26, 10], c2);
    } else if (shape === 'chainsaw') {
      rrect(g, 10, 8, 18, 8, 2, c1);
      for (let i = 0; i < 8; i++) px(g, 11 + i * 2.2, 9 + (i % 2), 1.4, 2.4, c2);
      poly(g, [4, 14, 10, 12, 10, 17, 4, 17], c3);
      circ(g, 23, 12, 2, acc);
    } else if (shape === 'boomerang' || shape === 'chakram') {
      g.strokeStyle = c1; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.arc(20, 12, 9, -1.2, 1.2); g.stroke();
      g.strokeStyle = c2; g.lineWidth = 2;
      g.beginPath(); g.arc(20, 12, 9, -1.2, 1.2); g.stroke();
      if (shape === 'chakram') {
        for (let i = 0; i < 6; i++) {
          const a = -1.1 + i * .45;
          poly(g, [20 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, 20 + Math.cos(a + .1) * 14, 12 + Math.sin(a + .1) * 14, 20 + Math.cos(a + .2) * 9, 12 + Math.sin(a + .2) * 9], c1);
        }
      }
    } else if (shape === 'shuriken' || shape === 'knife') {
      if (shape === 'shuriken') {
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * TAU;
          poly(g, [20 + Math.cos(a) * 3, 12 + Math.sin(a) * 3, 20 + Math.cos(a + .5) * 12, 12 + Math.sin(a + .5) * 12, 20 + Math.cos(a + 1) * 3, 12 + Math.sin(a + 1) * 3], c1);
        }
        circ(g, 20, 12, 2, c3);
      } else {
        poly(g, [6, 16, 10, 7, 34, 10, 12, 18], c1);
        px(g, 6, 14, 8, 3, c3);
      }
    } else if (shape === 'orb' || shape === 'tome') {
      g.save(); g.shadowBlur = 10; g.shadowColor = acc;
      circ(g, 20, 12, 8, c1); g.restore();
      circ(g, 20, 12, 5.4, c2);
      circ(g, 20, 12, 2.6, acc);
      if (shape === 'tome') { rrect(g, 10, 4, 20, 16, 2, c3); px(g, 12, 6, 16, 3, c2); px(g, 12, 11, 12, 2, acc); }
    } else if (shape === 'cannon' || shape === 'launcher' || shape === 'flamethrower') {
      rrect(g, 4, 8, 24, 9, 3, c1);
      px(g, 24, 9, 10, 7, c3);
      circ(g, 34, 12.5, 4, c3); circ(g, 34, 12.5, 2, acc);
      poly(g, [6, 17, 13, 16, 11, 22, 5, 22], c2);
      px(g, 8, 5, 10, 3, c2);
      if (shape === 'flamethrower') { circ(g, 3, 12, 3, c2); px(g, 0, 10, 4, 3, acc); }
    } else {
      rrect(g, 8, 8, 22, 8, 2, c1);
      px(g, 28, 10, 8, 4, c3);
      poly(g, [8, 14, 14, 14, 12, 20, 6, 20], c2);
    }
  });
  return key;
}

/* =====================================================================
   地形 / 道具
   ===================================================================== */
const _tileCache = new Map();
function tileSprite(themeIdx, kind, variant = 0) {
  const key = `t_${themeIdx}_${kind}_${variant}`;
  if (_tileCache.has(key)) return _tileCache.get(key);
  const T = THEMES[themeIdx];
  const { c, g } = mkCanvas(32, 32);
  const R = new RNG(themeIdx * 991 + variant * 37 + kind.length * 13 + 7);
  if (kind === 'floor') {
    const base = T.floor[variant % T.floor.length];
    g.fillStyle = base; g.fillRect(0, 0, 32, 32);
    // 石板缝
    g.strokeStyle = withAlpha('#000000', .28); g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, 31, 31);
    g.strokeStyle = withAlpha('#ffffff', .045); g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, 1); g.lineTo(32, 1); g.stroke();
    for (let i = 0; i < 5; i++) {
      g.fillStyle = withAlpha(T.floorLight, R.range(.08, .22));
      g.fillRect(R.int(2, 28), R.int(2, 28), R.int(1, 4), R.int(1, 2));
    }
    if (variant === 0) {
      g.strokeStyle = withAlpha('#000', .18); g.lineWidth = 1;
      g.beginPath(); g.moveTo(R.int(4, 12), R.int(4, 28)); g.lineTo(R.int(16, 28), R.int(4, 28)); g.stroke();
    }
  } else if (kind === 'wall') {
    g.fillStyle = T.wall[1]; g.fillRect(0, 0, 32, 32);
    // 砖块
    for (let row = 0; row < 2; row++) {
      const y = row * 16;
      for (let col = 0; col < 2; col++) {
        const x = col * 16 + (row % 2 ? 8 : 0);
        g.fillStyle = T.wall[(row + col) % 2 === 0 ? 0 : 2];
        g.fillRect(x + 1, y + 1, 14, 14);
        g.fillStyle = withAlpha('#ffffff', .07);
        g.fillRect(x + 1, y + 1, 14, 2);
        g.fillStyle = withAlpha('#000', .22);
        g.fillRect(x + 1, y + 13, 14, 2);
      }
    }
    g.strokeStyle = withAlpha('#000', .5); g.lineWidth = 1.5;
    g.strokeRect(.75, .75, 30.5, 30.5);
    if (variant === 1) {
      g.fillStyle = withAlpha(T.wallGlow, .5);
      g.fillRect(10, 13, 2, 11); g.fillRect(14, 16, 2, 8); g.fillRect(18, 11, 2, 13);
    }
  } else if (kind === 'door') {
    g.fillStyle = T.wall[2]; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#1a1428'; g.fillRect(4, 0, 24, 32);
    g.fillStyle = T.wall[0]; g.fillRect(2, 4, 3, 24); g.fillRect(27, 4, 3, 24);
    g.fillStyle = withAlpha(T.wallGlow, .35); g.fillRect(8, 2, 16, 28);
    g.fillStyle = T.wallGlow;
    for (let i = 0; i < 3; i++) g.fillRect(10, 8 + i * 7, 12, 1.6);
  } else if (kind === 'doorOpen') {
    g.fillStyle = '#100d18'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = withAlpha(T.wallGlow, .16); g.fillRect(0, 0, 32, 32);
    g.fillStyle = T.wall[2]; g.fillRect(0, 0, 5, 32); g.fillRect(27, 0, 5, 32);
    g.fillStyle = T.wallGlow; g.globalAlpha = .55;
    g.fillRect(2, 0, 2, 32); g.fillRect(28, 0, 2, 32);
    g.globalAlpha = 1;
  } else if (kind === 'void') {
    g.fillStyle = '#07060c'; g.fillRect(0, 0, 32, 32);
  }
  _tileCache.set(key, c);
  return c;
}

/* 道具 */
function propSprite(kind, themeIdx = 0) {
  const key = `pr_${kind}_${themeIdx}`;
  if (_spriteCache.has(key)) return key;
  const T = THEMES[themeIdx] || THEMES[0];
  sprite(key, 32, 32, (g) => {
    switch (kind) {
      case 'barrel': {
        rrect(g, 8, 9, 16, 20, 4, '#7a5a3a');
        px(g, 8, 12, 16, 2, '#a87c4a'); px(g, 8, 24, 16, 2, '#a87c4a');
        px(g, 11, 9, 2, 20, '#5e4428'); px(g, 19, 9, 2, 20, '#5e4428');
        px(g, 13, 5, 6, 4, '#513c22');
        break;
      }
      case 'crate': {
        rrect(g, 6, 8, 20, 20, 2, '#8a6a3a');
        px(g, 6, 15, 20, 2, '#5e4428'); px(g, 15, 8, 2, 20, '#5e4428');
        g.strokeStyle = '#b08a4a'; g.lineWidth = 1.4; g.strokeRect(7, 9, 18, 18);
        break;
      }
      case 'torch': {
        px(g, 15, 16, 3, 13, '#5e4428');
        g.save(); g.shadowBlur = 12; g.shadowColor = '#ffa63d';
        poly(g, [16.5, 2, 21, 11, 16.5, 16, 12, 11], '#ffa63d');
        poly(g, [16.5, 6, 19, 11, 16.5, 14, 14, 11], '#fff0a3');
        g.restore();
        break;
      }
      case 'pillar': {
        rrect(g, 8, 4, 16, 24, 2, T.wall[0]);
        px(g, 8, 4, 4, 24, T.wall[2]);
        px(g, 6, 2, 20, 4, T.wall[2]);
        px(g, 6, 27, 20, 3, T.wall[2]);
        px(g, 18, 8, 2, 16, withAlpha('#fff', .1));
        break;
      }
      case 'statue': {
        rrect(g, 10, 22, 12, 7, 2, T.wall[2]);
        rrect(g, 12, 10, 8, 13, 3, T.wall[0]);
        circ(g, 16, 8, 5, T.wall[0]);
        glowEye(g, 16, 8, 4, 1, T.wallGlow);
        px(g, 13, 4, 6, 2, T.wall[2]);
        break;
      }
      case 'bones': {
        g.strokeStyle = '#d8d2b8'; g.lineWidth = 2.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(6, 24); g.lineTo(18, 20); g.moveTo(12, 27); g.lineTo(24, 22); g.stroke();
        circ(g, 24, 18, 4, '#e8e2c8');
        px(g, 22, 16, 2, 2, '#3a3328'); px(g, 25, 16, 2, 2, '#3a3328');
        break;
      }
      case 'chest': {
        rrect(g, 4, 12, 24, 16, 3, '#7a4a1e');
        rrect(g, 4, 8, 24, 8, 3, '#a86a2a');
        px(g, 4, 15, 24, 2, '#d4a24a');
        px(g, 15, 14, 3, 6, '#ffd257');
        circ(g, 16.5, 17, 1.4, '#5e3a10', false);
        px(g, 6, 10, 20, 1.6, '#d4a24a');
        break;
      }
      case 'portal': {
        g.save(); g.translate(16, 16);
        for (let i = 0; i < 3; i++) {
          g.save(); g.rotate(i * 0.6);
          g.globalAlpha = .8 - i * .18;
          g.strokeStyle = i === 0 ? '#d8b4ff' : '#8f74ff'; g.lineWidth = 2.6;
          g.beginPath(); g.ellipse(0, 0, 12 - i * 2, 6 - i, .4, 0, TAU); g.stroke();
          g.restore();
        }
        g.shadowBlur = 16; g.shadowColor = '#b98cff';
        g.fillStyle = '#e6d8ff';
        g.beginPath(); g.ellipse(0, 0, 4, 6, 0, 0, TAU); g.fill();
        g.restore();
        break;
      }
      case 'coin': {
        g.save(); g.shadowBlur = 5; g.shadowColor = '#ffcf4d';
        circ(g, 16, 16, 7, '#ffcf4d'); g.restore();
        circ(g, 16, 16, 4.4, '#ffe9a0', false);
        px(g, 14, 12.4, 4, 1.4, '#c9962a');
        break;
      }
      case 'gem': {
        g.save(); g.shadowBlur = 8; g.shadowColor = '#54e0ff';
        poly(g, [16, 5, 25, 13, 20, 27, 12, 27, 7, 13], '#54e0ff'); g.restore();
        poly(g, [16, 8, 21, 14, 17, 24, 13, 14], '#b8f4ff', false);
        break;
      }
      case 'potionRed': case 'potionBlue': case 'potionGreen': {
        const col = kind === 'potionRed' ? '#ff5d6c' : (kind === 'potionBlue' ? '#54a8ff' : '#7bff9b');
        px(g, 14, 7, 4, 4, '#c9d2e2');
        rrect(g, 10, 11, 12, 14, 4, '#c9d2e2');
        g.save(); g.beginPath(); roundRect(g, 12, 15, 8, 8, 3); g.clip();
        g.fillStyle = col; g.fillRect(10, 16, 14, 12); g.restore();
        circ(g, 16, 18, 2.4, col);
        px(g, 12, 12, 2, 5, withAlpha('#fff', .55));
        break;
      }
      case 'shieldOrb': {
        g.save(); g.shadowBlur = 8; g.shadowColor = '#67e8ff';
        poly(g, [16, 5, 26, 11, 24, 24, 16, 29, 8, 24, 6, 11], withAlpha('#67e8ff', .9)); g.restore();
        poly(g, [16, 9, 22, 13, 21, 22, 16, 25, 11, 22, 10, 13], '#b8f4ff', false);
        break;
      }
      case 'energy': {
        g.save(); g.shadowBlur = 8; g.shadowColor = '#8f74ff';
        poly(g, [18, 4, 10, 17, 16, 17, 13, 28, 24, 13, 17, 13], '#a99cff'); g.restore();
        break;
      }
      case 'weaponStand': {
        rrect(g, 6, 22, 20, 6, 2, '#4a3a5e');
        px(g, 14, 16, 4, 8, '#6b5a8a');
        break;
      }
      case 'shop': {
        rrect(g, 4, 26, 24, 5, 2, '#6b4a2a');
        px(g, 7, 10, 2.4, 16, '#8a6a3a'); px(g, 23, 10, 2.4, 16, '#8a6a3a');
        poly(g, [2, 10, 30, 10, 26, 2, 6, 2], '#c84a4a');
        for (let i = 0; i < 4; i++) px(g, 4 + i * 7, 10, 4, 3, '#f0e0c0');
        break;
      }
      case 'merchant': {
        // 斗篷商人
        poly(g, [16, 8, 28, 30, 4, 30], '#3a2a5e');
        poly(g, [16, 11, 24, 30, 8, 30], '#5b3a7e');
        circ(g, 16, 9, 5.8, '#f0d8b8');
        glowEye(g, 16, 9, 4, 1.1, '#ffd257');
        // 尖帽
        poly(g, [7, 7, 25, 7, 17, -3], '#241a3a');
        px(g, 5, 6, 22, 2.2, '#3a2a5e');
        // 钱袋
        circ(g, 25, 25, 3.2, '#ffd257');
        circ(g, 25, 25, 1.6, '#c9962a', false);
        // 手
        circ(g, 10, 20, 2.2, '#f0d8b8');
        break;
      }
      case 'sign': {
        px(g, 15, 14, 2, 16, '#5e4428');
        rrect(g, 4, 4, 24, 14, 2, '#8a6a3a');
        px(g, 6, 6, 20, 2, '#b08a4a');
        poly(g, [9, 11, 17, 11, 17, 8, 22, 13, 17, 18, 17, 15, 9, 15], '#3a2a18');
        break;
      }
      case 'altar': {
        rrect(g, 5, 22, 22, 8, 3, '#3b3358');
        rrect(g, 9, 14, 14, 9, 2, '#514a68');
        px(g, 13, 6, 6, 9, '#8f74ff');
        g.save(); g.shadowBlur = 10; g.shadowColor = '#b98cff'; circ(g, 16, 6, 4, '#d8b4ff'); g.restore();
        break;
      }
      case 'spike': {
        poly(g, [16, 2, 22, 30, 10, 30], '#b9c2d0');
        poly(g, [16, 8, 19, 30, 13, 30], '#e8eef8', false);
        break;
      }
      case 'web': {
        g.strokeStyle = withAlpha('#ffffff', .35); g.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU;
          g.beginPath(); g.moveTo(16, 16); g.lineTo(16 + Math.cos(a) * 16, 16 + Math.sin(a) * 16); g.stroke();
        }
        for (let r = 4; r < 17; r += 4) { g.beginPath(); g.arc(16, 16, r, 0, TAU); g.stroke(); }
        break;
      }
      default: {
        circ(g, 16, 16, 8, '#555');
      }
    }
  });
  return key;
}

/* 技能图标（画在 HUD 上的简易图形） */
function drawSkillIcon(g, id, x, y, s, color = '#ffe066') {
  g.save(); g.translate(x, y); g.scale(s / 32, s / 32);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2.4; g.lineJoin = 'round'; g.lineCap = 'round';
  switch (id) {
    case 'charge': // 骑士冲锋
      poly(g, [6, 12, 22, 12, 22, 6, 30, 16, 22, 26, 22, 20, 6, 20], color);
      break;
    case 'rapid': // 连射
      for (let i = 0; i < 3; i++) { poly(g, [4, 8 + i * 7, 20, 10 + i * 7, 20, 12 + i * 7, 4, 10 + i * 7], color); }
      poly(g, [22, 6, 30, 16, 22, 26, 24, 16], color);
      break;
    case 'nova': // 新星
      circ(g, 16, 16, 6, color, false);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        g.beginPath(); g.moveTo(16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9); g.lineTo(16 + Math.cos(a) * 15, 16 + Math.sin(a) * 15); g.stroke();
      }
      break;
    case 'poison':
      circ(g, 12, 22, 7, color, false); circ(g, 21, 15, 5, color, false); circ(g, 23, 25, 3.4, color, false);
      break;
    case 'turret':
      px(g, 8, 24, 16, 4, color); rrect(g, 11, 12, 10, 11, 3, color); px(g, 15, 4, 3, 9, color);
      break;
    case 'shadow':
      poly(g, [10, 26, 16, 4, 22, 26, 16, 21], color);
      break;
    case 'holy':
      poly(g, [16, 3, 20, 10, 28, 10, 22, 15, 25, 24, 16, 19, 7, 24, 10, 15, 4, 10, 12, 10], color);
      break;
    case 'barrage':
      for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + .4; px(g, 16 + Math.cos(a) * 11 - 1.5, 16 + Math.sin(a) * 11 - 1.5, 4, 4, color); }
      circ(g, 16, 16, 5, color, false);
      break;
    default:
      circ(g, 16, 16, 9, color, false);
  }
  g.restore();
}

/* 小地图房间风格色 */
function themeAccent(i) { return (THEMES[i] || THEMES[0]).accent; }
