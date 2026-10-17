'use strict';
/* =====================================================================
   地牢：房间生成 / 门 / 地形 / 道具 / 传送门
   ===================================================================== */

const THEME_CYCLE = [0, 1, 3, 4, 5, 2];
function getFloorTheme(floor) { return THEME_CYCLE[(floor - 1) % THEME_CYCLE.length]; }
function floorName(floor) {
  const theme = getFloorTheme(floor);
  const cycle = Math.floor((floor - 1) / 6);
  return THEMES[theme].name + (cycle > 0 ? ' · 深层' + cycle : '');
}

const DIRS = {
  n: { dx: 0, dy: -1, opp: 's', col: 14, row: 0, rows: [0, 0], cols: [14, 15] },
  s: { dx: 0, dy: 1, opp: 'n', col: 14, row: 16, rows: [16, 16], cols: [14, 15] },
  w: { dx: -1, dy: 0, opp: 'e', col: 0, row: 8, rows: [8, 9], cols: [0, 0] },
  e: { dx: 1, dy: 0, opp: 'w', col: 29, row: 8, rows: [8, 9], cols: [29, 29] },
};

function tileAt(x, y) {
  const room = world.room;
  if (!room) return 1;
  const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return 1;
  return room.tiles[cy][cx];
}
function isWall(x, y) {
  const t = tileAt(x, y);
  return t === 1 || t === 2;
}
function canStand(x, y, r) {
  const room = world.room;
  if (!room) return false;
  if (x < 6 || y < 6 || x > VW - 6 || y > VH - 6) return false;
  const rr = r * .72;
  const pts = [
    [x, y], [x - rr, y], [x + rr, y], [x, y - rr], [x, y + rr],
    [x - rr * .7, y - rr * .7], [x + rr * .7, y - rr * .7],
    [x - rr * .7, y + rr * .7], [x + rr * .7, y + rr * .7],
  ];
  for (const [px_, py_] of pts) if (isWall(px_, py_)) return false;
  return true;
}
function moveActor(a, dx, dy) {
  if (!world.room) return;
  if (a.ai === 'ghost') {
    a.x = clamp(a.x + dx, 30, VW - 30);
    a.y = clamp(a.y + dy, 30, VH - 30);
    return;
  }
  if (canStand(a.x + dx, a.y, a.r)) a.x += dx;
  if (canStand(a.x, a.y + dy, a.r)) a.y += dy;
}

/* =====================================================================
   楼层生成
   ===================================================================== */
function generateFloor(floor) {
  const theme = getFloorTheme(floor);
  const rng = new RNG(floor * 7919 + 1337);
  const GW = 5, GH = 5;
  const targetCount = clamp(6 + Math.floor(floor / 2), 6, 11);
  const sx = rng.int(1, 3), sy = rng.int(1, 3);
  const cells = new Map();
  const key = (x, y) => x + ',' + y;
  function addCell(x, y) {
    const c = { gx: x, gy: y, links: { n: false, s: false, e: false, w: false }, type: 'battle', visited: false, cleared: false, spawned: false, tiles: null, props: [], bg: null };
    cells.set(key(x, y), c);
    return c;
  }
  const startCell = addCell(sx, sy);
  startCell.type = 'start';
  const stack = [startCell];
  let guard = 0;
  while (stack.length && cells.size < targetCount && guard++ < 400) {
    const cur = stack[stack.length - 1];
    const dirs = rng.shuffle(['n', 's', 'e', 'w']);
    let moved = false;
    for (const d of dirs) {
      const nx = cur.gx + DIRS[d].dx, ny = cur.gy + DIRS[d].dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      if (cells.has(key(nx, ny))) continue;
      const nc = addCell(nx, ny);
      cur.links[d] = true; nc.links[DIRS[d].opp] = true;
      stack.push(nc);
      moved = true;
      break;
    }
    if (!moved) stack.pop();
  }
  // 额外环路
  const cellList = [...cells.values()];
  let loops = 0;
  for (const c of cellList) {
    if (loops >= 2) break;
    for (const d of ['n', 'e']) {
      const nx = c.gx + DIRS[d].dx, ny = c.gy + DIRS[d].dy;
      const nb = cells.get(key(nx, ny));
      if (nb && !c.links[d] && rng.chance(.45)) {
        c.links[d] = true; nb.links[DIRS[d].opp] = true; loops++;
      }
    }
  }
  // BFS 距离
  const distMap = new Map();
  const q = [startCell];
  distMap.set(key(startCell.gx, startCell.gy), 0);
  while (q.length) {
    const c = q.shift();
    const dd = distMap.get(key(c.gx, c.gy));
    for (const d of ['n', 's', 'e', 'w']) {
      if (!c.links[d]) continue;
      const nb = cells.get(key(c.gx + DIRS[d].dx, c.gy + DIRS[d].dy));
      if (nb && !distMap.has(key(nb.gx, nb.gy))) { distMap.set(key(nb.gx, nb.gy), dd + 1); q.push(nb); }
    }
  }
  let boss = startCell, bd = -1;
  for (const c of cellList) {
    const d = distMap.get(key(c.gx, c.gy)) || 0;
    if (d > bd) { bd = d; boss = c; }
  }
  boss.type = 'boss';
  // 宝箱房 & 商店
  const candidates = cellList.filter(c => c !== startCell && c !== boss && (distMap.get(key(c.gx, c.gy)) || 0) >= 1);
  rng.shuffle(candidates);
  if (candidates[0]) candidates[0].type = 'treasure';
  if (candidates[1]) candidates[1].type = 'shop';
  // 挑战房
  const challenge = candidates[2];
  if (challenge && floor >= 2) { challenge.type = 'challenge'; }
  // 挑战者
  const rooms = cellList.map(c => {
    c.theme = theme;
    c.floor = floor;
    c.cleared = c.type === 'start' || c.type === 'shop' || c.type === 'treasure';
    buildRoomTiles(c);
    return c;
  });
  const fd = {
    floor, theme, rooms, start: startCell, boss,
    gridW: GW, gridH: GH,
    distMap,
  };
  // 建立方向查找表
  for (const r of rooms) {
    r.next = {};
    for (const d of ['n', 's', 'e', 'w']) {
      if (!r.links[d]) continue;
      const nb = cells.get(key(r.gx + DIRS[d].dx, r.gy + DIRS[d].dy));
      if (nb) r.next[d] = nb;
    }
    renderRoomBg(r);
  }
  world.floorData = fd;
  world.theme = theme;
  Sfx.setTheme(theme);
  return fd;
}

