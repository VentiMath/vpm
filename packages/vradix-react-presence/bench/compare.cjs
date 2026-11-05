'use strict';
process.env.NODE_ENV = 'production';
const path = require('node:path'), assert = require('node:assert/strict');
const fixture = path.resolve(__dirname, '../../../scripts/radix-presence-conformance');
const root = path.resolve(__dirname, '..');
const upstream = path.join(fixture, 'node_modules/@radix-ui/react-presence');
require(path.join(fixture, 'check-built.cjs'))(true);
let dom;
const cleanup = [];
const cases = ['SSR 32 children', 'unchanged 32 children', 'toggle 32 children'].map(name => ({
  name,
  make(file) {
    // One document per isolated worker, before ReactDOM's module initialization.
    if (!dom) {
      dom = new (require(path.join(fixture, 'node_modules/jsdom')).JSDOM)('<!doctype html>');
      for (const key of ['window', 'document', 'navigator']) Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
      globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
    }
    const { api, React, selected } = require(path.join(fixture, 'load.cjs'))(file === upstream ? 'upstream' : 'vpm', '19.1', true);
    const h = React.createElement;
    let present = true;
    const tree = () => h('div', null, Array.from({ length: 32 }, (_, key) => h(api.Presence, { key, present }, h('span', null, String(key)))));
    if (name.startsWith('SSR')) {
      const render = selected('react-dom/server').renderToStaticMarkup;
      return () => render(tree());
    }
    const { flushSync } = selected('react-dom');
    const container = document.createElement('div'); document.body.append(container);
    const mounted = selected('react-dom/client').createRoot(container);
    cleanup.push(() => { flushSync(() => mounted.unmount()); container.remove(); });
    flushSync(() => mounted.render(tree()));
    return () => {
      if (name.startsWith('toggle')) present = !present;
      flushSync(() => mounted.render(tree()));
      return { element: container.firstChild, present };
    };
  },
  validate(value) {
    if (typeof value === 'string') assert.equal((value.match(/<span/g) || []).length, 32);
    else assert.equal(value.element.children.length, value.present ? 32 : 0);
  },
}));
require('../../../scripts/bench-process.cjs').run({
  root, upstream, vpm: root, cases,
  files: ['index.cjs', 'index.mjs', 'index.d.ts', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs',
    ...Object.keys(require(path.join(fixture, 'sources.cjs')).sources()).map(file => '../../' + file),
    '../../scripts/radix-presence-conformance/load.cjs', '../../scripts/radix-presence-conformance/check-built.cjs',
    '../../scripts/radix-presence-conformance/node_modules/.vpm-presence-production',
    '../../scripts/radix-presence-conformance/node_modules/@radix-ui/react-presence'],
  cleanup: () => { for (const close of cleanup.reverse()) close(); dom?.window.close(); },
}).catch(error => { console.error(error); process.exitCode = 1; });
