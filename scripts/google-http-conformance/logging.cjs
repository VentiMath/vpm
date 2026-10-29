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
  for (const version of ['0.0.2', '2.1.1']) {
    const directory = path.join(temporary, version);
    fs.mkdirSync(directory);
    if (version === '0.0.2') {
      const archive = path.join(__dirname, 'google-logging-utils-0.0.2.tar.gz');
      assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), '245e6d31a4120caac33eda25fad7fa46377393d6134989bea1657028c7e17a54');
      run('tar', ['-xzf', archive, '--strip-components=2', '-C', directory, 'gax-nodejs-511df04ec5064070adb173b9b8d84056cf7b1758/logging-utils']);
      if (!upstream) {
        // Latest stable explicitly enables a selected backend without the flag.
        const file = path.join(directory, 'test/logging-utils.ts');
        const source = fs.readFileSync(file, 'utf8'), old = 'assert.deepStrictEqual(sink.logs, []);';
        assert.equal(source.split(old).length, 2);
        fs.writeFileSync(file, source.replace(old, "assert.deepStrictEqual(sink.logs, [{namespace: system, fields: {}, args: ['foo']}]);"));
      }
    } else {
      const source = fs.readFileSync(path.join(__dirname, 'logging-2.1.1/logging-utils.ts'));
      assert.equal(createHash('sha256').update(source).digest('hex'), '7d43f30fa295671b9911a52da7d71b900749c4e47e4f18f1f39d8c3dde87f71e');
      fs.mkdirSync(path.join(directory, 'test'));
      fs.writeFileSync(path.join(directory, 'test/logging-utils.ts'), source);
    }
    fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
    fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({compilerOptions: {target: 'ES2022', module: 'CommonJS', noCheck: true, noResolve: true, outDir: 'compiled', rootDir: '.'}, files: ['test/logging-utils.ts']}));
    run(process.execPath, [compiler().path, '-p', path.join(directory, 'tsconfig.json')]);
    const control = version === '0.0.2' ? 'scripts/consumers/node_modules/google-logging-utils' : 'scripts/google-http-conformance/node_modules/google-logging-utils';
    const target = path.join(root, upstream ? control : 'packages/vgoogle-logging-utils');
    if (upstream) assert.equal(require(path.join(target, 'package.json')).version, version);
    fs.mkdirSync(path.join(directory, 'compiled/src'), {recursive: true});
    const entry = version === '0.0.2' ? 'logging-utils.js' : 'index.js';
    fs.writeFileSync(path.join(directory, 'compiled/src', entry), 'module.exports=require(' + JSON.stringify(target) + ');');
    const env = {...process.env}; delete env.GOOGLE_SDK_NODE_LOGGING;
    console.log('google-logging-utils ' + version + (upstream ? ' upstream control' : ' VPM'));
    console.log(run(process.execPath, [require.resolve('mocha/bin/mocha.js'), '--no-config', '--no-package', '--timeout', '10000', '--reporter', 'dot', 'compiled/test/logging-utils.js'], {cwd: directory, env}));
  }
} finally { fs.rmSync(temporary, {recursive: true, force: true}); }
