/* 手机视口回归：用 CDP 模拟真机横屏 / 竖屏 / 小屏，验证面板不溢出、
   触屏模式自动开启、触屏按钮尺寸补偿、竖屏逃生通道、面板可滚动。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = process.env.EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.resolve(process.argv[2] || '.');
const port = 9444;
const userDir = path.join(process.env.TEMP || '.', 'dsh-edge-mobile-' + Date.now());
const pageUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const outDir = path.join(root, 'tools');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const errors = [];
function ok(cond, msg) { results.push([cond ? 'ok' : 'FAIL', msg]); console.log((cond ? '  ok  ' : 'FAIL  ') + msg); }

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
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

async function waitFor(expr, timeout = 10000, interval = 120) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await evaluate(expr)) return true;
    await sleep(interval);
  }
  return false;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(r.data, 'base64'));
  console.log('      screenshot: tools/' + name);
}

async function metrics(w, h) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await sleep(400);
}

/* 面板与控件的几何体检 */
const GEOM = `(()=>{
  const lay = document.querySelector('#domui .layer');
  const p = document.querySelector('#domui .panel');
  if (!p) return { none: true };
  const pr = p.getBoundingClientRect();
  const cards = [...document.querySelectorAll('.char-card')].map(el => {
    const b = el.getBoundingClientRect();
    return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom) };
  });
  const btns = [...document.querySelectorAll('#domui .btn')].map(el => {
    const b = el.getBoundingClientRect();
    return { id: el.id, l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) };
  });
  return {
    none: false,
    panel: { l: Math.round(pr.left), r: Math.round(pr.right), t: Math.round(pr.top), b: Math.round(pr.bottom),
             w: Math.round(pr.width), h: Math.round(pr.height), sw: p.scrollWidth, cw: p.clientWidth, sh: p.scrollHeight, ch: p.clientHeight },
    layer: !!lay,
    cards, btns,
    vw: innerWidth, vh: innerHeight,
    bodyTouch: getComputedStyle(document.body).touchAction,
    panelTouch: getComputedStyle(p).touchAction,
    overflowY: getComputedStyle(p).overflowY,
  };
})()`;

