'use strict';
/* =====================================================================
   弹幕 / 近战 / 掉落物 / 特效 / 光束
   ===================================================================== */
world.effects = world.effects || [];

/* ---------------------------- 玩家子弹 ---------------------------- */
function spawnBullet(o) {
  const b = {
    x: o.x, y: o.y,
    vx: Math.cos(o.angle) * (o.speed || 600),
    vy: Math.sin(o.angle) * (o.speed || 600),
    angle: o.angle, speed: o.speed || 600,
    dmg: o.dmg || 5, r: o.r || 5,
    life: o.life || 1.5, maxLife: o.life || 1.5,
    pierce: o.pierce || 0, pierceLeft: o.pierce || 0,
    color: o.color || '#ffe066', proj: o.proj || 'bolt',
    owner: o.owner, effect: o.effect, isCrit: !!o.isCrit,
    kb: o.kb || 60, explode: o.explode || 0, chain: o.chain || 0,
    bounce: o.bounce || 0, homing: o.homing || 0, boomerang: !!o.boomerang,
    pull: o.pull || 0, heal: o.heal || 0, weapon: o.weapon,
    hit: new Set(), dead: false, t: 0, rot: rand(TAU), vr: rand(14, -14),
    trailT: 0, homingTarget: null, fade: 1,
  };
  world.bullets.push(b);
  return b;
}

function updateBullets(dt) {
  const list = world.bullets;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    if (b.dead) { list.splice(i, 1); continue; }
    b.t += dt;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; list.splice(i, 1); continue; }
    b.rot += b.vr * dt;

    // 回旋
    if (b.boomerang) {
      if (b.t > .32 && b.owner && !b.owner.dead) {
        const a = angleTo(b.x, b.y, b.owner.x, b.owner.y);
        const tx = Math.cos(a) * b.speed * 1.15, ty = Math.sin(a) * b.speed * 1.15;
        b.vx = lerp(b.vx, tx, clamp(dt * 5, 0, 1));
        b.vy = lerp(b.vy, ty, clamp(dt * 5, 0, 1));
        if (dist(b.x, b.y, b.owner.x, b.owner.y) < 24 && b.t > .5) {
          b.dead = true; FX.burst(b.x, b.y, 5, { color: b.color, speed: 80, life: .25, size: 2 });
          Sfx.play('pickup');
          list.splice(i, 1); continue;
        }
      }
    }
    // 追踪
    if (b.homing) {
      if (!b.homingTarget || b.homingTarget.dead) b.homingTarget = nearestEnemy(b.x, b.y, 460);
      if (b.homingTarget) {
        const a = angleTo(b.x, b.y, b.homingTarget.x, b.homingTarget.y);
        const cur = Math.atan2(b.vy, b.vx);
        const na = cur + clamp(angDiff(a, cur), -b.homing * dt, b.homing * dt);
        b.vx = Math.cos(na) * b.speed; b.vy = Math.sin(na) * b.speed;
        if (Math.random() < .5) FX.trail(b.x, b.y, b.color, 2.2, .18);
      }
    }
    // 黑洞拉扯
    if (b.pull) {
      for (const e of world.enemies) {
        if (e.dead || e.isBoss) continue;
        const d = dist(b.x, b.y, e.x, e.y);
        if (d < 170 && d > 4) {
          const a = angleTo(e.x, e.y, b.x, b.y);
          const f = (1 - d / 170) * b.pull;
          moveActor(e, Math.cos(a) * f * dt, Math.sin(a) * f * dt);
          e.slow = Math.max(e.slow, .2);
        }
      }
    }

    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    // 墙壁
    if (isWall(nx, ny)) {
      if (b.explode) { explodeAt(nx, ny, b.explode, b.dmg, b.owner, b.color); b.dead = true; list.splice(i, 1); continue; }
      if (b.bounce > 0 && b.weapon) {
        // 简单反射
        if (isWall(nx, b.y)) b.vx *= -1;
        if (isWall(b.x, ny)) b.vy *= -1;
        if (!isWall(nx, b.y) && !isWall(b.x, ny)) { b.vx *= -1; b.vy *= -1; }
        b.bounce--; b.life = Math.max(b.life, .8);
        FX.burst(b.x, b.y, 3, { color: b.color, speed: 80, life: .2, size: 1.8 });
        Sfx.play('hit');
        b.x = clamp(b.x, 30, VW - 30); b.y = clamp(b.y, 30, VH - 30);
        continue;
      }
      FX.burst(nx, ny, 4, { color: b.color, speed: 90, life: .2, size: 2 });
      b.dead = true; list.splice(i, 1); continue;
    }
    b.x = nx; b.y = ny;

    // 拖尾
    b.trailT -= dt;
    if (b.trailT <= 0) {
      b.trailT = .035;
      if (b.proj === 'rocket' || b.proj === 'rail' || b.proj === 'blackhole' || b.proj === 'flame' || b.proj === 'plasma' || b.proj === 'arcane') {
        FX.trail(b.x, b.y, b.color, b.proj === 'blackhole' ? 4 : 3, .25);
      }
    }

    // 命中敌人
    for (const e of world.enemies) {
      if (e.dead || b.hit.has(e)) continue;
      if (dist(b.x, b.y, e.x, e.y) < b.r + e.r + 2.5) {
        b.hit.add(e);
        const kbDir = Math.atan2(b.vy, b.vx);
        const dealt = e.hurt(b.dmg, {
          crit: b.isCrit, color: b.color, owner: b.owner, kb: b.kb,
          effect: b.effect,
        });
        if (b.isCrit) Camera.addShake(1.6);
        if (b.heal && world.player) {
          world.player.hp = Math.min(world.player.maxHp, world.player.hp + b.heal);
          FX.text(world.player.x, world.player.y - 30, '+' + b.heal, '#7bff9b', 13);
        }
        if (b.explode) {
          explodeAt(b.x, b.y, b.explode, b.dmg * .75, b.owner, b.color);
          b.dead = true;
        } else if (b.chain > 0) {
          chainZap(e.x, e.y, b.dmg * .55, b.chain, b.color, b.owner, e);
          b.dead = true;
        }
        if (b.pierceLeft > 0 && !b.explode) {
          b.pierceLeft--;
        } else if (!b.boomerang) {
          b.dead = true;
        }
        if (b.dead) break;
      }
    }
    if (b.dead) { list.splice(i, 1); continue; }
    if (b.x < -40 || b.x > VW + 40 || b.y < -40 || b.y > VH + 40) { list.splice(i, 1); continue; }
  }
}