function buildRoomTiles(room) {
  const tiles = [];
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) {
      if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) row.push(1);
      else row.push(0);
    }
    tiles.push(row);
  }
  // 门：先设为墙，尚未开启
  for (const d of ['n', 's', 'e', 'w']) {
    if (!room.links[d]) continue;
    const dd = DIRS[d];
    for (const yy of dd.rows) for (const xx of dd.cols) tiles[yy][xx] = 2;
  }
  // 房间四角柱子（非通行装饰）
  room.tiles = tiles;
  setDoors(room, room.cleared);
}

function setDoors(room, open) {
  if (!room || !room.tiles) return;
  for (const d of ['n', 's', 'e', 'w']) {
    if (!room.links[d]) continue;
    const dd = DIRS[d];
    for (const yy of dd.rows) for (const xx of dd.cols) {
      room.tiles[yy][xx] = open ? 3 : 2;
    }
  }
  if (room.bg) renderRoomBg(room);
}

/* 房间静态背景烘焙 */
function renderRoomBg(room) {
  const { c, g } = mkCanvas(VW, VH);
  const T = THEMES[room.theme];
  const rng = new RNG(room.gx * 733 + room.gy * 977 + room.floor * 31);
  g.imageSmoothingEnabled = false;
  // 地板
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      const v = Math.floor(rng.next() * 3);
      g.drawImage(tileSprite(room.theme, 'floor', v), x * TILE, y * TILE);
    }
  }
  // 墙
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (room.tiles[y][x] === 1) {
        g.drawImage(tileSprite(room.theme, 'wall', (x + y) % 4 === 0 ? 1 : 0), x * TILE, y * TILE);
      }
    }
  }
  // 门
  for (const d of ['n', 's', 'e', 'w']) {
    if (!room.links[d]) continue;
    const dd = DIRS[d];
    const open = room.tiles[dd.rows[0]][dd.cols[0]] === 3;
    for (const yy of dd.rows) {
      for (const xx of dd.cols) {
        g.drawImage(tileSprite(room.theme, open ? 'doorOpen' : 'door', 0), xx * TILE, yy * TILE);
      }
    }
  }
  // 墙体投影
  g.save();
  const grd = g.createLinearGradient(0, TILE, 0, TILE + 22);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(TILE, TILE, VW - TILE * 2, 22);
  g.restore();
  g.save();
  const grd2 = g.createLinearGradient(0, VH - TILE, 0, VH - TILE - 18);
  grd2.addColorStop(0, 'rgba(0,0,0,.5)'); grd2.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd2; g.fillRect(TILE, VH - TILE - 18, VW - TILE * 2, 18);
  g.restore();
  // 墙脚暗带，增加房间立体感
  g.save();
  g.fillStyle = 'rgba(0,0,0,.28)';
  g.fillRect(TILE, TILE, VW - TILE * 2, 7);
  g.fillRect(TILE, VH - TILE - 7, VW - TILE * 2, 7);
  g.fillRect(TILE, TILE, 7, VH - TILE * 2);
  g.fillRect(VW - TILE - 7, TILE, 7, VH - TILE * 2);
  g.fillStyle = withAlpha(T.wallGlow, .07);
  g.fillRect(TILE, TILE + 7, VW - TILE * 2, 5);
  g.restore();
  // 地面装饰
  const decos = T.deco;
  for (let i = 0; i < 14; i++) {
    const kind = rng.pick(decos);
    const x = rng.int(1, COLS - 2) * TILE + rng.int(0, 20);
    const y = rng.int(1, ROWS - 2) * TILE + rng.int(0, 20);
    g.save();
    g.globalAlpha = .25 + rng.next() * .3;
    if (kind === 'crack') {
      g.strokeStyle = '#000'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) g.lineTo(x + rng.int(-16, 16), y + rng.int(-16, 16));
      g.stroke();
    } else if (kind === 'moss' || kind === 'bio') {
      g.fillStyle = kind === 'moss' ? '#4a7a3a' : '#2a8a7a';
      for (let k = 0; k < 5; k++) g.fillRect(x + rng.int(-12, 12), y + rng.int(-8, 8), rng.int(2, 5), rng.int(2, 4));
    } else if (kind === 'bones') {
      g.strokeStyle = '#c8c2a8'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y + 3); g.stroke();
    } else if (kind === 'water' || kind === 'snow' || kind === 'ash' || kind === 'sand' || kind === 'lava') {
      const col = { water: '#2a5a7a', snow: '#c8e8f8', ash: '#5a5048', sand: '#b8a070', lava: '#ff6b2c' }[kind];
      g.fillStyle = col;
      g.beginPath(); g.ellipse(x, y, rng.int(8, 26), rng.int(4, 12), rng.next() * 3, 0, TAU); g.fill();
      if (kind === 'lava') { g.globalAlpha = .5; g.fillStyle = '#ffd257'; g.beginPath(); g.ellipse(x, y, rng.int(4, 12), rng.int(2, 5), 0, 0, TAU); g.fill(); }
    } else if (kind === 'ice') {
      const s = rng.int(12, 26);
      g.fillStyle = 'rgba(190,230,255,.2)';
      poly(g, [x, y - s * .5, x + s * .5, y + s * .1, x, y + s * .45, x - s * .45, y + s * .05], 'rgba(190,230,255,.22)', false);
      g.strokeStyle = 'rgba(230,250,255,.45)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x, y - s * .5); g.lineTo(x + s * .5, y + s * .1); g.lineTo(x, y + s * .45); g.lineTo(x - s * .45, y + s * .05); g.closePath(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.3)';
      g.beginPath(); g.moveTo(x, y - s * .2); g.lineTo(x + s * .2, y + s * .05); g.stroke();
    } else if (kind === 'crystal') {
      const s = rng.int(8, 16);
      poly(g, [x, y - s, x + s * .6, y, x, y + s, x - s * .6, y], withAlpha(T.wallGlow, .4), false);
      g.strokeStyle = withAlpha(T.wallGlow, .7); g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
    } else if (kind === 'mushroom') {
      g.fillStyle = '#a86bff'; g.beginPath(); g.arc(x, y, 3, PI, TAU); g.fill();
      g.fillStyle = '#e0d0ff'; g.fillRect(x - .8, y, 1.6, 4);
    }
    g.restore();
  }
  // Boss 房符文
  if (room.type === 'boss') {
    g.save();
    g.globalAlpha = .22; g.strokeStyle = T.wallGlow; g.lineWidth = 4;
    g.beginPath(); g.arc(VW / 2, VH / 2, 170, 0, TAU); g.stroke();
    g.beginPath(); g.arc(VW / 2, VH / 2, 140, 0, TAU); g.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      g.beginPath();
      g.moveTo(VW / 2 + Math.cos(a) * 140, VH / 2 + Math.sin(a) * 140);
      g.lineTo(VW / 2 + Math.cos(a) * 170, VH / 2 + Math.sin(a) * 170);
      g.stroke();
    }
    g.restore();
  }
  // 暗角
  const vg = g.createRadialGradient(VW / 2, VH / 2, VH * .35, VW / 2, VH / 2, VH * .95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)');
  g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
  g.fillStyle = T.ambient; g.fillRect(0, 0, VW, VH);
  // 商店地毯与柜台
  if (room.type === 'shop') {
    g.save();
    g.fillStyle = 'rgba(70,22,32,.55)';
    roundRect(g, VW / 2 - 300, VH / 2 - 60, 600, 230, 16); g.fill();
    g.strokeStyle = withAlpha(T.wallGlow, .4); g.lineWidth = 3; g.stroke();
    g.strokeStyle = 'rgba(255,210,90,.28)'; g.lineWidth = 1.5;
    roundRect(g, VW / 2 - 284, VH / 2 - 44, 568, 198, 12); g.stroke();
    // 柜台
    g.fillStyle = '#5e4428';
    roundRect(g, VW / 2 - 210, 168, 420, 22, 4); g.fill();
    g.fillStyle = '#8a6a3a';
    roundRect(g, VW / 2 - 214, 160, 428, 12, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(VW / 2 - 210, 162, 420, 3);
    g.fillStyle = '#4a3320';
    g.fillRect(VW / 2 - 198, 190, 12, 26); g.fillRect(VW / 2 + 186, 190, 12, 26);
    g.fillStyle = 'rgba(0,0,0,.3)';
    g.beginPath(); g.ellipse(VW / 2, 220, 215, 9, 0, 0, TAU); g.fill();
    g.restore();
  }
  room.bg = c;
}

