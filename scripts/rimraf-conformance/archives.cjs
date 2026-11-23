'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  assert = require('node:assert/strict'),
  { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'),
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-rimraf-archives-'));
const run = (bin, args, cwd = tmp, extra = {}) =>
  execFileSync(bin, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120000,
    env: {
      ...process.env,
      npm_config_cache: tmp + '/npm-cache',
      BUN_INSTALL_CACHE_DIR: tmp + '/bun-cache',
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      ...extra,
    },
  });
try {
  const deps = {};
  for (const name of [
    'vbalanced-match',
    'vbrace-expansion',
    'vminimatch',
    'vlru-cache',
    'vminipass',
    'vpath-scurry',
    'vglob',
    'vrimraf',
  ]) {
    const pack = JSON.parse(
      run('npm', ['pack', root + '/packages/' + name, '--ignore-scripts', '--json']),
    )[0];
    assert(pack.files.every((f) => !f.path.startsWith('test/') && !f.path.startsWith('bench/')));
    deps[name] = 'file:../' + pack.filename;
  }
  for (const manager of ['npm', 'bun']) {
    const cwd = tmp + '/' + manager;
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      cwd + '/package.json',
      JSON.stringify({
        private: true,
        type: 'module',
        dependencies: { ...deps, rimraf: deps.vrimraf },
        overrides: deps,
      }),
    );
    run(manager, ['install', '--ignore-scripts'], cwd);
    run(
      manager,
      manager === 'npm'
        ? ['ci', '--ignore-scripts']
        : ['install', '--ignore-scripts', '--frozen-lockfile'],
      cwd,
    );
    const packageDir = cwd + '/node_modules/rimraf';
    fs.writeFileSync(
      cwd + '/check.mjs',
      `import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';import {rimraf,rimrafSync} from 'rimraf';assert.equal(rimraf,createRequire(import.meta.url)('rimraf').rimraf);fs.mkdirSync('scratch/nested',{recursive:true});fs.writeFileSync('scratch/nested/a','x');assert.equal(await rimraf('scratch/**/*',{glob:true}),true);assert.deepEqual(fs.readdirSync('scratch'),[]);assert.equal(rimrafSync('scratch'),true);assert(!fs.existsSync('scratch'));`,
    );
    for (const runtime of ['node', 'bun']) {
      run(runtime, ['check.mjs'], cwd);
      process.stdout.write(
        run(runtime, [__dirname + '/callers.cjs'], cwd, { VPM_RIMRAF_PACKAGE: packageDir }),
      );
    }
    fs.mkdirSync(cwd + '/cli-target');
    run(cwd + '/node_modules/.bin/rimraf', ['cli-target'], cwd);
    assert(!fs.existsSync(cwd + '/cli-target'));
    const types = fs
      .readFileSync(root + '/packages/vrimraf/test/types.ts', 'utf8')
      .replace("'../index.cjs'", "'rimraf'");
    for (const ext of ['cts', 'mts']) fs.writeFileSync(cwd + '/check.' + ext, types);
    const platform = require('../platform-types.cjs'),
      config = platform.configuration([cwd + '/check.cts', cwd + '/check.mts']);
    platform.clean(platform.compile(config));
    config.files = [cwd + '/check.mts'];
    config.compilerOptions.module = 'ESNext';
    config.compilerOptions.moduleResolution = 'Bundler';
    platform.clean(platform.compile(config));
  }
  console.log(
    'Fresh/frozen npm+Bun eight-package archives, original rimraf name, CJS/ESM, CLI, Capacitor cleanup and TS7 consumers pass.',
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
