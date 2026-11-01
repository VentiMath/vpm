'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), {spawnSync} = require('node:child_process');
if (!process.execArgv.includes('--preserve-symlinks')) {
  const child = spawnSync(process.execPath, ['--preserve-symlinks', __filename], {stdio: 'inherit', env: {...process.env, NODE_ENV: 'production'}});
  process.exit(child.status ?? 1);
}
const root = path.resolve(__dirname, '..'), loaded = new Map(), trees = [];
function load(library) {
  if (!loaded.has(library)) {
    const tree = require('../../../scripts/emotion-conformance/consumer-tree.cjs')(library);
    trees.push(tree);
    loaded.set(library, {React: tree.require('react'), api: tree.require('@emotion/react'),
      render: tree.require('react-dom/server').renderToStaticMarkup, createCache: tree.require('@emotion/cache').default});
  }
  return loaded.get(library);
}
const cssProp = {color: 'red', padding: 8, '&:hover': {color: 'blue'}};
const cases = [
  {name: 'render cached css-prop component', make: library => {
    const {React, api, render, createCache} = load(library), cache = createCache({key: 'fixture'});
    const element = React.createElement(api.CacheProvider, {value: cache}, api.jsx('button', {css: cssProp}, 'content'));
    render(element); return () => render(element);
  }, validate: html => assert.match(html, /^<button class="fixture-[a-z0-9]+">content<\/button>$/)},
  {name: 'render css prop with a fresh request cache', make: library => {
    const {React, api, render, createCache} = load(library), element = api.jsx('button', {css: cssProp}, 'content');
    return () => render(React.createElement(api.CacheProvider, {value: createCache({key: 'fixture'})}, element));
  }, validate: html => {assert.ok(html.startsWith('<style data-emotion="fixture ')); assert.ok(html.includes('padding:8px;')); assert.match(html, /<button class="fixture-[a-z0-9]+">content<\/button>$/);}},
  {name: 'render Global with a fresh request cache', make: library => {
    const {React, api, render, createCache} = load(library), element = React.createElement(api.Global, {styles: {body: {color: 'red', margin: 0}}});
    return () => render(React.createElement(api.CacheProvider, {value: createCache({key: 'fixture'})}, element));
  }, validate: html => assert.match(html, /^<style data-emotion="fixture-global [a-z0-9]+">body\{color:red;margin:0;\}<\/style>$/)},
  {name: 'render ClassNames composition', make: library => {
    const {React, api, render, createCache} = load(library), cache = createCache({key: 'fixture'});
    const element = React.createElement(api.CacheProvider, {value: cache}, React.createElement(api.ClassNames, null,
      ({css, cx}) => React.createElement('button', {className: cx('external', css({color: 'red'}), css({padding: 8}))}, 'content')));
    render(element); return () => render(element);
  }, validate: html => assert.match(html, /^<button class="external fixture-[a-z0-9]+">content<\/button>$/)},
  {name: 'render nested theme providers', make: library => {
    const {React, api, render} = load(library);
    const Reader = () => {const theme = api.useTheme(); return React.createElement('output', null, `${theme.color}:${theme.spacing}`);};
    const element = React.createElement(api.ThemeProvider, {theme: {color: 'red', spacing: 4}},
      React.createElement(api.ThemeProvider, {theme: parent => ({...parent, spacing: parent.spacing * 2})}, React.createElement(Reader)));
    return () => render(element);
  }, validate: html => assert.equal(html, '<output>red:8</output>')},
];
const files = ['index.js', 'src', 'package.json', 'bench/compare.cjs', '../../scripts/emotion-conformance/consumer-tree.cjs', '../../scripts/emotion-conformance/package-lock.json'];
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
