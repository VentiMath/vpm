'use strict';
const assert = require('node:assert/strict');
const [variant = 'vpm', version = '19.1', mode = 'client'] = process.argv.slice(2);
const { JSDOM } = require('jsdom');
let dom, clock;
if (mode === 'client') {
  dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true });
  clock = require('../radix-use-size-conformance/dom.cjs').install(dom.window);
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'MutationObserver', 'getComputedStyle', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperties(document.documentElement, { clientWidth: { value: 800 }, clientHeight: { value: 600 } });
  function dimensions(node) {
    const isAnchor = node?.hasAttribute('data-anchor');
    const style = node?.hasAttribute('data-radix-popper-content-wrapper') ? node.firstElementChild?.style : node?.style;
    return { x: isAnchor ? 200 : 0, y: isAnchor ? 200 : 0, width: isAnchor ? 80 : parseFloat(style?.width) || 0, height: isAnchor ? 30 : parseFloat(style?.height) || 0 };
  }
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () { const d = dimensions(this); return new dom.window.DOMRect(d.x, d.y, d.width, d.height); };
  Object.defineProperties(dom.window.HTMLElement.prototype, { offsetWidth: { configurable: true, get() { return dimensions(this).width; } }, offsetHeight: { configurable: true, get() { return dimensions(this).height; } } });
}
const { api: P, React, selected } = require('./load.cjs')(variant, version), h = React.createElement;
const { renderToString, renderToStaticMarkup: ssr } = selected('react-dom/server');
for (const [alias, name] of Object.entries({ Root: 'Popper', Anchor: 'PopperAnchor', Content: 'PopperContent', Arrow: 'PopperArrow' })) assert.equal(P[alias], P[name]);
assert.deepEqual(P.SIDE_OPTIONS, ['top', 'right', 'bottom', 'left']); assert.deepEqual(P.ALIGN_OPTIONS, ['start', 'center', 'end']);
const tree = (side = 'bottom', align = 'center') => h(P.Root, null, h(P.Anchor, { 'data-anchor': '' }, 'anchor'), h(P.Content, { side, align }, 'content', h(P.Arrow, { width: 18, height: 8 })));

