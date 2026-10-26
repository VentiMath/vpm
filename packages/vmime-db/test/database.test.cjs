'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const db = require('..');
const raw = fs.readFileSync(path.join(__dirname, '../db.json'));
const source = JSON.parse(raw);
const provenance = require('../provenance.json');

test('the full data snapshot matches its recorded upstream digest and count', () => {
  assert.equal(createHash('sha256').update(raw).digest('hex'), provenance.sha256);
  assert.equal(provenance.sha256, '96b8a5746867c832ab56743c05e46e73c9facb04879677df0b356f20496cb6cd');
  assert.equal(Object.keys(db).length, provenance.entries);
  assert.deepEqual(JSON.parse(JSON.stringify(db)), source);
});

test('all records satisfy the published schema without invented defaults', () => {
  for (const [type, record] of Object.entries(db)) {
    assert.match(type, /^[!#$%&'*+\-.^_`|~0-9a-z]+\/[!#$%&'*+\-.^_`|~0-9a-z]+$/);
    for (const key of Object.keys(record)) assert.ok(['source', 'charset', 'compressible', 'extensions'].includes(key));
    if (record.source !== undefined) assert.ok(['iana', 'apache', 'nginx'].includes(record.source));
    if (record.charset !== undefined) assert.equal(typeof record.charset, 'string');
    if (record.compressible !== undefined) assert.equal(typeof record.compressible, 'boolean');
    if (record.extensions) {
      assert.equal(new Set(record.extensions).size, record.extensions.length);
      for (const extension of record.extensions) assert.match(extension, /^[a-z0-9_-]+$/);
    }
  }
});

test('database, records, and every extension list are frozen', () => {
  assert.ok(Object.isFrozen(db));
  for (const record of Object.values(db)) {
    assert.ok(Object.isFrozen(record));
    assert.equal(Object.getPrototypeOf(record), null);
    if (record.extensions) assert.ok(Object.isFrozen(record.extensions));
  }
  assert.throws(() => { db['text/html'] = {}; }, TypeError);
  assert.throws(() => { db['text/html'].charset = 'invalid'; }, TypeError);
  assert.throws(() => db['text/html'].extensions.push('invalid'), TypeError);
  assert.throws(() => { delete db['text/html']; }, TypeError);
  assert.equal(require('..')['text/html'].extensions[0], 'html');
});

test('missing keys and inherited-looking names are absent', () => {
  assert.equal(Object.getPrototypeOf(db), null);
  for (const key of ['constructor', '__proto__', 'toString', 'text/not-in-this-catalog']) assert.equal(db[key], undefined);
  for (const key of ['constructor', '__proto__', 'toString']) assert.equal(db['text/html'][key], undefined);
});

test('a consumer-owned copy can be customized without changing shared data', () => {
  const custom = { ...db['text/html'], extensions: [...db['text/html'].extensions] };
  custom.extensions.push('myhtml'); custom.charset = 'MY-CHARSET';
  assert.equal(db['text/html'].charset, undefined);
  assert.equal(db['text/html'].extensions.includes('myhtml'), false);
});
