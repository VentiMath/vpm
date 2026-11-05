'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-focus-scope-'));
function run(cmd, args, cwd = temp) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 120000, env: { ...process.env, BUN_INSTALL_CACHE_DIR: path.join(temp, 'bun-cache'), npm_config_cache: path.join(temp, 'npm-cache') } });
  assert.ifError(r.error); assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout;
}
try {
  const archives = {};
  function pack(name) {
    if (archives[name]) return;
    const dir = path.join(root, 'packages', name), meta = require(path.join(dir, 'package.json'));
    for (const child of Object.keys(meta.dependencies || {})) pack(child);
    run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', temp, '--quiet'], dir);
    const file = path.join(temp, name + '-' + meta.version + '.tgz'); archives[name] = 'file:' + file;
    assert.doesNotMatch(run('tar', ['-tzf', file]), /\/(test|bench|node_modules)\//);
    const packed = JSON.parse(run('tar', ['-xOf', file, 'package/package.json']));
    assert(Object.values(packed.dependencies || {}).every(value => !value.startsWith('workspace:')));
  }
  pack('vradix-react-focus-scope');
  for (const manager of ['npm', 'bun']) for (const react of ['19.1.0', '19.2.4']) {
    const cwd = path.join(temp, manager + '-' + react); fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: {
      ...archives, react, 'react-dom': react, '@types/react': '19.2.14', '@radix-ui/react-focus-scope': '1.3.1', '@radix-ui/react-dropdown-menu': '2.2.1',
    }, overrides: archives }));
    run(manager, ['install', '--ignore-scripts', ...(manager === 'npm' ? ['--no-audit', '--no-fund'] : [])], cwd);
    run(manager, manager === 'npm' ? ['ci', '--ignore-scripts', '--no-audit', '--no-fund'] : ['install', '--frozen-lockfile', '--ignore-scripts'], cwd);
    fs.writeFileSync(path.join(cwd, 'consumer.mjs'), `import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {createRequire} from 'node:module';import * as P from 'vradix-react-focus-scope';assert.equal(createRequire(import.meta.url)('vradix-react-focus-scope').FocusScope,P.FocusScope);assert.equal(P.Root,P.FocusScope);const html=renderToString(React.createElement(P.Root,{loop:true,trapped:true},React.createElement('button',null,'button')));assert(html.includes('tabindex="-1"'));assert(!html.includes('trapped='));`);
    for (const runtime of ['node', 'bun']) run(runtime, ['consumer.mjs'], cwd);
    fs.writeFileSync(path.join(cwd, 'consumer.tsx'), `import * as React from 'react';import * as P from 'vradix-react-focus-scope';const props:P.FocusScopeProps={loop:true,trapped:true,branches:[document.body],onMountAutoFocus:e=>e.preventDefault(),onUnmountAutoFocus:e=>e.preventDefault()};const a=<P.Root {...props} ref={React.createRef<HTMLDivElement>()} onKeyDown={e=>e.preventDefault()}><button>button</button></P.Root>;function Branch(){const {nodes,registry}=P.useFocusScopeBranchRegistry();P.useFocusScopeBranch(nodes[0]||null);return <P.FocusScopeBranchProvider registry={registry}><P.FocusScope branches={nodes} asChild><section/></P.FocusScope></P.FocusScopeBranchProvider>;}
const registry:P.FocusScopeBranchRegistry={add:node=>{},remove:node=>{}};
// @ts-expect-error branches require HTML elements
const wrongBranch=<P.Root branches={[document.createElementNS('http://www.w3.org/2000/svg','svg')]}/>;
// @ts-expect-error root ref must match the div contract
const wrongRef=<P.Root ref={React.createRef<SVGSVGElement>()}/>;void [a,Branch,registry];`);
    for (const resolution of ['NodeNext', 'Bundler']) {
      fs.writeFileSync(path.join(cwd, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, exactOptionalPropertyTypes: true, noEmit: true, jsx: 'react-jsx', target: 'ES2022', module: resolution === 'Bundler' ? 'ESNext' : resolution, moduleResolution: resolution, lib: ['ES2022', 'DOM'], types: [] }, files: ['consumer.tsx'] }));
      run('node', [require('../platform-types.cjs').compiler().path, '-p', 'tsconfig.json'], cwd);
    }
    fs.copyFileSync(path.join(__dirname, 'browser-entry.mjs'), path.join(cwd, 'browser-entry.mjs'));
    run('bun', [path.join(__dirname, 'build.cjs'), cwd, cwd], cwd);
    if (manager === 'npm') {
      for (const variant of ['upstream', 'vpm']) console.log(react, run('node', [path.join(__dirname, 'browser.cjs'), cwd, variant], cwd).trim());

    }
  }
  console.log(Object.keys(archives).length + '-package closure: npm/Bun fresh/frozen installs, Node/Bun CJS/ESM SSR, TS7 exact DOM types and Chrome upstream/VPM caller comparisons pass.');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
