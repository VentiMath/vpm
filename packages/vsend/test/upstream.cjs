'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const fixture = { exports: {} };
const file = path.join(__dirname, 'fixtures/send-1.2.1.cjs');
// Isolate send's own decisions using the same VPM primitives on both sides.
// An optional integration script separately exercises the installed upstream stack.
const dependencies = Object.fromEntries(Object.entries({
  'http-errors': 'vhttp-errors', debug: 'vdebug', encodeurl: 'vencodeurl', 'escape-html': 'vescape-html',
  etag: 'vetag', fresh: 'vfresh', 'mime-types': 'vmime-types', ms: 'vms', 'on-finished': 'von-finished',
  'range-parser': 'vrange-parser', statuses: 'vstatuses',
}).map(([name, target]) => [name, require(target)]));
for (const name of ['fs', 'path', 'stream', 'util']) dependencies[name] = require('node:' + name);
vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
  if (!Object.hasOwn(dependencies, name)) throw new Error('Unexpected dependency: ' + name);
  return dependencies[name];
}, fixture, fixture.exports);
module.exports = fixture.exports;