/* 爆炸（玩家方） */
function explodeAt(x, y, radius, dmg, owner, color, opts = {}) {
  FX.ring(x, y, color || '#ffa63d', 8, radius, .4, 6);
  FX.burst(x, y, 24, { color: color || '#ffa63d', speed: 300, life: .55, size: 4, glow: true });
  FX.burst(x, y, 10, { color: '#fff6cf', speed: 180, life: .3, size: 3 });
  Camera.addShake(Math.min(12, radius * .09));
  Sfx.play('explode');
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (dist(x, y, e.x, e.y) < radius + e.r * .5) {
      e.hurt(dmg, { owner, color: color || '#ffa63d', kb: 120, dot: true });
    }
  }
  for (const eb of world.ebullets) {
    if (!eb.dead && dist(x, y, eb.x, eb.y) < radius * .9) eb.dead = true;
  }
}

/* 连锁闪电 */
function chainZap(x, y, dmg, count, color, owner, exclude) {
  let from = { x, y };
  const used = new Set();
  if (exclude) used.add(exclude);
  for (let i = 0; i < count; i++) {
    let best = null, bd = 200;
    for (const e of world.enemies) {
      if (e.dead || used.has(e)) continue;
      const d = dist(from.x, from.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) break;
    used.add(best);
    world.beams.push({ x: from.x, y: from.y, x2: best.x, y2: best.y, width: 3.4, color, life: .16, maxLife: .16, bolt: true });
    best.hurt(dmg, { owner, color, dot: true, effect: { type: 'stun', chance: .25, dur: .3 } });
    FX.burst(best.x, best.y, 5, { color, speed: 110, life: .25, size: 2.4 });
    from = { x: best.x, y: best.y };
  }
  Sfx.play('chain');
}

/* 玩家光束 */
function fireBeam(x, y, angle, opts) {
  const len = opts.length || 600;
  const width = opts.width || 8;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const hits = [];
  for (const e of world.enemies) {
    if (e.dead) continue;
    const dx = e.x - x, dy = e.y - y;
    const proj = dx * cos + dy * sin;
    if (proj < 0 || proj > len) continue;
    const perp = Math.abs(-dx * sin + dy * cos);
    if (perp < e.r + width * .5) hits.push({ e, proj });
  }
  hits.sort((a, b) => a.proj - b.proj);
  const maxHits = (opts.pierce || 0) + 1;
  let endLen = len;
  hits.slice(0, maxHits).forEach((h, idx) => {
    const eff = opts.randomEffect ? randomElement() : opts.effect;
    h.e.hurt(opts.dmg, { crit: opts.isCrit, owner: opts.owner, color: opts.color, effect: eff });
    FX.burst(h.e.x, h.e.y, 6, { color: opts.color, speed: 130, life: .3, size: 2.6 });
    if (opts.chain) chainZap(h.e.x, h.e.y, opts.dmg * .5, opts.chain, opts.color, opts.owner, h.e);
    if (opts.heal && world.player) {
      world.player.hp = Math.min(world.player.maxHp, world.player.hp + opts.heal);
      FX.text(world.player.x, world.player.y - 30, '+' + opts.heal, '#7bff9b', 13);
    }
    if (idx === maxHits - 1) endLen = h.proj + h.e.r;
  });
  world.beams.push({
    x, y, angle, len: Math.max(endLen, hits.length ? endLen : len), width, color: opts.color || '#67e8ff',
    life: .14, maxLife: .14, glow: true,
  });
  // 枪口闪光
  FX.burst(x, y, 5, { color: opts.color, speed: 130, life: .18, size: 3, angle, spread: .8, glow: true });
}

/* ---------------------------- 敌方子弹 ---------------------------- */
function spawnEnemyBullet(o) {
  const b = {
    x: o.x, y: o.y,
    vx: Math.cos(o.angle) * (o.speed || 230),
    vy: Math.sin(o.angle) * (o.speed || 230),
    angle: o.angle, speed: o.speed || 230,
    dmg: o.dmg || 8, r: o.r || 5,
    life: o.life || 4, maxLife: o.life || 4,
    color: o.color || '#ff5d6c', proj: o.proj || 'ebolt',
    explode: o.explode || 0, fuse: o.fuse || 0, homing: o.homing || 0,
    effect: o.effect, kb: o.kb || 0, dead: false, t: 0,
    rot: rand(TAU), vr: rand(10, -10), hit: false,
    homingTarget: null, trailT: 0,
  };
  world.ebullets.push(b);
  return b;
}

function updateEnemyBullets(dt) {
  const p = world.player;
  const list = world.ebullets;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    if (b.dead) { list.splice(i, 1); continue; }
    b.t += dt;
    b.life -= dt;
    b.rot += b.vr * dt;
    if (b.life <= 0) {
      if (b.explode) enemyExplode(b);
      b.dead = true; list.splice(i, 1); continue;
    }
    if (b.homing) {
      if (!b.homingTarget || b.homingTarget.dead) b.homingTarget = p;
      if (b.homingTarget && !b.homingTarget.dead) {
        const a = angleTo(b.x, b.y, b.homingTarget.x, b.homingTarget.y);
        const cur = Math.atan2(b.vy, b.vx);
        const na = cur + clamp(angDiff(a, cur), -b.homing * dt, b.homing * dt);
        b.vx = Math.cos(na) * b.speed; b.vy = Math.sin(na) * b.speed;
      }
    }
    // 引信
    if (b.fuse > 0) {
      b.fuse -= dt;
      if (b.fuse <= 0) {
        enemyExplode(b); b.dead = true; list.splice(i, 1); continue;
      }
    }
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    if (b.proj === 'grenade' || b.proj === 'arc') {
      // 抛物线弹不撞墙
      b.x = nx; b.y = ny;
    } else if (isWall(nx, ny)) {
      if (b.explode) { enemyExplode(b); b.dead = true; list.splice(i, 1); continue; }
      FX.burst(nx, ny, 3, { color: b.color, speed: 70, life: .2, size: 2 });
      b.dead = true; list.splice(i, 1); continue;
    } else {
      b.x = nx; b.y = ny;
    }
    b.trailT -= dt;
    if (b.trailT <= 0) {
      b.trailT = .06;
      if (b.proj === 'rocket' || b.proj === 'flame' || b.proj === 'arcane' || b.proj === 'bone') FX.trail(b.x, b.y, b.color, 2.2, .18);
    }
    // 命中玩家
    if (p && !p.dead && dist(b.x, b.y, p.x, p.y) < b.r + p.r * .8) {
      if (p.invuln <= 0) {
        p.hurt(b.dmg, b);
        if (b.effect && p.applyStatus) p.applyStatus(b.effect);
        if (b.explode) enemyExplode(b);
        FX.burst(b.x, b.y, 8, { color: b.color, speed: 130, life: .3, size: 2.6 });
      }
      b.dead = true; list.splice(i, 1); continue;
    }
    if (b.x < -50 || b.x > VW + 50 || b.y < -50 || b.y > VH + 50) { list.splice(i, 1); continue; }
  }
}

