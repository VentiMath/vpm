'use strict';
process.env.NODE_ENV = 'production';
const path = require('node:path'), assert = require('node:assert/strict');
const fixture = path.resolve(__dirname, '../../../scripts/radix-portal-conformance');
const root = path.resolve(__dirname, '..'), upstream = path.join(fixture, 'node_modules/@radix-ui/react-portal');
require(path.join(fixture, 'check-built.cjs'))(true);
let dom;
const cleanup = [];
const cases = ['SSR 32 portals', 'unchanged 32 portals', 'mount/remove 32 portals'].map(name => ({
  name,
  make(file) {
    if (!dom) {
      dom = new (require(path.join(fixture, 'node_modules/jsdom')).JSDOM)('<!doctype html>');
      for (const key of ['window','document','navigator']) Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
    }
    const {api,React,selected} = require(path.join(fixture, 'load.cjs'))(file === upstream ? 'upstream' : 'vpm','19.1',true);
    const h = React.createElement, ssr = name.startsWith('SSR');
    const destination = ssr ? undefined : document.createElement('section');
    let mounted = true;
    const tree = () => h('main',null,mounted ? Array.from({length:32},(_,key)=>h(api.Portal,{key,container:destination},String(key))) : null);
    if (ssr) {
      const render = selected('react-dom/server').renderToStaticMarkup;
      return () => render(tree());
    }
    const {flushSync} = selected('react-dom'), container = document.createElement('div');
    document.body.append(container,destination);
    const client = selected('react-dom/client').createRoot(container);
    cleanup.push(()=>{flushSync(()=>client.unmount());container.remove();destination.remove();});
    flushSync(()=>client.render(tree()));
    return () => {
      if (name.startsWith('mount')) mounted = !mounted;
      flushSync(()=>client.render(tree()));
      return {destination,mounted};
    };
  },
  validate(value) {
    if (typeof value === 'string') assert.equal(value,'<main></main>');
    else assert.equal(value.destination.children.length,value.mounted?32:0);
  },
}));
require('../../../scripts/bench-process.cjs').run({
  root, upstream, vpm:root, cases,
  files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs',
    ...Object.keys(require(path.join(fixture,'sources.cjs')).sources()).map(file=>'../../'+file),
    '../../scripts/radix-portal-conformance/load.cjs','../../scripts/radix-portal-conformance/check-built.cjs',
    '../../scripts/radix-portal-conformance/node_modules/.vpm-portal-production',
    '../../scripts/radix-portal-conformance/node_modules/@radix-ui/react-portal'],
  cleanup:()=>{for(const close of cleanup.reverse())close();dom?.window.close();},
}).catch(error=>{console.error(error);process.exitCode=1;});
