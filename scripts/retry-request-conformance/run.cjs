'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), {Module} = require('node:module'), {spawnSync} = require('node:child_process');
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
const variant = process.argv.find(arg => arg.startsWith('--variant='))?.split('=')[1];
if (!variant) {
  for (const variant of ['upstream', 'vpm']) {
    const result = spawnSync(process.execPath, [__filename, '--variant=' + variant], {stdio: 'inherit'});
    if (result.status !== 0) process.exit(result.status || 1);
  }
} else {
  const entry = variant === 'upstream' ? require.resolve('retry-request') : require.resolve('../../packages/vretry-request');
  // Test source is immutable; only select which implementation ./index.js means.
  const source = fs.readFileSync(path.join(__dirname, 'upstream/test.js.txt'), 'utf8')
    .replace("require('./index.js')", `require(${JSON.stringify(entry)})`)
    // Bun closeAllConnections can also stop its listener. Accept only that
    // already-closed cleanup result, on both implementations and runtimes.
    .replace('server.close(done);', "server.close(error => done(error?.code === 'ERR_SERVER_NOT_RUNNING' ? undefined : error));");
  const Mocha = require('mocha');
  const mocha = new Mocha({timeout: 30000, reporter: 'spec'});
  console.log('retry-request 9.1.0 upstream tests against ' + variant);
  const file = path.join(__dirname, 'upstream-tests.cjs');
  mocha.suite.emit('pre-require', globalThis, file, mocha);
  const mod = new Module(file, module); mod.filename = file; mod.paths = module.paths;
  mod._compile(source, file);
  mocha.suite.emit('post-require', globalThis, file, mocha);
  mocha.run(failures => { process.exitCode = failures ? 1 : 0; });
}