function enemyExplode(b) {
  FX.ring(b.x, b.y, b.color, 6, b.explode, .35, 5);
  FX.burst(b.x, b.y, 18, { color: b.color, speed: 240, life: .5, size: 3.6, glow: true });
  Camera.addShake(7);
  Sfx.play('explode');
  const p = world.player;
  if (p && !p.dead && dist(b.x, b.y, p.x, p.y) < b.explode + p.r * .5) p.hurt(b.dmg, b);
}

/* ---------------------------- 近战挥砍 ---------------------------- */
function updateSlashes(dt) {
  for (let i = world.slashes.length - 1; i >= 0; i--) {
    const s = world.slashes[i];
    s.life -= dt;
    if (!s.fired) {
      s.fired = true;
      // 附加弹幕效果
      if (s.wave) {
        spawnBullet({
          x: s.x + Math.cos(s.angle) * s.range * .6, y: s.y + Math.sin(s.angle) * s.range * .6,
          angle: s.angle, speed: s.wave.speed || 460, dmg: s.wave.dmg * (s.owner.dmgMul || 1),
          r: s.wave.size || 10, life: .9, color: s.wave.color || '#8fe6ff', proj: 'wave',
          owner: s.owner, pierce: 2, kb: 80, isCrit: s.isCrit,
        });
      }
      if (s.shockwave) {
        spawnShockwave(s.x, s.y, s.shockwave.radius || 100, s.shockwave.dmg * (s.owner.dmgMul || 1), s.owner, s.shockwave.color || '#ffd257');
      }
      if (s.gunOnMelee) {
        const g = s.gunOnMelee;
        for (let k = 0; k < (g.count || 3); k++) {
          const a = s.angle + (k / ((g.count || 3) - 1) - .5) * (g.spread || .18);
          spawnBullet({
            x: s.x + Math.cos(s.angle) * 20, y: s.y - 4 + Math.sin(s.angle) * 20,
            angle: a, speed: g.speed || 760, dmg: (g.dmg || 8) * (s.owner.dmgMul || 1),
            r: 5, life: .8, color: g.color || '#67e8ff', proj: 'bolt', owner: s.owner, pierce: 0, kb: 40,
          });
        }
      }
    }
    // 判定
    for (const e of world.enemies) {
      if (e.dead || s.hit.has(e)) continue;
      const d = dist(s.x, s.y, e.x, e.y);
      if (d > s.range + e.r) continue;
      const a = angleTo(s.x, s.y, e.x, e.y);
      if (Math.abs(angDiff(a, s.angle)) > s.arc / 2) continue;
      s.hit.add(e);
      e.hurt(s.dmg, {
        crit: s.isCrit, owner: s.owner, color: s.color, kb: s.kb, effect: s.effect,
      });
      if (s.lifesteal && s.owner.hp < s.owner.maxHp) {
        const heal = Math.max(1, Math.round(s.dmg * s.lifesteal * .35));
        s.owner.hp = Math.min(s.owner.maxHp, s.owner.hp + heal);
        FX.text(s.owner.x, s.owner.y - 34, '+' + heal, '#7bff9b', 13);
      }
      if (s.chain) chainZap(e.x, e.y, s.dmg * .4, s.chain, '#ffe066', s.owner, e);
      if (s.explode) explodeAt(e.x, e.y, s.explode, s.dmg * .5, s.owner, s.color);
    }
    // 挡子弹
    if (s.deflect) {
      for (const eb of world.ebullets) {
        if (eb.dead) continue;
        const d = dist(s.x, s.y, eb.x, eb.y);
        if (d > s.range + 10) continue;
        const a = angleTo(s.x, s.y, eb.x, eb.y);
        if (Math.abs(angDiff(a, s.angle)) > s.arc / 2) continue;
        eb.dead = true;
        FX.burst(eb.x, eb.y, 6, { color: s.color, speed: 140, life: .3, size: 2.4 });
        Sfx.play('shield');
        s.deflectCount = (s.deflectCount || 0) + 1;
      }
    }
    if (s.life <= 0) world.slashes.splice(i, 1);
  }
}

