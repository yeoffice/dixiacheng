'use strict';
/* =====================================================================
   角色 / 技能 / 玩家控制
   ===================================================================== */

const CHARACTERS = [
  {
    id: 'knight', name: '骑士', title: '钢铁壁垒', color: '#67e8ff',
    hp: 130, armor: 110, energy: 100, speed: 158, crit: .05,
    startWeapon: 'sword', cost: 0,
    skill: { id: 'charge', name: '无敌冲锋', cd: 8, energy: 15, desc: '向前冲锋，撞飞沿途敌人，期间无敌。' },
    desc: '最可靠的近战先锋。护甲恢复更快。',
    perk: { armorRegenMul: 1.3 },
  },
  {
    id: 'ranger', name: '游侠', title: '风之射手', color: '#7bff9b',
    hp: 100, armor: 90, energy: 120, speed: 172, crit: .12,
    startWeapon: 'shortbow', cost: 0,
    skill: { id: 'rapid', name: '疾风连射', cd: 10, energy: 20, desc: '5 秒内射速提升 140%，暴击提升。' },
    desc: '轻盈的远程猎手，暴击率天生更高。',
    perk: { crit: .06 },
  },
  {
    id: 'mage', name: '法师', title: '奥术低语', color: '#b98cff',
    hp: 88, armor: 86, energy: 170, speed: 162, crit: .08,
    startWeapon: 'gnarledStaff', cost: 0,
    skill: { id: 'nova', name: '奥术新星', cd: 9, energy: 25, desc: '以自身为中心引爆奥术冲击，清空周围弹幕。' },
    desc: '能量上限极高，越战越强的法术机关枪。',
    perk: { energyRegen: 3 },
  },
  {
    id: 'alchemist', name: '炼金术士', title: '瓶中之灾', color: '#a6ff6b',
    hp: 104, armor: 96, energy: 120, speed: 165, crit: .07,
    startWeapon: 'bubblegun', cost: 150,
    skill: { id: 'poison', name: '剧毒风暴', cd: 10, energy: 20, desc: '在目标区域倾泻毒瓶，并对自身少量治疗。' },
    desc: '用瓶子解决问题。毒云可以持续压制一整片区域。',
    perk: { poisonBonus: 1.3 },
  },
  {
    id: 'engineer', name: '工程师', title: '火力工坊', color: '#ffc93c',
    hp: 112, armor: 120, energy: 120, speed: 155, crit: .06,
    startWeapon: 'nailgun', cost: 200,
    skill: { id: 'turret', name: '部署炮台', cd: 14, energy: 30, desc: '在身旁架设两座自动炮台，持续 15 秒。' },
    desc: '护甲厚实，善用炮台制造交叉火力。',
    perk: { armor: 10 },
  },
  {
    id: 'assassin', name: '刺客', title: '无声之刃', color: '#ff5d6c',
    hp: 90, armor: 78, energy: 130, speed: 186, crit: .2,
    startWeapon: 'twinDagger', cost: 250,
    skill: { id: 'shadow', name: '影袭', cd: 8, energy: 15, desc: '瞬移到瞄准方向，获得短暂无敌与大量暴击。' },
    desc: '脆皮但致命，暴击与移速极高。',
    perk: { crit: .1 },
  },
  {
    id: 'paladin', name: '圣骑士', title: '不灭圣光', color: '#ffe066',
    hp: 150, armor: 140, energy: 90, speed: 145, crit: .05,
    startWeapon: 'battleAxe', cost: 300,
    skill: { id: 'holy', name: '圣盾庇护', cd: 12, energy: 25, desc: '获得可吸收 90 点伤害的护盾并恢复 25 点生命。' },
    desc: '最坚硬的职业，嘲讽所有伤害。',
    perk: { armorRegenMul: 1.15, thorns: .12 },
  },
  {
    id: 'gunner', name: '枪炮手', title: '弹幕狂潮', color: '#ff9a4d',
    hp: 118, armor: 100, energy: 110, speed: 160, crit: .09,
    startWeapon: 'revolver', cost: 350,
    skill: { id: 'barrage', name: '弹幕风暴', cd: 11, energy: 25, desc: '向四周倾泻 26 发子弹，短时间内射速大增。' },
    desc: '为火力而生的雇佣兵，什么枪都拿得稳。',
    perk: { rangedMul: 1.08 },
  },
];

