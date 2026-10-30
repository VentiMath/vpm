'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {createHash} = require('node:crypto'), {Module, createRequire} = require('node:module');
const fixture = createRequire(path.resolve(__dirname, '../retry-request-conformance/package.json'));
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
assert.equal(fixture('stream-events/package.json').version, '1.0.5');
assert.equal(fixture('stubs/package.json').version, '3.0.0');
assert.equal(fixture('duplexify/package.json').version, '4.1.3');
assert.equal(fs.readFileSync(fixture.resolve('stream-events'), 'utf8'), fs.readFileSync(path.join(__dirname, 'upstream/index.js'), 'utf8'));
for (const [variant, entry] of [['upstream', fixture.resolve('stream-events')], ['vpm', require.resolve('../../packages/vstream-events')]]) {
  console.log('stream-events 1.0.5 upstream tests against ' + variant);
  const source = fs.readFileSync(path.join(__dirname, 'upstream/test.js.txt'), 'utf8')
    .replace("require('./')", `require(${JSON.stringify(entry)})`)
    .replace("require('duplexify')", `require(${JSON.stringify(fixture.resolve('duplexify'))})`);
  const file = path.join(__dirname, variant + '.cjs');
  const mod = new Module(file, module); mod.filename = file; mod.paths = module.paths;
  // Upstream only logs failures; make its four test results enforce the gate.
  mod._compile(source + '\nassert.equal(tests.length, 4); assert.equal(tests.filter(test => test.fail).length, 0);\n', file);
}
for (const [lib, expected] of [[fixture('stream-events'), 2], [require('../../packages/vstream-events'), 1]]) {
  const {EventEmitter} = require('node:events');
  const s = Object.assign(new EventEmitter(), {_read() {return 42;}, _write() {}});
  let count = 0; s.on('reading', () => count++); lib(s); s._write();
  const result = s._read(); s._read();
  assert.equal(count, expected); assert.equal(result, expected === 2 ? true : 42);
}
console.log('Independent read/write counter and exact return-value regression controls passed.');
