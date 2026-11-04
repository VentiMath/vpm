'use strict';
process.env.NODE_ENV = 'production';
const path = require('node:path'), assert = require('node:assert/strict');
const fixture = path.resolve(__dirname, '../../../scripts/radix-arrow-conformance');
const upstream = path.join(fixture, 'node_modules/@radix-ui/react-arrow'), vpm = path.resolve(__dirname, '..');
const cleanup = [];
const cases = ['SSR default arrow', 'SSR slotted arrow', '20 unchanged arrows', '20 resized arrows'].map(name => ({
  name,
  make(file) {
    const client = name.startsWith('20');
    if (client) {
      const dom = new (require(path.join(fixture, 'node_modules/jsdom')).JSDOM)('<div id="root"></div>');
      for (const key of ['window', 'document', 'navigator']) Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
      cleanup.push(() => dom.window.close());
    }
    const { api: { Arrow }, React, selected } = require(path.join(fixture, 'load.cjs'))(file === upstream ? 'upstream' : 'vpm');
    const h = React.createElement;
    if (!client) {
      const { renderToStaticMarkup } = selected('react-dom/server');
      const props = name.includes('slotted') ? { asChild: true, className: 'arrow', width: 20, height: 10 } : { fill: 'currentColor' };
      const child = name.includes('slotted') ? h('svg', { className: 'custom', viewBox: '0 0 20 10' }, h('path', { d: 'M0 0L20 0L10 10Z' })) : undefined;
      return () => renderToStaticMarkup(h(Arrow, props, child));
    }
    const { flushSync } = selected('react-dom'), root = selected('react-dom/client').createRoot(document.getElementById('root'));
    cleanup.push(() => flushSync(() => root.unmount()));
    let tick = 0;
    const run = () => {
      const width = name.includes('resized') ? 10 + (++tick % 2) : 10;
      flushSync(() => root.render(h('div', null, Array.from({ length: 20 }, (_, key) => h(Arrow, { key, width, height: 5, 'aria-hidden': true })))));
      return document.getElementById('root').firstChild;
    };
    run(); return run;
  },
  validate(value) {
    if (typeof value === 'string') { assert(value.startsWith('<svg')); assert(value.includes(name.includes('slotted') ? '<path' : '<polygon')); }
    else { assert.equal(value.querySelectorAll('svg > polygon').length, 20); assert(['10', '11'].includes(value.firstChild.getAttribute('width'))); }
  }
}));
require('../../../scripts/bench-process.cjs').run({
  root: vpm, upstream, vpm, cases,
  files: ['index.cjs', 'index.mjs', 'index.d.ts', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', '../vradix-react-primitive/index.cjs', '../vradix-react-slot/index.cjs', '../vradix-react-compose-refs/index.cjs', '../../scripts/radix-arrow-conformance/load.cjs', '../../scripts/radix-arrow-conformance/package-lock.json', '../../scripts/radix-arrow-conformance/node_modules/@radix-ui/react-arrow'],
  cleanup: () => { for (const close of cleanup.reverse()) close(); }
}).catch(error => { console.error(error); process.exitCode = 1; });
