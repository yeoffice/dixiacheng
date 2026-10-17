import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const files = ['util', 'art', 'weapons', 'enemies', 'bosses', 'entities', 'player', 'dungeon', 'ui', 'game', 'net', 'main'];
let src = '';
for (const f of files) {
  const p = path.join(root, 'js', f + '.js');
  src += fs.readFileSync(p, 'utf8') + '\n;\n';
}
src += '\n' + fs.readFileSync(path.join(root, 'tools', 'test-code.js'), 'utf8');
const extra = process.argv[3];
if (extra) src = src.replace("/* 无头冒烟测试", "/* 无头冒烟测试").replace('\n(function () {\n  const R = [];', '\n' + fs.readFileSync(extra, 'utf8') + '\n;\n(function () {\n  const R = [];');

const gradient = { addColorStop() { } };
const ctxStub = new Proxy({}, {
  get(t, prop) {
    if (typeof prop === 'symbol') return t[prop];
    if (prop === 'canvas') return fakeCanvasMain;
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient') return () => gradient;
    if (prop === 'measureText') return s => ({ width: String(s).length * 8 });
    if (prop === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)) });
    if (prop === 'createPattern') return () => ({});
    if (prop in t) return t[prop];
    return () => { };
  },
  set(t, prop, v) { t[prop] = v; return true; },
  has() { return true; },
});

function fakeEl(tag = 'div') {
  const el = {
    tagName: tag, style: {}, dataset: {}, innerHTML: '', textContent: '', children: [],
    width: 72, height: 72, onclick: null, className: '',
    getContext: () => ctxStub,
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() { }, removeEventListener() { },
    setAttribute() { }, getAttribute() { return null; },
    querySelector() { return fakeEl(); },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 544, right: 960, bottom: 544 }; },
    setPointerCapture() { }, releasePointerCapture() { },
    focus() { }, click() { },
  };
  return el;
}

const fakeCanvasMain = mockCanvas();
function mockCanvas() {
  return {
    width: 960, height: 544, style: {}, dataset: {},
    getContext: () => ctxStub,
    addEventListener() { }, removeEventListener() { },
    setPointerCapture() { },
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 544, right: 960, bottom: 544 }; },
  };
}

const store = new Map();
const localStorageStub = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => store.delete(k),
};

const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  performance,
  localStorage: localStorageStub,
  document: {
    readyState: 'complete',
    hidden: false,
    body: fakeEl(),
    getElementById(id) {
      if (id === 'game') return fakeCanvasMain;
      if (id === 'domui') return fakeEl();
      return fakeEl();
    },
    createElement(tag) { return tag === 'canvas' ? mockCanvas() : fakeEl(tag); },
    addEventListener() { }, removeEventListener() { },
  },
  addEventListener() { }, removeEventListener() { },
  requestAnimationFrame() { return 0; },
  cancelAnimationFrame() { },
  innerWidth: 1280, innerHeight: 800,
  devicePixelRatio: 1,
  alert() { },
  Image: class { },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

try {
  const context = vm.createContext(sandbox);
  vm.runInContext(src, context, { filename: 'dungeon-knight.bundle.js', timeout: 120000 });
  const results = sandbox.__TEST_RESULTS__ || [];
  let failed = 0;
  for (const [status, msg] of results) {
    if (status === 'ok') console.log('  ok  ' + msg);
    else { console.log('FAIL  ' + msg); failed++; }
  }
  console.log(`\n${results.filter(r => r[0] === 'ok').length} passed, ${failed} failed, ${results.length} total`);
  process.exit(failed ? 1 : 0);
} catch (err) {
  console.error('FATAL:', err && err.stack || err);
  process.exit(2);
}
