'use strict';
// Runs functional-red-black-tree 1.0.1's unchanged tape suite. Only the
// `require('../rbtree.js')` entry is redirected (to VPM, or with --upstream to
// the installed original), so the suite's internal-node checks run as written.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), {createRequire} = require('node:module'), {spawnSync} = require('node:child_process');
const upstream = process.argv.includes('--upstream');
const target = upstream ? path.join(__dirname, 'node_modules/functional-red-black-tree/rbtree.js') : path.resolve(__dirname, '../../packages/vfunctional-red-black-tree');

if (process.argv.includes('--child')) {
  const local = createRequire(__filename), file = path.join(__dirname, 'upstream/test/test.js.txt');
  const req = name => name === '../rbtree.js' ? require(target) : local(name);
  new Function('require', fs.readFileSync(file, 'utf8'))(req);
} else {
  for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
  }
  assert.equal(require('./node_modules/functional-red-black-tree/package.json').version, '1.0.1');
  assert.equal(fs.readFileSync(path.join(__dirname, 'upstream/rbtree.js.txt'), 'utf8'), fs.readFileSync(path.join(__dirname, 'node_modules/functional-red-black-tree/rbtree.js'), 'utf8'));
  const result = spawnSync(process.execPath, [__filename, '--child', ...(upstream ? ['--upstream'] : [])], {encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024});
  assert.ifError(result.error);
  const count = name => Number(new RegExp('^# ' + name + ' +(\\d+)$', 'm').exec(result.stdout)?.[1] ?? 0);
  const failures = result.stdout.split('\n').filter(line => line.startsWith('not ok'));
  assert.equal(result.status, 0, failures.slice(0, 10).join('\n') + result.stderr);
  assert.deepEqual(failures, []);
  // tape 2 reports assertions, not test blocks: nine blocks, every assertion passing.
  assert.equal((result.stdout.match(/^# /gm) || []).length - 3, 9, 'upstream test blocks');
  assert.equal(count('fail'), 0);
  assert.equal(count('tests'), count('pass'));
  assert.equal(count('tests'), 25663);
  console.log(`${upstream ? 'Upstream' : 'VPM'} red-black tree suite: 9 unchanged upstream tests, ${count('pass')} assertions passed.`);
}
