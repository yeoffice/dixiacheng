'use strict';
/* =====================================================================
   启动 / 主循环 / 自适应缩放
   ===================================================================== */
let lastT = 0;
let booted = false;

/* 视口尺寸：移动端浏览器地址栏收放时 visualViewport 比 inner* 更准，
   两者取较小值，避免画布比可视区域还大导致上下被裁。 */
function viewportSize() {
  const vv = window.visualViewport;
  const iw = window.innerWidth || VW;
  const ih = window.innerHeight || VH;
  const w = vv && vv.width ? Math.min(iw, vv.width) : iw;
  const h = vv && vv.height ? Math.min(ih, vv.height) : ih;
  return { w: Math.max(280, Math.round(w)), h: Math.max(200, Math.round(h)) };
}

function fitCanvas() {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const vs = viewportSize();
  const availW = vs.w;
  const availH = vs.h;
  const scale = Math.min(availW / VW, availH / VH);
  const cssW = Math.max(320, Math.floor(VW * scale));
  const cssH = Math.max(180, Math.floor(VH * scale));
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const bw = Math.max(480, Math.round(cssW * dpr));
  const bh = Math.round(bw * VH / VW);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  viewScale = bw / VW;
  // 触屏按钮按实际显示尺寸补偿半径，小屏上手指才按得准
  if (typeof UI !== 'undefined' && UI && UI.refreshTouchLayout) {
    UI.touchScale = Math.max(0.4, cssW / VW);
    UI.refreshTouchLayout();
  }
}

function loop(ts) {
  const dt = Math.min(0.05, Math.max(0.0001, (ts - lastT) / 1000)) || 0.016;
  lastT = ts;
  try {
    Game.update(dt);
    Game.render();
  } catch (err) {
    console.error(err);
    if (!window._dshErrShown) {
      window._dshErrShown = true;
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:999;background:#2a0d14;color:#ff9aa2;border:1px solid #ff5d6c;border-radius:6px;padding:8px 12px;font:12px monospace;max-width:80vw;white-space:pre-wrap';
      d.textContent = '运行错误: ' + (err && err.message ? err.message : err);
      document.body.appendChild(d);
    }
  }
  Input.endFrame();
  requestAnimationFrame(loop);
}

/* 全屏 / 横屏锁定：手机浏览器地址栏会吃掉 15% 高度，全屏后视野才完整。
   iPhone Safari 不支持元素全屏，那边走「添加到主屏幕」的 PWA 全屏。 */
const View = {
  fullEl() {
    const d = document;
    return d.fullscreenElement || d.webkitFullscreenElement || d.msFullscreenElement || null;
  },
  isFull() { return !!this.fullEl(); },
  supported() {
    const el = document.documentElement;
    return !!(el && (el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen || el.msRequestFullscreen));
  },
  toggle() {
    const d = document;
    if (this.isFull()) {
      const exit = d.exitFullscreen || d.webkitExitFullscreen || d.msExitFullscreen;
      try { if (exit) exit.call(d); } catch (e) { /* ignore */ }
      return false;
    }
    const el = d.documentElement;
    const req = el && (el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen || el.msRequestFullscreen);
    if (!req) {
      if (typeof UI !== 'undefined' && UI && UI.toast) UI.toast('此浏览器不支持全屏，可「添加到主屏幕」启动', '#ffd257');
      return false;
    }
    try {
      const r = req.call(el, { navigationUI: 'hide' });
      const lock = () => this.lockLandscape();
      if (r && r.then) r.then(lock).catch(() => { });
      else lock();
    } catch (e) { /* ignore */ }
    return true;
  },
  lockLandscape() {
    try {
      const so = screen.orientation;
      if (so && typeof so.lock === 'function') {
        const p = so.lock('landscape');
        if (p && p.catch) p.catch(() => { });
      }
    } catch (e) { /* 桌面浏览器 / iOS 不支持，忽略 */ }
  },
};

/* 竖屏遮罩：默认要求横屏，但允许用户强行竖屏继续（系统锁了旋转也不至于完全玩不了） */
const PORTRAIT_KEY = 'dungeon_knight_allow_portrait';
let allowPortrait = false;
try { allowPortrait = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(PORTRAIT_KEY) === '1'; } catch (e) { allowPortrait = false; }

function isPortrait() {
  const { w, h } = viewportSize();
  return h > w && Math.min(w, h) < 820;
}

function checkOrientation() {
  const portrait = isPortrait();
  const hint = document.getElementById('rotate-hint');
  if (hint) hint.style.display = (portrait && !allowPortrait) ? 'flex' : 'none';
  if (portrait && !allowPortrait && Game.state === 'playing') {
    Game.togglePause();
    if (UI.root) UI.toast('请横屏游玩', '#ffd257');
  }
}

function boot() {
  if (booted) return;
  booted = true;
  canvas = document.getElementById('game');
  view = canvas.getContext('2d');
  worldCanvas = document.createElement('canvas');
  worldCanvas.width = VW;
  worldCanvas.height = VH;
  ctx = worldCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (view) view.imageSmoothingEnabled = false;
  Save.load();
  Sfx.enabled = Save.data.settings.sfx !== false;
  Sfx.musicEnabled = Save.data.settings.music !== false;
  Input.init(canvas);
  UI.init();
  let fitPending = false;
  const scheduleFit = () => {
    if (fitPending) return;
    fitPending = true;
    requestAnimationFrame(() => { fitPending = false; fitCanvas(); checkOrientation(); });
  };
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', () => setTimeout(() => { fitCanvas(); checkOrientation(); }, 200));
  // 移动端地址栏收放只触发 visualViewport 事件，不触发 resize
  if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleFit);
  // 竖屏遮罩上的「竖屏继续」：系统锁定旋转时的逃生通道
  const rhBtn = document.getElementById('rh-continue');
  if (rhBtn) rhBtn.addEventListener('click', () => {
    allowPortrait = true;
    try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(PORTRAIT_KEY, '1'); } catch (e) { /* ignore */ }
    fitCanvas();
    checkOrientation();
    if (Game.state === 'paused') Game.resume();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.state === 'playing') Game.togglePause();
  });
  window.addEventListener('blur', () => {
    if (Game.state === 'playing') Game.togglePause();
  });
  fitCanvas();
  checkOrientation();
  // 「添加到主屏幕」：manifest 只在 http(s) 托管下注入，file:// 打开时不会触发 CORS 报错
  try {
    if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && document.head) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.json';
      document.head.appendChild(link);
    }
  } catch (e) { /* ignore */ }
  // 首次交互解锁音频
  const unlock = () => {
    Sfx.resume();
    if (Game.state === 'playing' && Sfx.musicEnabled) Sfx.startMusic();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  lastT = performance.now();
  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
