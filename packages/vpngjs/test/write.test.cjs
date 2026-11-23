'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), vm = require('node:vm'), fs = require('node:fs');
const {PNG} = require(process.env.VPM_PNG_ENTRY || '../index.cjs');
const upstream = require('../../../scripts/png-conformance/node_modules/pngjs').PNG;
const {chunks} = require('../../../scripts/png-conformance/binary.cjs');
const {inflateSync, crc32} = require('node:zlib');

test('unchanged historical-contest fixture: construct, fill, write and validate', () => {
  const png = new PNG({width: 4, height: 3});
  assert(png instanceof PNG); assert(Buffer.isBuffer(png.data));
  assert.deepEqual([...png.data], Array(48).fill(0));
  png.data.fill(255);
  const bytes = PNG.sync.write(png), old = new upstream({width: 4, height: 3}); old.data.fill(255);
  assert(Buffer.isBuffer(bytes));
  assert.deepEqual(PNG.sync.read(bytes), upstream.sync.read(upstream.sync.write(old)));
  const corrupt = Buffer.from(bytes); corrupt[corrupt.length - 8] ^= 1;
  assert.throws(() => PNG.sync.read(corrupt));
});

test('mixed RGBA, transparent pixels, gamma, sliced and other-realm bytes', () => {
  let seed = 0x12345678;
  for (let i = 1; i <= 192; i++) {
    const width = i % 31 + 1, height = i % 17 + 1;
    const source = Buffer.alloc(width * height * 4 + 12, 77), view = source.subarray(5, -7);
    for (let n = 0; n < view.length; n++) {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; view[n] = seed >>> 24;}
    const data = i % 2 ? view : vm.runInNewContext('new Uint8Array(buffer, offset, length)', {buffer: source.buffer, offset: view.byteOffset, length: view.length});
    const before = Buffer.from(source), gamma = i % 3 ? 0 : 0.45455;
    const input = {width, height, data, gamma}, encoded = PNG.sync.write(input);
    const decoded = PNG.sync.read(encoded);
    assert.deepEqual(decoded, upstream.sync.read(encoded));
    assert.deepEqual(decoded, upstream.sync.read(upstream.sync.write(input)));
    assert.deepEqual(decoded.data, view); assert.deepEqual(source, before);
    const pieces = chunks(encoded);
    assert.deepEqual(pieces.map(p => p.type), gamma ? ['IHDR','gAMA','IDAT','IEND'] : ['IHDR','IDAT','IEND']);
    assert.equal(inflateSync(pieces.find(p => p.type === 'IDAT').data).length, height * (width * 4 + 1));
    // CRC independently checked on every emitted chunk.
    for (let at = 8; at < encoded.length;) {
      const size = encoded.readUInt32BE(at), end = at + size + 8;
      assert.equal(encoded.readUInt32BE(end), crc32(encoded.subarray(at + 4, end))); at = end + 4;
    }
  }
});

test('normalized images from every valid reader corpus file can be written without pixel loss', () => {
  const directory = path.resolve(__dirname, '../../../scripts/png-conformance/images');
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.png') && !name.startsWith('x'))) {
    const image = PNG.sync.read(fs.readFileSync(path.join(directory, name)));
    const encoded = PNG.sync.write(image), actual = upstream.sync.read(encoded);
    assert.equal(actual.width, image.width, name); assert.equal(actual.height, image.height, name);
    assert.deepEqual(actual.data, image.data, name); assert.equal(actual.gamma, image.gamma, name);
    assert.deepEqual(PNG.sync.read(encoded), actual, name);
  }
});

test('owned zero-filled allocation and output never alias previous calls', () => {
  const a = new PNG({width: 2, height: 2}), b = new PNG({width: 2, height: 2});
  a.data.fill(91); assert.equal(b.data[0], 0);
  const first = PNG.sync.write(a), retained = Buffer.from(first), second = PNG.sync.write(a);
  second.fill(0); assert.deepEqual(first, retained); assert.equal(a.data[0], 91);
});

test('bounds, dimensions and exact RGBA length are checked before allocation or compression', () => {
  for (const value of [undefined, null, 0, -1, 1.5, NaN, Infinity, '4', 0x80000000])
    for (const key of ['width', 'height']) {
      const dimensions = {width: 4, height: 3, [key]: value};
      assert.throws(() => new PNG(dimensions));
      assert.throws(() => PNG.sync.write({...dimensions, data: Buffer.alloc(48)}));
    }
  assert.throws(() => new PNG({width: 4001, height: 4000}), /maxPixels/);
  assert.throws(() => new PNG({width: 4, height: 3, maxPixels: 11}), /maxPixels/);
  const p = new PNG({width: 4, height: 3, maxPixels: 12});
  assert.throws(() => PNG.sync.write(p, {maxPixels: 11}), /maxPixels/);
  assert.doesNotThrow(() => PNG.sync.write(p, {maxPixels: 12}));
  for (const data of [Buffer.alloc(47), Buffer.alloc(49), new Uint16Array(24), [], null])
    assert.throws(() => PNG.sync.write({...p, data}), /RGBA8/);
  for (const key of ['maxPixels', 'maxBytes']) for (const value of [0, -1, 1.5, NaN, Infinity, '100', 0x80000000])
    assert.throws(() => PNG.sync.write(p, {[key]: value}), RangeError);
  const encoded = PNG.sync.write(p);
  assert.equal(PNG.sync.write(p, {maxBytes: encoded.length}).length, encoded.length);
  assert.throws(() => PNG.sync.write(p, {maxBytes: encoded.length - 1}));
  assert.throws(() => PNG.sync.write(p, {maxBytes: 57}), /maxBytes/);
});

test('unsupported modes and invalid gamma fail explicitly', () => {
  const p = new PNG({width: 1, height: 1});
  for (const key of ['colorType', 'inputColorType', 'bitDepth', 'filterType', 'deflateLevel', 'skipRescale'])
    assert.throws(() => PNG.sync.write(p, {[key]: 0}), /Unsupported/);
  assert.throws(() => new PNG({width: 1, height: 1, fill: false}), /Unsupported/);
  for (const value of [null, [], 'options', 1]) {
    assert.throws(() => new PNG(value)); assert.throws(() => PNG.sync.write(p, value));
  }
  for (const gamma of [-1, NaN, Infinity, '1', null, 1e-10, 50000])
    assert.throws(() => PNG.sync.write({...p, gamma}), /gamma/);
  assert.throws(() => PNG.sync.write(null), /object/);
  assert.equal(p.pack, undefined); assert.equal(p.parse, undefined);
});
