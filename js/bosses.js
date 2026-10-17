'use strict';
/* =====================================================================
   Boss：6 种多阶段首领，各自拥有独特的攻击编排
   ===================================================================== */

const BOSS_DEFS = [
  {
    id: 'boneKing', art: 'boneKing', pal: 'bone', name: '骸骨之王', title: '莫德雷德',
    hp: 760, dmg: 16, r: 34, speed: 52, moveStyle: 'walk', theme: 0, phases: 2,
    coins: [30, 50],
    attacks: [
      { name: 'boneRing', w: 3, minPhase: 1 },
      { name: 'boneSummon', w: 2, minPhase: 1 },
      { name: 'boneCharge', w: 3, minPhase: 1 },
      { name: 'boneRain', w: 2, minPhase: 2 },
      { name: 'boneStorm', w: 2, minPhase: 2 },
    ],
    desc: '地牢最深处白骨堆成的王座，无数冒险者在此长眠。',
  },
  {
    id: 'stoneLord', art: 'golem', pal: 'rock', name: '石心魔像', title: '亘古守卫',
    hp: 1040, dmg: 20, r: 36, speed: 40, moveStyle: 'walk', theme: 1, phases: 2,
    coins: [34, 56], armor: 3,
    attacks: [
      { name: 'golemRock', w: 3, minPhase: 1 },
      { name: 'golemSlam', w: 3, minPhase: 1 },
      { name: 'golemLaser', w: 2, minPhase: 1 },
      { name: 'golemRain', w: 2, minPhase: 2 },
      { name: 'golemSlam', w: 2, minPhase: 2 },
    ],
    desc: '洞窟尽头沉睡的古老造物，胸腔里的核心仍在跳动。',
  },
  {
    id: 'frostLord', art: 'frost', pal: 'ice', name: '霜之领主', title: '永冻的低语',
    hp: 1180, dmg: 19, r: 34, speed: 58, moveStyle: 'hover', theme: 3, phases: 2,
    coins: [36, 60],
    attacks: [
      { name: 'frostRing', w: 3, minPhase: 1 },
      { name: 'frostBlizzard', w: 3, minPhase: 1 },
      { name: 'frostBeam', w: 2, minPhase: 1 },
      { name: 'frostWolves', w: 2, minPhase: 2 },
      { name: 'frostRing', w: 2, minPhase: 2 },
    ],
    desc: '冰原的统治者，呼吸之间就能冻结整条走廊。',
  },
  {
    id: 'magmaTyrant', art: 'magma', pal: 'lava', name: '熔岩暴君', title: '深渊咆哮',
    hp: 1320, dmg: 22, r: 36, speed: 50, moveStyle: 'walk', theme: 4, phases: 2,
    coins: [40, 64],
    attacks: [
      { name: 'magmaNova', w: 3, minPhase: 1 },
      { name: 'magmaMeteor', w: 3, minPhase: 1 },
      { name: 'magmaPillars', w: 2, minPhase: 1 },
      { name: 'magmaHounds', w: 2, minPhase: 2 },
      { name: 'magmaNova', w: 2, minPhase: 2 },
    ],
    desc: '从火山口爬出的暴君，脚下的岩石都化为岩浆。',
  },
  {
    id: 'mechCore', art: 'core', pal: 'mech', name: '机械核心', title: '零号协议',
    hp: 1460, dmg: 20, r: 34, speed: 62, moveStyle: 'hover', theme: 5, phases: 2,
    coins: [42, 68], armor: 2,
    attacks: [
      { name: 'coreLaser', w: 3, minPhase: 1 },
      { name: 'coreMissiles', w: 3, minPhase: 1 },
      { name: 'coreMines', w: 2, minPhase: 1 },
      { name: 'coreDrones', w: 2, minPhase: 2 },
      { name: 'coreLaser', w: 2, minPhase: 2 },
    ],
    desc: '洞窟深处挖掘出的远古兵器，至今仍在执行清除指令。',
  },
  {
    id: 'abyssEye', art: 'abyss', pal: 'void', name: '深渊之眼', title: '无尽回响',
    hp: 1800, dmg: 24, r: 38, speed: 54, moveStyle: 'hover', theme: 2, phases: 3,
    coins: [50, 80],
    attacks: [
      { name: 'abyssPull', w: 2, minPhase: 1 },
      { name: 'abyssBeams', w: 3, minPhase: 1 },
      { name: 'abyssRain', w: 3, minPhase: 1 },
      { name: 'abyssSummon', w: 2, minPhase: 2 },
      { name: 'abyssBeams', w: 2, minPhase: 2 },
      { name: 'abyssPull', w: 2, minPhase: 3 },
    ],
    desc: '所有地牢的源头。它凝视你的时候，你也正在被凝视。',
  },
];

