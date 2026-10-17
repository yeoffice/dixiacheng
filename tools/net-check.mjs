/* 联机端到端测试：真服务器 + 两个真浏览器页面
   验证：建房/加入、开局同步、队友出现、移动同步、怪物同步、队友开火在房主端结算 */
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const PORT = Number(process.env.NET_TEST_PORT || 8098);
const CDP_PORT = 9335;
const EDGE = process.env.EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDir = path.join(process.env.TEMP || '.', 'dsh-net-' + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const errors = [];
function ok(cond, msg) { results.push([cond ? 'ok' : 'FAIL', msg]); console.log((cond ? '  ok  ' : 'FAIL  ') + msg); }

const srv = spawn(process.execPath, [path.join(root, 'server', 'index.mjs')], {
  env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
});
let srvLog = '';
srv.stdout.on('data', d => { srvLog += d.toString(); });
srv.stderr.on('data', d => { srvLog += d.toString(); });

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${userDir}`, '--window-size=1280,800', 'about:blank',
], { stdio: 'ignore' });

class Cdp {
  constructor(url, label) {
    this.url = url; this.label = label; this.seq = 0; this.pending = new Map(); this.ws = null;
  }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = evt => {
      const m = JSON.parse(evt.data);
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id); this.pending.delete(m.id);
        if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result || {});
        return;
      }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        errors.push(this.label + ': ' + ((d.exception && (d.exception.description || d.exception.value)) || d.text));
      }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        errors.push(this.label + ' console.error: ' + m.params.args.map(a => a.value || a.description || '').join(' '));
      }
    };
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, 15000);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(this.label + ' JS异常: ' + ((d.exception && (d.exception.description || d.exception.value)) || d.text));
    }
    return r.result ? r.result.value : undefined;
  }
  async waitFor(expr, timeout = 10000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try { if (await this.eval(expr)) return true; } catch (e) { /* 页面可能还没加载完 */ }
      await sleep(120);
    }
    return false;
  }
  async shot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    (await import('node:fs')).writeFileSync(path.join(root, 'tools', name), Buffer.from(r.data, 'base64'));
    console.log('      screenshot: tools/' + name);
  }
}

async function waitPort() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); if (r.ok) return await r.json(); } catch (e) { /* retry */ }
    await sleep(100);
  }
  throw new Error('CDP port not ready');
}

(async () => {
  let A = null, B = null;
  try {
    await sleep(600);
    ok(srvLog.includes('联机服务已启动'), '联机服务端已启动');
    const ver = await waitPort();
    console.log('      Edge ' + ver.Browser);

    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
    const first = list.find(t => t.type === 'page');
    if (!first) throw new Error('no page target');
    const second = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' })).json();

    A = new Cdp(first.webSocketDebuggerUrl, 'A');
    B = new Cdp(second.webSocketDebuggerUrl, 'B');
    await A.open(); await B.open();
    for (const c of [A, B]) { await c.send('Page.enable'); await c.send('Runtime.enable'); }

    const url = 'http://127.0.0.1:' + PORT + '/';
    await A.send('Page.navigate', { url });
    await B.send('Page.navigate', { url });
    // 两个 tab 只有一个在前台，后台 tab 的 rAF 会被冻结；强制都保持 active + 焦点模拟
    for (const c of [A, B]) {
      try { await c.send('Page.setWebLifecycleState', { state: 'active' }); } catch (e) { /* ignore */ }
      try { await c.send('Emulation.setFocusEmulationEnabled', { enabled: true }); } catch (e) { /* ignore */ }
    }
    ok(await A.waitFor('typeof Net !== "undefined" && typeof Game !== "undefined" && Game.state === "title"', 20000), '房主页面加载完成');
    ok(await B.waitFor('typeof Net !== "undefined" && typeof Game !== "undefined" && Game.state === "title"', 20000), '成员页面加载完成');
    ok(await A.eval('typeof Net.openLobby === "function"'), '联机模块已加载');

    /* ---------- 建房 / 加入 ---------- */
    await A.eval('Net.openLobby(); Net.name = "房主A"; Net.createRoom("ws://127.0.0.1:' + PORT + '", "房主A"); true');
    ok(await A.waitFor('Net.on === true && !!Net.code', 8000), '房主创建房间成功');
    const code = await A.eval('Net.code');
    console.log('      房间码: ' + code);
    ok(/^[A-Z0-9]{4}$/.test(code), '房间码 ' + code);
    ok(await A.eval('Net.isHost === true'), '房主身份正确');

    // 房间列表 API
    const api = await (await fetch('http://127.0.0.1:' + PORT + '/api/rooms')).json();
    ok(api.ok && api.rooms.length === 1 && api.rooms[0].code === code, '房间列表 API 返回刚创建的房间');
    ok(api.rooms[0].players === 1 && api.rooms[0].started === false, '房间列表人数与状态正确');

    // 成员打开大厅 -> 看到列表 -> 点击加入
    await B.eval('Net.openLobby(); true');
    await B.waitFor('document.querySelectorAll("#netRooms .net-room").length > 0', 8000);
    const listed = await B.eval('document.querySelectorAll("#netRooms .net-room").length');
    ok(listed === 1, '成员大厅显示房间列表 (' + listed + ' 个)');
    const listText = await B.eval('(document.querySelector("#netRooms .net-room")||{}).textContent || ""');
    ok(String(listText).includes(code), '列表项显示房间码 ' + code);
    await B.eval('(()=>{const b=document.querySelector("#netRooms [data-join]"); if(b) b.click(); return true;})()');
    ok(await B.waitFor('Net.on === true && !!Net.code', 8000), '点击列表中的房间直接加入');
    await B.eval('Net.charId = "ranger"; true');
    ok(await B.eval('Net.isHost === false'), '成员身份正确');
    ok(await A.waitFor('Net.peers.size === 1', 5000), '房主看到 1 名队友');
    ok(await B.eval('Net.peers.size === 1'), '成员看到房主');

    /* ---------- 开局 ---------- */
    await A.eval('Net.charId = "ranger"; Net.send({ t: "start" }); Net.beginGame(); true');
    ok(await A.waitFor('Game.state === "playing"', 6000), '房主进入游戏');
    ok(await B.waitFor('Game.state === "playing"', 8000), '成员跟随开局');
    ok(await B.waitFor('Net.started === true', 5000), '成员联机状态就绪');

    /* ---------- 队友互见 ---------- */
    await sleep(1200);
    const diag = {
      aTicks: await A.eval('Net.ticks'),
      aStates: await A.eval('Net.states'),
      aTx: await A.eval('Net.tx'),
      bRx: await B.eval('Net.rx'),
      aHost: await A.eval('Net.isHost'),
      bHost: await B.eval('Net.isHost'),
      aWs: await A.eval('Net.ws ? Net.ws.readyState : -1'),
      bWs: await B.eval('Net.ws ? Net.ws.readyState : -1'),
      aStarted: await A.eval('Net.started'),
      bStarted: await B.eval('Net.started'),
      aState: await A.eval('Game.state'),
      bState: await B.eval('Game.state'),
      aOn: await A.eval('Net.on'),
      bOn: await B.eval('Net.on'),
      aRaf: await A.eval('typeof requestAnimationFrame'),
    };
    console.log('      diag:', JSON.stringify(diag));
    ok(await A.waitFor('Net.ghosts.size === 1', 6000), '房主端建立成员代理角色');
    ok(await B.waitFor('Net.remote.size === 1', 8000), '成员端出现房主投影');

    /* ---------- 移动同步 ---------- */
    const before = await A.eval('(()=>{const g=[...Net.ghosts.values()][0];return g?Math.round(g.x):-1;})()');
    await B.eval('Input.keys["KeyD"] = true; true');
    await sleep(900);
    await B.eval('Input.keys["KeyD"] = false; true');
    const after = await A.eval('(()=>{const g=[...Net.ghosts.values()][0];return g?Math.round(g.x):-1;})()');
    ok(before > 0 && after > before + 8, `成员移动同步到房主端 (x ${before} -> ${after})`);

    /* ---------- 怪物同步 ---------- */
    await A.eval('(()=>{const r=world.floorData.rooms.find(x=>x.type==="battle"); if(r) enterRoom(r,"s"); return true;})()');
    await sleep(700);
    const hostEnemies = await A.eval('world.enemies.length');
    ok(hostEnemies > 0, '房主战斗房已生成怪物 (' + hostEnemies + ')');
    const clientEnemies = await B.eval('world.enemies.length');
    ok(clientEnemies > 0, '成员端收到怪物快照 (' + clientEnemies + ')');
    const dbg = {
      bLast: await B.eval('Net.last ? { r: Net.last.r, e: Net.last.e.length, p: Net.last.p.length, f: Net.last.f } : null'),
      bRoom: await B.eval('world.room ? [world.room.gx, world.room.gy, world.room.type] : null'),
      bRx: await B.eval('Net.rx'),
      bEnemies: await B.eval('world.enemies.length'),
      aRoom: await A.eval('world.room ? [world.room.gx, world.room.gy, world.room.type] : null'),
      aEnemies: await A.eval('world.enemies.length'),
    };
    console.log('      dbg:', JSON.stringify(dbg));
    const sameIds = await A.eval(`(()=>{
      const ids = new Set(world.enemies.map(e=>e.nid));
      return { host: [...ids].slice(0,8) };
    })()`);
    const clientIds = await B.eval('world.enemies.map(e=>e.nid).slice(0,8)');
    const overlap = sameIds.host.filter(id => clientIds.includes(id)).length;
    ok(overlap >= Math.min(3, sameIds.host.length), `怪物编号在两端一致 (重叠 ${overlap}/${sameIds.host.length})`);

    /* ---------- 成员开火在房主端结算 ---------- */
    await A.eval('world.enemies.forEach(e=>{e.hp=9999;e.maxHp=9999;}); world.bullets.length=0; world.slashes.length=0; true');
    const bullets0 = await A.eval('world.bullets.length + world.slashes.length');
    await B.eval('Input.mouse.down = true; Input.mouse.x = 700; Input.mouse.y = 300; true');
    await sleep(1200);
    const bullets1 = await A.eval('world.bullets.length + world.slashes.length');
    await B.eval('Input.mouse.down = false; true');
    const fireDbg = {
      bFiring: await B.eval('Input.firing'),
      bTx: await B.eval('Net.tx'),
      ghost: await A.eval('(()=>{const g=[...Net.ghosts.values()][0];return g?{cd:+g.weapon().cd.toFixed(2),dead:g.dead,energy:Math.round(g.energy),w:g.weapon().name}:null;})()'),
      aBullets: await A.eval('world.bullets.length'),
      aSlashes: await A.eval('world.slashes.length'),
    };
    console.log('      fireDbg:', JSON.stringify(fireDbg));
    ok(bullets1 > bullets0, `成员开火在房主端生成攻击 (${bullets0} -> ${bullets1})`);

    /* ---------- 房主过门，成员一起过 ---------- */
    const gate = await A.eval(`(()=>{
      const r = world.room;
      world.enemies.length = 0;
      r.cleared = true; setDoors(r, true);
      const dir = ['s','e','w','n'].find(d => r.next[d]);
      const target = r.next[dir];
      enterRoom(target, dir);
      return { dir, room: [world.room.gx, world.room.gy] };
    })()`);
    await sleep(900);
    const bRoom = await B.eval('world.room ? [world.room.gx, world.room.gy] : null');
    ok(JSON.stringify(bRoom) === JSON.stringify(gate.room), '房主过门后成员进入同一房间 ' + JSON.stringify(gate.room));
    const bNear = await B.eval(`(()=>{const p=world.player; const h=[...Net.remote.values()][0]; if(!p||!h) return -1; return Math.round(Math.hypot(p.x-h.p.x, p.y-h.p.y));})()`);
    ok(bNear >= 0 && bNear < 180, '成员落点在房主附近 (距离 ' + bNear + 'px)');
    const bDoor = await B.eval('world.room ? !!world.room.cleared : false');
    ok(bDoor === true, '房间清空状态同步到成员端');

    /* ---------- 成员不能自主过门 ---------- */
    const bBefore = await B.eval('world.room ? [world.room.gx, world.room.gy] : null');
    await B.eval('(()=>{const r=world.room; r.cleared=true; const p=world.player; p.x=VW/2; p.y=6; return true;})()');
    await sleep(600);
    const bAfter = await B.eval('world.room ? [world.room.gx, world.room.gy] : null');
    ok(JSON.stringify(bBefore) === JSON.stringify(bAfter), '成员不能自主过门，房间保持不变');

    /* ---------- 传送门同步 ---------- */
    await A.eval('Game.spawnPortal(world.room); true');
    await sleep(700);
    ok(await B.waitFor('!!world.portal', 5000), '传送门同步到成员端');

    /* ---------- 掉线处理 ---------- */
    await B.eval('Net.close(); true');
    await sleep(600);
    ok(await A.waitFor('Net.peers.size === 0 && Net.ghosts.size === 0', 6000), '成员离开后房主端清理代理');

    await A.shot('net-host.png');
    ok(errors.length === 0, '全程无 JS 异常（' + errors.length + ' 条）');
    if (errors.length) for (const e of errors.slice(0, 8)) console.log('  ! ' + e);

    const fails = results.filter(r => r[0] === 'FAIL').length;
    console.log(`\n${results.length - fails} passed, ${fails} failed`);
    process.exitCode = fails ? 1 : 0;
  } catch (err) {
    console.error('FATAL:', err && err.stack || err);
    if (srvLog) console.error('server log:\n' + srvLog);
    process.exitCode = 2;
  } finally {
    try { if (A) A.ws.close(); } catch (e) { /* ignore */ }
    try { if (B) B.ws.close(); } catch (e) { /* ignore */ }
    try { edge.kill(); } catch (e) { /* ignore */ }
    try { srv.kill(); } catch (e) { /* ignore */ }
  }
})();
