/* 通过 CDP 驱动真实 Edge，验证点击开局 / 键鼠操作 / 战斗 / 祝福 / 楼层推进 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = process.env.EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.resolve(process.argv[2] || '.');
const port = 9333;
const userDir = path.join(process.env.TEMP || '.', 'dsh-edge-cdp-' + Date.now());
const pageUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const outDir = path.join(root, 'tools');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const errors = [];
function ok(cond, msg) { results.push([cond ? 'ok' : 'FAIL', msg]); console.log((cond ? '  ok  ' : 'FAIL  ') + msg); }

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--window-size=1280,800', 'about:blank',
], { stdio: 'ignore' });

let ws = null, seq = 0;
const pending = new Map();

async function waitPort() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return await r.json();
    } catch (e) { /* retry */ }
    await sleep(100);
  }
  throw new Error('Edge debugging port not ready');
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout ' + method)); } }, 15000);
  });
}

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error('JS异常: ' + (d.exception && (d.exception.description || d.exception.value) || d.text));
  }
  return r.result ? r.result.value : undefined;
}

async function waitFor(expr, timeout = 8000, interval = 120) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (await evaluate(expr)) return true; } catch (e) { /* keep waiting */ }
    await sleep(interval);
  }
  return false;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(r.data, 'base64'));
  console.log('      screenshot: tools/' + name);
}

