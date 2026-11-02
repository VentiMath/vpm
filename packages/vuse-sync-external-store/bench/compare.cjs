'use strict';
process.env.NODE_ENV = 'production';
const path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), fixture = path.resolve(root, '../../scripts/external-store-conformance');
const fixtureRequire = require('node:module').createRequire(path.join(fixture, 'package.json'));
const reactPath = fixtureRequire.resolve('react');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function(name, parent, ...args) {
  return resolve.call(this, name === 'react' ? reactPath : name, parent, ...args);
};
const React = require(reactPath), {renderToString} = require(path.join(fixture, 'node_modules/react-dom/server'));
const {JSDOM} = require(path.join(fixture, 'node_modules/jsdom'));
const dom = new JSDOM('<!doctype html><body></body>');
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Node']) Object.defineProperty(globalThis, name, {value: dom.window[name], configurable: true});
const {createRoot} = require(path.join(fixture, 'node_modules/react-dom/client')), {flushSync} = require(path.join(fixture, 'node_modules/react-dom'));
const roots = [];
const hook = dir => require(path.join(dir, dir === root ? 'with-selector.cjs' : 'with-selector')).useSyncExternalStoreWithSelector;
function mounted(dir, changed) {
  const select = hook(dir); let state = {value: 0, other: 0};
  const listeners = new Set(), subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
  const snapshot = () => state, selector = value => value.value;
  const node = document.createElement('div'), reactRoot = createRoot(node); roots.push(reactRoot);
  function View() { return React.createElement('span', null, select(subscribe, snapshot, undefined, selector)); }
  flushSync(() => reactRoot.render(React.createElement(View)));
  return () => {
    state = {value: changed ? 1 - state.value : 0, other: state.other + 1};
    flushSync(() => {for (const fn of listeners) fn();});
    return node.textContent;
  };
}
const cases = [
  {name: 'SSR with selector', make: dir => {const select = hook(dir), state = {value: 7}, snapshot = () => state, selector = s => s.value, subscribe = () => () => {};
    function View() { return React.createElement('span', null, select(subscribe, snapshot, snapshot, selector)); }
    return () => renderToString(React.createElement(View));}, validate: value => assert.equal(value, '<span>7</span>')},
  {name: 'unselected field update', make: dir => mounted(dir, false), validate: value => assert.equal(value, '0')},
  {name: 'selected field update and render', make: dir => mounted(dir, true), validate: value => assert.ok(value === '0' || value === '1')},
];
require('../../../scripts/bench-process.cjs').run({root, upstream: path.join(fixture, 'node_modules/use-sync-external-store'), vpm: root, cases,
  files: ['package.json', 'selection.cjs', 'with-selector.cjs', 'bench/compare.cjs', '../../scripts/external-store-conformance/package-lock.json', ...['react', 'react-dom', 'use-sync-external-store'].map(n => '../../scripts/external-store-conformance/node_modules/' + n)],
  cleanup: async () => {for (const root of roots) flushSync(() => root.unmount()); dom.window.close();},
}).catch(error => {console.error(error); process.exitCode = 1;});