/* Boss 按主题分配；主题 2（遗迹）默认使用深渊之眼 */
const BOSS_BY_THEME = { 0: 'boneKing', 1: 'stoneLord', 2: 'abyssEye', 3: 'frostLord', 4: 'magmaTyrant', 5: 'mechCore' };
const BOSS_BY_ID = {};
for (const b of BOSS_DEFS) BOSS_BY_ID[b.id] = b;

/* ------------------------- 辅助 ------------------------- */
function bossShot(b, angle, opts = {}) {
  spawnEnemyBullet({
    x: b.x + Math.cos(angle) * b.r * .55,
    y: b.y + Math.sin(angle) * b.r * .55,
    angle, speed: opts.speed || 260,
    dmg: (opts.dmg || b.dmg) * (opts.mult || 1),
    r: opts.r || 7, color: opts.color || '#ff8a8a',
    proj: opts.proj || 'ebolt', life: opts.life || 4.5,
    homing: opts.homing || 0, explode: opts.explode || 0,
    effect: opts.effect, kb: 0,
  });
  Sfx.play('shoot2');
}
function bossRadial(b, n, opts = {}, offset = 0) {
  for (let i = 0; i < n; i++) {
    bossShot(b, offset + i / n * TAU, opts);
  }
}
function bossTelegraph(x, y, r, delay, dmg, color, owner, opts = {}) {
  world.effects = world.effects || [];
  world.effects.push({
    type: 'meteorWarn', x, y, r, delay, t: 0, dmg, owner, color, burn: opts.burn, freeze: opts.freeze, ice: opts.ice,
  });
}
function bossBeamHazard(b, angle, len, width, dmg, color, dt, ox = 0, oy = 0) {
  const x = b.x + ox, y = b.y + oy;
  const x2 = x + Math.cos(angle) * len, y2 = y + Math.sin(angle) * len;
  world.beams.push({ x, y, angle, len, width, color, life: .07, maxLife: .07 });
  const p = world.player;
  if (p && p.invuln <= 0) {
    const dd = pointLineDist(p.x, p.y, x, y, x2, y2);
    if (dd < width / 2 + p.r * .7 && (b.beamHitCd || 0) <= 0) {
      p.hurt(dmg, b);
      b.beamHitCd = .45;
    }
  }
  b.beamHitCd = Math.max(0, (b.beamHitCd || 0) - dt);
}
function bossSummon(b, typeId, count) {
  const def = ENEMY_BY_ID[typeId];
  if (!def) return;
  for (let i = 0; i < count; i++) {
    const a = i / count * TAU + rand(.5);
    let x, y, tries = 0;
    do {
      x = clamp(b.x + Math.cos(a) * rand(110, 70), 60, VW - 60);
      y = clamp(b.y + Math.sin(a) * rand(110, 70), 60, VH - 60);
      tries++;
    } while (!canStand(x, y, def.r) && tries < 12);
    const e = new Enemy(def, x, y, b.floor);
    e.spawnT = .35;
    world.enemies.push(e);
    FX.ring(x, y, '#b98cff', 4, 34, .4, 3);
    FX.burst(x, y, 10, { color: '#b98cff', speed: 120, life: .4, size: 3 });
  }
  Sfx.play('summon');
}

/* =====================================================================
   Boss 动作库
   ===================================================================== */
