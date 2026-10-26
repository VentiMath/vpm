'use strict';
const compare = require('../../../scripts/compare.cjs');
const etag = require('..');
const before = require('../test/fixtures/etag-1.8.1.cjs');
compare([
  ['empty', ['']],
  ['short ASCII', ['hello world', 'another small response']],
  ['1 KiB buffer', [Buffer.alloc(1024, 42)]],
  ['32 KiB Unicode', ['é🦊'.repeat(5461)]],
  ['file stat', [{ size: 12345, mtime: new Date(1000), ctime: new Date(1000), ino: 1 }]],
].map(([name, inputs]) => ({ name, inputs, before, after: etag })));