/* ---------------------------- 光束更新 ---------------------------- */
function updateBeams(dt) {
  for (let i = world.beams.length - 1; i >= 0; i--) {
    const b = world.beams[i];
    b.life -= dt;
    if (b.life <= 0) world.beams.splice(i, 1);
  }
}

/* ---------------------------- 召唤物（炮台） ---------------------------- */
class Turret {
  constructor(x, y, owner, opts = {}) {
    this.x = x; this.y = y; this.owner = owner;
    this.r = 14; this.life = opts.life || 14; this.maxLife = this.life;
    this.cd = .4; this.dmg = opts.dmg || 14; this.angle = -PI / 2;
    this.spawnT = .3;
  }
  update(dt) {
    this.life -= dt;
    this.cd -= dt;
    this.spawnT = Math.max(0, this.spawnT - dt);
    const target = nearestEnemy(this.x, this.y, 420);
    if (target) {
      this.angle = approachAngle(this.angle, angleTo(this.x, this.y, target.x, target.y), dt * 7);
      if (this.cd <= 0) {
        this.cd = .38;
        spawnBullet({
          x: this.x + Math.cos(this.angle) * 16, y: this.y + Math.sin(this.angle) * 16,
          angle: this.angle + rand(.05, -.05), speed: 780, dmg: this.dmg * (this.owner.dmgMul || 1),
          r: 4.5, life: 1.1, color: '#67e8ff', proj: 'bolt', owner: this.owner, kb: 30,
        });
        FX.burst(this.x + Math.cos(this.angle) * 20, this.y + Math.sin(this.angle) * 20, 3, { color: '#67e8ff', speed: 90, life: .15, size: 2 });
        Sfx.play('shoot');
      }
    }
    if (this.life <= 0) {
      FX.burst(this.x, this.y, 12, { color: '#67e8ff', speed: 140, life: .4, size: 3 });
    }
  }
  draw(g) {
    const k = 1 - this.spawnT / .3;
    g.save();
    g.translate(this.x, this.y);
    g.scale(k, k);
    g.save(); g.globalAlpha = .3; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(0, 12, 14, 5, 0, 0, TAU); g.fill(); g.restore();
    rrect(g, -11, -2, 22, 14, 4, '#3d4666');
    g.fillStyle = '#67e8ff'; g.fillRect(-9, 8, 18, 2.5);
    circ(g, 0, -4, 9, '#8f9bc4');
    g.save(); g.rotate(this.angle);
    px(g, 0, -4, 20, 7, '#b9c2d0');
    px(g, 16, -2.6, 6, 4, '#67e8ff');
    g.restore();
    g.save(); g.globalAlpha = .5; g.strokeStyle = '#67e8ff'; g.lineWidth = 1.4;
    g.beginPath();
    g.arc(0, 0, 15, -PI / 2, -PI / 2 + TAU * (this.life / this.maxLife)); g.stroke();
    g.restore();
    g.restore();
  }
}

