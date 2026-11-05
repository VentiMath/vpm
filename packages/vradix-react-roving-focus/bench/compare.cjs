'use strict';
process.env.NODE_ENV = 'production';
const path = require('node:path'), assert = require('node:assert/strict');
const fixture = path.resolve(__dirname, '../../../scripts/radix-roving-conformance');
const root = path.resolve(__dirname, '..');
const upstream = path.join(fixture, 'node_modules/@radix-ui/react-roving-focus');
const cleanup = [];
require(path.join(fixture, 'check-built.cjs'))();
const cases = ['SSR 16 items', 'unchanged 16 items', 'controlled tab stop 16 items'].map(name => ({
  name,
  make(file) {
    const dom = new (require(path.join(fixture, 'node_modules/jsdom')).JSDOM)('<div id="root"></div>');
    for (const key of ['window', 'document', 'navigator']) {
      Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
    }
    cleanup.push(() => dom.window.close());
    const { api, React, selected } = require(path.join(fixture, 'load.cjs'))(file === upstream ? 'upstream' : 'vpm');
    const h = React.createElement;
    let current = 0;
    const tree = () => h(api.Root, { currentTabStopId: String(current), orientation: 'horizontal', loop: true },
      Array.from({ length: 16 }, (_, key) => h(api.Item, { key, tabStopId: String(key), asChild: true }, h('button', null, String(key)))));
    if (name.startsWith('SSR')) {
      const render = selected('react-dom/server').renderToStaticMarkup;
      return () => render(tree());
    }
    const { flushSync } = selected('react-dom');
    const container = document.getElementById('root');
    const mounted = selected('react-dom/client').createRoot(container);
    cleanup.push(() => flushSync(() => mounted.unmount()));
    flushSync(() => mounted.render(tree()));
    return () => {
      if (name.startsWith('controlled')) current = (current + 1) % 16;
      flushSync(() => mounted.render(tree()));
      return { element: container.firstChild, current };
    };
  },
  validate(value) {
    if (typeof value === 'string') {
      assert.equal((value.match(/<button/g) || []).length, 16);
      assert.equal((value.match(/tabindex="0"/g) || []).length, 1);
    } else {
      assert.equal(value.element.children.length, 16);
      assert.equal(value.element.tabIndex, 0);
      assert.equal(value.element.querySelectorAll('button[tabindex="0"]').length, 1);
      assert.equal(value.element.querySelector('button[tabindex="0"]').textContent, String(value.current));
    }
  },
}));
require('../../../scripts/bench-process.cjs').run({
  root, upstream, vpm: root, cases,
  files: ['index.cjs', 'index.mjs', 'index.d.ts', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs',
    ...Object.keys(require(path.join(fixture, 'sources.cjs')).sources()).map(file => '../../' + file),
    '../../scripts/radix-roving-conformance/load.cjs', '../../scripts/radix-roving-conformance/check-built.cjs',
    '../../scripts/radix-roving-conformance/node_modules/@radix-ui/react-roving-focus'],
  cleanup: () => { for (const close of cleanup.reverse()) close(); },
}).catch(error => { console.error(error); process.exitCode = 1; });
