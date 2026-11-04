'use strict';
const assert = require('node:assert/strict');
const [variant = 'vpm', version = '19.1', mode = 'client'] = process.argv.slice(2);
let dom;
if (mode === 'client') {
  dom = new (require('jsdom').JSDOM)('<!doctype html><div id="root"></div><div id="portal"></div>', { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MutationObserver']) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}
const { api, React, selected } = require('./load.cjs')(variant, version), h = React.createElement, { act } = React;
const [C, useItems, createScope] = api.createCollection('Fixture');
assert.equal(createScope.scopeName, 'FixtureCollectionProvider');
const { renderToString } = selected('react-dom/server');
let getItems, layoutItems;
function Read() { getItems = useItems(undefined); React.useLayoutEffect(() => { layoutItems = getItems().map(x => x.id); }); return null; }
function Tree({ ids = ['a', 'b', 'c'], changed = false, childTag = 'button', itemRef, portalled = false }) {
  return h(C.Provider, { scope: undefined }, h(C.Slot, { scope: undefined }, h('div', { id: 'collection' },
    ids.map(id => h(C.ItemSlot, { key: id, scope: undefined, id, disabled: changed && id === 'b', ref: id === 'a' ? itemRef : undefined }, h(childTag, { 'data-id': id, tabIndex: 0 }, id))),
    h('b', { 'data-radix-collection-item': '', 'data-id': 'unregistered' }, 'ignore'))), h(Read),
    portalled && selected('react-dom').createPortal(h(C.ItemSlot, { scope: undefined, id: 'elsewhere' }, h('button', { 'data-id': 'portal' }, 'portal')), document.getElementById('portal')));
}
if (mode === 'server') {
  assert.equal(typeof window, 'undefined');
  const markup = renderToString(h(Tree, {}));
  assert.equal((markup.match(/data-radix-collection-item/g) || []).length, 4);
  assert(!markup.includes('disabled=')); assert(markup.includes('data-id="a"'));
  assert.deepEqual(getItems(), []);
  console.log(variant, version, 'DOM-free SSR, item metadata is not DOM props, empty pre-mount reads');
} else (async () => {
  let root = selected('react-dom/client').createRoot(document.getElementById('root'));
  const render = tree => act(() => root.render(h(React.StrictMode, null, tree)));
  const ids = () => getItems().map(x => x.id);
  try {
    const itemRef = React.createRef(); await render(h(Tree, { itemRef }));
    assert.deepEqual(ids(), ['a', 'b', 'c']); assert.equal(getItems()[0].ref.current, itemRef.current);
    if (variant === 'vpm') assert.deepEqual(layoutItems, ['a', 'b', 'c'], 'committed child registrations available in parent layout');
    const first = itemRef.current, getter = getItems; first.focus();
    await render(h(Tree, { itemRef, changed: true }));
    assert.equal(getItems, getter); assert.equal(itemRef.current, first); assert.equal(document.activeElement, first); assert.equal(getItems()[1].disabled, true);
    await render(h(Tree, { ids: ['c', 'a', 'b'], itemRef })); assert.deepEqual(ids(), ['c', 'a', 'b']);
    const list = document.getElementById('collection'); list.prepend(itemRef.current); assert.deepEqual(ids(), ['a', 'c', 'b'], 'synchronous manual DOM order');
    await render(null); assert.deepEqual(getter(), []); assert.equal(itemRef.current, null);
    await render(h(Tree, { itemRef, childTag: 'span' })); assert.equal(itemRef.current.tagName, 'SPAN');
    await render(h(Tree, { itemRef, childTag: 'button', ids: ['a'] })); assert.deepEqual(ids(), ['a']); assert.equal(itemRef.current.tagName, 'BUTTON');
    await render(h(Tree, { portalled: true }));
    assert.deepEqual(ids(), variant === 'vpm' ? ['a', 'b', 'c'] : ['elsewhere', 'a', 'b', 'c'], 'outside-root items explicitly excluded only by VPM');
    const outside = document.querySelector('[data-id="b"]'), parent = outside.parentNode; outside.remove();
    assert.deepEqual(ids(), variant === 'vpm' ? ['a', 'c'] : ['b', 'elsewhere', 'a', 'c']); parent.append(outside);
    await render(null);
    const scoped = createScope(); let outerRead, innerRead;
    function ScopeRead({ scope, inner }) { const getter = useItems(scope); if (inner) innerRead = getter; else outerRead = getter; return null; }
    function Scopes() {
      const props = scoped(undefined), scope = props.__scopeFixtureCollectionProvider;
      return h(C.Provider, { scope: undefined }, h(C.Slot, { scope: undefined }, h('section', null,
        h(C.ItemSlot, { scope: undefined, id: 'outer' }, h('button', null, 'outer')),
        h(C.Provider, { scope }, h(C.Slot, { scope }, h('div', null, h(C.ItemSlot, { scope, id: 'inner' }, h('button', null, 'inner')), h(ScopeRead, { scope, inner: true })))),
        h(ScopeRead, { scope: undefined }))));
    }
    await render(h(Scopes)); assert.deepEqual(outerRead().map(x => x.id), ['outer']); assert.deepEqual(innerRead().map(x => x.id), ['inner']);
    const refs = [], released = [];
    const ref = node => { refs.push(node); return () => released.push(node); };
    await render(h(Tree, { itemRef: ref })); await render(null); assert.equal(released.length, refs.length);
    // Two registrations on one actual element remain independently readable.
    await render(h(C.Provider, { scope: undefined }, h(C.Slot, { scope: undefined }, h('div', null,
      h(C.ItemSlot, { scope: undefined, id: 'first' }, h(C.ItemSlot, { scope: undefined, id: 'second' }, h('button', null, 'both'))), h(Read)))));
    assert.deepEqual(new Set(ids()), new Set(['first', 'second']));
    await act(() => root.unmount());
    const container = document.getElementById('root'), errors = []; container.innerHTML = renderToString(h(Tree, { itemRef })); const before = container.querySelector('[data-id="a"]');
    await act(() => { root = selected('react-dom/client').hydrateRoot(container, h(Tree, { itemRef }), { onRecoverableError: e => errors.push(e) }); });
    assert.equal(itemRef.current, before); assert.deepEqual(ids(), ['a', 'b', 'c']); assert.deepEqual(errors, []);
    console.log(variant, version, 'StrictMode, metadata, stable getters/refs, live order, removal/portals, node replacement, independent scopes, callback cleanup, duplicate slots and hydration');
  } finally { await act(() => root.unmount()); dom.window.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