/* =====================================================================
   房间内容
   ===================================================================== */
function spawnRoomEnemies(room) {
  if (room.cleared || room.spawned) return;
  room.spawned = true;
  const floor = room.floor;
  const theme = room.theme;
  if (room.type === 'boss') {
    const bossDef = BOSS_BY_ID[BOSS_BY_THEME[theme]] || BOSS_DEFS[0];
    const boss = new Boss(bossDef, VW / 2, VH / 2, floor);
    boss.spawnT = 1;
    world.enemies.push(boss);
    Camera.addShake(14);
    Camera.flashScreen('#ff5d6c', .4);
    Sfx.play('boss');
    if (typeof Game !== 'undefined') Game.onBossSpawn(boss);
    return;
  }
  const pool = enemiesForTheme(theme, floor).filter(d => !d.hidden);
  if (!pool.length) return;
  let count = 4 + Math.floor(floor * .6);
  if (room.type === 'challenge') count += 2;
  count = clamp(count, 4, 10);
  const rng = new RNG(room.gx * 131 + room.gy * 977 + floor * 17);
  const picks = rng.shuffle(pool.slice());
  for (let i = 0; i < count; i++) {
    const def = picks[i % picks.length];
    let x, y, tries = 0;
    do {
      x = rng.range(90, VW - 90);
      y = rng.range(100, VH - 100);
      tries++;
    } while ((!canStand(x, y, def.r + 2) || dist(x, y, VW / 2, VH / 2) < 130 || dist(x, y, world.player.x, world.player.y) < 170) && tries < 40);
    const eliteChance = room.type === 'challenge' ? .3 : clamp(.04 + floor * .012, .04, .2);
    const elite = rng.chance(eliteChance);
    const e = new Enemy(def, x, y, floor, elite);
    e.spawnT = .5 + rng.next() * .3;
    world.enemies.push(e);
    FX.ring(x, y, elite ? e.eliteColor : THEMES[theme].wallGlow, 4, elite ? 46 : 30, .5, 2.4);
  }
  // 挑战房额外奖励宝箱
  if (room.type === 'challenge') {
    room.props.push({ kind: 'chest', x: VW / 2, y: VH / 2, r: 18, hp: 1, dead: false, opened: false, special: true });
  }
  setDoors(room, false);
  Sfx.play('door');
  if (typeof Game !== 'undefined') Game.toast('房间被封锁了！', '#ff8a8a');
}

