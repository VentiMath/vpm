'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process'), path = require('node:path'), fs = require('node:fs');
const {createHash} = require('node:crypto');
const fixture = path.resolve(__dirname,'../../../scripts/radix-focus-scope-conformance');
for (const variant of ['upstream','vpm']) for (const version of ['19.1','19.2']) for (const mode of ['server','client']) {
  test(`${variant} React ${version} ${mode}`,()=>{
    const run = spawnSync(process.execPath,[path.join(fixture,'run.cjs'),variant,version,mode],{encoding:'utf8',timeout:30000});
    assert.ifError(run.error); assert.equal(run.status,0,run.stdout+run.stderr);
  });
}
test('pinned upstream source hashes',()=>{
  for (const [file,digest] of Object.entries(require('../PROVENANCE.json').sourceSHA256)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(fixture,'node_modules/@radix-ui/react-focus-scope',file))).digest('hex'),digest);
  }
});
