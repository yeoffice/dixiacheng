'use strict';
/* =====================================================================
   启动 / 主循环 / 自适应缩放
   ===================================================================== */
let lastT = 0;
let booted = false;

function fitCanvas() {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const availW = Math.max(320, window.innerWidth);
  const availH = Math.max(200, window.innerHeight);
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

function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth && Math.min(window.innerWidth, window.innerHeight) < 820;
  if (portrait && Game.state === 'playing') {
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
  window.addEventListener('resize', () => { fitCanvas(); checkOrientation(); });
  window.addEventListener('orientationchange', () => setTimeout(() => { fitCanvas(); checkOrientation(); }, 200));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.state === 'playing') Game.togglePause();
  });
  window.addEventListener('blur', () => {
    if (Game.state === 'playing') Game.togglePause();
  });
  fitCanvas();
  checkOrientation();
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
