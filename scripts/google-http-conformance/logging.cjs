'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process'), {createHash} = require('node:crypto'), {compiler} = require('../platform-types.cjs');
const root = path.resolve(__dirname, '../..'), temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vgoogle-logging-conformance-'));
const upstream = process.argv.includes('--upstream');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 120000, ...options});
  if (result.status !== 0) console.log(result.stdout + result.stderr);
  assert.equal(result.status, 0, String(result.error || result.signal || 'Failed'));
  return result.stdout;
}
try {
  const archive = path.join(__dirname, 'google-logging-utils-0.0.2.tar.gz');
  assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), '245e6d31a4120caac33eda25fad7fa46377393d6134989bea1657028c7e17a54');
  run('tar', ['-xzf', archive, '--strip-components=2', '-C', temporary, 'gax-nodejs-511df04ec5064070adb173b9b8d84056cf7b1758/logging-utils']);
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(temporary, 'tsconfig.json'), JSON.stringify({compilerOptions: {target: 'ES2022', module: 'CommonJS', noCheck: true, noResolve: true, outDir: 'compiled', rootDir: '.'}, files: ['test/logging-utils.ts']}));
  run(process.execPath, [compiler().path, '-p', path.join(temporary, 'tsconfig.json')]);
  const target = path.join(root, upstream ? 'scripts/consumers/node_modules/google-logging-utils' : 'packages/vgoogle-logging-utils');
  fs.mkdirSync(path.join(temporary, 'compiled/src'), {recursive: true});
  fs.writeFileSync(path.join(temporary, 'compiled/src/logging-utils.js'), 'module.exports=require(' + JSON.stringify(target) + ');');
  const env = {...process.env}; delete env.GOOGLE_SDK_NODE_LOGGING;
  console.log(run(process.execPath, [require.resolve('mocha/bin/mocha.js'), '--no-config', '--no-package', '--timeout', '10000', '--reporter', 'dot', 'compiled/test/logging-utils.js'], {cwd: temporary, env}));
} finally { fs.rmSync(temporary, {recursive: true, force: true}); }
