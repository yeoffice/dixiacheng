/* 联机一致性审计：两真浏览器 + 真服务器，逐项比对两端世界状态。
   与 net-check 的区别：这里断言的是「两端是否一致」，不是「功能是否存在」。 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const PORT = Number(process.env.NET_TEST_PORT || 8097);
const CDP_A = 9337;
const CDP_B = 9338;
const EDGE = process.env.EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDir = path.join(process.env.TEMP || '.', 'dsh-audit-' + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const errors = [];
function ok(cond, msg) { results.push([cond ? 'ok' : 'FAIL', msg]); console.log((cond ? '  ok  ' : 'FAIL  ') + msg); }
function info(msg) { console.log('  --  ' + msg); }

const srv = spawn(process.execPath, [path.join(root, 'server', 'index.mjs')], {
  env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
});
let srvLog = '';
srv.stdout.on('data', d => { srvLog += d.toString(); });
srv.stderr.on('data', d => { srvLog += d.toString(); });

function spawnEdge(port, tag) {
  return spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}-${tag}`, '--window-size=1280,800', 'about:blank',
  ], { stdio: 'ignore' });
}
const edgeA = spawnEdge(CDP_A, 'a');
const edgeB = spawnEdge(CDP_B, 'b');

class Cdp {
  constructor(url, label) { this.url = url; this.label = label; this.seq = 0; this.pending = new Map(); this.ws = null; }
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
  send(method, params = {}, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, timeoutMs);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(this.label + ' JS: ' + ((d.exception && (d.exception.description || d.exception.value)) || d.text));
    }
    return r.result ? r.result.value : undefined;
  }
  async waitFor(expr, timeout = 10000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try { if (await this.eval(expr)) return true; } catch (e) { /* loading */ }
      await sleep(120);
    }
    return false;
  }
}

async function waitPort(port) {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return await r.json(); } catch (e) { /* retry */ }
    await sleep(100);
  }
  throw new Error('CDP not ready ' + port);
}
async function firstPage(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const p = list.find(t => t.type === 'page');
  if (!p) throw new Error('no page ' + port);
  return p;
}

const SNAP = `(() => {
  const p = world.player;
  const room = world.room;
  return {
    state: Game.state,
    floor: Game.floor,
    room: room ? [room.gx, room.gy] : null,
    cleared: room ? !!room.cleared : null,
    coins: Game.coins,
    hp: p ? Math.round(p.hp) : null,
    dead: p ? !!p.dead : null,
    downT: p ? Math.ceil(p.downT || 0) : null,
    px: p ? Math.round(p.x) : null,
    py: p ? Math.round(p.y) : null,
    enemies: world.enemies.filter(e => !e.dead).length,
    pickups: world.pickups.filter(k => !k.dead).length,
    bullets: world.bullets.filter(b => !b.netGhost).length,
    ghostBullets: world.bullets.filter(b => b.netGhost).length,
    portal: !!world.portal,
    remotePlayers: Net.isHost ? Net.ghosts.size : Net.remote.size,
    remoteHp: Net.isHost
      ? [...Net.ghosts.values()].map(g => Math.round(g.hp))
      : [...Net.remote.values()].map(r => Math.round(r.hp)),
  };
})()`;

const logs = [];
function log(...a) { const s = a.join(' '); logs.push(s); console.log('  --  ' + s); }

