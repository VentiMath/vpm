'use strict';
process.env.NODE_ENV = 'production';
require('../../../scripts/radix-popper-conformance/check-built.cjs')();
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const fixture = path.resolve(__dirname, '../../../scripts/radix-popper-conformance'), vpm = path.resolve(__dirname, '..'), upstream = path.join(fixture, 'node_modules/@radix-ui/react-popper');
let dom, closeCurrent, anchorX = 200, measurements = 0;
function environment() {
  if (dom) return;
  dom = new (require(path.join(fixture, 'node_modules/jsdom')).JSDOM)('<!doctype html><div id="root"></div>');
  require(path.join(fixture, '../radix-use-size-conformance/dom.cjs')).install(dom.window);
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'getComputedStyle', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
  Object.defineProperties(document.documentElement, { clientWidth: { value: 800 }, clientHeight: { value: 600 } });
  function dimensions(node) {
    const anchor = node.hasAttribute('data-anchor'), style = node.hasAttribute('data-radix-popper-content-wrapper') ? node.firstElementChild?.style : node.style;
    return { x: anchor ? anchorX : 0, y: anchor ? 200 : 0, width: anchor ? 80 : parseFloat(style?.width) || 0, height: anchor ? 30 : parseFloat(style?.height) || 0 };
  }
  window.HTMLElement.prototype.getBoundingClientRect = function () { if (this.hasAttribute('data-anchor')) measurements++; const r = dimensions(this); return new window.DOMRect(r.x, r.y, r.width, r.height); };
  Object.defineProperties(window.HTMLElement.prototype, { offsetWidth: { get() { return dimensions(this).width; } }, offsetHeight: { get() { return dimensions(this).height; } } });
}
const nextTask = () => new Promise(resolve => setImmediate(resolve));
const cases = ['SSR anchor and content', 'unchanged parent update', 'unchanged resize calculation', 'moving anchor calculation'].map(name => ({
  name, async: name.endsWith('calculation'),
  async make(file) {
    environment(); closeCurrent?.(); closeCurrent = null; anchorX = 200;
    const { api: P, React, selected } = require(path.join(fixture, 'load.cjs'))(file === upstream ? 'upstream' : 'vpm');
    const h = React.createElement;
    const tree = () => h(P.Root, null, h(P.Anchor, { 'data-anchor': '' }, 'anchor'), h(P.Content, { style: { width: 100, height: 50 }, avoidCollisions: false }, 'content'));
    if (name.startsWith('SSR')) return () => selected('react-dom/server').renderToStaticMarkup(tree());
    const { flushSync } = selected('react-dom'), root = selected('react-dom/client').createRoot(document.getElementById('root'));
    closeCurrent = () => flushSync(() => root.unmount());
    flushSync(() => root.render(tree())); await nextTask(); await nextTask();
    const wrapper = document.querySelector('[data-radix-popper-content-wrapper]');
    assert.equal(wrapper.style.transform, 'translate(190px, 230px)');
    if (name === 'unchanged parent update') return () => { flushSync(() => root.render(tree())); return wrapper.style.transform === 'translate(190px, 230px)'; };
    let serial = 0;
    return async () => {
      if (name.startsWith('moving')) anchorX = 200 + (++serial % 2 ? 4 : 0);
      const before = measurements;
      window.dispatchEvent(new window.Event('resize')); await nextTask();
      return measurements > before && wrapper.style.transform === `translate(${anchorX - 10}px, 230px)`;
    };
  },
  validate(value) { if (typeof value === 'string') { assert(value.includes('data-radix-popper-content-wrapper')); assert(value.includes('data-side="bottom"')); } else assert.equal(value, true); },
}));
const sources = new Set();
function track(name) {
  const folder = path.resolve(vpm, '..', name), meta = require(path.join(folder, 'package.json'));
  if (sources.has('../' + name + '/package.json')) return;
  sources.add('../' + name + '/package.json');
  for (const file of fs.readdirSync(folder)) if (/\.(?:cjs|mjs)$/.test(file)) sources.add('../' + name + '/' + file);
  for (const dep of Object.keys(meta.dependencies || {})) track(dep);
}
track('vradix-react-popper');
require('../../../scripts/bench-process.cjs').run({ root: vpm, upstream, vpm, cases,
  files: [...sources, 'index.d.ts', 'PROVENANCE.json', 'bench/compare.cjs', '../../scripts/radix-popper-conformance/build.cjs', '../../scripts/radix-popper-conformance/entry.mjs', '../../scripts/radix-popper-conformance/load.cjs', '../../scripts/radix-popper-conformance/package-lock.json', '../../scripts/radix-popper-conformance/node_modules/.vpm-popper/upstream.cjs', '../../scripts/radix-popper-conformance/node_modules/.vpm-popper/vpm.cjs', '../../scripts/radix-use-size-conformance/dom.cjs'],
  cleanup() { closeCurrent?.(); dom?.window.close(); },
}).catch(e => { console.error(e); process.exitCode = 1; });