const CHAR_BY_ID = {};
for (const c of CHARACTERS) CHAR_BY_ID[c.id] = c;

/* =====================================================================
   技能
   ===================================================================== */
const SKILLS = {
  charge(p) {
    p.chargeT = .34;
    p.chargeAngle = p.aimAngle;
    p.invuln = Math.max(p.invuln, 1.2);
    p.chargeHit = new Set();
    Camera.addShake(5);
    Sfx.play('dash');
    FX.ring(p.x, p.y, '#8fe6ff', 8, 44, .3, 4);
  },
  rapid(p) {
    p.rapidT = 5;
    p.crit += .1;
    p._rapidCrit = (p._rapidCrit || 0) + .1;
    p.fireRateMul *= .42;
    p._rapidRate = (p._rapidRate || 1) * .42;
    Sfx.play('skill');
    FX.ring(p.x, p.y, '#7bff9b', 10, 60, .4, 4);
    FX.burst(p.x, p.y, 16, { color: '#7bff9b', speed: 160, life: .5, size: 3, glow: true });
  },
  nova(p) {
    const R = 180;
    FX.ring(p.x, p.y, '#b98cff', 14, R, .5, 8);
    FX.burst(p.x, p.y, 36, { color: '#b98cff', speed: 340, life: .7, size: 4.4, glow: true });
    Camera.addShake(12);
    Camera.flashScreen('#b98cff', .25);
    Sfx.play('explode');
    for (const e of world.enemies) {
      if (e.dead) continue;
      if (dist(p.x, p.y, e.x, e.y) < R + e.r) {
        e.hurt(55 * (p.dmgMul || 1) * (p.magicMul || 1), { owner: p, color: '#b98cff', kb: 180, effect: { type: 'slow', dur: 2, power: .5 } });
      }
    }
    for (const b of world.ebullets) if (dist(p.x, p.y, b.x, b.y) < R) b.dead = true;
  },
  poison(p) {
    const a = p.aimAngle;
    const tx = clamp(p.x + Math.cos(a) * 150, 70, VW - 70), ty = clamp(p.y + Math.sin(a) * 150, 70, VH - 70);
    for (let i = 0; i < 6; i++) {
      const x = clamp(tx + rand(110, -110), 50, VW - 50), y = clamp(ty + rand(100, -100), 50, VH - 50);
      world.effects.push({ type: 'poisonCloud', x, y, r: rand(70, 46), life: 6.5, maxLife: 6.5, dmg: 7 * (p.dmgMul || 1), owner: p });
      FX.ring(x, y, '#a6ff6b', 6, 70, .5, 3);
    }
    p.hp = Math.min(p.maxHp, p.hp + 20);
    FX.text(p.x, p.y - 36, '+20', '#7bff9b', 14);
    Sfx.play('burn');
    Camera.addShake(4);
  },
  turret(p) {
    for (let i = 0; i < 2; i++) {
      const a = i / 2 * TAU + rand(.6);
      let x = clamp(p.x + Math.cos(a) * 46, 60, VW - 60);
      let y = clamp(p.y + Math.sin(a) * 46, 60, VH - 60);
      let tries = 0;
      while (!canStand(x, y, 14) && tries < 10) {
        x = clamp(p.x + rand(70, -70), 60, VW - 60);
        y = clamp(p.y + rand(70, -70), 60, VH - 60);
        tries++;
      }
      world.summons.push(new Turret(x, y, p, { life: 15, dmg: 15 * (p.dmgMul || 1) }));
      FX.ring(x, y, '#67e8ff', 6, 40, .4, 3);
    }
    Sfx.play('skill');
  },
  shadow(p) {
    const a = p.aimAngle;
    const fromX = p.x, fromY = p.y;
    let tx = p.x, ty = p.y;
    for (let d = 210; d > 0; d -= 14) {
      const nx = p.x + Math.cos(a) * d, ny = p.y + Math.sin(a) * d;
      if (canStand(nx, ny, p.r)) { tx = nx; ty = ny; break; }
    }
    FX.burst(fromX, fromY, 18, { color: '#ff5d6c', speed: 160, life: .4, size: 3 });
    p.x = tx; p.y = ty;
    p.invuln = Math.max(p.invuln, .9);
    p.crit += .4;
    p._shadowCrit = (p._shadowCrit || 0) + .4;
    p.shadowT = 4;
    FX.burst(p.x, p.y, 22, { color: '#ff5d6c', speed: 200, life: .5, size: 3.4, glow: true });
    FX.ring(p.x, p.y, '#ff5d6c', 10, 50, .35, 4);
    Camera.addShake(6);
    Sfx.play('dash');
    // 落点斩击
    world.slashes.push({
      x: p.x, y: p.y, angle: a, arc: TAU, range: 60, dmg: 30 * (p.meleeMul || 1) * (p.dmgMul || 1),
      life: .2, maxLife: .2, owner: p, isCrit: false, color: '#ff5d6c', weapon: null,
      hit: new Set(), deflect: true, kb: 200, hitCount: 0, delay: 0,
    });
  },
  holy(p) {
    p.shieldHp = (p.shieldHp || 0) + 90;
    p.hp = Math.min(p.maxHp, p.hp + 25);
    p.shieldT = 10;
    FX.ring(p.x, p.y, '#ffe066', 10, 70, .6, 5);
    FX.burst(p.x, p.y, 24, { color: '#ffe066', speed: 160, life: .7, size: 3.4, glow: true });
    FX.text(p.x, p.y - 38, '+25', '#7bff9b', 15);
    Sfx.play('levelup');
  },
  barrage(p) {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + rand(.1);
      const sp = 620;
      spawnBullet({
        x: p.x + Math.cos(a) * 18, y: p.y + Math.sin(a) * 18,
        angle: a, speed: sp, dmg: 12 * (p.dmgMul || 1) * (p.rangedMul || 1),
        r: 5, life: .82, color: '#ff9a4d', proj: 'bolt', owner: p, kb: 40,
      });
    }
    p.rapidT = Math.max(p.rapidT || 0, 3.5);
    p.fireRateMul *= .55;
    p._barrageRate = (p._barrageRate || 1) * .55;
    p.barrageT = 3.5;
    Camera.addShake(6);
    Sfx.play('skill');
  },
};

