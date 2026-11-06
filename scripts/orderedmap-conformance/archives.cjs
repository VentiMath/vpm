'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-orderedmap-archives-'));
function run(cmd, args, cwd = temp, env = {}) {
  const result = spawnSync(cmd, args, {cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 2e6, env: {...process.env, BUN_INSTALL_CACHE_DIR: path.join(temp, 'bun-cache'), npm_config_cache: path.join(temp, 'npm-cache'), ...env}});
  assert.ifError(result.error); assert.equal(result.status, 0, result.stdout + result.stderr); return result.stdout;
}
try {
  const packageDir = path.join(root, 'packages/vorderedmap');
  run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', temp, '--quiet'], packageDir);
  const archive = path.join(temp, 'vorderedmap-2.1.1.tgz');
  assert.doesNotMatch(run('tar', ['-tzf', archive]), /\/(test|bench|node_modules)\//);
  const unpack = path.join(temp, 'unpack'); fs.mkdirSync(unpack); run('tar', ['-xzf', archive, '-C', unpack]);
  for (const file of fs.readdirSync(path.join(unpack, 'package'))) assert.deepEqual(fs.readFileSync(path.join(unpack, 'package', file)), fs.readFileSync(path.join(packageDir, file)), file);
  for (const manager of ['npm', 'bun']) {
    const cwd = path.join(temp, manager); fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({private: true, type: 'module', dependencies: {vorderedmap: 'file:' + archive}}));
    run(manager, ['install', '--ignore-scripts', ...(manager === 'npm' ? ['--no-audit','--no-fund'] : [])], cwd);
    const lock = path.join(cwd, manager === 'npm' ? 'package-lock.json' : 'bun.lock'), before = fs.readFileSync(lock);
    run(manager, manager === 'npm' ? ['ci','--ignore-scripts','--no-audit','--no-fund'] : ['install','--frozen-lockfile','--ignore-scripts'], cwd);
    assert.deepEqual(fs.readFileSync(lock), before);
    const entry = path.join(cwd, 'node_modules/vorderedmap/index.cjs');
    for (const runtime of ['node','bun']) {
      console.log(run(runtime, [runtime === 'node' ? '--test' : 'test', path.join(packageDir, 'test/contracts.test.cjs')], cwd, {VPM_ORDEREDMAP_ENTRY: entry}).trim());
      console.log(run(runtime, [path.join(__dirname, 'callers.cjs')], cwd, {VPM_ORDEREDMAP_ENTRY: entry}).trim());
    }
    fs.writeFileSync(path.join(cwd, 'consumer.mjs'), `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import Map from 'vorderedmap';assert.equal(createRequire(import.meta.url)('vorderedmap'),Map);assert.equal(Map.from({a:1}).get('a'),1);`);
    for (const runtime of ['node','bun']) run(runtime, ['consumer.mjs'], cwd);
    const types = fs.readFileSync(path.join(packageDir, 'test/types.ts'), 'utf8');
    fs.writeFileSync(path.join(cwd, 'consumer.mts'), types);
    fs.writeFileSync(path.join(cwd, 'consumer.cts'), types + `\nimport CjsMap = require('vorderedmap');const cjsNumber:number|undefined=CjsMap.from({x:1}).get('x');`);
    for (const resolution of ['NodeNext','Bundler']) {
      fs.writeFileSync(path.join(cwd, 'tsconfig.json'), JSON.stringify({compilerOptions: {strict: true, noEmit: true, target: 'ES2022', module: resolution === 'Bundler' ? 'Preserve' : resolution, moduleResolution: resolution, lib: ['ES2022'], types: []}, files: ['consumer.mts','consumer.cts']}));
      run('node', [require('../platform-types.cjs').compiler().path, '-p', 'tsconfig.json'], cwd);
    }
    fs.writeFileSync(path.join(cwd, 'browser.js'), `import Map from 'vorderedmap';globalThis.result=Map.from({a:1,b:2}).addBefore('b','c',3).toObject();`);
    run('bun', ['build','browser.js','--target=browser','--format=iife','--outfile=bundle.js'], cwd);
    const context = {}; require('node:vm').runInNewContext(fs.readFileSync(path.join(cwd, 'bundle.js'), 'utf8'), context);
    assert.equal(JSON.stringify(context.result), '{"a":1,"c":3,"b":2}');
    assert.deepEqual(require(path.join(cwd, 'node_modules/vorderedmap/package.json')).dependencies, {});
  }
  console.log('Exact one-package archives: fresh/frozen npm/Bun, Node/Bun contracts and real ProseMirror callers, CJS/ESM identity, TS7 CJS/ESM NodeNext/Bundler without ambient types, executed browser bundle pass.');
} finally { fs.rmSync(temp, {recursive: true, force: true}); }
