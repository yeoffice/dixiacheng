/* 联机服务端协议冒烟测试：起服务 -> 建房 -> 加入 -> 转发 -> 离开 -> 房主转移 */
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const PORT = Number(process.env.NET_TEST_PORT || 8099);
const URL_WS = 'ws://127.0.0.1:' + PORT + '/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
function ok(cond, msg) { results.push([cond ? 'ok' : 'FAIL', msg]); console.log((cond ? '  ok  ' : 'FAIL  ') + msg); }

function client() {
  const ws = new WebSocket(URL_WS);
  const inbox = [];
  ws.onmessage = e => { try { inbox.push(JSON.parse(e.data)); } catch (err) { /* ignore */ } };
  const open = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  return {
    ws, inbox, open,
    send(o) { ws.send(JSON.stringify(o)); },
    async wait(t, timeout = 4000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        const i = inbox.findIndex(m => m.t === t);
        if (i >= 0) return inbox.splice(i, 1)[0];
        await sleep(40);
      }
      return null;
    },
    close() { try { ws.close(); } catch (e) { /* ignore */ } },
  };
}

const srv = spawn(process.execPath, [path.join(root, 'server', 'index.mjs')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let srvLog = '';
srv.stdout.on('data', d => { srvLog += d.toString(); });
srv.stderr.on('data', d => { srvLog += d.toString(); });

(async () => {
  try {
    await sleep(700);
    ok(srvLog.includes('联机服务已启动'), '服务端启动成功');

    // 静态文件同端口托管
    const page = await fetch('http://127.0.0.1:' + PORT + '/');
    ok(page.ok, '静态首页同端口可访问 (' + page.status + ')');
    const html = await page.text();
    ok(html.includes('地牢骑士'), '首页内容正确');
    const health = await (await fetch('http://127.0.0.1:' + PORT + '/health')).json();
    ok(health.ok === true, '健康检查接口正常');

    const A = client();
    await A.open;
    A.send({ t: 'create', name: '房主A' });
    const roomA = await A.wait('room');
    ok(!!roomA && roomA.host === true, '创建房间成功，房主标记正确 (code=' + (roomA && roomA.code) + ')');
    ok(/^[A-Z0-9]{4}$/.test(roomA.code), '房间码格式正确');
    const code = roomA.code;

    const B = client();
    await B.open;
    B.send({ t: 'join', code, name: '玩家B' });
    const roomB = await B.wait('room');
    ok(!!roomB && roomB.host === false, '加入房间成功，非房主');
    ok(roomB.peers.length === 1 && roomB.peers[0].name === '房主A', '新成员拿到成员列表');
    const peer = await A.wait('peer');
    ok(!!peer && peer.name === '玩家B', '房主收到新成员通知');

    // 转发
    B.send({ t: 'relay', d: { t: 'hello', n: 1 } });
    const relay = await A.wait('relay');
    ok(!!relay && relay.d.t === 'hello' && relay.from === roomB.id, '成员消息转发到房主');

    A.send({ t: 'relay', d: { t: 'state', x: 42 } });
    const relay2 = await B.wait('relay');
    ok(!!relay2 && relay2.d.x === 42, '房主消息转发到成员');

    // 第三个成员
    const C = client();
    await C.open;
    C.send({ t: 'join', code, name: '玩家C' });
    const roomC = await C.wait('room');
    ok(!!roomC && roomC.peers.length === 2, '第三人加入，成员数 2');

    // 房间不存在
    const D = client();
    await D.open;
    D.send({ t: 'join', code: 'ZZZZ', name: '迷路' });
    const err = await D.wait('err');
    ok(!!err && err.msg.includes('房间不存在'), '错误房间码被拒绝');
    D.close();

    // 房主离开 -> 转移
    A.close();
    const hostMsg = await B.wait('host');
    ok(!!hostMsg && hostMsg.id === roomB.id, '房主离开后房主身份转移给下一人');

    // 清理
    B.close();
    C.close();
    await sleep(300);
    const health2 = await (await fetch('http://127.0.0.1:' + PORT + '/health')).json();
    ok(health2.rooms === 0 && health2.players === 0, '全部离开后房间自动回收');

    const fails = results.filter(r => r[0] === 'FAIL').length;
    console.log(`\n${results.length - fails} passed, ${fails} failed`);
    process.exitCode = fails ? 1 : 0;
  } catch (err) {
    console.error('FATAL:', err && err.stack || err);
    if (srvLog) console.error('server log:\n' + srvLog);
    process.exitCode = 2;
  } finally {
    try { srv.kill(); } catch (e) { /* ignore */ }
  }
})();