const BOSS_ACTIONS = {
  /* ---------------- 骸骨之王 ---------------- */
  boneRing: {
    dur: 2.7,
    start(b) { b.data = { t: 0, wave: 0, off: 0 }; b.announce = '白骨回旋'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.wave * .52 && d.wave < 5) {
        d.wave++;
        bossRadial(b, 12, { speed: 210 + d.wave * 12, color: '#e8e2c8', proj: 'bone', r: 6 }, d.off);
        d.off += .26;
        Camera.addShake(3);
        Sfx.play('throw');
      }
      if (Math.random() < .3) FX.trail(b.x + rand(30, -30), b.y + rand(30, -30), '#e8e2c8', 3, .3);
    },
  },
  boneSummon: {
    dur: 1.9,
    start(b) {
      b.announce = '亡者归来';
      bossSummon(b, 'skeleton', 3);
      FX.ring(b.x, b.y, '#a6ffd6', 10, 150, .6, 4);
      Camera.addShake(6);
    },
    tick() { },
  },
  boneCharge: {
    dur: 1.6,
    start(b) {
      b.announce = '骸骨冲锋';
      const p = world.player;
      b.data = { phase: 'wind', ang: p ? angleTo(b.x, b.y, p.x, p.y) : 0, vx: 0, vy: 0 };
      b.faceAngle = b.data.ang;
    },
    tick(b, t, dt) {
      const d = b.data;
      if (d.phase === 'wind' && t > .55) {
        d.phase = 'dash';
        d.vx = Math.cos(d.ang) * 620; d.vy = Math.sin(d.ang) * 620;
        Camera.addShake(7); Sfx.play('dash');
        FX.burst(b.x, b.y, 18, { color: '#e8e2c8', speed: 200, life: .4, size: 4 });
      }
      if (d.phase === 'dash') {
        moveActor(b, d.vx * dt, d.vy * dt);
        if (Math.random() < .7) FX.trail(b.x + rand(20, -20), b.y + rand(20, -20), '#e8e2c8', 4, .35);
      }
    },
  },
  boneRain: {
    dur: 2.6,
    start(b) { b.data = { n: 0, t: 0 }; b.announce = '骨雨'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .27 && d.n < 9) {
        d.n++;
        const p = world.player;
        const x = clamp((p ? p.x : b.x) + rand(180, -180), 60, VW - 60);
        const y = clamp((p ? p.y : b.y) + rand(150, -150), 60, VH - 60);
        bossTelegraph(x, y, 46, .75, b.dmg * .9, '#e8e2c8', b);
      }
    },
  },
  boneStorm: {
    dur: 3.4,
    start(b) { b.data = { a: 0, t: 0 }; b.announce = '骨风暴'; },
    tick(b, t, dt) {
      const d = b.data;
      d.a += dt * 2.2;
      if (Math.floor(t / .1) !== Math.floor((t - dt) / .1)) {
        for (let k = 0; k < 3; k++) bossShot(b, d.a + k / 3 * TAU, { speed: 190, color: '#e8e2c8', proj: 'bone', r: 5 });
      }
      Camera.addShake(1.2);
    },
  },

  /* ---------------- 石心魔像 ---------------- */
  golemRock: {
    dur: 2.1,
    start(b) { b.data = { n: 0 }; b.announce = '落石'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .25 && d.n < 7) {
        d.n++;
        const p = world.player;
        if (!p) return;
        const a = angleTo(b.x, b.y, p.x, p.y) + rand(.12, -.12);
        bossShot(b, a, { speed: 330, color: '#b6a894', proj: 'rock', r: 9, dmg: b.dmg * .9, explode: 24 });
      }
    },
  },
  golemSlam: {
    dur: 1.9,
    start(b) { b.data = { done: false }; b.announce = '大地震荡'; },
    tick(b, t, dt) {
      const d = b.data;
      if (!d.done && t > .7) {
        d.done = true;
        const R = 190;
        world.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: .5, maxLife: .5, color: '#ffcf4d', size: 8, grav: 0, drag: 0, shape: 'ring', r0: 20, r1: R, rot: 0, vr: 0, glow: true });
        const p = world.player;
        if (p && dist(b.x, b.y, p.x, p.y) < R) p.hurt(b.dmg * 1.2, b);
        for (const e of world.enemies) { /* 不伤害自己人 */ }
        FX.burst(b.x, b.y, 26, { color: '#b6a894', speed: 320, life: .6, size: 4 });
        Camera.addShake(14); Sfx.play('explode');
      }
    },
  },
  golemLaser: {
    dur: 2.8,
    start(b) { b.data = { a: 0 }; b.announce = '石化射线'; },
    tick(b, t, dt) {
      const d = b.data;
      d.a += dt * .8;
      const p = world.player;
      const base = p ? angleTo(b.x, b.y, p.x, p.y) : 0;
      bossBeamHazard(b, base + Math.sin(d.a) * .5, 700, 14, b.dmg * .55, '#ffcf4d', dt);
      bossBeamHazard(b, base - Math.sin(d.a) * .5, 700, 14, b.dmg * .55, '#ffcf4d', dt);
      Camera.addShake(1.5);
    },
  },
  golemRain: {
    dur: 3.2,
    start(b) { b.data = { n: 0 }; b.announce = '天崩'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .32 && d.n < 9) {
        d.n++;
        bossTelegraph(rand(VW - 160, 80) + 40, rand(VH - 160, 80) + 40, 58, .8, b.dmg * 1.1, '#ffcf4d', b);
      }
    },
  },

  /* ---------------- 霜之领主 ---------------- */
  frostRing: {
    dur: 2.3,
    start(b) { b.data = { n: 0, off: 0 }; b.announce = '寒霜环'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .45 && d.n < 4) {
        d.n++;
        bossRadial(b, 14, { speed: 200, color: '#8fdcff', proj: 'ice', r: 6, effect: { type: 'freeze', chance: .6, power: .4, dur: 1.4 } }, d.off);
        d.off += .22;
        Sfx.play('freeze');
      }
    },
  },
  frostBlizzard: {
    dur: 3.4,
    start(b) { b.data = { n: 0 }; b.announce = '暴风雪'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .3 && d.n < 11) {
        d.n++;
        const p = world.player;
        bossTelegraph(clamp((p ? p.x : b.x) + rand(200, -200), 60, VW - 60), clamp((p ? p.y : b.y) + rand(170, -170), 60, VH - 60), 52, .8, b.dmg * .9, '#8fdcff', b, { ice: true, freeze: true });
      }
      if (Math.random() < .6) FX.trail(rand(VW), rand(VH), '#c4ecff', 2, .4);
    },
  },
  frostBeam: {
    dur: 2.6,
    start(b) { b.data = { a: 0, dir: Math.random() < .5 ? 1 : -1 }; b.announce = '绝对零度'; },
    tick(b, t, dt) {
      const d = b.data;
      d.a += dt * 1.5 * d.dir;
      bossBeamHazard(b, d.a, 680, 18, b.dmg * .6, '#8fdcff', dt);
      if (Math.random() < .5) FX.trail(b.x + Math.cos(d.a) * rand(680), b.y + Math.sin(d.a) * rand(680), '#e8fbff', 3, .25);
    },
  },
  frostWolves: {
    dur: 1.8,
    start(b) { b.announce = '狼群'; bossSummon(b, 'iceWolf', 3); },
    tick() { },
  },

  /* ---------------- 熔岩暴君 ---------------- */
  magmaNova: {
    dur: 2.5,
    start(b) { b.data = { n: 0, off: 0 }; b.announce = '熔岩新星'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .55 && d.n < 4) {
        d.n++;
        bossRadial(b, 18, { speed: 190 + d.n * 20, color: '#ff6b2c', proj: 'flame', r: 7, effect: { type: 'burn', chance: .6, power: 4, dur: 2.5 } }, d.off);
        d.off += .17;
        Camera.addShake(4); Sfx.play('explode');
      }
    },
  },
  magmaMeteor: {
    dur: 3.0,
    start(b) { b.data = { n: 0 }; b.announce = '陨火'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .3 && d.n < 10) {
        d.n++;
        const p = world.player;
        bossTelegraph(clamp((p ? p.x : b.x) + rand(190, -190), 60, VW - 60), clamp((p ? p.y : b.y) + rand(170, -170), 60, VH - 60), 54, .85, b.dmg, '#ff6b2c', b, { burn: true });
      }
    },
  },
  magmaPillars: {
    dur: 2.8,
    start(b) { b.data = { n: 0 }; b.announce = '烈焰柱'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .3 && d.n < 7) {
        d.n++;
        const p = world.player;
        const x = p ? p.x : b.x, y = p ? p.y : b.y;
        bossTelegraph(clamp(x + rand(90, -90), 60, VW - 60), clamp(y + rand(90, -90), 60, VH - 60), 40, .65, b.dmg * 1.1, '#ffd257', b, { burn: true });
      }
    },
  },
  magmaHounds: {
    dur: 1.8,
    start(b) { b.announce = '猎犬放出'; bossSummon(b, 'lavaHound', 3); },
    tick() { },
  },

  /* ---------------- 机械核心 ---------------- */
  coreLaser: {
    dur: 3.6,
    start(b) { b.data = { a: rand(TAU), spd: 1.5 }; b.announce = '轨道激光'; },
    tick(b, t, dt) {
      const d = b.data;
      d.a += dt * d.spd;
      for (let k = 0; k < 2; k++) bossBeamHazard(b, d.a + k * PI, 760, 13, b.dmg * .5, '#ff4d6d', dt);
      Camera.addShake(2);
    },
  },
  coreMissiles: {
    dur: 2.4,
    start(b) { b.data = { n: 0 }; b.announce = '导弹齐射'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .18 && d.n < 12) {
        d.n++;
        const a = rand(TAU);
        bossShot(b, a, { speed: 210, color: '#ff4d6d', proj: 'rocket', r: 6, homing: 1.4, dmg: b.dmg * .7 });
      }
    },
  },
  coreMines: {
    dur: 2.2,
    start(b) {
      b.announce = '地雷阵';
      for (let i = 0; i < 8; i++) {
        const a = rand(TAU), r = rand(220, 80);
        const x = clamp(b.x + Math.cos(a) * r, 60, VW - 60), y = clamp(b.y + Math.sin(a) * r, 60, VH - 60);
        bossTelegraph(x, y, 34, rand(1.6, .8), b.dmg * .9, '#ff4d6d', b);
      }
    },
    tick() { },
  },
  coreDrones: {
    dur: 1.8,
    start(b) { b.announce = '无人机部署'; bossSummon(b, 'drone', 3); },
    tick() { },
  },

  /* ---------------- 深渊之眼 ---------------- */
  abyssPull: {
    dur: 2.4,
    start(b) { b.data = { t: 0, fired: 0 }; b.announce = '深渊引力'; },
    tick(b, t, dt) {
      const p = world.player;
      if (p && !p.dead) {
        const a = angleTo(p.x, p.y, b.x, b.y);
        const pull = 95;
        if (canStand(p.x + Math.cos(a) * pull * dt, p.y, p.r)) p.x += Math.cos(a) * pull * dt;
        if (canStand(p.x, p.y + Math.sin(a) * pull * dt, p.r)) p.y += Math.sin(a) * pull * dt;
        if (Math.random() < .5) FX.trail(p.x + rand(20, -20), p.y + rand(20, -20), '#b98cff', 2, .3);
      }
      if (Math.random() < .25) bossShot(b, rand(TAU), { speed: 170, color: '#ff5ce0', proj: 'arcane', r: 6 });
    },
  },
  abyssBeams: {
    dur: 3.2,
    start(b) { b.data = { a: rand(TAU) }; b.announce = '凝视之光'; },
    tick(b, t, dt) {
      const d = b.data;
      d.a += dt * 1.1;
      for (let k = 0; k < 4; k++) bossBeamHazard(b, d.a + k / 4 * TAU, 820, 12, b.dmg * .45, '#ff5ce0', dt);
      Camera.addShake(1.5);
    },
  },
  abyssRain: {
    dur: 3.2,
    start(b) { b.data = { n: 0 }; b.announce = '虚空坠落'; },
    tick(b, t, dt) {
      const d = b.data;
      if (t > d.n * .26 && d.n < 12) {
        d.n++;
        const p = world.player;
        bossTelegraph(clamp((p ? p.x : b.x) + rand(220, -220), 50, VW - 50), clamp((p ? p.y : b.y) + rand(190, -190), 50, VH - 50), 48, .8, b.dmg * .9, '#b98cff', b);
      }
    },
  },
  abyssSummon: {
    dur: 1.9,
    start(b) { b.announce = '巢穴苏醒'; bossSummon(b, 'aberrant', 4); },
    tick() { },
  },
};