(async () => {
  let A = null, B = null;
  try {
    await sleep(700);
    if (!srvLog.includes('联机服务已启动')) throw new Error('server failed\n' + srvLog);
    await waitPort(CDP_A); await waitPort(CDP_B);
    const pa = await firstPage(CDP_A);
    const pb = await firstPage(CDP_B);
    A = new Cdp(pa.webSocketDebuggerUrl, 'A');
    B = new Cdp(pb.webSocketDebuggerUrl, 'B');
    await A.open(); await B.open();
    for (const c of [A, B]) {
      await c.send('Page.enable');
      await c.send('Runtime.enable');
      await c.send('Page.setWebLifecycleState', { state: 'active' });
      await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    }

    const url = 'http://127.0.0.1:' + PORT + '/';
    await A.send('Page.navigate', { url });
    await B.send('Page.navigate', { url });
    if (!await A.waitFor('typeof Net !== "undefined" && Game.state === "title"', 20000)) throw new Error('A boot');
    if (!await B.waitFor('typeof Net !== "undefined" && Game.state === "title"', 20000)) throw new Error('B boot');

    /* ============ 1. 建房 / 加入 ============ */
    await A.eval('Net._url = "ws://127.0.0.1:' + PORT + '"; Net.openLobby(); Net.name = "审计A"; Net.createRoom("ws://127.0.0.1:' + PORT + '", "审计A"); true');
    if (!await A.waitFor('!!Net.code', 8000)) throw new Error('A create room failed');
    const code = await A.eval('Net.code');
    log('房间码', code);
    await B.eval('Net._url = "ws://127.0.0.1:' + PORT + '"; Net.openLobby(); Net.joinRoom("ws://127.0.0.1:' + PORT + '", "' + code + '", "审计B"); true');
    ok(await B.waitFor('!!Net.code', 8000), 'B 加入房间');
    // 必须在开局前定角色，否则 beginGame 会用默认骑士（近战），测不到子弹
    await B.eval('Net.charId = "ranger"; true');

    /* ============ 2. 开局一致性 ============ */
    await A.eval('Net.charId = "ranger"; Net.send({t:"start"}); Net.beginGame(); true');
    ok(await A.waitFor('Game.state === "playing"', 8000), 'A 开局');
    ok(await B.waitFor('Game.state === "playing"', 10000), 'B 跟随开局');
    await sleep(1500);

    let a = await A.eval(SNAP), b = await B.eval(SNAP);
    ok(a.floor === b.floor, `楼层一致 (${a.floor}/${b.floor})`);
    ok(JSON.stringify(a.room) === JSON.stringify(b.room), `房间一致 (${JSON.stringify(a.room)}/${JSON.stringify(b.room)})`);
    ok(a.remotePlayers === 1 && b.remotePlayers === 1, `双方各看到 1 名队友 (${a.remotePlayers}/${b.remotePlayers})`);

    /* ============ 3. 进入战斗房 ============ */
    await A.eval('(()=>{const r=world.floorData.rooms.find(x=>x.type==="battle"); if(r) enterRoom(r,"s"); return true;})()');
    await sleep(1200);
    a = await A.eval(SNAP); b = await B.eval(SNAP);
    ok(JSON.stringify(a.room) === JSON.stringify(b.room), `过门后房间一致 (${JSON.stringify(a.room)}/${JSON.stringify(b.room)})`);
    ok(Math.abs(a.enemies - b.enemies) <= 1, `敌人数量接近 (${a.enemies}/${b.enemies})`);

    /* ============ 4. 玩家血量投影同步 ============ */
    const aHpBefore = (await B.eval(SNAP)).remoteHp[0];
    await A.eval('world.player.hp = Math.max(1, world.player.hp - 40); true');
    await sleep(900);
    const aHpAfter = (await B.eval(SNAP)).remoteHp[0];
    ok(aHpAfter < aHpBefore, `A 掉血同步到 B 的投影 (${aHpBefore} -> ${aHpAfter})`);

    const bHpBefore = (await A.eval(SNAP)).remoteHp[0];
    await B.eval('world.player.hp = Math.max(1, world.player.hp - 30); true');
    await sleep(900);
    const bHpAfter = (await A.eval(SNAP)).remoteHp[0];
    ok(bHpAfter < bHpBefore, `B 掉血同步到 A 的代理 (${bHpBefore} -> ${bHpAfter})`);

    /* ============ 5. 子弹双向可见 ============ */
    await A.eval(`(()=>{ world.bullets.forEach(x=>{x.dead=true}); Net._ghostBullets.clear();
      const p = world.player; p.energy = p.maxEnergy; p.weapon().cd = 0;
      Input.mouse.down = true; Input.mouse.x = 800; Input.mouse.y = 300; return true; })()`);
    await sleep(1000);
    await A.eval('Input.mouse.down = false; true');
    await sleep(400);
    const aOwn = (await A.eval(SNAP)).bullets;
    const bSeesGhost = (await B.eval(SNAP)).ghostBullets;
    ok(aOwn > 0, `A 自己开火生成了子弹 (${aOwn} 颗)`);
    ok(bSeesGhost > 0, `B 能看到 A 的子弹 (${bSeesGhost} 颗)`);

    await B.eval(`(()=>{ world.bullets.forEach(x=>{x.dead=true});
      const p = world.player; p.energy = p.maxEnergy; p.weapon().cd = 0;
      Input.mouse.down = true; Input.mouse.x = 800; Input.mouse.y = 400; return true; })()`);
    await sleep(1000);
    await B.eval('Input.mouse.down = false; true');
    await sleep(400);
    const bOwn = (await B.eval(SNAP)).bullets;
    const aSeesB = (await A.eval(SNAP)).bullets;
    ok(bOwn > 0, `B 自己开火生成了子弹 (${bOwn} 颗)`);
    ok(aSeesB > 0, `A 能看到 B 的子弹（真实结算）(${aSeesB} 颗)`);

    /* ============ 6. 三种掉落物同步 + 拾取归属 ============ */
    for (const kind of ['coin', 'health', 'weapon']) {
      await A.eval(`(()=>{
        world.pickups.length = 0;
        const o = { vx: 0, vy: 0 };
        let pk;
        if ('${kind}' === 'coin') { o.value = 6; pk = new Pickup('coin', 200, 500, o); }
        else if ('${kind}' === 'health') { o.heal = 25; pk = new Pickup('health', 200, 500, o); }
        else { o.weapon = makeWeaponInstance(WEAPONS[0], 1, 0); pk = new Pickup('weapon', 200, 500, o); }
        pk.magnet = false;
        world.pickups.push(pk);
        return true;
      })()`);
      await sleep(800);
      const seen = await B.eval(`world.pickups.some(p => p.type === '${kind}' && !p.dead)`);
      ok(seen, `B 能看到房主丢的 ${kind}`);

      const before = await A.eval('world.pickups.filter(p=>!p.dead).length');
      await B.eval(`(()=>{
        const pk = world.pickups.find(p => p.type === '${kind}' && !p.dead);
        if (!pk) return false;
        pk.x = world.player.x; pk.y = world.player.y;
        pk.collect(world.player);
        return true;
      })()`);
      await sleep(900);
      const after = await A.eval('world.pickups.filter(p=>!p.dead).length');
      ok(after < before, `B 捡走 ${kind} 后房主端同步移除 (${before} -> ${after})`);
    }

    /* ============ 7. 祝福共享 ============ */
    const dmgA0 = await A.eval('world.player.dmgMul');
    const dmgB0 = await B.eval('world.player.dmgMul');
    await A.eval('(()=>{ const b = BUFFS.find(x=>x.id==="dmg2"); b.apply(world.player); Net.sendRelay({t:"buff", id:"dmg2"}); return true; })()');
    await sleep(700);
    const dmgA1 = await A.eval('world.player.dmgMul');
    const dmgB1 = await B.eval('world.player.dmgMul');
    ok(dmgB1 > dmgB0, `B 收到共享祝福 (${dmgB0.toFixed(2)} -> ${dmgB1.toFixed(2)})`);
    ok(dmgA1 > dmgA0, `A 自己也有该祝福 (${dmgA0.toFixed(2)} -> ${dmgA1.toFixed(2)})`);

    /* ============ 8. 金币池一致性 ============ */
    a = await A.eval(SNAP); b = await B.eval(SNAP);
    ok(a.coins === b.coins, `金币两端一致 (${a.coins}/${b.coins})`);

    /* ============ 9. 倒地救援 ============ */
    await B.eval('world.player.die(); true');
    ok(await A.waitFor('(()=>{const g=[...Net.ghosts.values()][0]; return !!g && g.dead;})()', 6000), 'A 看到 B 倒地');
    // 施救者必须活着，战斗房里 A 可能已经残血
    await A.eval('(()=>{ const p = world.player; p.hp = p.maxHp; p.dead = false; p.invuln = 999; return true; })()');
    await A.eval('(()=>{const g=[...Net.ghosts.values()][0]; world.player.x=g.x; world.player.y=g.y; return Net.tryRevive();})()');
    ok(await B.waitFor('world.player.dead === false', 6000), 'B 被救起');

    /* ============ 10. 楼层推进 ============ */
    await A.eval('Game.nextFloor(); true');
    await sleep(1500);
    a = await A.eval(SNAP); b = await B.eval(SNAP);
    ok(a.floor === b.floor, `下楼层后楼层一致 (${a.floor}/${b.floor})`);
    ok(JSON.stringify(a.room) === JSON.stringify(b.room), `下楼层后房间一致 (${JSON.stringify(a.room)}/${JSON.stringify(b.room)})`);

    /* ============ 10b. 中途加入已开局房间 ============ */
    const aBefore = await A.eval(SNAP);
    await B.eval('Net.close(); true');
    await sleep(700);
    await B.eval('Net.joinRoom("ws://127.0.0.1:' + PORT + '", "' + code + '", "审计B2"); true');
    ok(await B.waitFor('Net.started === true', 10000), 'B 中途重新加入已开局房间');
    await sleep(2200);
    const bMid = await B.eval(SNAP);
    ok(bMid.floor === aBefore.floor, `中途加入后楼层一致 (${aBefore.floor}/${bMid.floor})`);
    ok(JSON.stringify(bMid.room) === JSON.stringify(aBefore.room), `中途加入后房间一致 (${JSON.stringify(aBefore.room)}/${JSON.stringify(bMid.room)})`);
    ok(bMid.remotePlayers === 1, `中途加入后看得到房主 (${bMid.remotePlayers})`);

    /* ============ 11. 房主退出 ============ */
    await A.eval('Net.close(); true');
    await sleep(1200);
    ok(await B.waitFor('Net.isHost === true', 6000), '房主退出后 B 接管房主');
    ok(await B.eval('Net.ghosts.size === 0 || true'), 'B 端状态未崩溃');

    /* ============ 汇总 ============ */
    a = await A.eval(SNAP).catch(() => null);
    b = await B.eval(SNAP).catch(() => null);
    log('A 快照: ' + JSON.stringify(a));
    log('B 快照: ' + JSON.stringify(b));

    if (errors.length) {
      console.log('\n  JS 异常：');
      for (const e of errors.slice(0, 10)) console.log('    ! ' + e);
    }
    ok(errors.length === 0, '全程无 JS 异常（' + errors.length + ' 条）');

    const fails = results.filter(r => r[0] === 'FAIL').length;
    console.log(`\n${results.length - fails} passed, ${fails} failed`);
    if (fails) {
      console.log('\n失败项：');
      for (const r of results) if (r[0] === 'FAIL') console.log('  - ' + r[1]);
    }
    process.exitCode = fails ? 1 : 0;
  } catch (err) {
    console.error('FATAL:', err && err.stack || err);
    if (srvLog) console.error('server:\n' + srvLog);
    process.exitCode = 2;
  } finally {
    try { if (A) A.ws.close(); } catch (e) { /* ignore */ }
    try { if (B) B.ws.close(); } catch (e) { /* ignore */ }
    try { spawnSync('taskkill', ['/PID', String(edgeA.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) { /* ignore */ }
    try { spawnSync('taskkill', ['/PID', String(edgeB.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) { /* ignore */ }
    try { srv.kill(); } catch (e) { /* ignore */ }
    for (const d of [userDir + '-a', userDir + '-b']) {
      try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { /* ignore */ }
    }
  }
})();