/* ---------------------------- 掉落物 ---------------------------- */
class Pickup {
  constructor(type, x, y, opts = {}) {
    this.type = type; this.x = x; this.y = y;
    this.vx = opts.vx !== undefined ? opts.vx : rand(70, -70);
    this.vy = opts.vy !== undefined ? opts.vy : rand(70, -70);
    this.life = 60;
    this.t = 0; this.bob = rand(TAU);
    this.value = opts.value || 1;
    this.weapon = opts.weapon || null;
    this.price = opts.price || 0;
    this.dead = false;
    this.r = 14;
    this.label = opts.label || '';
    this.shop = !!opts.shop;
    this.heal = opts.heal || 0;
    this.energy = opts.energy || 0;
    this.magnet = true;
    this.spawnT = .25;
    if (['weapon', 'shopWeapon'].includes(type)) this.magnet = false;
    if (this.shop) this.magnet = false;
  }
  update(dt) {
    this.t += dt;
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx -= this.vx * 6 * dt; this.vy -= this.vy * 6 * dt;
    this.x = clamp(this.x, 44, VW - 44); this.y = clamp(this.y, 52, VH - 44);
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const p = world.player;
    if (!p || p.dead) return;
    const d = dist(this.x, this.y, p.x, p.y);
    // 磁吸
    if (this.magnet && !this.shop && d < (p.magnet || 90)) {
      const a = angleTo(this.x, this.y, p.x, p.y);
      const sp = 260 + (1 - d / (p.magnet || 90)) * 260;
      this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt;
    }
    if (this.magnet && !this.shop && d < 22) this.collect(p);
  }
  collect(p) {
    if (this.dead) return;
    this.dead = true;
    switch (this.type) {
      case 'coin':
        Game.addCoins(this.value);
        Sfx.play('coin');
        FX.text(this.x, this.y - 14, '+' + this.value, '#ffd257', 12);
        break;
      case 'energy':
        p.energy = Math.min(p.maxEnergy, p.energy + (this.energy || 20));
        Sfx.play('energy');
        FX.text(this.x, this.y - 14, '+' + (this.energy || 20) + ' 能量', '#a99cff', 12);
        break;
      case 'health':
        p.hp = Math.min(p.maxHp, p.hp + (this.heal || 25));
        Sfx.play('heal');
        FX.text(this.x, this.y - 14, '+' + (this.heal || 25), '#7bff9b', 13);
        FX.burst(this.x, this.y, 8, { color: '#7bff9b', speed: 90, life: .4, size: 3 });
        break;
      case 'armor':
        p.armor = Math.min(p.maxArmor, p.armor + 25);
        Sfx.play('heal');
        FX.text(this.x, this.y - 14, '+25 护甲', '#8fe6ff', 12);
        break;
      default: break;
    }
  }
  draw(g) {
    const bob = Math.sin(this.t * 4 + this.bob) * 2.5;
    const scale = this.spawnT > 0 ? .5 + (1 - this.spawnT / .25) * .5 : 1;
    const isShopItem = this.price > 0;
    let spr = null, size = 24;
    if (this.type === 'coin') { spr = propSprite('coin'); size = 16; }
    else if (this.type === 'energy') { spr = propSprite('energy'); size = isShopItem ? 30 : 20; }
    else if (this.type === 'health') { spr = propSprite('potionRed'); size = isShopItem ? 32 : 20; }
    else if (this.type === 'armor') { spr = propSprite('shieldOrb'); size = isShopItem ? 32 : 20; }
    else if (this.type === 'weapon' || this.type === 'shopWeapon') {
      const w = this.weapon;
      if (w) {
        const tc = tierColor(w.tier);
        // 光柱
        g.save();
        g.globalAlpha = .16 + Math.sin(this.t * 2.4) * .05;
        const grd = g.createLinearGradient(this.x, this.y - 52, this.x, this.y + 14);
        grd.addColorStop(0, withAlpha(tc, 0)); grd.addColorStop(1, withAlpha(tc, .6));
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(this.x - 21, this.y + 12); g.lineTo(this.x - 8, this.y - 52); g.lineTo(this.x + 8, this.y - 52); g.lineTo(this.x + 21, this.y + 12); g.closePath(); g.fill();
        g.restore();
        // 台座
        g.save();
        g.fillStyle = '#241e38';
        roundRect(g, this.x - 25, this.y + 7, 50, 10, 4); g.fill();
        g.strokeStyle = withAlpha(tc, .75); g.lineWidth = 1.2; g.stroke();
        g.globalAlpha = .45; g.fillStyle = tc;
        g.beginPath(); g.ellipse(this.x, this.y + 10, 19, 4.5, 0, 0, TAU); g.fill();
        g.restore();
        const icon = _spriteCache.get(weaponIconKey(w));
        if (icon) {
          g.save();
          g.globalAlpha = .7;
          g.fillStyle = 'rgba(10,8,18,.6)';
          roundRect(g, this.x - 28, this.y - 24 + bob, 56, 34, 6); g.fill();
          g.globalAlpha = 1;
          g.shadowBlur = 10; g.shadowColor = tc;
          g.drawImage(icon, this.x - 26, this.y - 21 + bob, 52, 31);
          g.restore();
        }
        return;
      }
    } else if (this.type === 'gem') { spr = propSprite('gem'); size = 16; }
    const img = spr ? _spriteCache.get(spr) : null;
    if (img) {
      if (isShopItem) {
        const pc = this.type === 'health' ? '#ff6f7d' : (this.type === 'armor' ? '#8fe6ff' : '#ffd257');
        g.save();
        g.fillStyle = '#241e38';
        roundRect(g, this.x - 24, this.y + 8, 48, 10, 4); g.fill();
        g.strokeStyle = withAlpha(pc, .75); g.lineWidth = 1.2; g.stroke();
        g.globalAlpha = .4; g.fillStyle = pc;
        g.beginPath(); g.ellipse(this.x, this.y + 11, 18, 4.5, 0, 0, TAU); g.fill();
        g.restore();
      }
      g.save();
      g.globalAlpha = .3; g.fillStyle = '#000';
      g.beginPath(); g.ellipse(this.x, this.y + 10, 8, 3, 0, 0, TAU); g.fill();
      g.restore();
      if (this.type === 'coin' || this.type === 'gem' || this.type === 'energy') {
        g.save(); g.shadowBlur = 8; g.shadowColor = this.type === 'coin' ? '#ffd257' : (this.type === 'energy' ? '#a99cff' : '#54e0ff');
        g.drawImage(img, this.x - size / 2, this.y - size / 2 + bob, size, size);
        g.restore();
      } else if (isShopItem) {
        g.save();
        g.globalAlpha = .3 + Math.sin(this.t * 2.5) * .08;
        g.fillStyle = this.type === 'health' ? '#ff6f7d' : '#8fe6ff';
        g.beginPath(); g.arc(this.x, this.y, 22, 0, TAU); g.fill();
        g.restore();
        g.drawImage(img, this.x - size / 2, this.y - size / 2 + bob, size, size);
      } else {
        g.drawImage(img, this.x - size / 2, this.y - size / 2 + bob, size, size);
      }
    }
  }
}

