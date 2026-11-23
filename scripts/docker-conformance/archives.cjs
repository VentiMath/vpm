'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vis-docker-archive-'));
const run = (bin, args, cwd = tmp, extra = {}) => execFileSync(bin, args, {cwd, encoding:'utf8', timeout:120000, env:{...process.env, npm_config_cache:tmp+'/npm-cache', BUN_INSTALL_CACHE_DIR:tmp+'/bun-cache', npm_config_audit:'false', npm_config_fund:'false', ...extra}});
try {
  const pack = JSON.parse(run('npm', ['pack', root+'/packages/vis-docker', '--ignore-scripts', '--json']))[0];
  assert(pack.files.every(file => !file.path.startsWith('test/') && !file.path.startsWith('bench/')));
  for (const manager of ['npm', 'bun']) {
    const cwd = tmp+'/'+manager;
    fs.mkdirSync(cwd);
    fs.writeFileSync(cwd+'/package.json', JSON.stringify({private:true, type:'module', dependencies:{'is-docker':'file:../'+pack.filename}}));
    run(manager, ['install', '--ignore-scripts'], cwd);
    run(manager, manager === 'npm' ? ['ci', '--ignore-scripts'] : ['install', '--frozen-lockfile', '--ignore-scripts'], cwd);
    const packageDir = cwd+'/node_modules/is-docker';
    const metadata = JSON.parse(fs.readFileSync(packageDir+'/package.json'));
    assert.equal(metadata.name, 'vis-docker');
    assert(!metadata.dependencies && !metadata.optionalDependencies);
    fs.writeFileSync(cwd+'/check.mjs', `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import isDocker from 'is-docker';const require=createRequire(import.meta.url);assert.equal(isDocker,require('is-docker'));assert.equal(isDocker.default,isDocker);assert.equal(typeof isDocker(),'boolean');process.stdout.write(String(isDocker()));`);
    for (const runtime of ['node', 'bun']) {
      const found = run(runtime, ['check.mjs'], cwd) === 'true';
      for (const bin of ['is-docker', 'vis-docker']) {
        const cli = spawnSync(runtime, [cwd+'/node_modules/.bin/'+bin], {cwd, encoding:'utf8', timeout:10000});
        assert.equal(cli.error, undefined);
        assert.equal(cli.status, found ? 0 : 2);
        assert.equal(cli.stdout, '');
        assert.equal(cli.stderr, '');
      }
      process.stdout.write(run(runtime, [__dirname+'/callers.cjs'], cwd, {VPM_DOCKER_PACKAGE:packageDir}));
    }
    const types = fs.readFileSync(root+'/packages/vis-docker/test/types.ts', 'utf8').replaceAll("'../index.cjs'", "'is-docker'");
    fs.writeFileSync(cwd+'/check.cts', types);
    fs.writeFileSync(cwd+'/check.mts', types);
    const platform = require('../platform-types.cjs');
    const config = platform.configuration([cwd+'/check.cts', cwd+'/check.mts']);
    platform.clean(platform.compile(config));
    config.files = [cwd+'/check.mts'];
    config.compilerOptions.module = 'ESNext';
    config.compilerOptions.moduleResolution = 'Bundler';
    platform.clean(platform.compile(config));
  }
  console.log('Fresh/frozen npm+Bun original-name archives, CJS/ESM, both CLI aliases, unchanged callers and TS7 pass.');
} finally {fs.rmSync(tmp, {recursive:true, force:true})}
