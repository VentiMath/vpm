'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { test } = require('node:test');

test('both declaration forks account for every upstream file and record all modifications', () => {
  for (const name of ['vnode-types', 'vundici-types']) {
    const root = path.resolve(__dirname, '../../', name);
    const record = require(path.join(root, 'UPSTREAM.json'));
    assert.deepEqual(record.omitted, name === 'vnode-types'
      ? ['ts5.6/buffer.buffer.d.ts', 'ts5.6/globals.typedarray.d.ts', 'ts5.6/index.d.ts'] : []);
    const changed = [];
    for (const [file, hash] of Object.entries(record.sha256)) {
      if (record.omitted.includes(file)) {
        assert.ok(!fs.existsSync(path.join(root, file)), 'omitted file must not be shipped: ' + file);
        continue;
      }
      const text = fs.readFileSync(path.join(root, file), 'utf8');
      if (createHash('sha256').update(text).digest('hex') !== hash) changed.push(file);
      assert.doesNotMatch(text, /reference types="node"|(?:from |import\()["']undici-types["']/);
    }
    assert.deepEqual(changed, record.changed);
    assert.match(fs.readFileSync(path.join(root, 'LICENSE'), 'utf8'), /MIT License/);
    for (const added of record.added) assert.ok(fs.existsSync(path.join(root, added)));
  }
});