/* ---------------------------- 角色 / 特效绘制辅助 ---------------------------- */
function nearestEnemy(x, y, range = 9999, exclude = null) {
  let best = null, bd = range * range;
  for (const e of world.enemies) {
    if (e.dead || e === exclude) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function enemiesInRadius(x, y, r) {
  return world.enemies.filter(e => !e.dead && dist(x, y, e.x, e.y) < r);
}

/* 子弹绘制 */
function drawBullets(g) {
  for (const b of world.bullets) {
    g.save();
    g.translate(b.x, b.y);
    g.shadowBlur = 10; g.shadowColor = b.color;
    const c = b.color;
    switch (b.proj) {
      case 'arrow': {
        g.rotate(Math.atan2(b.vy, b.vx));
        px(g, -10, -1.6, 18, 3.2, '#e8d8b0');
        poly(g, [8, -4, 14, 0, 8, 4], c);
        px(g, -11, -3, 4, 1.6, '#e8d8b0'); px(g, -11, 1.4, 4, 1.6, '#e8d8b0');
        break;
      }
      case 'knife': {
        g.rotate(b.rot);
        poly(g, [-8, -1.6, 2, -4, 9, 0, 2, 4, -8, 1.6], '#dbe4f0');
        px(g, -9, -2, 3, 4, '#8f9bc4');
        break;
      }
      case 'shuriken': {
        g.rotate(b.rot * 4);
        for (let i = 0; i < 4; i++) {
          g.rotate(TAU / 4);
          poly(g, [0, -3, 10, 0, 0, 3], '#dbe4f0');
        }
        circ(g, 0, 0, 2, '#3d4554', false);
        break;
      }
      case 'chakram': {
        g.rotate(b.rot * 3);
        g.strokeStyle = c; g.lineWidth = 3.4;
        g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.stroke();
        g.strokeStyle = '#eef3fb'; g.lineWidth = 1.2;
        g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.stroke();
        for (let i = 0; i < 6; i++) { g.rotate(TAU / 6); px(g, 7, -1, 4, 2, '#eef3fb'); }
        break;
      }
      case 'boomerang': {
        g.rotate(b.rot * 4);
        g.strokeStyle = c; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.arc(-4, 0, 9, -1.1, 1.1); g.stroke();
        g.strokeStyle = '#ffe9a0'; g.lineWidth = 2;
        g.beginPath(); g.arc(-4, 0, 9, -1.1, 1.1); g.stroke();
        break;
      }
      case 'rocket': {
        g.rotate(Math.atan2(b.vy, b.vx));
        rrect(g, -9, -4, 16, 8, 2, '#b9c2d0');
        poly(g, [7, -4, 13, 0, 7, 4], '#ff5d6c');
        px(g, -12, -3, 4, 2, '#8f9bc4'); px(g, -12, 1, 4, 2, '#8f9bc4');
        g.globalAlpha = .7; circ(g, -12, 0, 3.4, '#ffa63d', false);
        break;
      }
      case 'grenade': {
        g.rotate(b.rot);
        circ(g, 0, 0, 5.4, '#4a5548');
        g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 5.4, 0, TAU); g.stroke();
        px(g, -1, -8, 2, 3, '#8f9b84');
        if (Math.sin(b.t * 25) > 0) circ(g, 0, -8, 1.6, '#ff5d6c', false);
        break;
      }
      case 'blackhole': {
        g.rotate(b.rot);
        g.globalAlpha = .85;
        circ(g, 0, 0, b.r, '#241a3a', false);
        g.strokeStyle = c; g.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          g.beginPath(); g.ellipse(0, 0, b.r + 4 + i * 3, b.r * .5 + i * 2, b.rot + i, 0, TAU); g.stroke();
        }
        circ(g, 0, 0, b.r * .35, '#ffffff', false);
        break;
      }
      case 'flame': {
        const k = clamp(b.life / b.maxLife, 0, 1);
        g.globalAlpha = k;
        circ(g, 0, 0, b.r * (0.5 + k * .8), c, false);
        circ(g, 0, 0, b.r * .45, '#fff6cf', false);
        break;
      }
      case 'acid': {
        circ(g, 0, 0, b.r, c, false);
        circ(g, -b.r * .3, -b.r * .3, b.r * .35, '#e6ffb0', false);
        break;
      }
      case 'bubble': {
        g.strokeStyle = c; g.lineWidth = 2;
        g.beginPath(); g.arc(0, 0, b.r, 0, TAU); g.stroke();
        g.globalAlpha = .3; g.fillStyle = c; g.fill();
        circ(g, -b.r * .35, -b.r * .35, b.r * .25, '#ffffff', false);
        break;
      }
      case 'ice': {
        g.rotate(b.rot);
        poly(g, [0, -b.r, b.r * .7, 0, 0, b.r, -b.r * .7, 0], c);
        poly(g, [0, -b.r * .5, b.r * .3, 0, 0, b.r * .5, -b.r * .3, 0], '#ffffff', false);
        break;
      }
      case 'bone': {
        g.rotate(Math.atan2(b.vy, b.vx));
        px(g, -b.r * 1.4, -b.r * .35, b.r * 2.8, b.r * .7, '#e8e2c8');
        circ(g, -b.r * 1.4, 0, b.r * .45, '#e8e2c8', false);
        circ(g, b.r * 1.4, 0, b.r * .45, '#e8e2c8', false);
        break;
      }
      case 'wave': {
        g.rotate(b.angle + PI / 2);
        g.strokeStyle = c; g.lineWidth = 4; g.globalAlpha = clamp(b.life * 2, 0, 1);
        g.beginPath(); g.arc(0, 8, 16, PI + .4, TAU - .4); g.stroke();
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.4; g.stroke();
        break;
      }
      case 'plasma': {
        circ(g, 0, 0, b.r * 1.15, c, false);
        circ(g, 0, 0, b.r * .6, '#ffffff', false);
        g.globalAlpha = .4; circ(g, 0, 0, b.r * 1.8, c, false);
        break;
      }
      case 'arcane': {
        circ(g, 0, 0, b.r * .9, c, false);
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.2;
        g.rotate(b.rot);
        g.beginPath(); g.arc(0, 0, b.r + 2, 0, 2.2); g.stroke();
        g.beginPath(); g.arc(0, 0, b.r + 2, PI, PI + 2.2); g.stroke();
        break;
      }
      case 'skull': {
        g.rotate(Math.atan2(b.vy, b.vx));
        circ(g, 0, 0, b.r * .9, '#e8e2c8', false);
        px(g, -b.r * .5, -b.r * .2, b.r * .35, b.r * .35, '#2a1e3a');
        px(g, b.r * .15, -b.r * .2, b.r * .35, b.r * .35, '#2a1e3a');
        break;
      }
      case 'nail': {
        g.rotate(Math.atan2(b.vy, b.vx));
        px(g, -b.r * 1.5, -1, b.r * 3, 2, '#dbe4f0');
        break;
      }
      case 'rock': {
        g.rotate(b.rot);
        poly(g, [-b.r, -b.r * .8, 0, -b.r, b.r, -b.r * .3, b.r * .7, b.r, -b.r * .4, b.r * .9, -b.r, b.r * .2], '#b6a894');
        px(g, -b.r * .4, -b.r * .3, b.r * .5, b.r * .4, '#8a7a66');
        break;
      }
      case 'rail': {
        g.rotate(Math.atan2(b.vy, b.vx));
        g.globalAlpha = .9;
        px(g, -24, -1.6, 34, 3.2, c);
        px(g, -24, -3.4, 34, 1, withAlpha(c, .5));
        break;
      }
      default: { // bolt
        const a = Math.atan2(b.vy, b.vx);
        g.rotate(a);
        px(g, -b.r * 2.4, -b.r * .45, b.r * 3.4, b.r * .9, c);
        circ(g, b.r * .6, 0, b.r * .9, '#ffffff', false);
        g.globalAlpha = .35; circ(g, 0, 0, b.r * 1.7, c, false);
      }
    }
    g.restore();
  }
}