/* =====================================================================
   Player
   ===================================================================== */
class Player {
  constructor(charId, x, y) {
    const c = CHAR_BY_ID[charId] || CHARACTERS[0];
    this.char = c;
    this.charId = c.id;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.r = 12;
    this.maxHp = c.hp + (c.perk.hp || 0);
    this.hp = this.maxHp;
    this.maxArmor = c.armor + (c.perk.armor || 0);
    this.armor = this.maxArmor;
    this.maxEnergy = c.energy + (c.perk.energy || 0);
    this.energy = this.maxEnergy;
    this.baseSpeed = c.speed * (c.perk.speed || 1);
    this.speed = this.baseSpeed;
    this.crit = c.crit + (c.perk.crit || 0);
    this.critMul = 2;
    this.dmgMul = 1;
    this.rangedMul = c.perk.rangedMul || 1;
    this.meleeMul = 1;
    this.magicMul = 1;
    this.fireRateMul = 1;
    this.magnet = 92;
    this.lifesteal = 0;
    this.thorns = c.perk.thorns || 0;
    this.pierceBonus = 0; this.bounceBonus = 0; this.countBonus = 0;
    this.homingBonus = 0;
    this.burnChance = 0; this.freezeChance = 0; this.poisonChance = 0; this.explodeChance = 0; this.chainBonus = 0;
    this.coinMul = 1;
    this.energyOnKill = 0; this.armorOnKill = 0;
    this.skillCdMul = 1; this.dashCdMul = 1;
    this.armorRegenMul = c.perk.armorRegenMul || 1;
    this.energyRegen = (c.perk.energyRegen || 0) + 8;
    this.poisonBonus = c.perk.poisonBonus || 1;
    this.revive = 0;
    this.aimAngle = 0;
    this.weapons = [makeWeaponInstance(WEAPON_BY_ID[c.startWeapon] || WEAPONS[0], 1, 0), null];
    this.slot = 0;
    this.skillCd = 0;
    this.skillCdMax = c.skill.cd;
    this.dashCd = 0;
    this.dashT = 0; this.dashSpeed = 0; this.dashAngle = 0;
    this.chargeT = 0; this.chargeAngle = 0;
    this.invuln = 0;
    this.armorDelay = 0;
    this.burn = 0; this.burnDps = 0; this.poison = 0; this.poisonDps = 0;
    this.slowT = 0;
    this.shieldHp = 0; this.shieldT = 0;
    this.rapidT = 0; this.shadowT = 0;
    this.walkT = 0;
    this.moving = false;
    this.dead = false;
    this.recoil = 0;
    this.muzzle = 0;
    this.hitFlash = 0;
    this.dashTrails = [];
    this.kills = 0;
    this.damageDealt = 0;
    this.floorKills = 0;
    this.roomKills = 0;
    this.poisonT = 0;
    this.hintCd = 0;
    this.barrageT = 0;
    this.floorHeal = 0;
    this.spawnT = .5;
    this.deathT = 0;
  }

