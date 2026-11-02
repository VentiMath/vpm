'use strict';
const fs = require('node:fs'),
      path = require('node:path'),
      os = require('node:os'),
      assert = require('node:assert/strict'),
      {
        spawnSync
      } = require('node:child_process');

const root = path.resolve(__dirname, '../../packages/vuse-sync-external-store'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-store-archive-'));

function run(cmd, args, cwd = temp) {
  const p = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120000
  });

  assert.equal(p.status, 0, p.stdout + p.stderr);
  return p.stdout;
}

try {
  run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', temp, '--quiet'], root);
  const archive = path.join(temp, 'vuse-sync-external-store-1.7.0.tgz');
  assert.doesNotMatch(run('tar', ['-tzf', archive]), /\/(test|bench|node_modules)\//);

  for (const manager of ['npm', 'bun']) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);

    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
      private: true,

      dependencies: {
        'vuse-sync-external-store': 'file:' + archive,
        react: '19.1.0',
        '@types/react': '19.2.10'
      }
    }));

    run(manager, [
      'install',
      '--ignore-scripts',
      ...(manager === 'npm' ? ['--no-audit', '--no-fund', '--cache', path.join(temp, 'cache')] : [])
    ], cwd);

    const exports = Object.keys(require(path.join(root, 'package.json')).exports).filter(p => p !== './package.json');

    fs.writeFileSync(
      path.join(cwd, 'consumer.cjs'),
      `const assert=require('node:assert/strict'),React=require('react');for(const sub of ${JSON.stringify(exports)}){const value=require('vuse-sync-external-store'+(sub==='.'?'':sub.slice(1)));assert.equal(typeof value[sub.includes('selector')?'useSyncExternalStoreWithSelector':'useSyncExternalStore'],'function');if(!sub.includes('selector'))assert.equal(value.useSyncExternalStore,React.useSyncExternalStore);}`
    );

    fs.writeFileSync(
      path.join(cwd, 'consumer.mjs'),
      `import assert from 'node:assert/strict';import React from 'react';for(const sub of ${JSON.stringify(exports)}){const value=await import('vuse-sync-external-store'+(sub==='.'?'':sub.slice(1)));assert.equal(typeof value[sub.includes('selector')?'useSyncExternalStoreWithSelector':'useSyncExternalStore'],'function');if(!sub.includes('selector'))assert.equal(value.useSyncExternalStore,React.useSyncExternalStore);}`
    );

    for (const runtime of ['node', 'bun']) for (const file of ['consumer.cjs', 'consumer.mjs'])
      run(runtime, [file], cwd);

    fs.writeFileSync(
      path.join(cwd, 'browser.mjs'),
      'export {useSyncExternalStore} from \'vuse-sync-external-store/shim\';export {useSyncExternalStoreWithSelector} from \'vuse-sync-external-store/shim/with-selector\';'
    );

    run('bun', ['build', 'browser.mjs', '--target', 'browser', '--outfile', 'browser-built.mjs'], cwd);
    run('node', ['browser-built.mjs'], cwd);
    const types = 'import {useSyncExternalStoreWithSelector as select} from \'vuse-sync-external-store/with-selector\';import {useSyncExternalStore} from \'vuse-sync-external-store/shim\';const subscribe=(fn:()=>void)=>()=>{};const n:number=useSyncExternalStore(subscribe,()=>1);const s:string=select(subscribe,()=>({n:1}),undefined,x=>String(x.n),(a,b)=>a===b);\n// @ts-expect-error wrong selector input\nselect(subscribe,()=>({n:1}),undefined,(x:string)=>x);\nvoid [n,s];';

    for (const ext of ['cts', 'mts'])
      fs.writeFileSync(path.join(cwd, 'types.' + ext), types);

    fs.writeFileSync(path.join(cwd, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: 'ES2022',
        lib: ['ES2022'],
        types: [],
        module: 'NodeNext',
        moduleResolution: 'NodeNext'
      },

      files: ['types.cts', 'types.mts']
    }));

    run('node', [require('../platform-types.cjs').compiler().path, '-p', 'tsconfig.json'], cwd);
  }

  console.log(
    'External-store packed npm/Bun: every CJS/ESM subpath, native identity, browser build and TS7 inference pass.'
  );
} finally {
  fs.rmSync(temp, {
    recursive: true,
    force: true
  });
}