function insideViewport(g, tol = 1) {
  return g.cards.every(c => c.r <= g.vw + tol && c.l >= -tol) &&
    g.btns.every(b => b.r <= g.vw + tol && b.l >= -tol);
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

    /* ---------- 1. 常见手机横屏 812x375（iPhone 12 横屏） ---------- */
    await metrics(812, 375);
    await send('Page.navigate', { url: pageUrl });
    await sleep(700);
    if (!await waitFor('typeof Game !== "undefined" && Game.state === "title"', 20000)) throw new Error('boot failed');

    ok(await evaluate('Input.touchMode === true'), '未触摸即自动进入触屏模式（手机从菜单开局就有摇杆）');
    ok(await evaluate('IS_TOUCH_DEVICE === true'), '粗指针设备判定生效');

    const canvasRect = await evaluate('(()=>{const b=document.getElementById("game").getBoundingClientRect();return {w:Math.round(b.width),h:Math.round(b.height)};})()');
    ok(canvasRect.w <= 812 && canvasRect.h <= 375, `画布适配视口 ${canvasRect.w}x${canvasRect.h}`);

    let g = await evaluate(GEOM);
    ok(!g.none, '标题面板已渲染');
    ok(g.panel.sw <= g.panel.cw + 1, `标题面板无横向溢出 (scrollWidth ${g.panel.sw} / clientWidth ${g.panel.cw})`);
    ok(insideViewport(g), '8 张角色卡与全部按钮都在视口内');
    ok(g.cards.length === 8, '角色卡数量 ' + g.cards.length);
    ok(await evaluate('!!document.getElementById("btnFs")'), '标题页提供全屏按钮');
    ok(g.bodyTouch !== 'none', 'body 不再封锁触摸手势（touch-action=' + g.bodyTouch + '）');
    ok(String(g.panelTouch).includes('pan-y'), '面板允许纵向手势滚动（touch-action=' + g.panelTouch + '）');
    await shot('mobile-title-812x375.png');

    /* ---------- 2. 图鉴在手机上可滚动 ---------- */
    await evaluate('document.getElementById("btnCodex").click()');
    await sleep(400);
    const codex = await evaluate(`(()=>{const grid=document.querySelector('.codex-grid');const p=document.querySelector('#domui .panel');return {items:document.querySelectorAll('.codex-item').length, sh:grid.scrollHeight, ch:grid.clientHeight, touch:getComputedStyle(grid).touchAction, psw:p.scrollWidth, pcw:p.clientWidth};})()`);
    ok(codex.items > 40, '图鉴条目数 ' + codex.items);
    ok(codex.sh > codex.ch, `图鉴可滚动内容 (${codex.sh} > ${codex.ch})`);
    ok(String(codex.touch).includes('pan-y'), '图鉴网格允许纵向滚动');
    ok(codex.psw <= codex.pcw + 1, '图鉴面板无横向溢出');
    await shot('mobile-codex-812x375.png');

    /* ---------- 3. 开局后触屏按钮尺寸补偿 ---------- */
    await evaluate('document.getElementById("btnBack").click()');
    await sleep(400);
    await evaluate('document.getElementById("btnStart").click()');
    await sleep(900);
    ok(await evaluate('Game.state === "playing"'), '手机视口下点击开始进入游戏');
    const touchInfo = await evaluate(`(()=>{
      const s = UI_BUTTONS.find(b => b.id === 'skill');
      const d = UI_BUTTONS.find(b => b.id === 'dash');
      return { scale: +UI.touchScale.toFixed(3), r: +s.r.toFixed(1), visible: !!s.visible, dashR: +d.r.toFixed(1) };
    })()`);
    ok(touchInfo.scale < 0.75, '记录了显示缩放 ' + touchInfo.scale);
    ok(touchInfo.r > 31, `技能按钮半径按缩放补偿到 ${touchInfo.r}（基准 31）`);
    const phys = Math.round(touchInfo.r * touchInfo.scale * 2);
    ok(phys >= 40, `技能按钮物理直径约 ${phys}px（≥40px 好按）`);
    ok(touchInfo.visible, '游戏中触屏按钮可见');
    await shot('mobile-playing-812x375.png');

    /* ---------- 4. 暂停面板 ---------- */
    await evaluate('Game.togglePause()');
    await sleep(350);
    g = await evaluate(GEOM);
    ok(g.panel.sw <= g.panel.cw + 1, '暂停面板无横向溢出');
    ok(g.btns.every(b => b.h >= 40), '暂停面板按钮高度均 ≥40px（' + g.btns.map(b => b.h).join('/') + '）');
    ok(await evaluate('!!document.getElementById("btnFs2")'), '暂停菜单提供全屏按钮');
    await shot('mobile-pause-812x375.png');
    await evaluate('Game.resume()');
    await sleep(200);

    /* ---------- 5. 小屏横屏 568x320（iPhone SE / 老安卓） ---------- */
    await metrics(568, 320);
    await sleep(500);
    ok(await evaluate('Game.state === "playing"'), '小屏切换后仍在游戏中');
    const small = await evaluate(`(()=>{const c=document.getElementById('game').getBoundingClientRect();const s=UI_BUTTONS.find(b=>b.id==='skill');return {cw:Math.round(c.width),ch:Math.round(c.height),scale:+UI.touchScale.toFixed(3),r:+s.r.toFixed(1),vw:innerWidth,vh:innerHeight};})()`);
    ok(small.cw <= 568 && small.ch <= 320, `小屏画布 ${small.cw}x${small.ch}`);
    ok(small.r >= 36, `小屏技能按钮半径补偿到 ${small.r}`);
    await evaluate('Game.togglePause()');
    await sleep(300);
    g = await evaluate(GEOM);
    ok(g.panel.sw <= g.panel.cw + 1, '小屏暂停面板无横向溢出');
    await evaluate('Game.resume()');
    await sleep(150);
    await shot('mobile-playing-568x320.png');

    /* ---------- 6. 竖屏 390x844：遮罩 + 竖屏继续逃生 ---------- */
    await metrics(390, 844);
    await sleep(500);
    const hint = await evaluate('getComputedStyle(document.getElementById("rotate-hint")).display');
    ok(hint === 'flex', '竖屏显示旋转提示（display=' + hint + '）');
    await shot('mobile-portrait-hint.png');
    await evaluate('document.getElementById("rh-continue").click()');
    await sleep(500);
    const hint2 = await evaluate('getComputedStyle(document.getElementById("rotate-hint")).display');
    ok(hint2 === 'none', '点「竖屏继续」后遮罩消失（display=' + hint2 + '）');
    const pv = await evaluate(`(()=>{const c=document.getElementById('game').getBoundingClientRect();const p=document.querySelector('#domui .panel');const psw=p?p.scrollWidth:0;const pcw=p?p.clientWidth:0;return {cw:Math.round(c.width),ch:Math.round(c.height),psw,pcw,state:Game.state};})()`);
    ok(pv.cw > 0 && pv.cw <= 390 && pv.ch <= 844, `竖屏画布仍可用 ${pv.cw}x${pv.ch}`);
    ok(pv.state === 'paused' || pv.state === 'playing', '竖屏继续后游戏状态正常 (' + pv.state + ')');
    await shot('mobile-portrait-play.png');

    /* ---------- 7. 回横屏，遮罩自动收起 ---------- */
    await metrics(812, 375);
    await sleep(500);
    ok(await evaluate('getComputedStyle(document.getElementById("rotate-hint")).display') === 'none', '回横屏后遮罩自动隐藏');
    ok(await evaluate('document.querySelectorAll("#domui .layer").length === 0'), '游戏中无遮挡层');

    /* ---------- 汇总 ---------- */
    await sleep(200);
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
    try { if (ws) ws.close(); } catch (e) { /* ignore */ }
    try { edge.kill(); } catch (e) { /* ignore */ }
    try { fs.rmSync(userDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { /* ignore */ }
  }
})();
