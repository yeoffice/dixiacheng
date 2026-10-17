/* 无头冒烟测试：在 stub canvas 下运行全部逻辑 */
(function () {
  const R = [];
  const ok = (cond, msg) => R.push([cond ? 'ok' : 'FAIL', msg]);
  const info = msg => R.push(['ok', '## ' + msg]);
  function attempt(name, fn) {
    try { return fn(); }
    catch (e) {
      R.push(['FAIL', name + ' 抛出异常: ' + (e && e.message)]);
      console.error('EXC', name, e && e.stack);
      return undefined;
    }
  }
  let frames = 0;
  function step(n, opts = {}) {
    for (let i = 0; i < n; i++) {
      if (opts.fire) {
        Input.mouse.down = true;
        if (opts.aim) { Input.mouse.x = opts.aim.x; Input.mouse.y = opts.aim.y; }
      } else {
        Input.mouse.down = false;
      }
      if (opts.keys) for (const k in opts.keys) Input.keys[k] = opts.keys[k];
      if (opts.press) for (const k of opts.press) Input.pressed[k] = true;
      Game.update(1 / 60);
      Game.render();
      frames++;
    }
  }
  function connected(fd) {
    const seen = new Set([fd.start]);
    const q = [fd.start];
    while (q.length) {
      const r = q.pop();
      for (const d of ['n', 's', 'e', 'w']) {
        if (!r.links[d]) continue;
        const nb = r.next[d];
        if (nb && !seen.has(nb)) { seen.add(nb); q.push(nb); }
      }
    }
    return seen.size === fd.rooms.length;
  }
  function clearEnemies() {
    let guard = 0;
    while (world.enemies.length && guard++ < 80) {
      for (const e of world.enemies.slice()) if (!e.dead) e.hurt(1e9, {});
      Game.update(1 / 60);
    }
    world.enemies.length = 0;
  }

  /* ================= 基础 ================= */
  info('基础启动');
  ok(Game.state === 'title', '初始状态为标题页');
  ok(typeof canvas !== 'undefined' && !!ctx, '画布上下文初始化');
  ok(WEAPONS.length >= 60, '武器数量 >= 60，实际 ' + WEAPONS.length);
  ok(ENEMY_DEFS.filter(e => !e.hidden).length >= 40, '敌人数量 >= 40，实际 ' + ENEMY_DEFS.filter(e => !e.hidden).length);
  ok(BOSS_DEFS.length === 6, '首领数量 = 6');
  ok(CHARACTERS.length === 8, '角色数量 = 8');
  ok(BUFFS.length >= 30, '祝福数量 >= 30，实际 ' + BUFFS.length);

  info('数据完整性');
  for (const w of WEAPONS) {
    if (!w.id || !w.name || !w.shape || !w.kind || !(w.tier >= 1 && w.tier <= 5)) {
      ok(false, '武器字段异常: ' + JSON.stringify(w));
    }
  }
  ok(true, '全部武器字段合法');
  const ais = new Set(ENEMY_DEFS.map(e => e.ai));
  let aiMissing = 0;
  for (const a of ais) if (typeof AI[a] !== 'function') { aiMissing++; ok(false, '缺少 AI 实现: ' + a); }
  ok(aiMissing === 0, '全部 ' + ais.size + ' 种敌人 AI 已实现: ' + [...ais].join(','));
  for (const c of CHARACTERS) if (!SKILLS[c.skill.id] && !['turret'].includes(c.skill.id)) ok(false, '缺少技能: ' + c.skill.id);
  ok(true, '全部角色技能已实现');
  for (const b of BOSS_DEFS) {
    if (!BOSS_ART[b.art]) ok(false, '缺少 Boss 贴图: ' + b.art);
    for (const at of b.attacks) if (!BOSS_ACTIONS[at.name]) ok(false, '缺少 Boss 招式: ' + at.name);
  }
  ok(true, '全部首领贴图与招式已实现');

  /* ================= 标题/UI 页面 ================= */
  info('UI 页面');
  attempt('UI.showCodex(weapons)', () => UI.showCodex('weapons'));
  attempt('UI.showCodex(enemies)', () => UI.showCodex('enemies'));
  attempt('UI.showCodex(bosses)', () => UI.showCodex('bosses'));
  attempt('UI.showHelp', () => UI.showHelp());
  attempt('UI.showTitle', () => UI.showTitle());
  ok(true, '标题 / 图鉴 / 玩法 页面构建成功');

  /* ================= 开一局 ================= */
  info('开局');
  attempt('startRun(knight)', () => Game.startRun('knight'));
  ok(Game.state === 'playing', '开局后状态为 playing');
  ok(!!world.player, '玩家已创建');
  ok(world.room && world.room.type === 'start', '初始房间为入口房');
  ok(world.room.cleared, '入口房默认可通行');
  ok(world.floorData.rooms.length >= 6, '本层房间数 ' + world.floorData.rooms.length);
  Game.render();
  ok(true, '第一帧渲染无异常');

  /* ================= 武器全量 ================= */
  info('武器开火测试');
  attempt('all weapons fire', () => {
    const p = world.player;
    p.maxEnergy = 99999; p.energy = 99999;
    for (const base of WEAPONS) {
      const w = makeWeaponInstance(base, 6, 0);
      p.weapons[0] = w; p.slot = 0;
      world.bullets.length = 0; world.slashes.length = 0; world.beams.length = 0;
      world.enemies.length = 0;
      const dummy = new Enemy(ENEMY_DEFS[0], p.x + 90, p.y, 6);
      dummy.spawnT = 0; world.enemies.push(dummy);
      if (w.kind === 'melee') meleeAttack(w, p, 0); else fireWeapon(w, p, 0);
      const produced = world.bullets.length + world.slashes.length + world.beams.length;
      if (produced === 0) ok(false, '武器未产生弹丸/挥砍: ' + w.name + ' (' + w.kind + ')');
      updateBullets(1 / 60); updateSlashes(1 / 60); updateBeams(1 / 60);
      updateEnemyBullets(1 / 60); FX.update(1 / 60);
    }
    ok(true, '全部 ' + WEAPONS.length + ' 件武器均可开火');
  });
  attempt('weapon prefixes', () => {
    const p = world.player;
    p.energy = 99999;
    for (const base of WEAPONS) {
      for (let i = 0; i < 4; i++) {
        const w = makeWeaponInstance(base, 8, 1);
        p.weapons[0] = w;
        if (w.kind === 'melee') meleeAttack(w, p, rand(TAU)); else fireWeapon(w, p, rand(TAU));
      }
    }
    world.bullets.length = 0; world.slashes.length = 0; world.beams.length = 0;
    ok(true, '词缀武器生成与开火正常');
  });
  attempt('all buffs apply', () => {
    for (const b of BUFFS) {
      const pp = new Player('mage', 0, 0);
      b.apply(pp);
      if (!isFinite(pp.dmgMul) || !isFinite(pp.maxHp)) ok(false, '祝福产生非法数值: ' + b.name);
    }
    ok(true, '全部 ' + BUFFS.length + ' 个祝福可应用');
  });

  /* ================= 敌人 AI 全量 ================= */
  info('敌人 AI 测试');
  attempt('all enemies', () => {
    Game.startRun('paladin');
    const p = world.player;
    p.hp = 1e7; p.maxHp = 1e7; p.armor = 1e6; p.maxArmor = 1e6;
    let ran = 0;
    for (const def of ENEMY_DEFS) {
      world.enemies.length = 0; world.ebullets.length = 0; world.effects.length = 0;
      world.bullets.length = 0; world.beams.length = 0;
      const e = new Enemy(def, VW / 2 + 150, VH / 2, 6, false);
      e.spawnT = 0;
      world.enemies.push(e);
      for (let i = 0; i < 150; i++) {
        p.invuln = 1;
        p.hp = 1e7;
        e.update(1 / 60);
        updateEnemyBullets(1 / 60);
        updateEffects(1 / 60);
        updateBullets(1 / 60);
        updateBeams(1 / 60);
        FX.update(1 / 60);
        if (e.dead) break;
      }
      ran++;
    }
    world.enemies.length = 0;
    ok(ran === ENEMY_DEFS.length, '全部 ' + ran + ' 种敌人 AI 运行无异常');
  });

  /* ================= Boss ================= */
  info('Boss 战测试');
  attempt('all bosses', () => {
    const p = world.player;
    p.hp = 1e7; p.maxHp = 1e7; p.armor = 1e6; p.maxArmor = 1e6;
    for (const bd of BOSS_DEFS) {
      world.enemies.length = 0; world.ebullets.length = 0; world.effects.length = 0;
      world.beams.length = 0; world.bullets.length = 0; world.pickups.length = 0;
      const b = new Boss(bd, VW / 2, VH / 3, 6);
      b.spawnT = 0;
      world.enemies.push(b);
      const phases = new Set([b.phase]);
      for (let i = 0; i < 1600; i++) {
        p.invuln = 1; p.hp = 1e7;
        if (i === 800) b.hp = b.maxHp * .5;
        if (i === 1200) b.hp = b.maxHp * .25;
        b.update(1 / 60);
        updateEnemyBullets(1 / 60);
        updateEffects(1 / 60);
        updateBeams(1 / 60);
        updateBullets(1 / 60);
        FX.update(1 / 60);
        phases.add(b.phase);
      }
      if (phases.size < 2) ok(false, 'Boss 未进入第二阶段: ' + bd.name);
      b.hp = 0; b.die({});
      if (!b.dead) ok(false, 'Boss 无法死亡: ' + bd.name);
      ok(true, 'Boss [' + bd.name + '] 多阶段与死亡流程正常（阶段 ' + phases.size + '）');
      Game.pendingBlessing = 0;
      world.enemies.length = 0;
    }
    Game.state = 'playing';
    world.player.dead = false;
  });
  attempt('blessing overlay', () => {
    Game.state = 'blessing';
    UI.showBlessings([BUFFS[0], BUFFS[1], BUFFS[2]], () => { });
    Game.state = 'playing';
    UI.clear();
    ok(true, '祝福选择界面构建成功');
  });

  /* ================= 角色 & 技能 ================= */
  info('角色技能测试');
  attempt('all characters + skills', () => {
    for (const c of CHARACTERS) {
      Game.startRun(c.id);
      const p = world.player;
      if (!p || p.charId !== c.id) { ok(false, '角色创建失败: ' + c.name); continue; }
      p.energy = 9999; p.maxEnergy = 9999;
      p.triggerSkill();
      if (!(p.skillCd > 0)) ok(false, '技能未触发: ' + c.name);
      for (let i = 0; i < 20; i++) { p.invuln = 1; Game.update(1 / 60); }
      if (p.dead) ok(false, '释放技能后角色死亡: ' + c.name);
    }
    ok(true, '全部 8 名角色技能释放正常');
  });

  /* ================= 房间机制 ================= */
  info('房间 / 门 / 清理');
  attempt('room doors', () => {
    Game.startRun('knight');
    const fd = world.floorData;
    const battle = fd.rooms.find(r => r.type === 'battle');
    if (!battle) throw new Error('没有战斗房');
    enterRoom(battle, 's');
    if (!battle.spawned) ok(false, '战斗房未生成敌人');
    if (world.enemies.length === 0) ok(false, '战斗房没有敌人');
    let closedDoor = false;
    for (const d of ['n', 's', 'e', 'w']) {
      if (!battle.links[d]) continue;
      const dd = DIRS[d];
      if (battle.tiles[dd.rows[0]][dd.cols[0]] === 2) closedDoor = true;
    }
    if (!closedDoor) ok(false, '战斗时门未关闭');
    clearEnemies();
    for (let i = 0; i < 8; i++) Game.update(1 / 60);
    if (!battle.cleared) ok(false, '房间未被标记为清空');
    let openDoor = false;
    for (const d of ['n', 's', 'e', 'w']) {
      if (!battle.links[d]) continue;
      const dd = DIRS[d];
      if (battle.tiles[dd.rows[0]][dd.cols[0]] === 3) openDoor = true;
    }
    if (!openDoor) ok(false, '清空后门未开启');
    ok(true, '战斗房生成敌人 / 关门 / 清空开门 正常');
    // 房间切换
    const dir = ['n', 's', 'e', 'w'].find(d => battle.next[d]);
    if (dir) {
      const before = world.room;
      enterRoom(battle.next[dir], DIRS[dir].opp);
      ok(world.room !== before, '房间切换成功');
    }
  });

  /* ================= 掉落 / 拾取 / 商店 / 宝箱 ================= */
  info('掉落与商店');
  attempt('coins & health pickup', () => {
    Game.startRun('ranger');
    const p = world.player;
    const c0 = Game.coins;
    world.pickups.push(new Pickup('coin', p.x, p.y, { value: 5, vx: 0, vy: 0 }));
    for (let i = 0; i < 20; i++) Game.update(1 / 60);
    if (Game.coins <= c0) ok(false, '金币未被拾取');
    p.hp = 10;
    world.pickups.push(new Pickup('health', p.x, p.y, { heal: 30, vx: 0, vy: 0 }));
    for (let i = 0; i < 20; i++) Game.update(1 / 60);
    if (p.hp <= 10) ok(false, '治疗药水无效');
    ok(true, '金币与药水拾取正常');
  });
  attempt('weapon pickup prompt', () => {
    Game.startRun('engineer');
    const p = world.player;
    p.x = 200; p.y = 200;
    const w = makeWeaponInstance(WEAPON_BY_ID.railgun, 3, 0);
    Game.spawnWeaponDrop(p.x + 30, p.y, w);
    Game.scanInteract();
    if (!UI.interactText) ok(false, '未显示拾取提示');
    Game.interact();
    const got = p.weapons.some(x => x && x.baseId === 'railgun');
    if (!got) ok(false, '武器未进入武器槽');
    ok(true, '武器掉落 / E 拾取正常');
  });
  attempt('shop purchase', () => {
    Game.startRun('alchemist');
    const shopRoom = world.floorData.rooms.find(r => r.type === 'shop');
    if (!shopRoom) { ok(false, '本层没有商店房'); return; }
    enterRoom(shopRoom, 's');
    const offers = world.pickups.filter(pk => pk.price > 0);
    if (offers.length < 3) ok(false, '商店商品不足: ' + offers.length);
    const wp = offers.find(pk => pk.type === 'shopWeapon');
    Game.coins = 9999;
    const before = Game.coins;
    const p = world.player;
    p.x = wp.x; p.y = wp.y;
    Game.scanInteract();
    Game.interact();
    if (!(Game.coins < before)) ok(false, '购买未扣金币');
    if (!p.weapons.some(w => w && w.baseId === wp.weapon.baseId)) ok(false, '购买武器未获得');
    ok(true, '商店购买流程正常');
  });
  attempt('chest', () => {
    Game.startRun('gunner');
    const room = world.floorData.rooms.find(r => r.type === 'treasure');
    if (!room) { ok(false, '本层没有宝藏房'); return; }
    enterRoom(room, 's');
    const chest = room.props.find(pr => pr.kind === 'chest' && !pr.opened);
    if (!chest) { ok(false, '宝藏房没有宝箱'); return; }
    const p = world.player;
    p.x = chest.x; p.y = chest.y + 30;
    Game.scanInteract();
    Game.interact();
    if (!chest.opened) ok(false, '宝箱未打开');
    if (world.pickups.length === 0) ok(false, '宝箱没有掉落');
    ok(true, '宝箱开启与掉落正常');
  });

  /* ================= 楼层推进 ================= */
  info('楼层推进');
  attempt('next floor / portal', () => {
    Game.startRun('mage');
    const f0 = Game.floor;
    Game.spawnPortal(world.room);
    const p = world.player;
    p.x = VW / 2; p.y = VH / 2;
    for (let i = 0; i < 200; i++) Game.update(1 / 60);
    if (Game.floor !== f0 + 1) ok(false, '传送门未推进楼层: ' + Game.floor);
    if (!world.floorData || world.floorData.floor !== Game.floor) ok(false, '楼层数据不匹配');
    ok(true, '传送门 / 下一层生成正常');
  });
  attempt('30 floors generation', () => {
    let bad = 0;
    for (let f = 1; f <= 30; f++) {
      world.room = null;
      const fd = generateFloor(f);
      if (fd.rooms.length < 6) { bad++; ok(false, '第' + f + '层房间太少'); }
      if (!connected(fd)) { bad++; ok(false, '第' + f + '层地图不连通'); }
      if (!fd.rooms.some(r => r.type === 'boss')) { bad++; ok(false, '第' + f + '层没有首领房'); }
      if (!fd.rooms.some(r => r.type === 'shop')) { bad++; ok(false, '第' + f + '层没有商店'); }
      if (!fd.rooms.some(r => r.type === 'treasure')) { bad++; ok(false, '第' + f + '层没有宝箱房'); }
    }
    ok(bad === 0, '连续 30 层地图生成均连通且包含首领/商店/宝藏房');
  });

  /* ================= 实战模拟 ================= */
  info('实战模拟');
  attempt('combat simulation', () => {
    Game.startRun('ranger');
    const p = world.player;
    const battle = world.floorData.rooms.find(r => r.type === 'battle');
    enterRoom(battle, 's');
    const c0 = Game.runStats.kills;
    for (let i = 0; i < 900; i++) {
      p.invuln = 1;
      if (p.dead) { p.dead = false; p.hp = p.maxHp; Game.state = 'playing'; }
      const tgt = nearestEnemy(p.x, p.y, 900);
      if (tgt) {
        Input.mouse.down = true;
        Input.mouse.x = tgt.x; Input.mouse.y = tgt.y;
        Input.keys['KeyD'] = tgt.x > p.x + 30;
        Input.keys['KeyA'] = tgt.x < p.x - 30;
        Input.keys['KeyW'] = tgt.y < p.y - 30;
        Input.keys['KeyS'] = tgt.y > p.y + 30;
      }
      if (i === 120) Input.pressed['Space'] = true;
      if (i === 240) Input.pressed['KeyQ'] = true;
      if (i === 300) Input.pressed['Digit2'] = true;
      Game.update(1 / 60);
      Game.render();
      if (!isFinite(p.x) || !isFinite(p.y)) { ok(false, '玩家坐标 NaN'); break; }
    }
    Input.keys = {};
    Input.mouse.down = false;
    ok(Game.runStats.kills >= c0, '实战模拟 900 帧无崩溃（击杀 ' + Game.runStats.kills + '）');
    if (Game.runStats.damage <= 0) ok(false, '实战模拟未造成伤害');
    ok(Game.runStats.damage > 0, '伤害统计正常: ' + Math.round(Game.runStats.damage));
  });

  /* ================= 八层战役模拟 ================= */
  info('八层战役模拟');
  attempt('campaign simulation', () => {
    Game.startRun('gunner');
    const themesSeen = new Set();
    let roomsEntered = 0, bossesFought = 0;
    for (let f = 1; f <= 8; f++) {
      if (f > 1) Game.nextFloor();
      themesSeen.add(world.floorData.theme);
      const fd = world.floorData;
      for (const room of fd.rooms.slice()) {
        if (room.type === 'start' || room.type === 'shop' || room.type === 'treasure') continue;
        world.room = null;
        enterRoom(room, 's');
        roomsEntered++;
        for (let i = 0; i < 6; i++) Game.update(1 / 60);
        if (room.type === 'boss') bossesFought++;
        // 清空敌人
        let guard = 0;
        while (world.enemies.length && guard++ < 60) {
          for (const e of world.enemies.slice()) if (!e.dead) e.hurt(1e9, {});
          for (let i = 0; i < 3; i++) Game.update(1 / 60);
          if (Game.state !== 'playing') break;
        }
        for (let i = 0; i < 4; i++) Game.update(1 / 60);
        if (Game.state === 'blessing') {
          Game.state = 'playing';
          UI.clear();
          BUFFS[(f * 7 + roomsEntered) % BUFFS.length].apply(world.player);
        }
        if (world.player.dead) { world.player.dead = false; world.player.hp = world.player.maxHp; Game.state = 'playing'; }
      }
      if (Game.state !== 'playing') { Game.state = 'playing'; UI.clear(); }
    }
    ok(roomsEntered >= 30, '连续 8 层共进入 ' + roomsEntered + ' 个战斗房间');
    ok(bossesFought >= 7, '连续 8 层共挑战 ' + bossesFought + ' 个首领');
    ok(themesSeen.size >= 4, '主题轮换生效（' + themesSeen.size + ' 种主题）');
    ok(!!world.floorData && Game.floor === 8, '战役推进到第 ' + Game.floor + ' 层无异常');
  });

  /* ================= 结算 / 存档 ================= */
  info('结算与存档');
  attempt('finish run', () => {
    Game.state = 'playing';
    Game.finishRun(false);
    if (Game.state !== 'gameover') ok(false, '结算状态异常');
    if (!(Save.data.gems >= 0)) ok(false, '宝石记录异常');
    UI.showGameOver({ floor: 3, kills: 10, damage: 500, coins: 40, time: 60, gems: 12 });
    Game.quitToTitle();
    if (Game.state !== 'title') ok(false, '返回标题失败');
    ok(true, '结算 / 返回标题 正常');
  });
  attempt('save load', () => {
    Save.data.gems = 1234;
    Save.save();
    Save.data.gems = 0;
    Save.load();
    if (Save.data.gems !== 1234) ok(false, '存档读取异常: ' + Save.data.gems);
    ok(true, 'localStorage 存档读写正常');
  });

  info('完成，共执行 ' + frames + ' 帧模拟');
  globalThis.__TEST_RESULTS__ = R;
})();
