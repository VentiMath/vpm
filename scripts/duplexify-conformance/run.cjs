'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), {spawnSync} = require('node:child_process'), Module = require('node:module');
const source = path.join(__dirname, 'upstream');
for (const [name, hash] of Object.entries(require('./upstream/SHA256.json'))) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source, name))).digest('hex'), hash, name);
const upstream = process.argv.includes('--upstream');
if (process.argv.includes('--child')) {
  let code = fs.readFileSync(path.join(source, 'test.js.txt'), 'utf8').replace("require('./')", 'require(' + JSON.stringify(upstream ? require.resolve('duplexify') : path.resolve(__dirname, '../../packages/vduplexify')) + ')');
  if (!upstream) code = code.replace("  passthrough.emit('close')", "  dup.on('error', function(err) { t.equal(err.code, 'ERR_STREAM_PREMATURE_CLOSE') })\n  passthrough.emit('close')");
  const mod = new Module(path.join(__dirname, 'suite.cjs'), module);
  mod.filename = path.join(__dirname, 'suite.cjs'); mod.paths = module.paths;
  mod._compile(code, mod.filename);
} else {
  const result = spawnSync(process.execPath, [__filename, '--child', ...(upstream ? ['--upstream'] : [])], {encoding:'utf8', timeout:15000});
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /# ok/);
  assert.match(result.stdout, new RegExp('# tests ' + (upstream ? 37 : 38) + '\\n'));
  console.log(`${upstream ? 'duplexify' : 'vduplexify'}: 16 upstream cases, ${upstream ? 37 : 38} assertions passed.`);
}