  get alive() { return !this.dead; }
  weapon() { return this.weapons[this.slot]; }

  /* --------- 装备 --------- */
  giveWeapon(w, slot) {
    if (slot === undefined) slot = this.slot;
    const old = this.weapons[slot];
    w.cd = Math.max(w.cd || 0, .2);
    this.weapons[slot] = w;
    return old;
  }
  swapWeapon(slot) {
    if (slot === this.slot) return;
    if (!this.weapons[slot]) return;
    this.slot = slot;
    Sfx.play('select');
    FX.ring(this.x, this.y, '#ffd257', 6, 26, .25, 2);
  }
  nextWeapon() {
    const other = 1 - this.slot;
    if (this.weapons[other]) this.swapWeapon(other);
  }

  /* --------- 状态 --------- */
  applyStatus(effect) {
    if (!effect) return;
    switch (effect.type) {
      case 'burn': this.burn = Math.max(this.burn, effect.dur || 2); this.burnDps = Math.max(this.burnDps, (effect.power || 3) * .8); break;
      case 'poison': this.poison = Math.max(this.poison, effect.dur || 3); this.poisonDps = Math.max(this.poisonDps, (effect.power || 3) * .8); break;
      case 'slow': this.slowT = Math.max(this.slowT, effect.dur || 1.5); break;
      case 'freeze': this.slowT = Math.max(this.slowT, (effect.dur || 1.2)); break;
    }
  }