function spawnRoomProps(room) {
  if (room.propSpawned) return;
  room.propSpawned = true;
  const rng = new RNG(room.gx * 313 + room.gy * 617 + room.floor * 47);
  if (room.type === 'start') {
    // 起始房：武器台 + 火把
    room.props.push({ kind: 'weaponStand', x: VW / 2, y: VH / 2 + 90, r: 16, dead: false, opened: true });
    const w = rollWeapon(room.floor, { filter: x => x.tier <= 2 });
    room.props.push({
      kind: 'pedestalWeapon', x: VW / 2, y: VH / 2 + 90, r: 16, dead: false,
      weapon: makeWeaponInstance(w, room.floor, 0), picked: false, free: true,
    });
    for (const x of [TILE * 4, VW - TILE * 4]) {
      room.props.push({ kind: 'torch', x, y: TILE + 16, r: 6, dead: false });
      room.props.push({ kind: 'torch', x, y: VH - TILE - 16, r: 6, dead: false });
    }
    room.props.push({ kind: 'sign', x: VW / 2 - 170, y: VH / 2 + 20, r: 8, dead: false });
    return;
  }
  if (room.type === 'treasure') {
    room.props.push({ kind: 'chest', x: VW / 2 - 80, y: VH / 2, r: 18, hp: 1, dead: false, opened: false });
    room.props.push({ kind: 'chest', x: VW / 2 + 80, y: VH / 2, r: 18, hp: 1, dead: false, opened: false, gold: true });
    for (let i = 0; i < 3; i++) room.props.push({ kind: 'torch', x: TILE * (6 + i * 9), y: TILE + 16, r: 6, dead: false });
    return;
  }
  if (room.type === 'boss') {
    for (const [x, y] of [[TILE * 3, TILE * 3], [VW - TILE * 3, TILE * 3], [TILE * 3, VH - TILE * 3], [VW - TILE * 3, VH - TILE * 3]]) {
      room.props.push({ kind: 'pillar', x, y, r: 16, dead: false });
      room.props.push({ kind: 'torch', x: x + 34, y, r: 6, dead: false });
    }
    return;
  }
  if (room.type === 'shop') {
    room.props.push({ kind: 'merchant', x: VW / 2, y: 158, r: 16, dead: false });
    // 商品：武器、药水、护甲
    const w = rollWeapon(room.floor, { minTier: Math.min(3, 1 + Math.floor(room.floor / 3)) });
    const price = Math.round(26 + w.tier * 14 + room.floor * 3);
    room.shopOffers = [
      { kind: 'shopWeapon', x: VW / 2 - 170, y: VH / 2 + 24, weapon: makeWeaponInstance(w, room.floor, .4), price },
      { kind: 'health', x: VW / 2, y: VH / 2 + 76, price: 16 + room.floor * 2, heal: 40 },
      { kind: 'armor', x: VW / 2 + 170, y: VH / 2 + 24, price: 14 + room.floor * 2 },
    ];
    for (const off of room.shopOffers) {
      const pk = new Pickup(off.kind, off.x, off.y, { weapon: off.weapon, price: off.price, shop: true, heal: off.heal });
      pk.offer = off;
      world.pickups.push(pk);
    }
    room.pickupsSpawned = true;
    for (let i = 0; i < 2; i++) room.props.push({ kind: 'torch', x: TILE * (8 + i * 13), y: TILE + 16, r: 6, dead: false });
    // 商店杂物
    const rng2 = new RNG(room.gx * 91 + room.gy * 37 + 11);
    for (let i = 0; i < 4; i++) {
      const px_ = i < 2 ? rng2.range(90, 170) : rng2.range(VW - 170, VW - 90);
      const py_ = rng2.range(120, VH - 120);
      room.props.push({ kind: rng2.chance(.5) ? 'crate' : 'barrel', x: px_, y: py_, r: 15, dead: false, hp: 1 });
    }
    return;
  }
  // 普通房间的杂物
  const n = rng.int(2, 5);
  for (let i = 0; i < n; i++) {
    const kind = rng.chance(.6) ? (rng.chance(.6) ? 'barrel' : 'crate') : (rng.chance(.5) ? 'bones' : 'pillar');
    let x, y, tries = 0;
    do {
      x = rng.range(80, VW - 80); y = rng.range(90, VH - 90); tries++;
    } while ((!canStand(x, y, 18) || dist(x, y, VW / 2, VH / 2) < 80) && tries < 30);
    room.props.push({ kind, x, y, r: 15, hp: kind === 'barrel' ? 1 : (kind === 'crate' ? 2 : 999), dead: false, solid: kind === 'pillar' });
    if (kind === 'barrel' || kind === 'crate') {
      // 随机给个炸药桶
      if (rng.chance(.12)) room.props[room.props.length - 1].explosive = true;
    }
  }
  // 地面散落物
  for (let i = 0; i < 2; i++) {
    room.props.push({ kind: 'bones', x: rng.range(90, VW - 90), y: rng.range(100, VH - 100), r: 8, dead: false, deco: true });
  }
  if (rng.chance(.4)) {
    room.props.push({ kind: 'torch', x: rng.chance(.5) ? TILE + 16 : VW - TILE - 16, y: rng.range(100, VH - 100), r: 6, dead: false });
  }
  if (room.type === 'battle' && rng.chance(.18)) {
    room.props.push({ kind: 'chest', x: rng.range(120, VW - 120), y: rng.range(120, VH - 120), r: 18, hp: 1, dead: false, opened: false });
  }
}