/* =====================================================================
   Boss 类
   ===================================================================== */
class Boss extends Enemy {
  constructor(def, x, y, floor) {
    super(Object.assign({}, def, { ai: 'boss', coins: def.coins || [20, 40] }), x, y, floor);
    this.isBoss = true;
    this.spr = bossSprite(def);
    this.def = def;
    this.phase = 1;
    this.maxPhase = def.phases || 2;
    this.act = null; this.actT = 0; this.idleT = 1.2;
    this.lastActs = [];
    this.data = {};
    this.announce = '';
    this.announceT = 0;
    this.speed = def.speed || 50;
    this.moveStyle = def.moveStyle || 'walk';
    this.orbitA = rand(TAU);
    this.armor = def.armor || 0;
    this.beamHitCd = 0;
    this.hp = Math.round(def.hp * (1 + (floor - 1) * 0.26));
    this.maxHp = this.hp;
    this.coins = [Math.round((def.coins ? def.coins[0] : 30) * (1 + floor * .08)), Math.round((def.coins ? def.coins[1] : 50) * (1 + floor * .08))];
  }

  onPhase() {
    this.announce = this.phase === 3 ? '最终形态' : '狂暴';
    this.announceT = 1.6;
    Sfx.play('boss');
    Camera.addShake(16);
    Camera.flashScreen('#ff5d6c', .5);
    FX.ring(this.x, this.y, '#ff5d6c', 20, 260, .8, 8);
    FX.burst(this.x, this.y, 40, { color: '#ff5d6c', speed: 300, life: .9, size: 5, glow: true });
    if (typeof Game !== 'undefined' && Game.toast) Game.toast(this.name + ' 进入了狂暴状态！', '#ff5d6c');
  }