if (mode === 'server') {
  assert.equal(typeof window, 'undefined');
  for (const side of P.SIDE_OPTIONS) for (const align of P.ALIGN_OPTIONS) {
    const page = new JSDOM(ssr(tree(side, align))), d = page.window.document;
    assert.equal(d.querySelector('[data-side]').dataset.side, side); assert.equal(d.querySelector('[data-align]').dataset.align, align);
    const wrapper = d.querySelector('[data-radix-popper-content-wrapper]'); assert.equal(wrapper.style.position, 'fixed'); assert.equal(wrapper.style.transform, 'translate(0, -200%)');
    assert.equal(d.querySelector('polygon').getAttribute('points'), '0,0 30,0 15,10'); page.window.close();
  }
  for (const Part of [P.Anchor, P.Content, P.Arrow]) assert.throws(() => ssr(h(Part)), /must be used within/);
  const useScope = P.createPopperScope();
  function Scoped() { const scope = useScope(); return h(P.Root, scope, h(P.Root, null, h(P.Anchor, { ...scope, asChild: true }, h('button', null, 'outer anchor')), h(P.Content, { ...scope, asChild: true }, h('section', null, 'outer content')))); }
  assert(ssr(h(Scoped)).includes('<section')); assert(ssr(h(Scoped)).includes('<button'));
  assert(!ssr(h(P.Root, null, h(P.Anchor, { virtualRef: { current: { getBoundingClientRect: () => { throw Error('SSR measured'); } } } }))).includes('<div'));
  for (const caller of [P.Dropdown, P.Popover]) assert(ssr(h(caller.Root, null, h(caller.Trigger, null, 'open'))).includes('<button'));
  console.log(variant, version, 'DOM-free SSR: 12 placements, aliases, scoped/virtual anchors, slots, missing-provider errors and real caller triggers pass');
} else {
  const { act } = React, host = document.getElementById('root'); let root = selected('react-dom/client').createRoot(host);
  const render = node => act(() => root.render(h(React.StrictMode, null, node)));
  const settle = async () => { for (let i = 0; i < 6; i++) await act(() => new Promise(resolve => setImmediate(resolve))); };
  (async () => { try {
    const anchor = React.createRef(), content = React.createRef(), arrow = React.createRef(); let placed = 0;
    const notify = () => placed++;
    const app = (visible = true, strategy = 'optimized', zIndex = 30) => h(P.Root, null,
      visible && h(P.Anchor, { ref: anchor, 'data-anchor': '', asChild: true }, h('button', null, 'anchor')),
      h(P.Content, { ref: content, avoidCollisions: false, onPlaced: notify, updatePositionStrategy: strategy, style: { width: 100, height: 50, zIndex } }, h('button', { id: 'focus' }, 'focus'), h(P.Arrow, { ref: arrow, width: 18, height: 8 })));
    await render(app()); await settle(); assert(anchor.current instanceof window.HTMLButtonElement); assert(content.current instanceof window.HTMLDivElement); assert(arrow.current instanceof window.SVGElement);
    const wrapper = host.querySelector('[data-radix-popper-content-wrapper]'); assert.equal(wrapper.style.zIndex, '30'); assert(placed > 0); assert.equal(anchor.current.dataset.radixPopperSide, 'bottom');
    const first = content.current, placedInitially = placed; document.getElementById('focus').focus();
    await render(app()); await settle(); assert.equal(content.current, first); assert.equal(document.activeElement.id, 'focus'); assert.equal(placed, placedInitially);
    await render(app(true, 'optimized', 90)); await settle(); assert.equal(wrapper.style.zIndex, variant === 'vpm' ? '90' : '30', 'explicit style updates refresh wrapper stacking order');
    assert.equal(clock.frames, 0); await render(app(true, 'always')); await settle(); assert.equal(clock.frames > 0, variant === 'vpm', 'live update-policy switch replaces subscriptions');
    await render(app(true, 'optimized')); await settle(); assert.equal(clock.frames, 0);
    const removed = anchor.current; await render(app(false)); await settle();
    assert.equal(clock.active.some(o => o.targets.has(removed)), variant === 'upstream', 'removed anchors must release positioning observers');
    assert.equal(wrapper.style.visibility === 'hidden', variant === 'vpm');
    await render(app()); await settle(); assert.equal(wrapper.style.visibility, '');
    await render(null); await settle(); assert.equal(clock.active.length, 0); assert.equal(clock.frames, 0); assert.equal(content.current, null); assert.equal(arrow.current, null);

    const virtual = { current: { getBoundingClientRect: () => new window.DOMRect(100, 100, 20, 20), contextElement: document.body } };
    const virtualTree = () => h(P.Root, null, h(P.Anchor, { virtualRef: virtual }), h(P.Content, { avoidCollisions: false }, 'virtual'));
    await render(virtualTree()); await settle(); const virtualWrapper = host.querySelector('[data-radix-popper-content-wrapper]'); assert(virtualWrapper.style.transform.startsWith('translate('));
    virtual.current = null; await render(virtualTree()); await settle(); assert.equal(virtualWrapper.style.visibility === 'hidden', variant === 'vpm');
    await render(null); await settle();
    await act(() => root.unmount()); host.innerHTML = renderToString(tree()); const before = host.firstChild, errors = [];
    await act(() => { root = selected('react-dom/client').hydrateRoot(host, tree(), { onRecoverableError: e => errors.push(e) }); }); await settle();
    assert.equal(host.firstChild, before); assert.deepEqual(errors, []);
    console.log(variant, version, 'StrictMode, focus/ref identity, placement callbacks, z-index/policy/removal controls, virtual anchors, hydration and complete subscription cleanup pass');
  } finally { await act(() => root.unmount()); dom.window.close(); } })().catch(e => { console.error(e); process.exitCode = 1; });
}
