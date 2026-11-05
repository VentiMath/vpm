'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-portal-'));
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
  pack('vradix-react-portal');
  for (const manager of ['npm', 'bun']) for (const react of ['19.1.0', '19.2.4']) {
    const cwd = path.join(temp, manager + '-' + react); fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: {
      ...archives, react, 'react-dom': react, '@types/react': '19.2.14', '@radix-ui/react-portal': '1.2.0', '@radix-ui/react-dropdown-menu': '2.2.1',
    }, overrides: archives }));
    run(manager, ['install', '--ignore-scripts', ...(manager === 'npm' ? ['--no-audit', '--no-fund'] : [])], cwd);
    run(manager, manager === 'npm' ? ['ci', '--ignore-scripts', '--no-audit', '--no-fund'] : ['install', '--frozen-lockfile', '--ignore-scripts'], cwd);
    fs.writeFileSync(path.join(cwd, 'consumer.mjs'), `import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {createRequire} from 'node:module';import * as P from 'vradix-react-portal';assert.equal(createRequire(import.meta.url)('vradix-react-portal').Portal,P.Portal);assert.equal(P.Root,P.Portal);assert.equal(renderToString(React.createElement(P.Root,null,'client only')),'');`);
    for (const runtime of ['node', 'bun']) run(runtime, ['consumer.mjs'], cwd);
    fs.writeFileSync(path.join(cwd, 'consumer.tsx'), `import * as React from 'react';import {Portal,Root,PortalProps} from 'vradix-react-portal';const props:PortalProps={container:document.createDocumentFragment(),className:'panel',style:{display:'block'}};const a=<Portal {...props} ref={React.createRef<HTMLDivElement>()}/>;const b=<Root asChild container={null}><button>button</button></Root>;const c=<Root container={document.createElement('div')} onClick={e=>e.currentTarget.focus()}/>;
// @ts-expect-error string is not a container
const wrongContainer=<Portal container="#root"/>;
// @ts-expect-error ref must match the declared div
const wrongRef=<Root ref={React.createRef<SVGSVGElement>()}/>;void [a,b,c];`);
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
