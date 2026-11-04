'use strict';
const assert = require('node:assert/strict');
const [variant = 'vpm', version = '19.1', mode = 'client'] = process.argv.slice(2);
let dom;
if (mode === 'client') {
  dom = new (require('jsdom').JSDOM)('<!doctype html><div id="root"></div>', { pretendToBeVisual: true });
  require('../radix-use-size-conformance/dom.cjs').install(dom.window);
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'MutationObserver', 'getComputedStyle', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}
const { api, React, selected, caller } = require('./load.cjs')(variant, version);
const { Arrow, Root } = api, h = React.createElement, { act } = React;
const { renderToString, renderToStaticMarkup: ssr } = selected('react-dom/server');
assert.equal(Arrow, Root);
assert.deepEqual(Object.keys(api).sort(), ['Arrow', 'Root']);

if (mode === 'server') {
  assert.equal(typeof window, 'undefined');
  const triangle = '<polygon points="0,0 30,0 15,10"></polygon>';
  for (const width of [undefined, 0, 10, 13.5, '2em', '100%', null]) for (const height of [undefined, 0, 5, 7.25, '1em', null]) {
    const dimensions = { ...(width === null ? {} : { width: width === undefined ? 10 : width }), ...(height === null ? {} : { height: height === undefined ? 5 : height }) };
    const props = Object.freeze({ width, height, viewBox: 'wrong', preserveAspectRatio: 'wrong', fill: 'currentColor', 'aria-hidden': true, style: Object.freeze({ display: 'block' }) });
    assert.equal(ssr(h(Arrow, props, h('title', null, 'ignored'))), ssr(h('svg', { viewBox: '0 0 30 10', preserveAspectRatio: 'none', fill: 'currentColor', 'aria-hidden': true, style: props.style, ...dimensions }, h('polygon', { points: '0,0 30,0 15,10' }))), 'native SVG output');
  }
  const basic = ssr(h(Arrow));
  assert(basic.includes(triangle)); assert.equal(basic.match(/<svg/g).length, 1);
  const slotted = ssr(h(Arrow, { asChild: true, className: 'outer', width: 20, style: { fill: 'red' } }, h('svg', { className: 'inner', width: 40, viewBox: '0 0 40 20', preserveAspectRatio: 'xMidYMid', style: { fill: 'blue' } }, h('path', { d: 'M0 0L20 10' }))));
  assert(slotted.includes('class="outer inner"')); assert(slotted.includes('width="40"')); assert(slotted.includes('viewBox="0 0 40 20"')); assert(slotted.includes('preserveAspectRatio="xMidYMid"')); assert(slotted.includes('fill:blue')); assert(!slotted.includes('<polygon'));
  assert.equal(ssr(h(Arrow, { asChild: true }, null)), '');
  assert.throws(() => ssr(h(Arrow, { asChild: true }, [h('svg', { key: 'a' }), h('svg', { key: 'b' })])));
  const escaped = ssr(h(Arrow, { 'aria-label': '<arrow & "title">' })); assert(escaped.includes('&lt;arrow &amp; &quot;title&quot;&gt;'));
  console.log(variant, version, '42 dimension combinations, fixed geometry, ignored/native children, slotted overrides, escaping and DOM-free SSR pass');
} else {
  let root = selected('react-dom/client').createRoot(document.getElementById('root'));
  const render = tree => act(() => root.render(h(React.StrictMode, null, tree)));
  (async () => { try {
    const reference = React.createRef();
    await render(h(Arrow, { ref: reference, 'data-arrow': '', className: 'triangle', tabIndex: 0 }));
    const svg = reference.current, polygon = svg.firstChild;
    assert(svg instanceof window.SVGElement); assert.equal(svg.namespaceURI, 'http://www.w3.org/2000/svg'); assert.equal(svg.getAttribute('width'), '10');
    assert.equal(polygon.getAttribute('points'), '0,0 30,0 15,10');
    svg.focus(); await render(h(Arrow, { ref: reference, 'data-arrow': '', className: 'triangle', tabIndex: 0, width: 25 }));
    assert.equal(reference.current, svg); assert.equal(svg.firstChild, polygon); assert.equal(document.activeElement, svg); assert.equal(svg.getAttribute('width'), '25');
    await render(h('div', null, h(Arrow, { 'data-one': '' }), h(Arrow, { 'data-two': '' })));
    const first = document.querySelector('[data-one]'), second = document.querySelector('[data-two]'); assert.notEqual(first.firstChild, second.firstChild, 'shared elements still mount separate DOM nodes');
    const events = [], refs = [], cleanups = [];
    const outerRef = node => { assert(node instanceof window.SVGElement); refs.push(node); return () => cleanups.push(node); };
    const innerRef = React.createRef();
    const custom = () => h(Arrow, { asChild: true, ref: outerRef, className: 'outer', onClick: () => events.push('outer'), style: { fill: 'red' } }, h('svg', { ref: innerRef, width: 42, viewBox: '0 0 40 20', className: 'inner', onClick: e => { events.push('inner'); e.preventDefault(); }, style: { fill: 'blue' } }, h('path', { d: 'M0 0L20 10' })));
    await render(custom()); const customSvg = innerRef.current; assert.equal(refs.at(-1), customSvg); assert.equal(customSvg.parentNode, document.getElementById('root')); assert.equal(customSvg.firstChild.tagName, 'path'); assert.equal(customSvg.getAttribute('width'), '42'); assert.equal(customSvg.style.fill, 'blue');
    customSvg.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); assert.deepEqual(events, ['inner', 'outer']);
    const mounted = refs.length; await render(custom()); assert.equal(innerRef.current, customSvg); assert.equal(refs.length, mounted, 'stable refs survive updates');
    await render(null); assert.equal(innerRef.current, null); assert.equal(cleanups.length, refs.length, 'every React 19 callback ref cleanup runs once');
    const Popper = caller();
    for (const side of ['top', 'right', 'bottom', 'left']) {
      await render(h(Popper.Root, null, h(Popper.Anchor, null, 'anchor'), h(Popper.Content, { side, avoidCollisions: false }, h(Popper.Arrow, { ref: reference, width: 18, height: 8, 'data-popper-arrow': '' }))));
      await act(() => Promise.resolve()); const node = document.querySelector('[data-popper-arrow]'); assert.equal(node, reference.current); assert.equal(node.firstChild.tagName, 'polygon'); assert.equal(node.getAttribute('width'), '18'); assert.equal(node.style.display, 'block'); assert(document.querySelector(`[data-side="${side}"]`));
    }
    await act(() => root.unmount());
    const container = document.getElementById('root'), hydrationErrors = [];
    const tree = h(Arrow, { ref: reference, width: 15, 'aria-label': 'hydrated' }); container.innerHTML = renderToString(tree); const before = container.firstChild;
    await act(() => { root = selected('react-dom/client').hydrateRoot(container, tree, { onRecoverableError: e => hydrationErrors.push(e) }); });
    assert.equal(reference.current, before); assert.deepEqual(hydrationErrors, []);
    console.log(variant, version, 'StrictMode, SVG identity/focus, independent instances, slots/events/ref cleanup, unchanged Popper four-side caller and hydration pass');
  } finally { await act(() => root.unmount()); dom.window.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
}