  hurt(dmg, src) {
    if (this.dead || this.invuln > 0) return;
    let final = dmg;
    // 圣盾
    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, final);
      this.shieldHp -= absorbed; final -= absorbed;
      FX.text(this.x, this.y - 34, '-' + Math.round(absorbed), '#8fe6ff', 13);
      FX.burst(this.x, this.y, 5, { color: '#8fe6ff', speed: 120, life: .3, size: 2.4 });
      if (final <= 0) { this.invuln = .35; Sfx.play('shield'); return; }
    }
    // 护甲优先
    if (this.armor > 0) {
      const ab = Math.min(this.armor, final);
      this.armor -= ab; final -= ab;
    }
    if (final > 0) {
      this.hp -= final;
      this.hitFlash = .18;
      Camera.flashScreen('#ff5d6c', .18);
      FX.text(this.x + rand(10, -10), this.y - 34, '-' + Math.round(final), DMG_COLOR.player, 16, { crit: true });
    } else {
      FX.text(this.x + rand(10, -10), this.y - 34, '护甲', '#8fe6ff', 12);
    }
    this.invuln = .6;
    this.armorDelay = 3.6;
    this.shieldT = Math.max(this.shieldT, 2);
    Camera.addShake(7);
    Sfx.play('hurt');
    FX.burst(this.x, this.y, 8, { color: '#ff5d6c', speed: 150, life: .4, size: 3 });
    if (src && this.thorns > 0 && src.hurt) {
      src.hurt(dmg * this.thorns, { owner: this, color: '#ffe066', ignoreShield: true });
    }
    if (this.hp <= 0) {
      if (this.revive > 0) {
        this.revive--;
        this.hp = this.maxHp * .6;
        this.armor = this.maxArmor;
        this.invuln = 2;
        this.hp = Math.round(this.hp);
        FX.ring(this.x, this.y, '#ffd257', 20, 200, .8, 8);
        FX.text(this.x, this.y - 40, '复活！', '#ffd257', 26, { life: 1.4 });
        Camera.flashScreen('#ffffff', .6);
        Sfx.play('levelup');
      } else {
        this.hp = 0;
        this.die();
      }
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deathT = 0;
    Sfx.play('death');
    Camera.addShake(16);
    Camera.flashScreen('#ff5d6c', .5);
    FX.burst(this.x, this.y, 40, { color: '#ff5d6c', speed: 260, life: 1, size: 4, grav: 220 });
    FX.ring(this.x, this.y, '#ffffff', 10, 160, .6, 5);
    if (Game && Game.onPlayerDeath) Game.onPlayerDeath();
  }

  triggerSkill() {
    if (this.dead) return;
    if (this.skillCd > 0) { if (typeof UI !== 'undefined') UI.toast('技能冷却中', '#8f88aa'); return; }
    const sk = this.char.skill;
    if (this.energy < sk.energy) { if (typeof UI !== 'undefined') UI.hintEnergy(); return; }
    this.energy -= sk.energy;
    this.skillCd = sk.cd * this.skillCdMul;
    this.skillCdMax = this.skillCd;
    SKILLS[sk.id] && SKILLS[sk.id](this);
    if (typeof UI !== 'undefined') UI.toast(sk.name + '！', this.char.color);
    Camera.flashScreen(this.char.color, .18);
  }

  /* --------- 更新 --------- */
  update(dt) {
    if (this.dead) { this.deathT += dt; return; }
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.muzzle = Math.max(0, this.muzzle - dt);
    this.recoil = Math.max(0, this.recoil - dt * 30);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.hintCd = Math.max(0, this.hintCd - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    if (this.shieldT <= 0) this.shieldHp = Math.max(0, this.shieldHp - dt * 30);
    this.slowT = Math.max(0, this.slowT - dt);
    this.burn = Math.max(0, this.burn - dt);
    this.poison = Math.max(0, this.poison - dt);
    this.rapidT = Math.max(0, this.rapidT - dt);
    this.shadowT = Math.max(0, this.shadowT - dt);

    // 状态伤害
    this.dotT = (this.dotT || 0) - dt;
    if (this.dotT <= 0 && (this.burn > 0 || this.poison > 0)) {
      this.dotT = .6;
      if (this.burn > 0) { this.hp -= this.burnDps * .6; FX.trail(this.x, this.y - 10, '#ffa63d', 3, .3); }
      if (this.poison > 0) { this.hp -= this.poisonDps * .6; FX.trail(this.x, this.y - 10, '#a6ff6b', 3, .3); }
      if (this.hp <= 0) this.die();
    }
    if (this.burn <= 0) this.burnDps = 0;
    if (this.poison <= 0) this.poisonDps = 0;

    // 临时 buff 回复
    this.barrageT = Math.max(0, this.barrageT - dt);
    if (this.rapidT <= 0 && this._rapidCrit) { this.crit -= this._rapidCrit; this._rapidCrit = 0; }
    if (this.rapidT <= 0 && this._rapidRate) { this.fireRateMul /= this._rapidRate; this._rapidRate = 0; }
    if (this.shadowT <= 0 && this._shadowCrit) { this.crit -= this._shadowCrit; this._shadowCrit = 0; }
    if (this.barrageT <= 0 && this._barrageRate) { this.fireRateMul /= this._barrageRate; this._barrageRate = 0; }

    // 能量恢复
    this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegen * dt);
    // 护甲恢复
    this.armorDelay = Math.max(0, this.armorDelay - dt);
    if (this.armorDelay <= 0 && this.armor < this.maxArmor) {
      this.armor = Math.min(this.maxArmor, this.armor + 15 * this.armorRegenMul * dt);
    }

    // 瞄准
    if (!Input.touchMode) this.aimAngle = Input.aim.angle;
    else this.aimAngle = Input.aim.angle;
    if (Input.stickAim) this.aimAngle = Input.aim.angle;
    // 瞄准辅助：轻微吸附到附近的敌人，提升手感
    const assist = nearestEnemy(this.x, this.y, Input.touchMode ? 560 : 480);
    if (assist) {
      const want = angleTo(this.x, this.y, assist.x, assist.y);
      const diff = angDiff(want, this.aimAngle);
      const range = Input.touchMode ? .3 : .17;
      if (Math.abs(diff) < range) this.aimAngle += diff * (Input.touchMode ? .8 : .55);
    }

    // 冲刺
    if (Input.wasPressed('Space') && this.dashCd <= 0 && this.dashT <= 0) {
      let a = this.aimAngle;
      if (Input.move.x || Input.move.y) a = Math.atan2(Input.move.y, Input.move.x);
      this.dashT = .16;
      this.dashSpeed = 620;
      this.dashAngle = a;
      this.dashCd = .85 * this.dashCdMul;
      this.invuln = Math.max(this.invuln, .3);
      Sfx.play('dash');
      FX.burst(this.x, this.y, 8, { color: this.char.color, speed: 100, life: .3, size: 3, angle: a + PI, spread: 1.4 });
    }

    // 移动
    let mx = Input.move.x, my = Input.move.y;
    this.moving = (mx !== 0 || my !== 0);

    if (this.chargeT > 0) {
      this.chargeT -= dt;
      const sp = 760;
      const ox = this.x, oy = this.y;
      moveActor(this, Math.cos(this.chargeAngle) * sp * dt, Math.sin(this.chargeAngle) * sp * dt);
      this.dashTrails.push({ x: this.x, y: this.y, t: .25, a: this.chargeAngle });
      for (const e of world.enemies) {
        if (e.dead || this.chargeHit.has(e)) continue;
        if (dist(this.x, this.y, e.x, e.y) < this.r + e.r + 8) {
          this.chargeHit.add(e);
          e.hurt(38 * (this.dmgMul || 1) + this.maxHp * .04, { owner: this, color: '#8fe6ff', kb: 460, crit: false });
          FX.burst(e.x, e.y, 10, { color: '#8fe6ff', speed: 200, life: .4, size: 3 });
          Sfx.play('hit');
        }
      }
    } else if (this.dashT > 0) {
      this.dashT -= dt;
      moveActor(this, Math.cos(this.dashAngle) * this.dashSpeed * dt, Math.sin(this.dashAngle) * this.dashSpeed * dt);
      this.dashTrails.push({ x: this.x, y: this.y, t: .22, a: this.dashAngle });
    } else {
      let sp = this.speed * (this.slowT > 0 ? .55 : 1);
      if (this.moving) {
        moveActor(this, mx * sp * dt, my * sp * dt);
        this.walkT += dt * (1 + Math.hypot(mx, my));
        if (this.slowT <= 0 && Math.random() < dt * 8) {
          FX.trail(this.x + rand(5, -5), this.y + this.r * .8, '#8a7a6a', 2, .25);
        }
      } else {
        this.walkT += dt * 2;
      }
    }
    this.vx = (this.x - (this._px === undefined ? this.x : this._px)) / Math.max(dt, 1e-4);
    this.vy = (this.y - (this._py === undefined ? this.y : this._py)) / Math.max(dt, 1e-4);
    this._px = this.x; this._py = this.y;

    // 冲刺拖影
    for (let i = this.dashTrails.length - 1; i >= 0; i--) {
      this.dashTrails[i].t -= dt;
      if (this.dashTrails[i].t <= 0) this.dashTrails.splice(i, 1);
    }

    // 技能
    if (Input.wasPressed('KeyQ')) this.triggerSkill();

    // 切换武器
    if (Input.wasPressed('Digit1')) this.swapWeapon(0);
    if (Input.wasPressed('Digit2')) this.swapWeapon(1);
    if (Input.wheel) this.nextWeapon();

    // 射击
    const w = this.weapon();
    if (w) {
      w.cd = Math.max(0, (w.cd || 0) - dt);
      if (Input.firing && w.cd <= 0) {
        const rateMul = this.fireRateMul * (w.kind === 'melee' ? (this.meleeSpeedMul || 1) : 1);
        let ok = false;
        if (w.kind === 'melee') {
          ok = meleeAttack(w, this, this.aimAngle);
        } else {
          ok = fireWeapon(w, this, this.aimAngle);
        }
        if (ok) {
          w.cd = 1 / Math.max(.05, w.rate * rateMul);
          this.muzzle = .06;
        } else {
          w.cd = .3;
        }
      }
    }
    // 换弹 / 空闲武器冷却
    for (const wp of this.weapons) if (wp && wp !== w) wp.cd = Math.max(0, (wp.cd || 0) - dt);
  }

  /* --------- 绘制 --------- */
  draw(g) {
    if (this.dead) {
      // 倒地
      g.save();
      g.globalAlpha = clamp(1 - this.deathT * .4, 0, 1);
      g.translate(this.x, this.y);
      g.rotate(PI / 2 * Math.min(1, this.deathT * 2));
      g.drawImage(_spriteCache.get(playerSprite(this.charId, 0)), -20, -20, 40, 40);
      g.restore();
      return;
    }
    // 拖影
    for (const t of this.dashTrails) {
      g.save();
      g.globalAlpha = t.t * 1.6;
      g.globalCompositeOperation = 'lighter';
      const spr = _spriteCache.get(playerSprite(this.charId, 0));
      g.drawImage(spr, t.x - 18, t.y - 22, 36, 36);
      g.restore();
    }
    const bob = this.moving ? Math.sin(this.walkT * 9) * 1.6 : Math.sin(this.walkT * 2.4) * .8;
    const frame = this.moving && Math.sin(this.walkT * 9) > 0 ? 1 : 0;
    const spr = _spriteCache.get(playerSprite(this.charId, frame));
    const flip = Math.cos(this.aimAngle) < 0;

    // 圣盾
    if (this.shieldHp > 0) {
      g.save();
      g.globalAlpha = .28 + Math.sin(performance.now() / 200) * .06;
      g.fillStyle = '#ffe066';
      g.beginPath(); g.arc(this.x, this.y - 2, 24, 0, TAU); g.fill();
      g.globalAlpha = .8; g.strokeStyle = '#fff6cf'; g.lineWidth = 1.6;
      g.beginPath(); g.arc(this.x, this.y - 2, 24, 0, TAU); g.stroke();
      g.restore();
    }
    // 影子
    g.save(); g.globalAlpha = .32; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(this.x, this.y + 12, 11, 4, 0, 0, TAU); g.fill(); g.restore();

    // 身体
    g.save();
    g.translate(this.x - Math.cos(this.aimAngle) * this.recoil * .4, this.y + bob - this.recoil * .2);
    if (flip) g.scale(-1, 1);
    if (spr) {
      // 黑色描边 + 角色色轮廓，保证在暗色地板上清晰可见
      const out = tintedSprite('pout_' + this.charId + frame, spr, '#06050a');
      const rim = tintedSprite('prim_' + this.charId + frame, spr, this.char.color);
      g.globalAlpha = this.hitFlash > 0 ? .85 : 1;
      g.drawImage(out, -19.5, -23.5, 39, 39);
      g.globalAlpha = .5;
      g.drawImage(rim, -18.6, -22.6, 37.2, 37.2);
      g.globalAlpha = (this.invuln > 0 && Math.sin(performance.now() / 40) > 0) ? .62 : 1;
      g.drawImage(spr, -18, -22, 36, 36);
    }
    g.restore();

    // 光环（角色色）
    g.save();
    g.globalAlpha = .16 + Math.sin(performance.now() / 350) * .04;
    g.fillStyle = this.char.color;
    g.beginPath(); g.ellipse(this.x, this.y + 12, 16, 5, 0, 0, TAU); g.fill();
    g.restore();

    // 武器
    const w = this.weapon();
    if (w) {
      const key = weaponIconKey(w);
      const icon = _spriteCache.get(key);
      if (icon) {
        g.save();
        g.translate(this.x + Math.cos(this.aimAngle) * 9, this.y - 2 + Math.sin(this.aimAngle) * 9);
        g.rotate(this.aimAngle);
        g.scale(.95, .95);
        const kick = this.muzzle > 0 ? -4 : 0;
        g.drawImage(icon, -6 + kick, -11, 38, 22);
        g.restore();
      }
      // 枪口闪光
      if (this.muzzle > 0 && w.kind !== 'melee') {
        const mx = this.x + Math.cos(this.aimAngle) * 32, my = this.y - 2 + Math.sin(this.aimAngle) * 32;
        g.save();
        g.translate(mx, my); g.rotate(this.aimAngle);
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = .9;
        g.fillStyle = w.color || '#ffe066';
        poly(g, [0, 0, 12, -6, 18, 0, 12, 6], w.color || '#ffe066', false);
        g.globalAlpha = .5;
        circ(g, 0, 0, 8, w.color || '#ffe066', false);
        g.restore();
      }
    }
    // 技能特效：连射
    if (this.rapidT > 0) {
      g.save(); g.globalAlpha = .35;
      g.strokeStyle = this.char.color; g.lineWidth = 2;
      g.beginPath(); g.arc(this.x, this.y, 22 + Math.sin(performance.now() / 120) * 3, 0, TAU); g.stroke();
      g.restore();
    }
    // 燃烧 / 中毒
    if (this.burn > 0 && Math.random() < .3) FX.trail(this.x + rand(8, -8), this.y - rand(10, 0), '#ffa63d', 3, .25);
    if (this.poison > 0 && Math.random() < .3) FX.trail(this.x + rand(8, -8), this.y - rand(10, 0), '#a6ff6b', 2.5, .3);
  }
}