/* =====================================================================
   进入房间
   ===================================================================== */
function enterRoom(room, fromDir) {
  const now = performance.now();
  if (world.room === room && world.room) return;
  // 清理旧房间状态
  world.bullets.length = 0; world.ebullets.length = 0;
  world.enemies.length = 0; world.slashes.length = 0; world.beams.length = 0;
  world.pickups.length = 0; world.summons.length = 0;
  world.effects.length = 0; world.particles.length = 0; world.texts.length = 0;
  world.portal = null;
  world.room = room;
  room.visited = true;
  const p = world.player;
  if (p) {
    p.dashT = 0; p.chargeT = 0;
    p.invuln = Math.max(p.invuln, .4);
    if (fromDir === 'n') { p.x = VW / 2; p.y = VH - 170; }
    else if (fromDir === 's') { p.x = VW / 2; p.y = 170; }
    else if (fromDir === 'w') { p.x = VW - 170; p.y = VH / 2; }
    else if (fromDir === 'e') { p.x = 170; p.y = VH / 2; }
    else { p.x = VW / 2; p.y = VH / 2 - 62; }
    p._px = p.x; p._py = p.y;
  }
  spawnRoomProps(room);
  // 每个房间补足火把
  if (!room.torchDone) {
    room.torchDone = true;
    const spots = [
      [TILE * 5, TILE + 18], [VW - TILE * 5, TILE + 18],
      [TILE * 5, VH - TILE - 18], [VW - TILE * 5, VH - TILE - 18],
    ];
    for (const [tx, ty] of spots) {
      if (tx < 70 || tx > VW - 70) continue;
      room.props.push({ kind: 'torch', x: tx, y: ty, r: 6, dead: false });
    }
  }
  // 商店未购买的商品保留
  if (room.type === 'shop' && room.shopOffers) {
    for (const off of room.shopOffers) {
      if (off.bought) continue;
      if (world.pickups.some(pk => pk.offer === off)) continue;
      const pk = new Pickup(off.kind, off.x, off.y, { weapon: off.weapon, price: off.price, shop: true, heal: off.heal });
      pk.offer = off;
      world.pickups.push(pk);
    }
  }
  // 门状态
  setDoors(room, room.cleared);
  if (!room.cleared && !room.spawned) {
    // 联机成员端不本地刷怪：怪物由房主统一生成并广播，避免两套敌人
    if (typeof Net === 'undefined' || !Net.skipLocalSpawn()) spawnRoomEnemies(room);
  } else if (room.type === 'boss' && room.cleared) {
    // Boss 已死，传送门
    if (typeof Game !== 'undefined') Game.spawnPortal(room);
  }
  // 相机入场
  Camera.flashScreen('#000000', 0);
  Sfx.play('door');
  if (typeof Game !== 'undefined') Game.onEnterRoom(room);
}

