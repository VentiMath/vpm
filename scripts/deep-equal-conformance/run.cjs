'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {createRequire} = require('node:module');
const local = createRequire(__filename);
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
const upstream = process.argv.includes('--upstream');
const target = path.resolve(__dirname, upstream ? 'node_modules/fast-deep-equal' : '../../packages/vfast-deep-equal');
const Mocha = require('mocha'), mocha = new Mocha({reporter: 'dot', timeout: 5000});
mocha.suite.emit('pre-require', globalThis, __filename, mocha);
for (const file of ['index.spec.js.txt', 'react.spec.js.txt']) {
  const filename = path.join(__dirname, 'upstream/spec', file);
  function req(name) {
    if (name === '..') return require(target);
    if (name.startsWith('../')) return require(path.join(target, name.slice(3)));
    if (name.startsWith('./')) return require(path.join(path.dirname(filename), name));
    return local(name);
  }
  new Function('require', fs.readFileSync(filename, 'utf8'))(req);
}
const runner = mocha.run(function(failures) {
  try {
    console.log(`${upstream ? 'Upstream' : 'VPM'} equality: ${runner.stats.passes} passed, ${runner.stats.pending} skipped, ${runner.stats.failures} failed.`);
    assert.equal(runner.stats.pending, 0);
    assert.equal(runner.stats.tests, 626);
    assert.equal(runner.stats.passes, 626);
    process.exitCode = failures ? 1 : 0;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
});