function drawEnemyBullets(g) {
  for (const b of world.ebullets) {
    g.save();
    g.translate(b.x, b.y);
    g.shadowBlur = 12; g.shadowColor = b.color;
    const c = b.color;
    switch (b.proj) {
      case 'arrow':
        g.rotate(Math.atan2(b.vy, b.vx));
        px(g, -10, -1.4, 18, 2.8, '#e8d8b0');
        poly(g, [8, -3.4, 13, 0, 8, 3.4], c);
        break;
      case 'ice':
        g.rotate(b.rot);
        poly(g, [0, -b.r, b.r * .7, 0, 0, b.r, -b.r * .7, 0], c);
        break;
      case 'flame':
        g.globalAlpha = .9;
        circ(g, 0, 0, b.r * 1.1, c, false);
        circ(g, 0, 0, b.r * .55, '#fff6cf', false);
        break;
      case 'arcane':
        circ(g, 0, 0, b.r * .95, c, false);
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.globalAlpha = .7;
        g.beginPath(); g.arc(0, 0, b.r + 3, b.rot, b.rot + 2.4); g.stroke();
        break;
      case 'rocket':
        g.rotate(Math.atan2(b.vy, b.vx));
        rrect(g, -8, -3.6, 14, 7.2, 2, '#7d8798');
        poly(g, [6, -3.6, 11, 0, 6, 3.6], c);
        circ(g, -10, 0, 2.8, '#ffa63d', false);
        break;
      case 'grenade':
        g.rotate(b.rot);
        circ(g, 0, 0, 5.6, '#4a4a3a');
        g.strokeStyle = c; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, 5.6, 0, TAU); g.stroke();
        if (Math.sin(b.t * 30) > 0) { circ(g, 0, -7, 1.6, '#ff5d6c', false); }
        break;
      case 'bone':
        g.rotate(Math.atan2(b.vy, b.vx));
        px(g, -b.r * 1.5, -b.r * .3, b.r * 3, b.r * .6, c);
        circ(g, -b.r * 1.5, 0, b.r * .4, c, false);
        circ(g, b.r * 1.5, 0, b.r * .4, c, false);
        break;
      case 'rail':
        g.rotate(Math.atan2(b.vy, b.vx));
        px(g, -20, -1.4, 30, 2.8, c);
        break;
      default:
        circ(g, 0, 0, b.r, c, false);
        circ(g, 0, 0, b.r * .5, '#ffffff', false);
        g.globalAlpha = .35; circ(g, 0, 0, b.r * 1.8, c, false);
    }
    g.restore();
  }
}