function tryRoomTransition() {
  const p = world.player, room = world.room;
  if (!p || !room || p.dead) return;
  if (!room.cleared) return;
  if (Math.abs(p.x - VW / 2) < 40 && p.y < 30 && room.next.n) {
    enterRoom(room.next.n, 's');
  } else if (Math.abs(p.x - VW / 2) < 40 && p.y > VH - 30 && room.next.s) {
    enterRoom(room.next.s, 'n');
  } else if (Math.abs(p.y - VH / 2) < 40 && p.x < 30 && room.next.w) {
    enterRoom(room.next.w, 'e');
  } else if (Math.abs(p.y - VH / 2) < 40 && p.x > VW - 30 && room.next.e) {
    enterRoom(room.next.e, 'w');
  }
}

/* =====================================================================
   道具交互
   ===================================================================== */
function breakProp(prop) {
  if (prop.dead) return;
  prop.dead = true;
  const theme = world.theme;
  FX.burst(prop.x, prop.y, 12, { color: prop.kind === 'crate' ? '#b08a4a' : '#a87c4a', speed: 160, life: .5, size: 3.4, grav: 260 });
  Sfx.play('hit');
  if (prop.explosive) {
    explodeAt(prop.x, prop.y, 90, 40, null, '#ff6b2c');
  } else {
    const n = rndi(1, 3);
    for (let i = 0; i < n; i++) world.pickups.push(new Pickup('coin', prop.x, prop.y, { value: 1, vx: rand(100, -100), vy: rand(100, -100) }));
    if (chance(.18)) world.pickups.push(new Pickup('energy', prop.x, prop.y, { energy: 15, vx: rand(80, -80), vy: rand(80, -80) }));
    if (chance(.1)) world.pickups.push(new Pickup('health', prop.x, prop.y, { heal: 20, vx: rand(80, -80), vy: rand(80, -80) }));
  }
}

function openChest(prop) {
  if (prop.opened) return;
  prop.opened = true;
  Sfx.play('clear');
  FX.burst(prop.x, prop.y, 18, { color: '#ffd257', speed: 200, life: .6, size: 3.4, grav: 200 });
  FX.ring(prop.x, prop.y, '#ffd257', 6, 50, .4, 3);
  const n = prop.gold ? rndi(10, 16) : rndi(3, 7);
  for (let i = 0; i < n; i++) world.pickups.push(new Pickup('coin', prop.x, prop.y, { value: prop.gold ? 2 : 1, vx: rand(160, -160), vy: rand(160, -160) }));
  if (chance(.7)) {
    const w = rollWeapon(world.floorData.floor, { minTier: 2 });
    Game.spawnWeaponDrop(prop.x, prop.y - 10, makeWeaponInstance(w, world.floorData.floor, .45));
  } else {
    world.pickups.push(new Pickup('health', prop.x, prop.y, { heal: 35, vx: rand(80, -80), vy: rand(80, -80) }));
  }
  if (chance(.25)) world.pickups.push(new Pickup('energy', prop.x, prop.y, { energy: 40, vx: rand(80, -80), vy: rand(80, -80) }));
}

