'use strict';
/* =====================================================================
   UI：HUD / 菜单 / 图鉴 / 祝福 / 触屏控制
   ===================================================================== */
const UI = {
  root: null,
  layer: null,
  toasts: [],
  energyHintT: 0,
  interactText: '',
  titleScreen: null,
  selectedChar: null,
  codexTab: 'weapons',
  helpOpen: false,
  _built: false,

  init() {
    this.root = document.getElementById('domui');
    this.selectedChar = Save.data.unlocked[0] || 'knight';
    if (!Save.data.unlocked.includes(this.selectedChar)) this.selectedChar = 'knight';
    this.buildTouchButtons();
    addEventListener('keydown', e => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (Game.state === 'playing') Game.togglePause();
        else if (Game.state === 'paused') Game.resume();
      }
      if (e.code === 'KeyM') {
        Sfx.setSfx(!Sfx.enabled);
        this.toast(Sfx.enabled ? '音效开启' : '音效关闭', '#8fe6ff');
      }
    });
    this.showTitle();
  },

  buildTouchButtons() {
    UI_BUTTONS.length = 0;
    const add = (id, x, y, r, label, onDown) => {
      UI_BUTTONS.push({ id, x, y, r, label, onDown, visible: false, down: false, kind: 'action' });
    };
    add('skill', 0, 0, 31, 'Q', () => { if (world.player) world.player.triggerSkill(); });
    add('dash', 0, 0, 25, '冲', () => { Input.pressed['Space'] = true; });
    add('swap', 0, 0, 22, '换', () => { if (world.player) world.player.nextWeapon(); });
    add('interact', 0, 0, 22, 'E', () => { if (Game.state === 'playing') Game.interact(); });
    add('pause', 0, 0, 17, '‖', () => { if (Game.state === 'playing') Game.togglePause(); });
    add('slot0', 0, 0, 26, '', () => { if (world.player) world.player.swapWeapon(0); });
    add('slot1', 0, 0, 26, '', () => { if (world.player) world.player.swapWeapon(1); });
  },

  MOBILE_BTN: {
    skill: [VW - 66, VH - 150, 31],
    dash: [VW - 152, VH - 104, 25],
    interact: [VW - 66, VH - 292, 22],
    swap: [VW - 66, VH - 230, 22],
    pause: [VW - 26, 26, 17],
    slot0: [VW - 223, VH - 37, 27],
    slot1: [VW - 77, VH - 37, 27],
  },

  setTouchVisible(v) {
    for (const b of UI_BUTTONS) {
      b.visible = v;
      const m = this.MOBILE_BTN[b.id];
      if (v && m) { b.x = m[0]; b.y = m[1]; b.r = m[2]; }
    }
  },

  mount(html) {
    if (!this.root) this.root = document.getElementById('domui');
    this.root.innerHTML = html;
  },
  clear() {
    if (this.root) this.root.innerHTML = '';
    UI_BUTTONS.forEach(b => b.down = false);
  },

  /* =====================================================================
     标题 / 选人
     ===================================================================== */
  showTitle() {
    Game.state = 'title';
    Input.resetSticks();
    this.setTouchVisible(false);
    const cards = CHARACTERS.map(c => {
      const locked = !Save.data.unlocked.includes(c.id);
      const sel = this.selectedChar === c.id;
      const pips = (n, cls) => Array.from({ length: 5 }, (_, i) => `<div class="pip ${cls} ${i < n ? 'on' : ''}"></div>`).join('');
      return `<div class="char-card ${sel ? 'sel' : ''} ${locked ? 'locked' : ''}" data-char="${c.id}">
        <canvas width="72" height="72" data-portrait="${c.id}"></canvas>
        <div class="cn" style="color:${c.color}">${c.name}</div>
        <div class="cr">${c.title}</div>
        <div class="statline">${pips(Math.round(c.hp / 30), 'hp')}</div>
        <div class="statline">${pips(Math.round(c.armor / 28), '')}</div>
        <div class="skill">${c.skill.name}<br><span style="color:#7b7494">${c.skill.desc.slice(0, 18)}…</span></div>
        ${locked ? `<div class="price">${c.cost} 💎</div>` : ''}
      </div>`;
    }).join('');
    const d = Save.data;
    this.mount(`<div class="layer"><div class="panel" style="max-width:760px">
      <h1 class="title">地牢骑士<small>无尽回响</small></h1>
      <div class="sub">随机地牢 · ${WEAPONS.length} 件武器 · ${ENEMY_DEFS.filter(e => !e.hidden).length} 种敌人 · ${BOSS_DEFS.length} 位首领</div>
      <div class="char-grid">${cards}</div>
      <div class="row" style="margin-top:18px">
        <button class="btn primary" id="btnStart">开始冒险</button>
        <button class="btn" id="btnCodex">图 鉴</button>
        <button class="btn ghost" id="btnHelp">玩 法</button>
      </div>
      <div class="record">
        <span>最深层数 <b>${d.bestFloor || 0}</b></span>
        <span>宝石 <b>${d.gems || 0}</b> 💎</span>
        <span>总击杀 <b>${fmt(d.kills || 0)}</b></span>
        <span>冒险次数 <b>${d.runs || 0}</b></span>
      </div>
      <div class="hint">
        <span class="kbd">WASD</span> 移动 &nbsp; <span class="kbd">鼠标</span> 瞄准 &nbsp; <span class="kbd">左键</span> 射击/挥砍 &nbsp;
        <span class="kbd">空格</span> 冲刺 &nbsp; <span class="kbd">Q</span> 技能 &nbsp; <span class="kbd">E</span> 交互 &nbsp; <span class="kbd">1/2</span> 换武器
      </div>
    </div></div>`);
    // 头像
    for (const c of CHARACTERS) {
      const cv = this.root.querySelector(`canvas[data-portrait="${c.id}"]`);
      if (!cv) continue;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, 72, 72);
      const grd = g.createRadialGradient(36, 40, 4, 36, 40, 38);
      grd.addColorStop(0, withAlpha(c.color, .35)); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 72, 72);
      const spr = _spriteCache.get(playerSprite(c.id, 0));
      if (spr) g.drawImage(spr, 4, 6, 64, 64);
    }
    this.root.querySelectorAll('.char-card').forEach(el => {
      el.onclick = () => {
        const id = el.dataset.char;
        const c = CHAR_BY_ID[id];
        if (!Save.data.unlocked.includes(id)) {
          if (Save.data.gems >= c.cost) {
            Save.data.gems -= c.cost;
            Save.data.unlocked.push(id);
            Save.save();
            Sfx.play('levelup');
            this.toast('解锁 ' + c.name + '！', c.color);
            this.showTitle();
          } else {
            Sfx.play('error');
            this.toast('宝石不足，需要 ' + c.cost + ' 💎', '#ff8a8a');
          }
          return;
        }
        this.selectedChar = id;
        Sfx.play('select');
        this.showTitle();
      };
    });
    const start = this.root.querySelector('#btnStart');
    start.onclick = () => { Sfx.resume(); Sfx.play('levelup'); Game.startRun(this.selectedChar); };
    this.root.querySelector('#btnCodex').onclick = () => { Sfx.play('select'); this.showCodex('weapons'); };
    this.root.querySelector('#btnHelp').onclick = () => { Sfx.play('select'); this.showHelp(); };
  },

  /* =====================================================================
     图鉴
     ===================================================================== */
  showCodex(tab) {
    this.codexTab = tab || this.codexTab;
    Game.state = 'codex';
    const t = this.codexTab;
    let tabHtml = '';
    const tabs = [['weapons', '武器'], ['enemies', '敌人'], ['bosses', '首领']];
    for (const [id, name] of tabs) tabHtml += `<div class="tab ${t === id ? 'on' : ''}" data-tab="${id}">${name}</div>`;
    let body = '';
    if (t === 'weapons') {
      body = WEAPONS.map(w => {
        const seen = Save.data.seenWeapons.includes(w.id);
        return `<div class="codex-item ${seen ? '' : 'locked'}" title="${w.desc}">
          <canvas width="40" height="24" data-wicon="${w.id}"></canvas>
          <div><div class="n" style="color:${tierColor(w.tier)}">${w.name}</div>
          <div class="d">${TIER_NAME[w.tier]} · ${w.dmg}伤害 · ${w.rate.toFixed(1)}/s</div></div>
        </div>`;
      }).join('');
    } else if (t === 'enemies') {
      body = ENEMY_DEFS.filter(e => !e.hidden).map(e => {
        const seen = Save.data.seenEnemies.includes(e.id);
        return `<div class="codex-item ${seen ? '' : 'locked'}" title="${e.desc}">
          <canvas width="32" height="32" data-eicon="${e.id}"></canvas>
          <div><div class="n">${e.name}</div><div class="d">${e.hp} HP · ${e.dmg} 伤害 · ${e.speed} 速度</div></div>
        </div>`;
      }).join('');
    } else {
      body = BOSS_DEFS.map(b => {
        const seen = Save.data.seenEnemies.includes(b.id);
        return `<div class="codex-item ${seen ? '' : 'locked'}" title="${b.desc}">
          <canvas width="48" height="48" data-bicon="${b.id}"></canvas>
          <div><div class="n" style="color:#ffd257">${b.name} · ${b.title}</div><div class="d">${b.hp} HP · ${b.phases} 阶段</div></div>
        </div>`;
      }).join('');
    }
    this.mount(`<div class="layer"><div class="panel" style="width:800px">
      <h1 class="title" style="font-size:28px;letter-spacing:4px">地 牢 图 鉴</h1>
      <div class="tabs">${tabHtml}</div>
      <div class="codex-grid scroll" style="max-height:340px">${body}</div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="btnBack">返 回</button></div>
    </div></div>`);
    this.root.querySelectorAll('.tab').forEach(el => el.onclick = () => { Sfx.play('select'); this.showCodex(el.dataset.tab); });
    this.root.querySelector('#btnBack').onclick = () => { Sfx.play('select'); this.showTitle(); };
    // 绘制图标
    for (const w of WEAPONS) {
      const cv = this.root.querySelector(`canvas[data-wicon="${w.id}"]`);
      if (!cv) continue;
      const icon = _spriteCache.get(weaponIconKey(w));
      if (icon) cv.getContext('2d').drawImage(icon, 0, 0);
    }
    for (const e of ENEMY_DEFS) {
      const cv = this.root.querySelector(`canvas[data-eicon="${e.id}"]`);
      if (!cv) continue;
      const img = _spriteCache.get(enemySprite(e));
      if (img) cv.getContext('2d').drawImage(img, 0, 0, 32, 32);
    }
    for (const b of BOSS_DEFS) {
      const cv = this.root.querySelector(`canvas[data-bicon="${b.id}"]`);
      if (!cv) continue;
      const img = _spriteCache.get(bossSprite(b));
      if (img) cv.getContext('2d').drawImage(img, 0, 0, 48, 48);
    }
  },

  /* =====================================================================
     玩法说明
     ===================================================================== */
  showHelp() {
    Game.state = 'help';
    this.mount(`<div class="layer"><div class="panel" style="width:700px">
      <h1 class="title" style="font-size:26px;letter-spacing:4px">玩 法 说 明</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:16px;font-size:12.5px;line-height:1.85;color:#b8b0d0">
        <div>
          <div style="color:#ffd257;font-weight:800;font-size:14px;margin-bottom:6px">操作</div>
          <span class="kbd">WASD</span> 移动 · <span class="kbd">鼠标</span> 瞄准<br>
          <span class="kbd">左键</span> 按住射击 / 挥砍<br>
          <span class="kbd">空格</span> 冲刺（短暂无敌）<br>
          <span class="kbd">Q</span> 角色技能 · <span class="kbd">E</span> 交互<br>
          <span class="kbd">1</span>/<span class="kbd">2</span> 或滚轮 切换双武器<br>
          <span class="kbd">Esc</span> 暂停 · <span class="kbd">M</span> 静音<br>
          手机：左半屏移动，右半屏瞄准并自动射击
        </div>
        <div>
          <div style="color:#ffd257;font-weight:800;font-size:14px;margin-bottom:6px">生存</div>
          · <b style="color:#ff6f7d">红条</b> 生命，只能靠药水恢复<br>
          · <b style="color:#7cd8ff">蓝条</b> 护甲，脱战后自动回复<br>
          · <b style="color:#a99cff">紫条</b> 能量，射击消耗、随时间恢复<br>
          · 清空房间才能开门，首领倒下后出现传送门<br>
        </div>
        <div>
          <div style="color:#ffd257;font-weight:800;font-size:14px;margin-bottom:6px">成长</div>
          · 每个首领掉落随机武器与大量金币<br>
          · 击败首领后从 3 个祝福中选择 1 个<br>
          · 商店可以用金币购买武器 / 药水 / 护甲<br>
          · 宝石在死亡后结算，用于永久解锁新角色<br>
        </div>
        <div>
          <div style="color:#ffd257;font-weight:800;font-size:14px;margin-bottom:6px">小技巧</div>
          · 元素可叠加：燃烧、中毒、冰冻、连锁闪电<br>
          · 黑球与虚空权杖能聚怪，适合搭配爆炸武器<br>
          · 绕后攻击可破解持盾敌人<br>
          · 冲刺穿过弹幕比硬吃伤害划算
        </div>
      </div>
      <div class="row" style="margin-top:20px"><button class="btn primary" id="btnBack">返 回</button></div>
    </div></div>`);
    this.root.querySelector('#btnBack').onclick = () => { Sfx.play('select'); this.showTitle(); };
  },

  /* =====================================================================
     暂停
     ===================================================================== */
  showPause() {
    const s = Save.data.settings;
    this.mount(`<div class="layer"><div class="panel" style="width:420px">
      <h1 class="title" style="font-size:30px;letter-spacing:8px">暂 停</h1>
      <div class="sub">第 ${Game.floor} 层 · ${floorName(Game.floor)}</div>
      <div class="col" style="margin-top:20px;align-items:stretch">
        <button class="btn primary" id="btnResume">继续冒险</button>
        <button class="btn" id="btnMusic">${s.music ? '♪ 音乐：开' : '♪ 音乐：关'}</button>
        <button class="btn" id="btnSfx">${s.sfx ? '🔊 音效：开' : '🔇 音效：关'}</button>
        <button class="btn ghost" id="btnQuit">放弃并返回标题</button>
      </div>
      <div class="hint">按 Esc 继续 · 当前击杀 ${Game.runStats.kills} · 伤害 ${fmt(Game.runStats.damage)}</div>
    </div></div>`);
    this.root.querySelector('#btnResume').onclick = () => Game.resume();
    this.root.querySelector('#btnMusic').onclick = () => { Sfx.setMusic(!Sfx.musicEnabled); this.showPause(); };
    this.root.querySelector('#btnSfx').onclick = () => { Sfx.setSfx(!Sfx.enabled); this.showPause(); };
    this.root.querySelector('#btnQuit').onclick = () => { Game.quitToTitle(); };
  },

  /* =====================================================================
     祝福
     ===================================================================== */
  showBlessings(list, onPick) {
    Game.state = 'blessing';
    this.mount(`<div class="layer"><div class="panel" style="max-width:800px">
      <h1 class="title" style="font-size:30px;letter-spacing:6px">首 领 击 破</h1>
      <div class="sub">选择一项祝福，继续深入</div>
      <div class="bless-grid">
        ${list.map((b, i) => `<div class="bless" data-i="${i}">
          <div class="ico">${b.icon}</div>
          <div class="bn">${b.name}</div>
          <div class="bd">${b.desc}</div>
          <span class="rar r${b.tier}">${TIER_NAME[b.tier]}</span>
        </div>`).join('')}
      </div>
      <div class="hint">祝福永久作用于本次冒险</div>
    </div></div>`);
    this.root.querySelectorAll('.bless').forEach(el => {
      el.onclick = () => {
        const i = +el.dataset.i;
        Sfx.play('levelup');
        onPick(list[i], i);
      };
    });
  },

  /* =====================================================================
     结算
     ===================================================================== */
  showGameOver(stats) {
    Game.state = 'gameover';
    this.setTouchVisible(false);
    const d = Save.data;
    this.mount(`<div class="layer"><div class="panel" style="width:560px">
      <div class="over-title dead">冒 险 结 束</div>
      <div class="sub">你倒在了第 ${stats.floor} 层 · ${floorName(stats.floor)}</div>
      <div class="stat-grid">
        <div class="stat-box"><div class="k">击杀</div><div class="v">${stats.kills}</div></div>
        <div class="stat-box"><div class="k">造成伤害</div><div class="v">${fmt(stats.damage)}</div></div>
        <div class="stat-box"><div class="k">收集金币</div><div class="v">${stats.coins}</div></div>
        <div class="stat-box"><div class="k">存活时间</div><div class="v">${Math.floor(stats.time / 60)}:${String(Math.floor(stats.time % 60)).padStart(2, '0')}</div></div>
        <div class="stat-box"><div class="k">到达层数</div><div class="v">${stats.floor}</div></div>
        <div class="stat-box"><div class="k">获得宝石</div><div class="v" style="color:#54e0ff">+${stats.gems}</div></div>
      </div>
      <div class="hint">最深层数记录：${d.bestFloor || 0} 层 · 宝石总数：${d.gems} 💎</div>
      <div class="row" style="margin-top:18px">
        <button class="btn primary" id="btnRetry">再来一局</button>
        <button class="btn ghost" id="btnTitle">返回标题</button>
      </div>
    </div></div>`);
    this.root.querySelector('#btnRetry').onclick = () => { Sfx.play('select'); Game.startRun(this.selectedChar); };
    this.root.querySelector('#btnTitle').onclick = () => { Sfx.play('select'); Game.quitToTitle(); };
  },

  /* =====================================================================
     提示
     ===================================================================== */
  toast(text, color = '#e9e6f5') {
    this.toasts.push({ text, color, t: 0, life: 1.8 });
    if (this.toasts.length > 3) this.toasts.shift();
  },
  hintEnergy() {
    if (performance.now() - this.energyHintT < 700) return;
    this.energyHintT = performance.now();
    this.toast('能量不足', '#a99cff');
    Sfx.play('error');
  },

  update(dt) {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].t += dt;
      if (this.toasts[i].t > this.toasts[i].life) this.toasts.splice(i, 1);
    }
  },

  /* =====================================================================
     HUD
     ===================================================================== */
  drawHUD(g) {
    const p = world.player;
    if (!p) return;
    const t = performance.now() / 1000;
    const touch = Input.touchMode && Game.state === 'playing';
    this.setTouchVisible(touch);
    g.save();

    /* --- 左上角状态面板 --- */
    const px0 = 10, py0 = 8, pw = 404, ph = 100;
    g.globalAlpha = .84;
    g.fillStyle = 'rgba(10,8,18,.94)';
    roundRect(g, px0, py0, pw, ph, 8); g.fill();
    g.strokeStyle = withAlpha(p.char.color, .5); g.lineWidth = 1.4; g.stroke();
    g.globalAlpha = 1;
    // 头像
    g.save();
    g.beginPath(); g.arc(px0 + 30, py0 + 46, 25, 0, TAU); g.clip();
    g.fillStyle = withAlpha(p.char.color, .18); g.fillRect(px0 + 4, py0 + 20, 54, 54);
    const spr = _spriteCache.get(playerSprite(p.charId, 0));
    if (spr) {
      const rim = tintedSprite('hud_' + p.charId, spr, p.char.color);
      g.drawImage(rim, px0 + 5, py0 + 18, 52, 52);
      g.drawImage(spr, px0 + 7, py0 + 20, 48, 48);
    }
    g.restore();
    g.strokeStyle = withAlpha(p.char.color, .85); g.lineWidth = 1.6;
    g.beginPath(); g.arc(px0 + 30, py0 + 46, 25, 0, TAU); g.stroke();
    // 名字 / 等级
    drawText(g, p.char.name, px0 + 64, py0 + 13, { size: 12, color: p.char.color, weight: 800 });
    drawText(g, 'Lv.' + (1 + Math.floor(Game.runStats.kills / 40)), px0 + pw - 14, py0 + 13, { size: 9.5, color: '#8f88aa', align: 'right' });
    // 生命
    const bx = px0 + 64, bw = 232;
    bar(g, bx, py0 + 22, bw, 13, p.hp / p.maxHp, '#ff5d6c');
    drawText(g, `${Math.ceil(p.hp)}/${Math.round(p.maxHp)}`, bx + bw / 2, py0 + 28.5, { size: 10, color: '#fff', align: 'center', weight: 800 });
    // 护甲
    bar(g, bx, py0 + 38, bw, 11, p.armor / p.maxArmor, '#54c8ff');
    drawText(g, `${Math.ceil(p.armor)}/${Math.round(p.maxArmor)}`, bx + bw / 2, py0 + 43.5, { size: 8.5, color: '#dff4ff', align: 'center', weight: 700 });
    // 能量
    bar(g, bx, py0 + 54, bw, 10, p.energy / p.maxEnergy, '#a99cff');
    drawText(g, `${Math.min(Math.floor(p.energy), Math.round(p.maxEnergy))}/${Math.round(p.maxEnergy)}`, bx + bw / 2, py0 + 59, { size: 8.5, color: '#efe9ff', align: 'center', weight: 700 });
    // 圣盾
    if (p.shieldHp > 0) {
      bar(g, bx, py0 + 68, bw, 6, clamp(p.shieldHp / 90, 0, 1), '#ffe066');
    }
    // 状态图标
    let sx = bx;
    const statuses = [];
    if (p.burn > 0) statuses.push(['#ffa63d', '燃']);
    if (p.poison > 0) statuses.push(['#a6ff6b', '毒']);
    if (p.slowT > 0) statuses.push(['#8fdcff', '缓']);
    if (p.rapidT > 0) statuses.push(['#7bff9b', '速']);
    if (p.shieldHp > 0) statuses.push(['#ffe066', '盾']);
    if (p.invuln > 0) statuses.push(['#ffffff', '闪']);
    for (const [col, ch] of statuses) {
      g.fillStyle = withAlpha(col, .22); g.fillRect(sx, py0 + 84, 16, 10);
      g.strokeStyle = withAlpha(col, .5); g.lineWidth = 1; g.strokeRect(sx, py0 + 84, 16, 10);
      drawText(g, ch, sx + 8, py0 + 89.5, { size: 8, color: col, align: 'center', weight: 800, shadow: false });
      sx += 18;
    }

    /* --- 技能 & 冲刺按钮（键鼠模式显示在面板内） --- */
    if (!touch) {
    const skx = 352, sky = py0 + 34, skr = 23;
    drawText(g, 'Q', 322, sky, { size: 10, color: p.skillCd > 0 ? '#5e5678' : '#c9c1e6', align: 'right', weight: 800 });
    this.drawCircleButton(g, skx, sky, skr, p.char.color, () => {
      drawSkillIcon(g, p.char.skill.id, skx, sky, 27, p.skillCd > 0 ? '#6a6280' : '#ffe066');
    });
    if (p.skillCd > 0) {
      g.save();
      g.fillStyle = 'rgba(0,0,0,.68)';
      g.beginPath(); g.moveTo(skx, sky); g.arc(skx, sky, skr, -PI / 2, -PI / 2 + TAU * (p.skillCd / p.skillCdMax)); g.closePath(); g.fill();
      g.restore();
      drawText(g, Math.ceil(p.skillCd), skx, sky, { size: 13, color: '#fff', align: 'center', weight: 800 });
    }
    // 冲刺
    const dsx = 352, dsy = py0 + 78, dsr = 18;
    drawText(g, '空格', 322, dsy, { size: 9, color: p.dashCd > 0 ? '#5e5678' : '#c9c1e6', align: 'right', weight: 700 });
    this.drawCircleButton(g, dsx, dsy, dsr, '#8fe6ff', () => {
      g.save();
      g.strokeStyle = p.dashCd > 0 ? '#5a5470' : '#8fe6ff';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(dsx - 6, dsy + 5); g.lineTo(dsx + 2, dsy - 5); g.lineTo(dsx + 2, dsy); g.lineTo(dsx + 8, dsy);
      g.moveTo(dsx + 6, dsy - 5); g.lineTo(dsx - 2, dsy + 5); g.stroke();
      g.restore();
    });
    if (p.dashCd > 0) {
      g.save(); g.globalAlpha = .6; g.fillStyle = 'rgba(0,0,0,.65)';
      g.beginPath(); g.arc(dsx, dsy, dsr, -PI / 2, -PI / 2 + TAU * (p.dashCd / .85)); g.lineTo(dsx, dsy); g.fill(); g.restore();
    }
    }

    /* --- 顶部信息 --- */
    drawText(g, `第 ${Game.floor} 层`, VW / 2, 18, { size: 17, color: '#ffe9a8', align: 'center', weight: 900 });
    drawText(g, floorName(Game.floor) + (roomLabel(world.room) ? ' · ' + roomLabel(world.room) : ''), VW / 2, 36, { size: 11, color: '#a99cff', align: 'center' });

    // Boss 血条
    const boss = world.enemies.find(e => e.isBoss && !e.dead);
    if (boss) {
      const bw2 = 460, bx2 = (VW - bw2) / 2, by2 = VH - 108;
      g.globalAlpha = .92;
      g.fillStyle = 'rgba(10,8,18,.92)'; roundRect(g, bx2 - 8, by2 - 5, bw2 + 16, 32, 7); g.fill();
      g.strokeStyle = '#7c1520'; g.lineWidth = 1.5; g.stroke();
      g.globalAlpha = 1;
      drawText(g, `${boss.def.name} · ${boss.def.title}`, VW / 2, by2 + 4, { size: 11, color: '#ffd257', align: 'center', weight: 800 });
      bar(g, bx2, by2 + 13, bw2, 8, boss.hp / boss.maxHp, '#e0434f', 'rgba(40,10,16,.9)');
      // 阶段标记
      for (let i = 1; i < boss.maxPhase; i++) {
        const frac = i === 1 ? .55 : .28;
        g.fillStyle = 'rgba(255,255,255,.5)';
        g.fillRect(bx2 + bw2 * (1 - frac), by2 + 11, 1.5, 12);
      }
    }

    /* --- 金币 / 宝石 --- */
    const coinImg = _spriteCache.get(propSprite('coin'));
    if (coinImg) g.drawImage(coinImg, VW - 148, 12, 20, 20);
    drawText(g, String(Game.coins), VW - 122, 23, { size: 15, color: '#ffd257', weight: 800 });
    const gemImg = _spriteCache.get(propSprite('gem'));
    if (gemImg) g.drawImage(gemImg, VW - 148, 34, 18, 18);
    drawText(g, String(Save.data.gems), VW - 124, 44, { size: 12, color: '#8fe6ff', weight: 700 });

    /* --- 小地图 --- */
    this.drawMinimap(g, VW - 134, 58);

    /* --- 武器槽 --- */
    this.drawWeaponSlots(g);

    /* --- 交互提示 --- */
    if (this.interactText && Game.state === 'playing') {
      g.save();
      g.font = '700 12px "Microsoft YaHei", system-ui, sans-serif';
      const tw = Math.max(190, g.measureText(this.interactText).width + 34);
      g.restore();
      const py = boss ? VH - 146 : VH - 96;
      g.globalAlpha = .9;
      g.fillStyle = 'rgba(10,8,18,.92)';
      roundRect(g, VW / 2 - tw / 2, py, tw, 30, 7); g.fill();
      g.strokeStyle = '#8f74ff'; g.lineWidth = 1.4; g.stroke();
      g.globalAlpha = 1;
      drawText(g, this.interactText, VW / 2, py + 15, { size: 12, color: '#ffe9a8', align: 'center', weight: 700 });
    }

    /* --- 键盘提示（前 14 秒） --- */
    if (!Input.touchMode && Game.runTime < 14) {
      const a = clamp((14 - Game.runTime) / 3, 0, 1);
      drawText(g, 'WASD 移动 · 空格 冲刺 · Q 技能 · E 交互', VW / 2, VH - 26, { size: 11, color: '#8f88aa', align: 'center', alpha: a });
    }

    /* --- 准星 --- */
    if (!Input.touchMode && Game.state === 'playing') {
      const mx = Input.mouse.x, my = Input.mouse.y;
      g.save();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.4;
      g.beginPath(); g.arc(mx, my, 7, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(mx - 1, my - 1, 2, 2);
      g.strokeStyle = withAlpha(p.char.color, .8);
      g.beginPath(); g.arc(mx, my, 11, .4, 1.2); g.stroke();
      g.beginPath(); g.arc(mx, my, 11, 1.9, 2.7); g.stroke();
      g.restore();
    }

    /* --- 低血量红光 --- */
    const hpPct = p.hp / p.maxHp;
    if (hpPct < .35) {
      const a = (.35 - hpPct) * (1.6 + Math.sin(t * 6) * .5);
      const grd = g.createRadialGradient(VW / 2, VH / 2, VH * .3, VW / 2, VH / 2, VH * .8);
      grd.addColorStop(0, 'rgba(255,0,30,0)');
      grd.addColorStop(1, `rgba(255,20,50,${clamp(a, 0, .5)})`);
      g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
    }

    /* --- Toast --- */
    let ty = 96;
    for (const tt of this.toasts) {
      const alpha = clamp(Math.min(tt.t * 6, (tt.life - tt.t) * 3), 0, 1);
      g.globalAlpha = alpha;
      g.font = '700 13px "Microsoft YaHei", system-ui, sans-serif';
      const tw = g.measureText(tt.text).width + 26;
      g.fillStyle = 'rgba(10,8,18,.9)';
      roundRect(g, VW / 2 - tw / 2, ty - 11, tw, 24, 6); g.fill();
      g.strokeStyle = withAlpha(tt.color, .6); g.lineWidth = 1.2; g.stroke();
      drawText(g, tt.text, VW / 2, ty + 1, { size: 13, color: tt.color, align: 'center', weight: 700, shadow: false });
      g.globalAlpha = 1;
      ty += 27;
    }

    /* --- 触屏摇杆 --- */
    if (touch) this.drawTouch(g);
    g.restore();
  },

  drawCircleButton(g, x, y, r, color, drawIcon) {
    g.save();
    g.fillStyle = 'rgba(12,10,22,.85)';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = withAlpha(color, .55); g.lineWidth = 1.8;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.restore();
    g.save();
    g.beginPath(); g.arc(x, y, r - 1.5, 0, TAU); g.clip();
    drawIcon();
    g.restore();
  },

  fitText(g, text, maxW, size) {
    g.save();
    g.font = `800 ${size}px "Microsoft YaHei", system-ui, sans-serif`;
    let s = text;
    if (g.measureText(s).width > maxW) {
      while (s.length > 1 && g.measureText(s + '…').width > maxW) s = s.slice(0, -1);
      s += '…';
    }
    g.restore();
    return s;
  },

  drawWeaponSlots(g) {
    const p = world.player;
    if (!p) return;
    for (let i = 0; i < 2; i++) {
      const w = p.weapons[i];
      const x = i === 0 ? VW - 292 : VW - 146, y = VH - 64, ww = 138, hh = 54;
      const active = p.slot === i;
      g.save();
      g.globalAlpha = active ? .97 : .72;
      g.fillStyle = 'rgba(10,8,18,.92)';
      roundRect(g, x, y, ww, hh, 7); g.fill();
      g.strokeStyle = active ? (w ? tierColor(w.tier) : '#3b3358') : '#3b3358';
      g.lineWidth = active ? 2 : 1.2; g.stroke();
      if (active) {
        g.globalAlpha = .14;
        g.fillStyle = w ? tierColor(w.tier) : '#fff';
        roundRect(g, x, y, ww, hh, 7); g.fill();
      }
      g.globalAlpha = 1;
      if (w) {
        const icon = _spriteCache.get(weaponIconKey(w));
        if (icon) g.drawImage(icon, x + 8, y + 10, 38, 23);
        const nm = this.fitText(g, w.name, 78, 9.5);
        drawText(g, nm, x + 50, y + 16, { size: 9.5, color: tierColor(w.tier), weight: 800 });
        drawText(g, `${TIER_NAME[w.tier]}${w.energy > 0 ? ' · ' + w.energy + '能' : ' · 无消耗'}`, x + 50, y + 32, { size: 7.5, color: '#827a9e' });
        // 冷却
        const cd = w.cd || 0, cdm = 1 / (w.rate || 1);
        if (cd > 0) {
          g.fillStyle = 'rgba(0,0,0,.65)';
          g.fillRect(x + 2, y + hh - 5, (ww - 4) * clamp(cd / cdm, 0, 1), 2.4);
        }
        drawText(g, String(i + 1), x + ww - 7, y + 8, { size: 8.5, color: '#6f6888', align: 'right' });
      } else {
        drawText(g, '空武器槽', x + ww / 2, y + hh / 2, { size: 10, color: '#585074', align: 'center' });
      }
      g.restore();
    }
    if (p.weapons[1]) {
      drawText(g, Input.touchMode ? '点按槽位切换' : '1 / 2 切换武器', VW - 16, VH - 74, { size: 8, color: '#6f6888', align: 'right' });
    }
  },

  drawMinimap(g, x, y) {
    const fd = world.floorData;
    if (!fd) return;
    const cs = 15, gap = 3;
    const gw = fd.gridW, gh = fd.gridH;
    const w = gw * (cs + gap) - gap, h = gh * (cs + gap) - gap;
    g.save();
    g.globalAlpha = .82;
    g.fillStyle = 'rgba(10,8,18,.9)';
    roundRect(g, x - 6, y - 6, w + 12, h + 12, 6); g.fill();
    g.strokeStyle = '#3b3358'; g.lineWidth = 1; g.stroke();
    g.globalAlpha = 1;
    // 连线
    for (const r of fd.rooms) {
      if (!r.visited) continue;
      for (const d of ['e', 's']) {
        if (!r.links[d]) continue;
        const nb = r.next[d];
        if (!nb || !nb.visited) continue;
        const ax = x + r.gx * (cs + gap) + cs / 2, ay = y + r.gy * (cs + gap) + cs / 2;
        const bx2 = x + nb.gx * (cs + gap) + cs / 2, by2 = y + nb.gy * (cs + gap) + cs / 2;
        g.strokeStyle = '#4a4068'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx2, by2); g.stroke();
      }
    }
    for (const r of fd.rooms) {
      const rx = x + r.gx * (cs + gap), ry = y + r.gy * (cs + gap);
      if (!r.visited) { g.fillStyle = 'rgba(40,34,60,.65)'; g.fillRect(rx, ry, cs, cs); continue; }
      let col = '#5a5478';
      if (r.type === 'boss') col = '#c22a3a';
      else if (r.type === 'shop') col = '#ffc93c';
      else if (r.type === 'treasure') col = '#3fd894';
      else if (r.type === 'start') col = '#5b7fe0';
      else if (r.type === 'challenge') col = '#a86bff';
      g.fillStyle = r.cleared ? col : withAlpha(col, .5);
      g.fillRect(rx, ry, cs, cs);
      g.strokeStyle = withAlpha('#000', .5); g.lineWidth = 1; g.strokeRect(rx, ry, cs, cs);
      if (r === world.room) {
        g.strokeStyle = '#ffe066'; g.lineWidth = 2;
        g.strokeRect(rx - 1, ry - 1, cs + 2, cs + 2);
      }
      if (r.type === 'boss') {
        g.fillStyle = '#ffd257';
        const cx2 = rx + cs / 2, cy2 = ry + cs / 2;
        g.beginPath();
        g.moveTo(cx2 - 4, cy2 + 3); g.lineTo(cx2 - 4, cy2 - 3); g.lineTo(cx2 - 1, cy2);
        g.lineTo(cx2, cy2 - 5); g.lineTo(cx2 + 1, cy2); g.lineTo(cx2 + 4, cy2 - 3); g.lineTo(cx2 + 4, cy2 + 3);
        g.closePath(); g.fill();
      }
    }
    g.restore();
  },

  drawTouch(g) {
    const p = world.player;
    if (!p) return;
    // 动作按钮
    for (const b of UI_BUTTONS) {
      if (!b.visible) continue;
      if (b.id === 'slot0' || b.id === 'slot1') continue;
      if (b.id === 'skill') {
        this.drawCircleButton(g, b.x, b.y, b.r, p.char.color, () => {
          drawSkillIcon(g, p.char.skill.id, b.x, b.y, b.r * 1.15, p.skillCd > 0 ? '#6a6280' : '#ffe066');
        });
        if (p.skillCd > 0) {
          g.save();
          g.fillStyle = 'rgba(0,0,0,.66)';
          g.beginPath(); g.moveTo(b.x, b.y);
          g.arc(b.x, b.y, b.r, -PI / 2, -PI / 2 + TAU * (p.skillCd / p.skillCdMax)); g.closePath(); g.fill();
          g.restore();
          drawText(g, Math.ceil(p.skillCd), b.x, b.y, { size: 15, color: '#fff', align: 'center', weight: 800 });
        }
        drawText(g, '技能', b.x, b.y + b.r + 9, { size: 8.5, color: '#9a92b4', align: 'center', weight: 700 });
        continue;
      }
      if (b.id === 'dash') {
        this.drawCircleButton(g, b.x, b.y, b.r, '#8fe6ff', () => {
          g.save();
          g.strokeStyle = p.dashCd > 0 ? '#5a5470' : '#8fe6ff'; g.lineWidth = 2.6;
          g.beginPath();
          g.moveTo(b.x - 9, b.y + 3); g.lineTo(b.x - 1, b.y - 7); g.lineTo(b.x - 1, b.y - 2); g.lineTo(b.x + 8, b.y - 2);
          g.moveTo(b.x + 6, b.y - 7); g.lineTo(b.x - 2, b.y + 7);
          g.stroke(); g.restore();
        });
        if (p.dashCd > 0) {
          g.save(); g.fillStyle = 'rgba(0,0,0,.66)';
          g.beginPath(); g.moveTo(b.x, b.y); g.arc(b.x, b.y, b.r, -PI / 2, -PI / 2 + TAU * (p.dashCd / .85)); g.closePath(); g.fill(); g.restore();
        }
        drawText(g, '冲刺', b.x, b.y + b.r + 9, { size: 8.5, color: '#9a92b4', align: 'center', weight: 700 });
        continue;
      }
      g.save();
      g.globalAlpha = b.down ? .95 : .62;
      g.fillStyle = 'rgba(12,10,22,.8)';
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
      g.strokeStyle = '#6f5ea8'; g.lineWidth = 1.4;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.stroke();
      drawText(g, b.label, b.x, b.y + 1, { size: 11, color: '#c9c1e6', align: 'center', weight: 700, shadow: false });
      g.restore();
    }
    // 摇杆
    for (const [stick, color] of [[Input.stickMove, '#67e8ff'], [Input.stickAim, '#ff8a8a']]) {
      if (!stick) continue;
      g.save();
      g.globalAlpha = .25;
      g.fillStyle = '#0a0812';
      g.beginPath(); g.arc(stick.ox, stick.oy, 52, 0, TAU); g.fill();
      g.globalAlpha = .7;
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.arc(stick.ox, stick.oy, 52, 0, TAU); g.stroke();
      let dx = stick.x - stick.ox, dy = stick.y - stick.oy;
      const l = Math.hypot(dx, dy);
      if (l > 42) { dx = dx / l * 42; dy = dy / l * 42; }
      g.globalAlpha = .85;
      g.fillStyle = withAlpha(color, .5);
      g.beginPath(); g.arc(stick.ox + dx, stick.oy + dy, 22, 0, TAU); g.fill();
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.arc(stick.ox + dx, stick.oy + dy, 22, 0, TAU); g.stroke();
      g.restore();
    }
    // 瞄准辅助线
    if (Input.stickAim && p) {
      g.save();
      g.globalAlpha = .25; g.strokeStyle = '#ff8a8a'; g.lineWidth = 1.4;
      g.setLineDash([4, 8]);
      g.beginPath(); g.moveTo(p.x, p.y);
      g.lineTo(p.x + Math.cos(p.aimAngle) * 260, p.y + Math.sin(p.aimAngle) * 260);
      g.stroke(); g.setLineDash([]);
      g.restore();
    }
  },
};
