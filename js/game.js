'use strict';
/* =====================================================================
   游戏主循环 / 状态机 / 掉落 / 祝福 / 楼层推进
   ===================================================================== */

const BUFFS = [
  { id: 'dmg1', name: '锋锐', icon: '⚔️', tier: 2, desc: '所有伤害 +12%', apply: p => { p.dmgMul *= 1.12; } },
  { id: 'dmg2', name: '毁灭之力', icon: '💥', tier: 4, desc: '所有伤害 +25%，暴击伤害 +25%', apply: p => { p.dmgMul *= 1.25; p.critMul += .25; } },
  { id: 'rate1', name: '快速装填', icon: '⚡', tier: 2, desc: '攻击速度 +15%', apply: p => { p.fireRateMul *= 1.15; } },
  { id: 'rate2', name: '弹幕洪流', icon: '🌪️', tier: 4, desc: '攻击速度 +30%', apply: p => { p.fireRateMul *= 1.3; } },
  { id: 'crit1', name: '致命瞄准', icon: '🎯', tier: 2, desc: '暴击率 +10%', apply: p => { p.crit += .1; } },
  { id: 'critdmg', name: '弱点洞悉', icon: '🔪', tier: 3, desc: '暴击伤害 +50%', apply: p => { p.critMul += .5; } },
  { id: 'hp', name: '生命源泉', icon: '❤️', tier: 2, desc: '生命上限 +35，并恢复 35 点', apply: p => { p.maxHp += 35; p.hp = Math.min(p.maxHp, p.hp + 35); } },
  { id: 'hp2', name: '钢铁之躯', icon: '🫀', tier: 4, desc: '生命上限 +70，并回满生命', apply: p => { p.maxHp += 70; p.hp = p.maxHp; } },
  { id: 'armor', name: '重装护甲', icon: '🛡️', tier: 2, desc: '护甲上限 +50 并立即充满', apply: p => { p.maxArmor += 50; p.armor = p.maxArmor; } },
  { id: 'armorRegen', name: '能量护壁', icon: '🔋', tier: 3, desc: '护甲回复速度 +60%', apply: p => { p.armorRegenMul *= 1.6; } },
  { id: 'energy', name: '法力之潮', icon: '🔮', tier: 2, desc: '能量上限 +40 并立即充满', apply: p => { p.maxEnergy += 40; p.energy = p.maxEnergy; } },
  { id: 'regen', name: '冥想', icon: '🧘', tier: 3, desc: '能量回复 +5/秒', apply: p => { p.energyRegen += 5; } },
  { id: 'speed', name: '疾风之靴', icon: '👟', tier: 2, desc: '移动速度 +14%', apply: p => { p.speed *= 1.14; } },
  { id: 'magnet', name: '磁力之心', icon: '🧲', tier: 2, desc: '拾取范围 +100', apply: p => { p.magnet += 100; } },
  { id: 'lifesteal', name: '嗜血', icon: '🩸', tier: 4, desc: '造成伤害的 8% 转化为生命', apply: p => { p.lifesteal += .08; } },
  { id: 'thorns', name: '尖刺甲壳', icon: '🌵', tier: 3, desc: '反弹 25% 受到的伤害', apply: p => { p.thorns += .25; } },
  { id: 'pierce', name: '穿甲弹', icon: '🏹', tier: 3, desc: '子弹与箭矢额外穿透 1 个敌人', apply: p => { p.pierceBonus += 1; } },
  { id: 'bounce', name: '弹射', icon: '🎱', tier: 3, desc: '子弹额外弹射 1 次', apply: p => { p.bounceBonus += 1; } },
  { id: 'dash', name: '影步', icon: '💨', tier: 3, desc: '冲刺冷却 -30%', apply: p => { p.dashCdMul *= .7; } },
  { id: 'skillcd', name: '秘术回响', icon: '⏳', tier: 3, desc: '技能冷却 -25%', apply: p => { p.skillCdMul *= .75; } },
  { id: 'energyKill', name: '灵魂汲取', icon: '✨', tier: 2, desc: '击杀敌人恢复 10 点能量', apply: p => { p.energyOnKill += 10; } },
  { id: 'armorKill', name: '战地维修', icon: '🔧', tier: 3, desc: '击杀敌人恢复 6 点护甲', apply: p => { p.armorOnKill += 6; } },
  { id: 'coin', name: '贪婪', icon: '💰', tier: 2, desc: '获得的金币 +40%', apply: p => { p.coinMul += .4; } },
  { id: 'explode', name: '爆裂弹头', icon: '🧨', tier: 4, desc: '子弹有 12% 几率产生小爆炸', apply: p => { p.explodeChance += .12; } },
  { id: 'freeze', name: '霜冻附魔', icon: '❄️', tier: 3, desc: '攻击有 15% 几率冻结敌人', apply: p => { p.freezeChance += .15; } },
  { id: 'burn', name: '烈焰附魔', icon: '🔥', tier: 3, desc: '攻击有 18% 几率点燃敌人', apply: p => { p.burnChance += .18; } },
  { id: 'poison', name: '剧毒附魔', icon: '☠️', tier: 3, desc: '攻击有 18% 几率使敌人中毒', apply: p => { p.poisonChance += .18; } },
  { id: 'chain', name: '连锁反应', icon: '🌩️', tier: 4, desc: '命中时向附近敌人弹射闪电', apply: p => { p.chainBonus += 1; } },
  { id: 'count', name: '分裂射击', icon: '🔱', tier: 4, desc: '远程武器弹丸 +1，伤害 -12%', apply: p => { p.countBonus += 1; p.dmgMul *= .88; } },
  { id: 'ranged', name: '枪械精通', icon: '🔫', tier: 3, desc: '远程武器伤害 +22%', apply: p => { p.rangedMul *= 1.22; } },
  { id: 'melee', name: '刀刃精通', icon: '🗡️', tier: 3, desc: '近战武器伤害 +28%', apply: p => { p.meleeMul *= 1.28; } },
  { id: 'magic', name: '奥术亲和', icon: '🪄', tier: 3, desc: '法术与技能伤害 +25%', apply: p => { p.magicMul *= 1.25; } },
  { id: 'boss', name: '屠戮者', icon: '👑', tier: 4, desc: '对首领造成的伤害 +25%', apply: p => { p.bossMul = (p.bossMul || 1) * 1.25; } },
  { id: 'revive', name: '不死契约', icon: '💀', tier: 5, desc: '死亡时复活一次，恢复 60% 生命', apply: p => { p.revive += 1; } },
  { id: 'homer', name: '追踪模块', icon: '📡', tier: 4, desc: '子弹获得追踪能力', apply: p => { p.homingBonus += 2; } },
  { id: 'floorHeal', name: '恢复之泉', icon: '⛲', tier: 3, desc: '每层开始时恢复 25% 生命', apply: p => { p.floorHeal += .25; } },
  { id: 'critRate2', name: '猎手直觉', icon: '👁️', tier: 3, desc: '暴击率 +8%，暴击伤害 +20%', apply: p => { p.crit += .08; p.critMul += .2; } },
];