/* 光束绘制 */
function drawBeams(g) {
  for (const b of world.beams) {
    const a = clamp(b.life / (b.maxLife || .15), 0, 1);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = a;
    g.strokeStyle = b.color || '#67e8ff';
    g.shadowBlur = 18; g.shadowColor = b.color || '#67e8ff';
    g.lineCap = 'round';
    if (b.x2 !== undefined) {
      g.lineWidth = b.width || 3;
      g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x2, b.y2); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, (b.width || 3) * .35);
      g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x2, b.y2); g.stroke();
    } else {
      const len = b.len || 600;
      const ex = b.x + Math.cos(b.angle) * len, ey = b.y + Math.sin(b.angle) * len;
      g.lineWidth = (b.width || 8) * (0.5 + a * .5);
      g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = Math.max(1, (b.width || 8) * .3);
      g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(ex, ey); g.stroke();
      // 枪口
      g.fillStyle = b.color || '#67e8ff'; g.globalAlpha = a * .5;
      g.beginPath(); g.arc(b.x, b.y, (b.width || 8) * .8, 0, TAU); g.fill();
    }
    g.restore();
  }
}

/* 挥砍绘制 */
function drawSlashes(g) {
  for (const s of world.slashes) {
    const k = 1 - s.life / s.maxLife;
    g.save();
    g.translate(s.x, s.y);
    g.rotate(s.angle);
    g.globalCompositeOperation = 'lighter';
    const alpha = Math.sin(Math.min(1, k) * PI);
    g.globalAlpha = .55 * alpha;
    g.strokeStyle = s.color || '#fff';
    g.lineWidth = 6 * (1 - k * .6);
    g.beginPath();
    g.arc(0, 0, s.range * .8, -s.arc / 2 + k * s.arc * .8, s.arc / 2 - s.arc * .0 + k * s.arc * .8);
    g.stroke();
    g.globalAlpha = .8 * alpha;
    g.strokeStyle = '#ffffff'; g.lineWidth = 2 * (1 - k);
    g.beginPath();
    g.arc(0, 0, s.range * .95, -s.arc / 2 + k * s.arc * .8, s.arc / 2 + k * s.arc * .8);
    g.stroke();
    g.restore();
  }
}

/* 区域效果绘制 */
function drawEffects(g) {
  const t = performance.now() / 1000;
  for (const ef of world.effects) {
    if (ef.type === 'meteorWarn') {
      const k = clamp(ef.t / ef.delay, 0, 1);
      g.save();
      g.strokeStyle = ef.color || '#ff6b2c';
      g.globalAlpha = .45 + Math.sin(ef.t * 18) * .15;
      g.lineWidth = 2;
      g.beginPath(); g.arc(ef.x, ef.y, ef.r, 0, TAU); g.stroke();
      g.globalAlpha = .18 + k * .3;
      g.fillStyle = ef.color || '#ff6b2c';
      g.beginPath(); g.arc(ef.x, ef.y, ef.r * k, 0, TAU); g.fill();
      g.globalAlpha = .8;
      g.strokeStyle = '#ffffff'; g.lineWidth = 1;
      g.beginPath(); g.arc(ef.x, ef.y, ef.r * .55, 0, TAU); g.stroke();
      g.restore();
      if (ef.ice) {
        g.save(); g.globalAlpha = .5;
        poly(g, [ef.x, ef.y - ef.r * .5, ef.x + ef.r * .4, ef.y, ef.x, ef.y + ef.r * .5, ef.x - ef.r * .4, ef.y], '#c4ecff');
        g.restore();
      }
    } else if (ef.type === 'poisonCloud') {
      g.save();
      const a = clamp(ef.life / ef.maxLife, 0, 1);
      g.globalAlpha = .18 * a;
      g.fillStyle = '#a6ff6b';
      g.beginPath(); g.arc(ef.x, ef.y, ef.r, 0, TAU); g.fill();
      g.globalAlpha = .45 * a + Math.sin(t * 6) * .1;
      g.strokeStyle = '#a6ff6b'; g.lineWidth = 2; g.setLineDash([6, 6]);
      g.beginPath(); g.arc(ef.x, ef.y, ef.r, 0, TAU); g.stroke();
      g.setLineDash([]);
      g.restore();
    }
  }
}

/* 掉落物 UI 提示（世界内） */
function drawPickupLabels(g) {
  const p = world.player;
  if (!p || p.dead) return;
  for (const pk of world.pickups) {
    if (pk.dead) continue;
    const isWeapon = pk.type === 'weapon' || pk.type === 'shopWeapon';
    const isShop = pk.price > 0;
    if (!isWeapon && !isShop) continue;
    const d = dist(pk.x, pk.y, p.x, p.y);
    if (!isShop && d > 90) continue;
    const w = pk.weapon;
    const nm = isWeapon && w ? w.name : (pk.type === 'health' ? '治疗药水' : (pk.type === 'armor' ? '护甲充能' : (pk.type === 'energy' ? '能量水晶' : '物品')));
    const col = w ? tierColor(w.tier) : (pk.type === 'health' ? '#ff6f7d' : (pk.type === 'armor' ? '#8fe6ff' : '#ffd257'));
    const label = isShop ? `${nm}  ${pk.price}G` : `E 拾取 ${nm}`;
    const y = Math.max(26, pk.y - (isWeapon ? 56 : 34));
    g.save();
    g.font = '700 12px "Microsoft YaHei", system-ui, sans-serif';
    const tw = g.measureText(label).width;
    const bx = clamp(pk.x - tw / 2 - 9, 6, VW - tw - 24);
    const by = y - 11;
    g.globalAlpha = isShop ? .95 : .85;
    g.fillStyle = 'rgba(10,8,18,.94)';
    roundRect(g, bx, by, tw + 18, 22, 5); g.fill();
    g.strokeStyle = col; g.lineWidth = 1.4; g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, bx + tw / 2 + 9, by + 12);
    g.restore();
  }
}
