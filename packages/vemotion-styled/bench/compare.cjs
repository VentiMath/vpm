'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {spawnSync} = require('node:child_process');
if (!process.execArgv.includes('--preserve-symlinks')) {
  const child = spawnSync(process.execPath, ['--preserve-symlinks', __filename], {stdio: 'inherit', env: {...process.env, NODE_ENV: 'production'}});
  process.exit(child.status ?? 1);
}
const root = path.resolve(__dirname, '..'), trees = [];
const loaded = new Map();
function load(library) {
  if (!loaded.has(library)) {
    const tree = require('../../../scripts/emotion-conformance/consumer-tree.cjs')(library);
    trees.push(tree);
    loaded.set(library, {React: tree.require('react'), styled: tree.require('@emotion/styled').default,
      render: tree.require('react-dom/server').renderToStaticMarkup,
      CacheProvider: tree.require('@emotion/react').CacheProvider,
      createCache: tree.require('@emotion/cache').default});
  }
  return loaded.get(library);
}
const style = {color: '#123456', padding: 8, '&:hover': {color: '#abcdef'}};
const isComponent = value => {assert.equal(typeof value, 'function'); assert.equal(value.__emotion_real, value);};
const cases = [
  {name: 'construct DOM styled component', make: library => {const {styled} = load(library); return () => styled('button')(style);}, validate: isComponent},
  {name: 'construct inherited styled component', make: library => {const {styled} = load(library); const Base = styled('button', {shouldForwardProp: name => name !== 'ownerState'})(style); return () => styled(Base)({margin: 2});}, validate: isComponent},
  {name: 'server render cached static styles', make: library => {
    const {React, styled, render, CacheProvider, createCache} = load(library);
    const Component = styled.button(style), cache = createCache({key: 'fixture'});
    const element = React.createElement(CacheProvider, {value: cache}, React.createElement(Component, {id: 'button'}, 'content'));
    render(element); // Insert once, outside the measured operation.
    return () => render(element);
  }, validate: html => {assert.match(html, /^<button id="button" class="fixture-[a-z0-9]+">content<\/button>$/);}},
  {name: 'server render theme and prop interpolation', make: library => {
    const {React, styled, render, CacheProvider, createCache} = load(library);
    const Component = styled('section', {shouldForwardProp: name => name !== 'amount' && name !== 'theme'})(props => ({color: props.theme.ink, padding: props.amount}));
    const cache = createCache({key: 'fixture'}), theme = {ink: '#123456'};
    const element = React.createElement(CacheProvider, {value: cache}, React.createElement(Component, {amount: 8, theme}, 'content'));
    render(element);
    return () => render(element);
  }, validate: html => {assert.match(html, /^<section class="fixture-[a-z0-9]+">content<\/section>$/);}},
];
const files = ['base.js', 'src', 'index.js', 'package.json', 'bench/compare.cjs', '../../scripts/emotion-conformance/consumer-tree.cjs'];
for (const name of fs.readdirSync(path.resolve(root, '..')).filter(name => name.startsWith('vemotion-') || name === 'vstylis')) {
  const metadata = require(path.resolve(root, '..', name, 'package.json'));
  for (const file of metadata.files) if (!/README|PROVENANCE|LICENSE|\.d\.ts/.test(file)) {
    const relative = path.join('..', name, file);
    if (fs.existsSync(path.resolve(root, relative))) files.push(relative);
  }
}
for (const name of ['@emotion', 'react19', 'react19-dom']) files.push('../../scripts/emotion-conformance/node_modules/' + name);
require('../../../scripts/bench-process.cjs').run({root, upstream: 'upstream', vpm: 'vpm', cases, files,
  cleanup: () => {for (const tree of trees) tree.cleanup();}
}).catch(error => {console.error(error); process.exitCode = 1;});