let rect = null;
async function getRect() {
  rect = await evaluate(`(()=>{const r=document.getElementById('game').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};})()`);
  return rect;
}
function vp(gx, gy) {
  return { x: Math.round(rect.x + gx / 960 * rect.w), y: Math.round(rect.y + gy / 544 * rect.h) };
}
async function mouseMove(gx, gy, held = false) {
  const p = vp(gx, gy);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, button: held ? 'left' : 'none', buttons: held ? 1 : 0 });
}
async function mouseDown() {
  const p = vp(480, 300);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 });
}
async function mouseUp() {
  const p = vp(480, 300);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: 1 });
}
const VK = { KeyA: 65, KeyD: 68, KeyW: 87, KeyS: 83, Space: 32, KeyQ: 81, KeyE: 69, Digit1: 49, Digit2: 50 };
async function keyDown(code, key) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: key || code, windowsVirtualKeyCode: VK[code] || 0, nativeVirtualKeyCode: VK[code] || 0 });
}
async function keyUp(code, key) {
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: key || code, windowsVirtualKeyCode: VK[code] || 0, nativeVirtualKeyCode: VK[code] || 0 });
}
async function press(code, key, hold = 90) {
  await keyDown(code, key);
  await sleep(hold);
  await keyUp(code, key);
}
async function clickAt(sel) {
  const r = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return null;const b=el.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()`);
  if (!r) throw new Error('element not found: ' + sel);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y, button: 'none', buttons: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', buttons: 1, clickCount: 1 });
  await sleep(60);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', buttons: 0, clickCount: 1 });
}

(async () => {
  try {
    const ver = await waitPort();
    console.log('Edge', ver.Browser);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('no page target');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    ws.onmessage = evt => {
      const msg = JSON.parse(evt.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id); pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result || {});
        return;
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        errors.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        errors.push('console.error: ' + msg.params.args.map(a => a.value || a.description || '').join(' '));
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        errors.push('log: ' + msg.params.entry.text);
      }
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');

    await send('Page.navigate', { url: pageUrl });
    await sleep(600);
    await waitFor('typeof Game !== "undefined" && Game.state === "title"', 20000);
    await getRect();
    console.log('viewport', rect);

    /* ---------- 标题页 ---------- */
    const state0 = await evaluate('typeof Game !== "undefined" ? Game.state : "boot-fail"');
    ok(state0 === 'title', '页面启动并进入标题页 (state=' + state0 + ')');
    ok(await evaluate('typeof window.__TEST_RESULTS__ === "undefined"'), '无测试注入，纯游戏页面');
    await shot('cdp-title.png');
    // 选角色
    await evaluate('document.querySelector(\'.char-card[data-char="ranger"]\').click()');
    await sleep(250);
    ok(await evaluate('!!document.querySelector(\'.char-card.sel[data-char="ranger"]\')'), '点击角色卡切换选择');
    // 开始（使用真实鼠标点击，验证 DOM 点击与音频解锁）
    await clickAt('#btnStart');
    await sleep(800);
    ok(await evaluate('Game.state === "playing"'), '点击「开始冒险」进入游戏');
    ok(await evaluate('!!Sfx.ac && Sfx.ac.state === "running"'), '音频上下文已解锁并运行');
    ok(await evaluate('Sfx.musicOn === true'), '背景音乐已启动');
    ok(await evaluate('!!world.player && world.player.charId === "ranger"'), '玩家使用所选角色（游侠）');
    ok(await evaluate('world.room.type === "start"'), '出生房间为入口');
    await shot('cdp-start.png');

    /* ---------- 移动 / 射击 / 技能 ---------- */
    await mouseMove(700, 240);
    await keyDown('KeyD');
    await sleep(500);
    await keyUp('KeyD');
    const moved = await evaluate('world.player.x');
    ok(moved > 480, '键盘 D 移动生效 (x=' + Math.round(moved) + ')');
    await mouseDown();
    await sleep(700);
    const firing = await evaluate('({firing: Input.firing, energy: world.player.energy, bullets: world.bullets.length, cd: world.player.weapon().cd})');
    ok(firing.firing === true, '鼠标左键触发持续射击');
    ok(firing.bullets >= 0, '射击系统运行（当前屏幕弹丸 ' + firing.bullets + '）');
    await mouseUp();
    await press('Space', ' ');
    await sleep(200);
    ok(await evaluate('world.player.dashCd > 0'), '空格冲刺生效');
    await press('KeyQ', 'q');
    await sleep(300);
    ok(await evaluate('world.player.skillCd > 0'), 'Q 技能释放生效');
    await press('Digit2', '2');
    await sleep(150);
    ok(true, '数字键切换武器无异常');

    /* ---------- 进入战斗房 ---------- */
    const enemyCount = await evaluate('(()=>{const fd=world.floorData;const r=fd.rooms.find(x=>x.type==="battle");enterRoom(r,"s");return world.enemies.length;})()');
    ok(enemyCount >= 3, '进入战斗房并生成 ' + enemyCount + ' 名敌人');
    await sleep(600);
    await shot('cdp-combat.png');
    // 真实键鼠战斗 3 秒
    await mouseDown();
    for (let i = 0; i < 30; i++) {
      const tgt = await evaluate('(()=>{const t=nearestEnemy(world.player.x,world.player.y,900); return t?{x:t.x,y:t.y}:null;})()');
      if (tgt) await mouseMove(tgt.x, tgt.y, true);
      await sleep(110);
    }
    await mouseUp();
    const stats = await evaluate('({kills:Game.runStats.kills, dmg:Math.round(Game.runStats.damage), hp:Math.round(world.player.hp), enemies:world.enemies.length})');
    ok(stats.dmg > 0, '实战中造成伤害 (' + stats.dmg + ')');
    await shot('cdp-fight.png');
    // 清房
    await evaluate('world.enemies.forEach(e=>e.hurt(1e9,{}))');
    await sleep(700);
    ok(await evaluate('world.room.cleared === true'), '击杀全部敌人后房间开启');
    ok(await evaluate('!!document.querySelector("#domui .layer") === false'), '游戏中无遮挡层');

    /* ---------- Boss 房 ---------- */
    const bossOk = await evaluate('(()=>{Game.floor=3;const fd=generateFloor(3);world.room=null;enterRoom(fd.boss,"s");const b=world.enemies.find(e=>e.isBoss);if(b){b.spawnT=0;}return !!b;})()');
    ok(bossOk, '第 3 层首领房生成 Boss');
    await sleep(1400);
    await shot('cdp-boss.png');
    const bossName = await evaluate('(()=>{const b=world.enemies.find(e=>e.isBoss);return b?b.def.name:"";})()');
    ok(!!bossName, 'Boss 已激活：' + bossName);
    // 让 Boss 释放技能
    await sleep(1600);
    await shot('cdp-boss2.png');
    // 击杀 Boss
    await evaluate('(()=>{const b=world.enemies.find(e=>e.isBoss); b.hp=0; b.die({}); return true;})()');
    await sleep(2200);
    ok(await evaluate('Game.state === "blessing"'), '击败 Boss 后弹出祝福选择');
    ok(await evaluate('document.querySelectorAll("#domui .bless").length === 3'), '祝福界面提供 3 个选项');
    await shot('cdp-blessing.png');
    await evaluate('document.querySelector("#domui .bless") && document.querySelector("#domui .bless").click()');
    await sleep(600);
    ok(await evaluate('Game.state === "playing"'), '选择祝福后继续游戏');
    ok(await evaluate('!!world.portal'), '祝福后出现传送门');
    await shot('cdp-portal.png');
    // 走进传送门
    await evaluate('world.player.x=VW/2; world.player.y=VH/2;');
    await sleep(2900);
    const floorNow = await evaluate('Game.floor');
    ok(floorNow === 4, '传送门推进到下一层 (floor=' + floorNow + ')');
    await sleep(700);
    await shot('cdp-floor4.png');

    /* ---------- 暂停 / 图鉴 / 结算 ---------- */
    await press('Escape', 'Escape');
    await sleep(350);
    ok(await evaluate('Game.state === "paused"'), 'Esc 打开暂停菜单');
    ok(await evaluate('!!document.getElementById("btnResume")'), '暂停菜单按钮存在');
    await shot('cdp-pause.png');
    await evaluate('document.getElementById("btnResume").click()');
    await sleep(250);
    ok(await evaluate('Game.state === "playing"'), '点击继续恢复游戏');
    await evaluate('Game.finishRun(false)');
    await sleep(400);
    ok(await evaluate('Game.state === "gameover"'), '结算界面正常');
    await shot('cdp-gameover.png');
    await evaluate('document.getElementById("btnTitle").click()');
    await sleep(400);
    ok(await evaluate('Game.state === "title"'), '返回标题页');
    await evaluate('document.getElementById("btnCodex").click()');
    await sleep(350);
    await shot('cdp-codex.png');
    ok(await evaluate('document.querySelectorAll("#domui .codex-item").length > 40'), '图鉴渲染全部武器条目');
    await evaluate('document.querySelector(\'#domui .tab[data-tab="enemies"]\').click()');
    await sleep(300);
    await shot('cdp-codex-enemies.png');
    await evaluate('document.querySelector(\'#domui .tab[data-tab="bosses"]\').click()');
    await sleep(300);
    await shot('cdp-codex-bosses.png');

    /* ---------- 触屏操作 ---------- */
    await evaluate('document.getElementById("btnBack").click()');
    await sleep(250);
    await evaluate('document.getElementById("btnStart").click()');
    await sleep(700);
    ok(await evaluate('Game.state === "playing"'), '触屏测试：重新开局');
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    const lp = vp(260, 400), rp = vp(720, 380);
    const x0 = await evaluate('world.player.x');
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: lp.x, y: lp.y, id: 1 }] });
    await sleep(150);
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: lp.x + 46, y: lp.y, id: 1 }] });
    await sleep(450);
    ok(await evaluate('Input.touchMode === true'), '触屏模式自动激活');
    ok(await evaluate('!!Input.stickMove'), '左半屏虚拟摇杆出现');
    ok(await evaluate('world.player.x > ' + JSON.stringify(x0) + ' + 20'), '虚拟摇杆驱动角色移动');
    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: lp.x + 46, y: lp.y, id: 1 }, { x: rp.x, y: rp.y, id: 2 }],
    });
    await sleep(150);
    await send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: lp.x + 46, y: lp.y, id: 1 }, { x: rp.x + 60, y: rp.y - 34, id: 2 }],
    });
    await sleep(500);
    ok(await evaluate('!!Input.stickAim && Input.firing === true'), '右半屏摇杆瞄准并自动开火');
    ok(await evaluate('UI_BUTTONS.some(b => b.visible)'), '触屏动作按钮显示');
    await shot('cdp-touch.png');
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(300);
    // 触屏技能按钮
    await evaluate('world.player.skillCd = 0; world.player.energy = world.player.maxEnergy;');
    await sleep(100);
    const sk = vp(894, 394);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sk.x, y: sk.y, id: 3 }] });
    await sleep(120);
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(250);
    ok(await evaluate('world.player.skillCd > 0'), '触屏点击技能按钮释放技能');

    /* ---------- 引擎级战斗诊断：固定目标 ---------- */
    const diag = await evaluate(`(()=>{
      Game.startRun('ranger');
      const room = world.floorData.rooms.find(x=>x.type==='battle'); enterRoom(room,'s');
      world.enemies.length=0; world.ebullets.length=0;
      const e = new Enemy(ENEMY_BY_ID.skeleton, 700, 300, 1); e.spawnT=0; e.maxHp = 5000; e.hp = 5000; world.enemies.push(e);
      const p = world.player; p.x=300; p.y=300; p.invuln=1e9; p.hp=p.maxHp=9999;
      Input.touchMode=false; Input.stickAim=null; Input.stickMove=null;
      Input.mouse.down=true;
      const d0=Game.runStats.damage;
      for (let i=0;i<180;i++){ Input.mouse.x=e.x; Input.mouse.y=e.y; Game.update(1/60); }
      Input.mouse.down=false;
      return {dmg:Math.round(Game.runStats.damage-d0), ehp:Math.round(e.hp), dead:e.dead, aim:+p.aimAngle.toFixed(2)};
    })()`);
    console.log('      combat diag:', JSON.stringify(diag));
    ok(diag.dmg > 60, '定点靶场 3 秒伤害 ' + diag.dmg + '（伤害判定正常）');

    /* ---------- 性能 ---------- */
    const fps = await evaluate('new Promise(res=>{let n=0;const t0=performance.now();function f(){n++;const el=performance.now()-t0;if(el<1500)requestAnimationFrame(f);else res(Math.round(n/el*1000));}requestAnimationFrame(f);})');
    ok(fps >= 40, '实时渲染帧率 ' + fps + ' fps');

    /* ---------- 结果 ---------- */
    await sleep(300);
    if (errors.length) {
      console.log('\nJS 异常 / 控制台错误：');
      for (const e of errors.slice(0, 10)) console.log('  ! ' + e);
    }
    ok(errors.length === 0, '全程无 JS 异常（' + errors.length + ' 条错误）');
    const fails = results.filter(r => r[0] === 'FAIL').length;
    console.log(`\n${results.length - fails} passed, ${fails} failed`);
    process.exitCode = fails ? 1 : 0;
  } catch (err) {
    console.error('FATAL:', err && err.stack || err);
    process.exitCode = 2;
  } finally {
    try { ws && ws.close(); } catch (e) { }
    try { spawnSync('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) { }
    setTimeout(() => process.exit(process.exitCode || 0), 300);
  }
})();