/* =====================================================================
   绘制
   ===================================================================== */
function drawRoom(g) {
  const room = world.room;
  if (!room) return;
  if (room.bg) g.drawImage(room.bg, 0, 0);
  const T = THEMES[room.theme];
  const t = performance.now() / 1000;
  // 门的能量光 / 封印提示
  for (const d of ['n', 's', 'e', 'w']) {
    if (!room.links[d]) continue;
    const dd = DIRS[d];
    const open = room.tiles[dd.rows[0]][dd.cols[0]] === 3;
    const vert = d === 'n' || d === 's';
    const cx = vert ? (dd.cols[0] + 1) * TILE : (dd.cols[0] + .5) * TILE;
    const cy = vert ? (dd.rows[0] + .5) * TILE : (dd.rows[0] + 1) * TILE;
    g.save();
    if (open) {
      g.globalAlpha = .28 + Math.sin(t * 3 + dd.col) * .1;
      const grd = g.createRadialGradient(cx, cy, 2, cx, cy, 68);
      grd.addColorStop(0, withAlpha(T.wallGlow, .8)); grd.addColorStop(1, withAlpha(T.wallGlow, 0));
      g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, 68, 0, TAU); g.fill();
    } else {
      g.globalAlpha = .2 + Math.sin(t * 4) * .05;
      const grd = g.createRadialGradient(cx, cy, 2, cx, cy, 46);
      grd.addColorStop(0, 'rgba(255,70,90,.55)'); grd.addColorStop(1, 'rgba(255,40,60,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, 46, 0, TAU); g.fill();
      // 锁
      g.globalAlpha = .9;
      g.strokeStyle = '#ff8a8a'; g.lineWidth = 1.6;
      g.beginPath(); g.arc(cx, cy - 4, 4, PI, 0); g.stroke();
      g.fillStyle = '#3a1a24';
      roundRect(g, cx - 6, cy - 2, 12, 10, 2); g.fill();
      g.strokeStyle = '#ff8a8a'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = '#ff8a8a'; g.fillRect(cx - 1, cy + 1, 2, 3);
    }
    g.restore();
  }
  // 火把光
  for (const pr of room.props) {
    if (pr.kind !== 'torch' || pr.dead) continue;
    const fl = .8 + Math.sin(t * 9 + pr.x) * .2;
    g.save();
    g.globalAlpha = .33 * fl;
    const grd = g.createRadialGradient(pr.x, pr.y - 4, 4, pr.x, pr.y - 4, 150);
    grd.addColorStop(0, '#ffb04d'); grd.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(pr.x, pr.y - 4, 150, 0, TAU); g.fill();
    g.restore();
  }
  // 漂浮尘埃
  g.save();
  for (let i = 0; i < 16; i++) {
    const px_ = 40 + ((i * 137 + t * (7 + i % 3) * 4) % (VW - 80));
    const py_ = 50 + ((i * 89 + Math.sin(t * .5 + i) * 26 + t * (3 + i % 4) * 3) % (VH - 100));
    g.globalAlpha = .1 + Math.max(0, Math.sin(t * .8 + i * 1.7)) * .12;
    g.fillStyle = T.light;
    g.beginPath(); g.arc(px_, py_, 1.2 + (i % 3) * .5, 0, TAU); g.fill();
  }
  g.restore();
}

/* 世界内文字标签：在 HUD 分辨率层绘制，保证中文清晰 */
function drawWorldLabels(g) {
  const room = world.room;
  if (!room) return;
  for (const pr of room.props) {
    if (pr.dead) continue;
    if (pr.kind === 'pedestalWeapon' && !pr.picked) {
      drawText(g, pr.weapon.name, pr.x, pr.y - 74, { size: 12.5, color: tierColor(pr.weapon.tier), align: 'center', weight: 900, stroke: 'rgba(0,0,0,.85)', strokeW: 4 });
      drawText(g, 'E 拾取 · 免费', pr.x, pr.y - 58, { size: 9.5, color: '#c9c1e6', align: 'center', weight: 700, stroke: 'rgba(0,0,0,.8)', strokeW: 3 });
    } else if (pr.kind === 'merchant') {
      drawText(g, '神秘商人', pr.x, pr.y - 64, { size: 12.5, color: '#ffd257', align: 'center', weight: 900, stroke: 'rgba(0,0,0,.85)', strokeW: 4 });
      drawText(g, '「用金币说话。」', pr.x, pr.y - 48, { size: 9.5, color: '#c9b8e6', align: 'center', stroke: 'rgba(0,0,0,.8)', strokeW: 3 });
    }
  }
  if (world.portal) {
    drawText(g, 'E 进入下一层', world.portal.x, world.portal.y + 50, { size: 12.5, color: '#e8dcff', align: 'center', weight: 800, alpha: .85 + Math.sin(performance.now() / 300) * .15, stroke: 'rgba(0,0,0,.85)', strokeW: 4 });
  }
}

