'use strict';
process.env.NODE_ENV = 'production';
const path = require('node:path'), assert = require('node:assert/strict');
const fixture = path.resolve(__dirname, '../../../scripts/radix-use-size-conformance'), upstream = path.join(fixture, 'node_modules/@radix-ui/react-use-size'), vpm = path.resolve(__dirname, '..');
const cases = ['mount and unmount', 'unchanged parent update', 'changed resize', 'unchanged resize', 'switch target'].map(name => ({ name, make: file => {
  const { JSDOM } = require(path.join(fixture, 'node_modules/jsdom')), dom = new JSDOM('<!doctype html><div id="root"></div>');
  const clock = require(path.join(fixture, 'dom.cjs')).install(dom.window);
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'getComputedStyle', 'ResizeObserver']) Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
  const { api, React, selected } = require(path.join(fixture, 'load.cjs'))(file === upstream ? 'upstream' : 'vpm');
  const { flushSync } = selected('react-dom'), root = selected('react-dom/client').createRoot(document.getElementById('root'));
  const a = document.createElement('div'), b = document.createElement('div');
  for (const element of [a, b]) Object.defineProperties(element, { offsetWidth: { value: 30 }, offsetHeight: { value: 40 } });
  let value, serial = 0;
  function Probe({ element, tick }) { value = api.useSize(element); return React.createElement('b', { 'data-tick': tick }, value?.width); }
  const mount = element => flushSync(() => root.render(React.createElement(Probe, { element, tick: ++serial })));
  mount(a);
  if (name === 'mount and unmount') return () => { flushSync(() => root.render(null)); mount(a); return value.width; };
  if (name === 'unchanged parent update') return () => { mount(a); return value.width; };
  if (name === 'switch target') return () => { mount(serial % 2 ? a : b); return value.width; };
  return () => { const width = name === 'changed resize' ? 30 + (++serial % 2) : 30; clock.deliver(a, { borderBoxSize: [{ inlineSize: width, blockSize: 40 }] }); flushSync(() => clock.tick()); return value.width; };
}, validate: value => assert(value === 30 || value === 31) }));
require('../../../scripts/bench-process.cjs').run({ root: vpm, upstream, vpm, cases, files: ['index.cjs', 'index.mjs', 'index.d.ts', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', '../vradix-react-use-layout-effect/index.cjs', '../../scripts/radix-use-size-conformance/load.cjs', '../../scripts/radix-use-size-conformance/dom.cjs', '../../scripts/radix-use-size-conformance/package-lock.json', '../../scripts/radix-use-size-conformance/node_modules/@radix-ui/react-use-size'] }).catch(error => { console.error(error); process.exitCode = 1; });
