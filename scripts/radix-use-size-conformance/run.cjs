'use strict';
const assert = require('node:assert/strict');
const [variant = 'vpm', version = '19.1', mode = 'client'] = process.argv.slice(2), fixed = variant === 'vpm';
if (mode === 'server') {
  const { api, React, selected } = require('./load.cjs')(variant, version);
  function Server() { const size = api.useSize({ get offsetWidth() { throw Error('SSR measured'); } }); return React.createElement('b', null, String(size)); }
  assert.equal(selected('react-dom/server').renderToString(React.createElement(Server)), '<b>undefined</b>');
  console.log(variant, version, 'DOM-free SSR pass');
} else {
  const { JSDOM } = require('jsdom'), dom = new JSDOM('<!doctype html><div id="root"></div>');
  const clock = require('./dom.cjs').install(dom.window);
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'MutationObserver', 'getComputedStyle', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const loaded = require('./load.cjs')(variant, version), { api, React, selected, caller } = loaded, h = React.createElement, { act } = React;
  const root = selected('react-dom/client').createRoot(document.getElementById('root'));
  let value, commits = [];
  function target(window, width, height) { const e = window.document.createElement('span'); Object.defineProperties(e, { offsetWidth: { get: () => width }, offsetHeight: { get: () => height } }); return e; }
  const a = target(dom.window, 30, 40), b = target(dom.window, 300, 400);
  function Probe({ element, suspend }) { value = api.useSize(element); React.useLayoutEffect(() => { commits.push(value); }); if (suspend) throw suspend; return h('output', null, value ? value.width + ',' + value.height : 'pending'); }
  const render = tree => act(() => root.render(h(React.StrictMode, null, tree)));
  (async () => { try {
    await render(h(Probe, { element: null })); assert.equal(value, undefined); assert.equal(clock.active.length, 0);
    await render(h(Probe, { element: a })); assert.deepEqual(value, { width: 30, height: 40 }); assert.equal(clock.active.length, 1); assert.deepEqual(clock.active[0].options, { box: 'border-box' });
    const first = value;
    clock.deliver(a, { borderBoxSize: [{ inlineSize: 30, blockSize: 40 }] }); await act(() => clock.tick());
    assert.equal(value === first, fixed, 'identical size keeps the current snapshot only in VPM');
    clock.deliver(a, { borderBoxSize: [{ inlineSize: 31.5, blockSize: 42.5 }] });
    clock.deliver(a, { borderBoxSize: [{ inlineSize: 33.5, blockSize: 44.5 }] }); assert.equal(clock.frames, 1);
    await act(() => clock.tick()); assert.deepEqual(value, { width: 33.5, height: 44.5 });
    clock.deliver(a, { borderBoxSize: { inlineSize: 35, blockSize: 46 } }); await act(() => clock.tick()); assert.deepEqual(value, { width: 35, height: 46 });
    await render(h(Probe, { element: b })); a.style.writingMode = 'vertical-rl'; await render(h(Probe, { element: a })); clock.deliver(a, { borderBoxSize: [{ inlineSize: 60, blockSize: 20 }] }); await act(() => clock.tick());
    assert.deepEqual(value, fixed ? { width: 20, height: 60 } : { width: 60, height: 20 }, 'physical dimensions in vertical writing mode');
    if (fixed) { clock.deliver(a, { borderBoxSize: [] }); await act(() => clock.tick()); assert.deepEqual(value, { width: 30, height: 40 }); }
    else { clock.deliver(a); await act(() => clock.tick()); assert.deepEqual(value, { width: 30, height: 40 }); }
    commits = []; await render(h(Probe, { element: b })); assert.equal(commits[0]?.width, fixed ? undefined : 30, 'no stale target size in first commit'); assert.deepEqual(value, { width: 300, height: 400 });
    const oldObserver = clock.active[0]; clock.deliver(b); assert.equal(clock.frames, 1);
    await render(h(Probe, { element: null })); assert.equal(value, undefined); assert.equal(clock.active.length, 0); assert.equal(clock.frames, 0);
    if (fixed) { oldObserver.callback([{ target: b }]); assert.equal(clock.frames, 0, 'late delivery after cleanup is ignored'); }
    const foreign = new JSDOM('<!doctype html><body></body>'), foreignClock = require('./dom.cjs').install(foreign.window), other = target(foreign.window, 50, 60);
    try { await render(h(Probe, { element: other })); assert.equal(foreignClock.active.length, fixed ? 1 : 0); assert.equal(clock.active.length, fixed ? 0 : 1); await render(null); assert.equal(foreignClock.active.length, 0); assert.equal(clock.active.length, 0); } finally { foreign.window.close(); }
    if (fixed) {
      const observer = window.ResizeObserver; delete window.ResizeObserver;
      try { await render(h(Probe, { element: a })); assert.deepEqual(value, { width: 30, height: 40 }); window.dispatchEvent(new window.Event('resize')); assert.equal(clock.frames, 1); await act(() => clock.tick()); await render(null); assert.equal(clock.frames, 0); } finally { window.ResizeObserver = observer; }
    }
    await render(h(React.Suspense, { fallback: 'waiting' }, h(Probe, { element: a, suspend: new Promise(() => {}) }))); assert.equal(clock.active.length, 0); await render(null);
    const Popper = caller();
    await render(h(Popper.Root, null, h(Popper.Anchor, null, 'anchor'), h(Popper.Content, { side: 'bottom', avoidCollisions: false }, 'content', h(Popper.Arrow, { 'data-test-arrow': '' }))));
    await act(() => Promise.resolve()); const arrow = document.querySelector('[data-test-arrow]'); assert(arrow); assert(document.querySelector('[data-side="bottom"]'));
    assert(clock.active.some(o => o.targets.has(arrow.parentElement)), 'real Popper arrow observes its wrapper');
    clock.deliver(arrow.parentElement, { borderBoxSize: [{ inlineSize: 10, blockSize: 5 }] }); await act(() => clock.tick()); await act(() => Promise.resolve());
    await render(null); assert.equal(clock.active.length, 0); assert.equal(clock.frames, 0);
    console.log(variant, version, 'coalescing, physical sizes, target changes, realm, StrictMode, cleanup and unchanged Popper caller pass');
  } finally { await act(() => root.unmount()); dom.window.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
}