  pickAttack() {
    const pool = [];
    for (const a of this.def.attacks) {
      if ((a.minPhase || 1) > this.phase) continue;
      let w = a.w;
      if (this.lastActs.includes(a.name)) w *= .35;
      pool.push({ a, w });
    }
    let total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of pool) { r -= x.w; if (r <= 0) return x.a.name; }
    return pool[0].a.name;
  }

  startAct(name) {
    this.act = { name };
    this.actT = 0;
    this.data = {};
    this.lastActs.push(name);
    if (this.lastActs.length > 2) this.lastActs.shift();
    const act = BOSS_ACTIONS[name];
    if (act.start) act.start(this);
    this.announceT = 1.3;
  }

  update(dt) {
    if (this.dead) return;
    this.bobT += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.announceT = Math.max(0, this.announceT - dt);
    this.hitCd = Math.max(0, (this.hitCd || 0) - dt);
    this.slow = Math.max(0, this.slow - dt);
    this.touchCd = Math.max(0, this.touchCd - dt);
    this.bossBarT = 2.5;
    this.beamHitCd = Math.max(0, (this.beamHitCd || 0) - dt);

    // 持续伤害
    if (this.burn > 0) {
      this.burn -= dt; this.dotT -= dt;
      if (this.dotT <= 0) { this.dotT = .5; this.hurt(this.burnDps, { dot: true, color: DMG_COLOR.burn }); FX.trail(this.x + rand(20, -20), this.y, '#ffa63d', 3, .3); }
    }
    if (this.poison > 0) {
      this.poison -= dt; this.dotT -= dt;
      if (this.dotT <= 0) { this.dotT = .5; this.hurt(this.poisonDps, { dot: true, color: DMG_COLOR.poison }); FX.trail(this.x + rand(20, -20), this.y, '#a6ff6b', 3, .3); }
    }
    if (this.dead) return;

    const p = world.player;
    if (!p || p.dead) return;

    // 阶段
    const pct = this.hp / this.maxHp;
    if (this.phase === 1 && pct <= .55) { this.phase = 2; this.onPhase(); }
    if (this.maxPhase >= 3 && this.phase === 2 && pct <= .28) { this.phase = 3; this.onPhase(); }

    // 速度倍率
    const spdMul = (this.slow > 0 ? .55 : 1) * (this.phase >= 2 ? 1.18 : 1) * (this.phase >= 3 ? 1.15 : 1);

    // 行动中的接触伤害
    if (this.act) {
      this.actT += dt;
      const act = BOSS_ACTIONS[this.act.name];
      act.tick(this, this.actT, dt);
      if (this.actT >= (act.dur || 2)) {
        this.act = null;
        this.idleT = Math.max(.35, .9 - this.phase * .18);
      }
      // 行动中不移动（冲刺除外）
      if (this.act && this.act.name === 'boneCharge') {
        // 已在 tick 中移动
      }
    } else {
      this.idleT -= dt;
      // 移动
      if (this.moveStyle === 'walk') {
        const a = angleTo(this.x, this.y, p.x, p.y);
        this.faceAngle = approachAngle(this.faceAngle, a, dt * 2.4);
        const d = dist(this.x, this.y, p.x, p.y);
        if (d > 110) moveActor(this, Math.cos(a) * this.speed * spdMul * dt, Math.sin(a) * this.speed * spdMul * dt);
      } else {
        // hover：围绕玩家
        this.orbitA += dt * .55 * spdMul;
        const tx = clamp(p.x + Math.cos(this.orbitA) * 210, 90, VW - 90);
        const ty = clamp(p.y + Math.sin(this.orbitA) * 160, 90, VH - 90);
        this.x = lerp(this.x, tx, clamp(dt * 1.4, 0, 1));
        this.y = lerp(this.y, ty, clamp(dt * 1.4, 0, 1));
        this.faceAngle = angleTo(this.x, this.y, p.x, p.y);
      }
      if (this.idleT <= 0) this.startAct(this.pickAttack());
    }

    // 接触伤害
    if (dist(this.x, this.y, p.x, p.y) < this.r + p.r && this.touchCd <= 0) {
      this.touchCd = .9;
      p.hurt(this.dmg * .8, this);
    }
    if (this.phase >= 2 && Math.random() < .25) {
      FX.trail(this.x + rand(30, -30), this.y + rand(30, -30), this.phase >= 3 ? '#ff5d6c' : '#ffd257', 3, .35);
    }
  }

  draw(g) {
    if (this.dead) return;
    const bob = Math.sin(this.bobT * 2.2) * 5;
    const t = performance.now() / 1000;
    // 光环
    g.save();
    const aura = this.phase >= 3 ? '#ff5d6c' : (this.phase === 2 ? '#ffd257' : '#b98cff');
    g.globalAlpha = .22 + Math.sin(t * 2.4) * .07;
    g.fillStyle = aura;
    g.beginPath(); g.ellipse(this.x, this.y + this.r * .7, this.r * 1.5, this.r * .5, 0, 0, TAU); g.fill();
    g.restore();
    // 影子
    g.save(); g.globalAlpha = .3; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(this.x, this.y + this.r * .9, this.r * 1.1, this.r * .32, 0, 0, TAU); g.fill();
    g.restore();

    // 蓄力红光（在贴图下方，避免染色）
    if (this.act) {
      g.save(); g.globalAlpha = .16 + Math.sin(t * 12) * .07;
      g.fillStyle = '#ff5d6c';
      g.beginPath(); g.arc(this.x, this.y, this.r * 1.35, 0, TAU); g.fill();
      g.restore();
    }

    const size = this.r * 2.7;
    const img = _spriteCache.get(this.spr);
    if (img) {
      g.save();
      g.translate(this.x, this.y + bob);
      if (Math.cos(this.faceAngle) < 0) g.scale(-1, 1);
      if (this.hitFlash > 0) {
        g.drawImage(whiteSprite('wb_' + this.spr, img), -size / 2, -size / 2, size, size);
      } else {
        const out = tintedSprite('bo_' + this.spr, img, '#05040a');
        g.drawImage(out, -size / 2 - 2, -size / 2 - 2, size + 4, size + 4);
        g.drawImage(img, -size / 2, -size / 2, size, size);
      }
      g.restore();
    }
    // 冻结 / 燃烧
    if (this.freeze > 0) {
      g.save(); g.globalAlpha = .35; g.fillStyle = '#8fdcff';
      roundRect(g, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2.2, 8); g.fill(); g.restore();
    }
  }
}