const Game = {
  state: 'title',
  floor: 1,
  coins: 0,
  runTime: 0,
  runStats: { kills: 0, damage: 0, coins: 0, time: 0, gems: 0, bossKills: 0 },
  deathT: 0,
  pendingBlessing: 0,
  bossDefeatedThisFloor: false,
  lastFloorToast: 0,
  demoT: 0,
  demoParticles: [],
  started: false,

  /* =============== 开始冒险 =============== */
  startRun(charId) {
    UI.clear();
    UI.toasts.length = 0;
    Sfx.resume();
    this.state = 'playing';
    this.floor = 1;
    this.coins = 20;
    this.runTime = 0;
    this.deathT = 0;
    this.pendingBlessing = 0;
    this.bossDefeatedThisFloor = false;
    this.started = true;
    this.runStats = { kills: 0, damage: 0, coins: 0, time: 0, gems: 0, bossKills: 0 };
    world.bullets.length = 0; world.ebullets.length = 0; world.enemies.length = 0;
    world.pickups.length = 0; world.summons.length = 0; world.slashes.length = 0;
    world.beams.length = 0; world.particles.length = 0; world.texts.length = 0;
    world.effects.length = 0; world.room = null; world.portal = null;
    world.floorData = null;
    world.player = null;
    const fd = generateFloor(1);
    const startRoom = fd.start;
    const p = new Player(charId, VW / 2, VH / 2 + 40);
    world.player = p;
    p.invuln = 1.2;
    Save.data.seenWeapons = Save.data.seenWeapons || [];
    if (p.weapons[0] && !Save.data.seenWeapons.includes(p.weapons[0].baseId)) Save.data.seenWeapons.push(p.weapons[0].baseId);
    this.pendingBossRoom = null;
    world.room = null;
    enterRoom(startRoom, null);
    Save.data.runs = (Save.data.runs || 0) + 1;
    Save.save();
    Sfx.setTheme(fd.theme);
    Sfx.startMusic();
    Camera.flashScreen('#ffffff', .25);
    UI.toast('第 1 层 · ' + THEMES[fd.theme].name, '#ffe9a8');
    setTimeout(() => { if (this.state === 'playing') UI.toast('击败本层首领，找到传送门', '#a99cff'); }, 900);
    this.lastFloorToast = performance.now();
  },

  /* =============== 主更新 =============== */
  update(dt) {
    UI.update(dt);
    Camera.update(dt);
    if (this.state === 'title' || this.state === 'codex' || this.state === 'help') {
      this.demoT += dt;
      if (this.demoParticles.length < 40 && Math.random() < .5) {
        this.demoParticles.push({ x: rand(VW), y: VH + 10, vx: rand(14, -14), vy: rand(-30, -70), life: rand(4), maxLife: 4, r: rand(2.5, 1) });
      }
      for (let i = this.demoParticles.length - 1; i >= 0; i--) {
        const p = this.demoParticles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) this.demoParticles.splice(i, 1);
      }
      return;
    }
    if (this.state !== 'playing') return;

    this.runTime += dt;
    this.runStats.time = this.runTime;
    Input.update();

    // 延迟祝福
    if (this.pendingBlessing > 0) {
      this.pendingBlessing -= dt;
      if (this.pendingBlessing <= 0) this.beginBlessing();
    }

    const p = world.player;
    if (p) p.update(dt);

    // 敌人
    for (const e of world.enemies) e.update(dt);
    // 邻近分离
    const es = world.enemies;
    for (let i = 0; i < es.length; i++) {
      const a = es[i];
      if (a.dead || a.isBoss || a.ai === 'ghost') continue;
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j];
        if (b.dead || b.isBoss || b.ai === 'ghost') continue;
        const d = dist(a.x, a.y, b.x, b.y);
        const min = (a.r + b.r) * .78;
        if (d < min && d > .01) {
          const push = (min - d) * .5;
          const ang = angleTo(a.x, a.y, b.x, b.y);
          moveActor(a, -Math.cos(ang) * push, -Math.sin(ang) * push);
          moveActor(b, Math.cos(ang) * push, Math.sin(ang) * push);
        }
      }
    }
    for (let i = es.length - 1; i >= 0; i--) if (es[i].dead) es.splice(i, 1);

    updateBullets(dt);
    updateEnemyBullets(dt);
    updateSlashes(dt);
    updateBeams(dt);
    updateEffects(dt);
    for (const s of world.summons) s.update(dt);
    for (let i = world.summons.length - 1; i >= 0; i--) if (world.summons[i].life <= 0) world.summons.splice(i, 1);
    for (const pk of world.pickups) pk.update(dt);
    for (let i = world.pickups.length - 1; i >= 0; i--) if (world.pickups[i].dead) world.pickups.splice(i, 1);
    FX.update(dt);

    // 传送门
    if (world.portal) {
      world.portal.t += dt;
      // 联机成员不自行推进楼层，跟着房主走
      const netFollower = typeof Net !== 'undefined' && Net.on && Net.started && !Net.isHost;
      if (!netFollower && world.portal.t > 1.0 && p && !p.dead && dist(world.portal.x, world.portal.y, p.x, p.y) < 34) {
        world.portal.standT = (world.portal.standT || 0) + dt;
        if (world.portal.standT > 1.5) {
          this.nextFloor();
          return;
        }
      } else if (world.portal) {
        world.portal.standT = 0;
      }
      if (Math.random() < .4) FX.trail(world.portal.x + rand(20, -20), world.portal.y + rand(20, -20), '#c8aaff', 2, .4);
    }

    // 房间切换
    tryRoomTransition();
    // 交互扫描
    this.scanInteract();
    if (Input.wasPressed('KeyE')) this.interact();

    // 房间清空
    this.checkRoomClear();

    // 联机同步（未联机时 Net.on 为 false，整段不执行）
    if (typeof Net !== 'undefined' && Net.on) Net.tick(dt);

    // 死亡流程
    if (p && p.dead) {
      this.deathT += dt;
      if (this.deathT > 1.6) this.finishRun(false);
    }
    Input.endFrame();
  },

  /* =============== 渲染 =============== */
  render() {
    if (!ctx || !view) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VW, VH);
    if (this.state === 'title' || this.state === 'codex' || this.state === 'help') {
      this.renderTitleBg();
      this.blit();
      return;
    }
    if (!world.room) {
      ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, VW, VH);
      this.blit();
      return;
    }
    ctx.save();
    ctx.translate(Camera.shakeX, Camera.shakeY);
    drawRoom(ctx);
    drawEffects(ctx);
    drawProps(ctx);
    // 掉落物
    for (const pk of world.pickups) pk.draw(ctx);
    drawPortal(ctx);
    // 召唤物
    for (const s of world.summons) s.draw(ctx);
    // 敌人按 y 排序
    const sorted = world.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of sorted) e.draw(ctx);
    // 玩家
    if (world.player) world.player.draw(ctx);
    // 联机队友
    if (typeof Net !== 'undefined' && Net.on) Net.draw(ctx);
    drawSlashes(ctx);
    drawBullets(ctx);
    drawEnemyBullets(ctx);
    drawBeams(ctx);
    FX.drawParticles(ctx);
    drawLighting(ctx);
    ctx.restore();

    this.blit();

    // ===== HUD 以显示分辨率绘制 =====
    view.setTransform(viewScale, 0, 0, viewScale, 0, 0);
    // 世界内文字（在 HUD 层绘制，保证清晰且不被旋转/缩放破坏）
    FX.drawTexts(view);
    drawPickupLabels(view);
    drawWorldLabels(view);
    // Boss 招式名
    for (const e of world.enemies) {
      if (e.isBoss && !e.dead && e.announceT > 0) {
        const a = clamp(e.announceT * 1.6, 0, 1);
        drawText(view, e.announce, e.x, e.y - e.r - 38, {
          size: 17 + (e.announceT > 1.1 ? (e.announceT - 1.1) * 8 : 0),
          color: '#ffd257', align: 'center', weight: 900, alpha: a, stroke: '#2a1000', strokeW: 5,
        });
      }
    }
    if (Camera.flash > 0) {
      view.save();
      view.globalAlpha = clamp(Camera.flash, 0, .8);
      view.fillStyle = Camera.flashColor;
      view.fillRect(0, 0, VW, VH);
      view.restore();
    }
    this.drawVignette(view);

    if (this.state === 'playing' || this.state === 'paused' || this.state === 'blessing') {
      UI.drawHUD(view);
    }
    if (world.player && world.player.dead) {
      view.save();
      view.fillStyle = `rgba(20,0,8,${clamp(this.deathT * .25, 0, .55)})`;
      view.fillRect(0, 0, VW, VH);
      drawText(view, '你 倒 下 了', VW / 2, VH / 2, { size: 46, color: '#ff5d6c', align: 'center', weight: 900, stroke: '#2a0008', strokeW: 8 });
      view.restore();
    }
    view.setTransform(1, 0, 0, 1, 0, 0);
  },

  blit() {
    view.setTransform(1, 0, 0, 1, 0, 0);
    view.imageSmoothingEnabled = false;
    view.clearRect(0, 0, canvas.width, canvas.height);
    view.drawImage(worldCanvas, 0, 0, canvas.width, canvas.height);
  },

  drawVignette(g) {
    g.save();
    const grd = g.createRadialGradient(VW / 2, VH / 2, VH * .42, VW / 2, VH / 2, VH * .95);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,.42)');
    g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
    g.restore();
  },

  renderTitleBg() {
    const t = this.demoT;
    const theme = THEMES[0];
    const grd = ctx.createRadialGradient(VW / 2, VH * .45, 40, VW / 2, VH * .5, VW * .7);
    grd.addColorStop(0, '#1d1730'); grd.addColorStop(.55, '#100c1a'); grd.addColorStop(1, '#07060c');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    // 远景柱
    ctx.save();
    ctx.globalAlpha = .25;
    for (let i = 0; i < 7; i++) {
      const x = 60 + i * 145;
      ctx.fillStyle = i % 2 ? '#221c33' : '#1a1528';
      ctx.fillRect(x, 120, 46, VH);
      ctx.fillStyle = '#2c2440';
      ctx.fillRect(x - 6, 108, 58, 16);
    }
    ctx.restore();
    // 光柱
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const x = VW * (.2 + i * .3) + Math.sin(t * .3 + i) * 40;
      const g2 = ctx.createLinearGradient(x, 0, x + 90, VH);
      g2.addColorStop(0, 'rgba(120,90,255,.15)');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 150, VH); ctx.lineTo(x + 10, VH); ctx.fill();
    }
    ctx.restore();
    // 火星
    for (const p of this.demoParticles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a * .41;
      ctx.fillStyle = '#a78bff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 地板剪影
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.fillStyle = '#0b0812';
    ctx.fillRect(0, VH - 90, VW, 90);
    ctx.restore();
    // 标题光晕
    const gg = ctx.createRadialGradient(VW / 2, 120, 10, VW / 2, 120, 300);
    gg.addColorStop(0, 'rgba(255,200,80,.1)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, VW, VH);
  },

  /* =============== 房间 / 掉落 =============== */
  checkRoomClear() {
    // 联机成员端不自行结算房间清空：门与清空状态以房主快照为准
    if (typeof Net !== 'undefined' && Net.on && Net.started && !Net.isHost) return;
    const room = world.room;
    if (!room || room.cleared || !room.spawned) return;
    if (world.enemies.length > 0) return;
    room.cleared = true;
    setDoors(room, true);
    Sfx.play('clear');
    Camera.flashScreen('#ffe066', .18);
    const p = world.player;
    if (p) {
      p.armor = Math.min(p.maxArmor, p.armor + 12);
      p.energy = Math.min(p.maxEnergy, p.energy + 20);
    }
    // 金币奖励
    const n = 2 + Math.floor(this.floor * .6);
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      world.pickups.push(new Pickup('coin', VW / 2 + Math.cos(a) * 30, VH / 2 + Math.sin(a) * 30, { value: 1, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 }));
    }
    if (Math.random() < .18) {
      world.pickups.push(new Pickup('energy', VW / 2, VH / 2, { energy: 25, vx: 60, vy: -60 }));
    }
    if (room.type === 'challenge') {
      const w = rollWeapon(this.floor, { minTier: 3 });
      this.spawnWeaponDrop(VW / 2, VH / 2 - 40, makeWeaponInstance(w, this.floor, .6));
    }
    UI.toast(room.type === 'boss' ? '首领已倒下 · 大门开启' : '房间清空 · 大门开启', '#ffe9a8');
  },

  onEnemyDeath(e, opts) {
    const p = world.player;
    const isBoss = !!(e.isBoss);
    this.runStats.kills++;
    if (!Save.data.seenEnemies.includes(e.defId)) {
      Save.data.seenEnemies.push(e.defId);
    }
    if (p && !p.dead) {
      if (p.energyOnKill) p.energy = Math.min(p.maxEnergy, p.energy + p.energyOnKill);
      if (p.armorOnKill) p.armor = Math.min(p.maxArmor, p.armor + p.armorOnKill);
    }
    if (isBoss) {
      this.runStats.bossKills++;
      this.bossDefeatedThisFloor = true;
      Sfx.play('bossdie');
      Camera.addShake(22);
      Camera.flashScreen('#ffffff', .7);
      FX.burst(e.x, e.y, 60, { color: '#ffd257', speed: 340, life: 1.2, size: 5, glow: true, grav: 90 });
      FX.ring(e.x, e.y, '#ffffff', 20, 320, .9, 8);
      FX.ring(e.x, e.y, '#ffd257', 10, 260, 1.2, 5);
      const coinN = rndi(18, 26);
      for (let i = 0; i < coinN; i++) {
        world.pickups.push(new Pickup('coin', e.x, e.y, { value: 2, vx: rand(260, -260), vy: rand(260, -260) }));
      }
      world.pickups.push(new Pickup('health', e.x, e.y, { heal: 45, vx: 120, vy: -80 }));
      world.pickups.push(new Pickup('energy', e.x, e.y, { energy: 60, vx: -120, vy: -80 }));
      const w = rollWeapon(this.floor, { minTier: 3 });
      this.spawnWeaponDrop(e.x, e.y, makeWeaponInstance(w, this.floor, Math.random() < .7 ? .8 : 0));
      this.pendingBlessing = 1.6;
      this.pendingBossRoom = world.room;
      UI.toast('首领被击败！选择你的祝福', '#ffd257');
      if (this.floor % 6 === 0) setTimeout(() => { if (Game.state === 'playing' || Game.state === 'blessing') UI.toast('深渊回响 · 难度提升！', '#ff5d6c'); }, 500);
      Camera.hitstop = .2;
      Save.data.bestFloor = Math.max(Save.data.bestFloor || 0, this.floor);
      Save.save();
      return;
    }
    if (!e.isElite && !opts.silent) {
      // 普通掉落
      const c = e.coins || [1, 2];
      const n = rndi(c[0], c[1]);
      for (let i = 0; i < n; i++) {
        world.pickups.push(new Pickup('coin', e.x, e.y, { value: 1, vx: rand(150, -150), vy: rand(150, -150) }));
      }
      if (Math.random() < .12) world.pickups.push(new Pickup('energy', e.x, e.y, { energy: 18, vx: rand(90, -90), vy: rand(90, -90) }));
      if (Math.random() < .05) world.pickups.push(new Pickup('health', e.x, e.y, { heal: 22, vx: rand(90, -90), vy: rand(90, -90) }));
      if (Math.random() < .035) {
        const w = rollWeapon(this.floor, { minTier: 1 });
        this.spawnWeaponDrop(e.x, e.y, makeWeaponInstance(w, this.floor, .3));
      }
    } else if (e.isElite) {
      const c = e.coins || [4, 8];
      for (let i = 0; i < rndi(c[0], c[1]); i++) {
        world.pickups.push(new Pickup('coin', e.x, e.y, { value: 2, vx: rand(190, -190), vy: rand(190, -190) }));
      }
      world.pickups.push(new Pickup('energy', e.x, e.y, { energy: 30 }));
      if (Math.random() < .45) {
        const w = rollWeapon(this.floor, { minTier: 2 });
        this.spawnWeaponDrop(e.x, e.y, makeWeaponInstance(w, this.floor, .5));
      }
    }
    if (e.atk && e.atk.slam) Camera.addShake(4);
  },

  spawnWeaponDrop(x, y, weapon) {
    const pk = new Pickup('weapon', x, y, { weapon, vx: rand(50, -50), vy: rand(50, -50) });
    world.pickups.push(pk);
    Save.data.seenWeapons = Save.data.seenWeapons || [];
    if (!Save.data.seenWeapons.includes(weapon.baseId)) Save.data.seenWeapons.push(weapon.baseId);
    Sfx.play('pickup');
    FX.ring(x, y, tierColor(weapon.tier), 4, 34, .4, 2);
  },

  addCoins(v) {
    const p = world.player;
    const mul = p ? p.coinMul : 1;
    const add = Math.max(1, Math.round(v * mul));
    this.coins += add;
    this.runStats.coins += add;
  },

  /* =============== 交互 =============== */
  scanInteract() {
    const p = world.player;
    UI.interactText = '';
    if (!p || p.dead) return;
    let best = null, bd = 90;
    for (const pk of world.pickups) {
      if (pk.dead) continue;
      if (!(pk.type === 'weapon' || pk.type === 'shopWeapon' || pk.price > 0)) continue;
      const d = dist(pk.x, pk.y, p.x, p.y);
      if (d < bd) {
        bd = d;
        const nm = pk.weapon ? pk.weapon.name : (pk.type === 'health' ? '治疗药水' : (pk.type === 'armor' ? '护甲充能' : '物品'));
        best = { kind: 'pickup', pk, text: pk.price ? `E 购买 ${nm}（${pk.price} 金币）` : `E 拾取 ${nm}` };
      }
    }
    const room = world.room;
    if (room) {
      for (const pr of room.props) {
        if (pr.dead) continue;
        if (pr.kind === 'chest' && !pr.opened) {
          const d = dist(pr.x, pr.y, p.x, p.y);
          if (d < 76 && d < bd) { bd = d; best = { kind: 'chest', pr, text: 'E 打开宝箱' }; }
        }
        if (pr.kind === 'pedestalWeapon' && !pr.picked) {
          const d = dist(pr.x, pr.y, p.x, p.y);
          if (d < 76 && d < bd) { bd = d; best = { kind: 'pedestal', pr, text: 'E 拾取 ' + pr.weapon.name }; }
        }
      }
    }
    if (world.portal && dist(world.portal.x, world.portal.y, p.x, p.y) < 90) {
      const d = dist(world.portal.x, world.portal.y, p.x, p.y);
      if (d < bd) best = { kind: 'portal', text: 'E 进入下一层（或站入传送门）' };
    }
    if (best) UI.interactText = best.text;
    this._interact = best;
  },

  interact() {
    const best = this._interact;
    if (!best) return;
    if (best.kind === 'portal') {
      if (world.portal) this.nextFloor();
      return;
    }
    if (best.kind === 'chest') {
      openChest(best.pr);
      this.scanInteract();
      return;
    }
    if (best.kind === 'pedestal') {
      this.pickupWeapon(best.pr.weapon, 0);
      best.pr.picked = true;
      FX.burst(best.pr.x, best.pr.y - 20, 12, { color: tierColor(best.pr.weapon.tier), speed: 140, life: .5, size: 3 });
      this.scanInteract();
      return;
    }
    if (best.kind === 'pickup') {
      const pk = best.pk;
      if (pk.price > 0) {
        if (this.coins < pk.price) { UI.toast('金币不足（需要 ' + pk.price + '）', '#ff8a8a'); Sfx.play('error'); return; }
        this.coins -= pk.price;
        if (pk.type === 'shopWeapon') {
          this.pickupWeapon(pk.weapon, pk.price);
          if (pk.offer) pk.offer.bought = true;
          pk.dead = true;
        } else if (pk.type === 'health') {
          world.player.hp = Math.min(world.player.maxHp, world.player.hp + (pk.heal || 40));
          FX.text(world.player.x, world.player.y - 34, '+' + (pk.heal || 40), '#7bff9b', 15);
          if (pk.offer) pk.offer.bought = true;
          pk.dead = true;
        } else if (pk.type === 'armor') {
          world.player.armor = world.player.maxArmor;
          FX.text(world.player.x, world.player.y - 34, '护甲全满', '#8fe6ff', 13);
          if (pk.offer) pk.offer.bought = true;
          pk.dead = true;
        }
        Sfx.play('buy');
        return;
      }
      this.pickupWeapon(pk.weapon, 0);
      pk.dead = true;
      this.scanInteract();
    }
  },

  pickupWeapon(w, price) {
    const p = world.player;
    if (!p) return;
    // 优先放入空槽
    let slot = p.slot;
    if (!p.weapons[1]) slot = 1;
    const old = p.giveWeapon(w, slot);
    p.slot = slot;
    Sfx.play('pickup');
    UI.toast('获得武器：' + w.name, tierColor(w.tier));
    Save.data.seenWeapons = Save.data.seenWeapons || [];
    if (!Save.data.seenWeapons.includes(w.baseId)) Save.data.seenWeapons.push(w.baseId);
    if (old) {
      const pk = new Pickup('weapon', p.x + rand(30, -30), p.y + 26, { weapon: old, vx: rand(60, -60), vy: 40 });
      world.pickups.push(pk);
    }
  },

  /* =============== 房间 / Boss =============== */
  onEnterRoom(room) {
    if (!room) return;
    this.scanInteract();
    if (room.type === 'boss' && !room.cleared) {
      const bd = BOSS_DEFS.find(b => b.id === BOSS_BY_THEME[room.theme]);
      setTimeout(() => {
        if (this.state === 'playing' && world.room === room && !room.cleared) {
          UI.toast('首领出现：' + (bd ? bd.name + ' · ' + bd.title : '未知存在'), '#ff8a8a');
        }
      }, 500);
    } else if (room.type === 'shop') {
      UI.toast('神秘商店 · 靠近商品按 E 购买', '#ffd257');
    } else if (room.type === 'treasure') {
      UI.toast('宝藏之间 · 打开宝箱', '#7bff9b');
    } else if (room.type === 'challenge') {
      if (!room.cleared) UI.toast('挑战房 · 精英敌人！', '#c79dff');
    }
  },

  onBossSpawn(boss) {
    Save.data.seenEnemies = Save.data.seenEnemies || [];
    if (!Save.data.seenEnemies.includes(boss.defId)) Save.data.seenEnemies.push(boss.defId);
    Camera.addShake(12);
    UI.toast('⚠ ' + boss.def.name + ' · ' + boss.def.title, '#ff5d6c');
  },

  spawnPortal(room) {
    world.portal = { x: VW / 2, y: VH / 2, t: 0 };
    Sfx.play('portal');
    FX.ring(VW / 2, VH / 2, '#c8aaff', 10, 120, .8, 6);
  },

  beginBlessing() {
    if (!world.player || world.player.dead) return;
    this.state = 'blessing';
    Input.resetSticks();
    Sfx.play('levelup');
    const choices = [];
    const pool = BUFFS.slice();
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(idx, 1)[0]);
    }
    UI.showBlessings(choices, (buff) => {
      buff.apply(world.player);
      Sfx.play('levelup');
      UI.toast('获得祝福：' + buff.name, '#ffd257');
      this.state = 'playing';
      UI.clear();
      const br = this.pendingBossRoom;
      this.pendingBossRoom = null;
      if (br && world.room === br) this.spawnPortal(br);
      UI.toast('传送门已开启 · 前往首领房中央', '#c8aaff');
      Camera.flashScreen('#ffe066', .3);
    });
  },

  /* =============== 楼层推进 / 结束 =============== */
  nextFloor() {
    this.floor++;
    Save.data.bestFloor = Math.max(Save.data.bestFloor || 0, this.floor);
    Save.save();
    world.portal = null;
    world.effects.length = 0;
    const fd = generateFloor(this.floor);
    const room = fd.start;
    const p = world.player;
    world.room = null;
    enterRoom(room, null);
    if (p) {
      p.armor = p.maxArmor;
      p.energy = p.maxEnergy;
      p.invuln = 1.2;
      p.x = VW / 2; p.y = VH / 2 + 30;
      if (p.floorHeal) {
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * p.floorHeal);
        FX.text(p.x, p.y - 34, '恢复', '#7bff9b', 15);
      }
    }
    Sfx.setTheme(fd.theme);
    Camera.flashScreen('#ffffff', .35);
    Sfx.play('portal');
    UI.toast('第 ' + this.floor + ' 层 · ' + THEMES[fd.theme].name, '#ffe9a8');
    this.bossDefeatedThisFloor = false;
  },

  onPlayerDeath() {
    this.deathT = 0;
    Save.data.kills = (Save.data.kills || 0) + this.runStats.kills;
    Save.save();
  },

  finishRun(victory) {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    const s = this.runStats;
    const gems = 8 + this.floor * 10 + Math.floor(s.kills / 4) + s.bossKills * 15;
    s.gems = gems;
    s.floor = this.floor;
    Save.data.gems = (Save.data.gems || 0) + gems;
    Save.data.kills = (Save.data.kills || 0) + s.kills;
    Save.data.runs = Save.data.runs || 1;
    Save.data.bestFloor = Math.max(Save.data.bestFloor || 0, this.floor);
    Save.save();
    Sfx.stopMusic();
    UI.showGameOver({
      floor: this.floor, kills: s.kills, damage: Math.round(s.damage),
      coins: s.coins, time: s.time, gems,
    });
  },

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      Sfx.stopMusic();
      Input.resetSticks();
      UI.showPause();
    }
  },
  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    UI.clear();
    Sfx.resume();
    Sfx.startMusic();
    Sfx.play('select');
    Input.endFrame();
  },
  quitToTitle() {
    this.state = 'title';
    this.started = false;
    Sfx.stopMusic();
    world.room = null; world.player = null; world.portal = null;
    world.enemies.length = 0; world.bullets.length = 0; world.ebullets.length = 0;
    world.pickups.length = 0; world.particles.length = 0; world.texts.length = 0;
    world.effects.length = 0; world.summons.length = 0; world.slashes.length = 0;
    Input.resetSticks();
    UI.showTitle();
  },

  toast(msg, color) { UI.toast(msg, color); },
};