function drawProps(g) {
  const room = world.room;
  if (!room) return;
  const t = performance.now() / 1000;
  for (const pr of room.props) {
    if (pr.dead) continue;
    if (pr.kind === 'pedestalWeapon') {
      if (pr.picked) continue;
      // 光柱
      g.save();
      g.globalAlpha = .25 + Math.sin(t * 2.5) * .08;
      const grd = g.createLinearGradient(pr.x, pr.y - 70, pr.x, pr.y + 6);
      grd.addColorStop(0, withAlpha(tierColor(pr.weapon.tier), 0)); grd.addColorStop(1, withAlpha(tierColor(pr.weapon.tier), .5));
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(pr.x - 14, pr.y + 6); g.lineTo(pr.x - 6, pr.y - 70); g.lineTo(pr.x + 6, pr.y - 70); g.lineTo(pr.x + 14, pr.y + 6); g.closePath(); g.fill();
      g.restore();
      const icon = _spriteCache.get(weaponIconKey(pr.weapon));
      if (icon) {
        g.save();
        g.translate(pr.x, pr.y - 30 + Math.sin(t * 2) * 3);
        g.shadowBlur = 9; g.shadowColor = tierColor(pr.weapon.tier);
        g.drawImage(icon, -22, -13, 44, 26);
        g.restore();
      }
      continue;
    }
    if (pr.kind === 'sign') {
      const img = _spriteCache.get(propSprite('sign', world.theme));
      if (img) g.drawImage(img, pr.x - 16, pr.y - 22, 32, 32);
      continue;
    }
    const img = _spriteCache.get(propSprite(pr.kind, world.theme));
    if (!img) continue;
    if (pr.kind === 'chest' && pr.opened) {
      g.save(); g.globalAlpha = .7;
      g.drawImage(img, pr.x - 20, pr.y - 22, 40, 40);
      g.restore();
      g.save(); g.translate(pr.x, pr.y); g.rotate(-.3);
      g.fillStyle = '#7a4a1e'; g.fillRect(-14, -24, 28, 7);
      g.restore();
      continue;
    }
    if (pr.kind === 'chest') {
      g.save();
      g.globalAlpha = .25 + Math.sin(t * 3) * .1;
      g.fillStyle = '#ffd257';
      g.beginPath(); g.arc(pr.x, pr.y, 26, 0, TAU); g.fill();
      g.restore();
    }
    const szMap = { barrel: 36, crate: 36, torch: 32, pillar: 48, statue: 44, chest: 40, shop: 58, merchant: 52, altar: 36, bones: 32, sign: 30, spike: 30, web: 32, weaponStand: 32 };
    const sz = pr.big ? 80 : (szMap[pr.kind] || 32);
    g.drawImage(img, pr.x - sz / 2, pr.y - sz * .72, sz, sz);
  }
}

function drawPortal(g) {
  const pt = world.portal;
  if (!pt) return;
  const t = performance.now() / 1000;
  g.save();
  g.translate(pt.x, pt.y);
  g.globalAlpha = .35 + Math.sin(t * 3) * .08;
  const grd = g.createRadialGradient(0, 0, 4, 0, 0, 70);
  grd.addColorStop(0, 'rgba(200,170,255,.9)'); grd.addColorStop(1, 'rgba(120,80,255,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.fill();
  g.globalAlpha = 1;
  const img = _spriteCache.get(propSprite('portal', world.theme));
  if (img) {
    g.rotate(Math.sin(t) * .15);
    g.drawImage(img, -28 + Math.sin(t * 1.3) * 3, -28, 56, 56);
  }
  // 粒子
  if (Math.random() < .5) FX.trail(pt.x + rand(24, -24), pt.y + rand(24, -24), '#c8aaff', 2.5, .5);
  g.restore();
}

/* 光照叠加 */
function drawLighting(g) {
  const p = world.player;
  if (!p) return;
  const t = performance.now() / 1000;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const grd = g.createRadialGradient(p.x, p.y - 8, 10, p.x, p.y - 8, 215);
  grd.addColorStop(0, 'rgba(130,110,215,.22)');
  grd.addColorStop(.6, 'rgba(90,70,170,.08)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(p.x, p.y - 8, 215, 0, TAU); g.fill();
  g.restore();
}

/* 特殊房间小提示 */
function roomLabel(room) {
  if (!room) return '';
  switch (room.type) {
    case 'shop': return '神秘商店';
    case 'treasure': return '宝藏之间';
    case 'challenge': return '挑战房';
    case 'boss': return '首领房';
    case 'start': return '入口';
    default: return '';
  }
}
