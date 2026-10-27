'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const iconv = require('..');
const upstream = require('./upstream.cjs');
upstream.getCodec('utf8');
const names = Object.keys(upstream.encodings).filter(name => !name.startsWith('_') && upstream.encodingExists(name));
const text = 'Hello\0 café Ελληνικά 中文 日本語 한글 💩 Ê̄';
function decodeChunks(api, encoding, chunks, options) {
  const decoder = api.getDecoder(encoding, options);
  return chunks.map(chunk => decoder.write(chunk)).join('') + (decoder.end() || '');
}
function encodeChunks(api, encoding, chunks, options) {
  const encoder = api.getEncoder(encoding, options);
  return Buffer.concat([...chunks.map(chunk => encoder.write(chunk)), encoder.end() || Buffer.alloc(0)]);
}
function collect(stream, chunks) {
  return new Promise((resolve, reject) => {
    stream.collect((error, result) => error ? reject(error) : resolve(result));
    for (const chunk of chunks) stream.write(chunk);
    stream.end();
  });
}

test('upstream fixtures and every retained data table have verified provenance', () => {
  const root = path.join(__dirname, '..');
  const provenance = require('../PROVENANCE.json');
  const baseline = require('./fixtures/UPSTREAM.json');
  for (const [file, digest] of Object.entries(baseline.files)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'fixtures', file))).digest('hex'), digest, file);
  }
  for (const [file, record] of Object.entries(provenance.files)) {
    const digest = createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    assert.equal(digest, record.sha256, file);
    if (file.startsWith('encodings/tables/') || /(?:-data(?:-generated)?\.js|types\/encodings\.d\.ts)$/.test(file)) assert.equal(digest, record.upstreamSha256, file);
  }
  assert.equal(require('../package.json').dependencies, undefined);
});

test('every supported upstream encoding and alias preserves ordinary conversions', () => {
  assert.ok(names.length > 400);
  for (const encoding of names) {
    assert.equal(iconv.encodingExists(encoding), true, encoding);
    for (const input of ['', 'ASCII \r\n 123', text]) {
      const encoded = upstream.encode(input, encoding);
      assert.deepEqual(iconv.encode(input, encoding), encoded, encoding);
      assert.equal(iconv.decode(encoded, encoding), upstream.decode(encoded, encoding), encoding);
    }
  }
});

test('all single-byte tables agree for every byte and UTF-16 code unit', () => {
  const seen = new Set();
  const bytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  let chars = '';
  for (let i = 0; i < 65536; i++) chars += String.fromCharCode(i);
  for (const encoding of names) {
    const codec = upstream.getCodec(encoding);
    if (!codec.decodeBuf || seen.has(codec)) continue;
    seen.add(codec);
    assert.equal(iconv.decode(bytes, encoding), upstream.decode(bytes, encoding), encoding);
    assert.deepEqual(iconv.encode(chars, encoding), upstream.encode(chars, encoding), encoding);
  }
  assert.ok(seen.size > 50);
});

test('multibyte tables agree for a corpus containing every pair of bytes', () => {
  const bytes = Buffer.alloc(65536 * 2);
  for (let i = 0; i < 65536; i++) { bytes[i * 2] = i >> 8; bytes[i * 2 + 1] = i & 255; }
  for (const encoding of ['shiftjis', 'eucjp', 'gbk', 'gb18030', 'cp949', 'cp950', 'big5hkscs']) {
    assert.equal(iconv.decode(bytes, encoding), upstream.decode(bytes, encoding), encoding);
  }
});

test('multibyte decoding retains pending output at every split and one-byte chunks', () => {
  for (const encoding of ['gb18030', 'big5hkscs', 'shiftjis', 'eucjp', 'cp949', 'utf8', 'utf16le', 'utf16be', 'utf32le', 'utf32be', 'cesu8', 'utf7', 'utf7imap']) {
    const bytes = iconv.encode(text, encoding), expected = iconv.decode(bytes, encoding);
    for (let split = 0; split <= bytes.length; split++) {
      assert.equal(decodeChunks(iconv, encoding, [bytes.subarray(0, split), Buffer.alloc(0), bytes.subarray(split)]), expected, encoding + ':' + split);
    }
    assert.equal(decodeChunks(iconv, encoding, Array.from(bytes, byte => Buffer.from([byte]))), expected, encoding);
  }
  const gb = Buffer.from('9439da33', 'hex');
  assert.equal(decodeChunks(upstream, 'gb18030', [gb.subarray(0, 3), gb.subarray(3)]), '\ud83d');
  assert.equal(decodeChunks(iconv, 'gb18030', [gb.subarray(0, 3), gb.subarray(3)]), '💩');
  assert.equal(decodeChunks(upstream, 'big5hkscs', [Buffer.from([0x88]), Buffer.from([0x62])]), 'Ê');
  assert.equal(decodeChunks(iconv, 'big5hkscs', [Buffer.from([0x88]), Buffer.from([0x62])]), 'Ê̄');
  for (const [encoding, marker] of [['utf7', '+'], ['utf7imap', '&']]) {
    const chunks = [Buffer.from(marker + 'AAA'), Buffer.from('-')];
    assert.equal(decodeChunks(upstream, encoding, chunks), marker);
    assert.equal(decodeChunks(iconv, encoding, chunks), '\0');
    assert.equal(decodeChunks(iconv, encoding, [Buffer.from(marker), Buffer.from('-')]), marker);
  }
});

test('pending encoder state cannot truncate the next chunk', () => {
  for (const encoding of ['gb18030', 'gbk', 'big5hkscs', 'shiftjis', 'utf8', 'utf16be', 'utf32be', 'utf32le', 'cesu8']) {
    for (const input of [text, 'Ê漢', '\ud800\u0080', '💩\ud800x\udfff']) {
      const expected = iconv.encode(input, encoding);
      for (let split = 0; split <= input.length; split++) {
        assert.deepEqual(encodeChunks(iconv, encoding, [input.slice(0, split), '', input.slice(split)]), expected, encoding + ':' + split);
      }
    }
  }
  assert.notDeepEqual(encodeChunks(upstream, 'gb18030', ['\ud800', '\u0080']), upstream.encode('\ud800\u0080', 'gb18030'));
});

test('generated malformed chunks agree with whole-buffer decoding', () => {
  let seed = 981789;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (const encoding of ['gb18030', 'big5hkscs', 'shiftjis', 'eucjp', 'utf8', 'utf16be', 'utf32be', 'cesu8']) {
    for (let i = 0; i < 400; i++) {
      const bytes = Buffer.from(Array.from({ length: 1 + next() % 40 }, () => next() >>> 24));
      const split = next() % bytes.length;
      assert.equal(decodeChunks(iconv, encoding, [bytes.subarray(0, split), bytes.subarray(split)]), iconv.decode(bytes, encoding), encoding + ':' + bytes.toString('hex'));
    }
  }
});

test('CESU-8 truncation emits one replacement and resets pending state', () => {
  assert.equal(upstream.decode(Buffer.from([0xe2]), 'cesu8'), '0�');
  for (const bytes of [[0xc2], [0xe2], [0xe2, 0x82]]) {
    const decoder = iconv.getDecoder('cesu8');
    assert.equal(decoder.write(Buffer.from(bytes)), '');
    assert.equal(decoder.end(), '�');
    assert.equal(decoder.end(), '');
  }
  assert.equal(iconv.decode(Buffer.from([0xc0, 0x80]), 'cesu8'), '\0');
  assert.equal(iconv.decode(Buffer.from([0xc0, 0x81]), 'cesu8'), '�');
});

test('UTF-16BE buffers a split surrogate until its pair arrives', () => {
  const decoder = iconv.getDecoder('utf16be');
  assert.equal(decoder.write(Buffer.from('d83d', 'hex')), '');
  assert.equal(decoder.write(Buffer.from('dca9', 'hex')), '💩');
  assert.equal(decoder.end(), '');
});

test('BOM behavior, callbacks and automatic endianness survive every byte split', () => {
  for (const encoding of ['utf8', 'utf16le', 'utf16be', 'utf32le', 'utf32be', 'cesu8', 'utf16', 'utf32']) {
    const bytes = iconv.encode('Hello 💩', encoding, Object.freeze({ addBOM: true }));
    assert.deepEqual(bytes, upstream.encode('Hello 💩', encoding, { addBOM: true }));
    for (let split = 0; split <= bytes.length; split++) {
      let stripped = 0;
      assert.equal(decodeChunks(iconv, encoding, [bytes.subarray(0, split), bytes.subarray(split)], { stripBOM() { stripped++; } }), 'Hello 💩', encoding);
      assert.equal(stripped, 1, encoding);
    }
    assert.equal(iconv.decode(bytes, encoding, { stripBOM: false }), '\ufeffHello 💩', encoding);
  }
});

test('automatic detectors own pending bytes and ignore empty chunks', () => {
  for (const encoding of ['utf16', 'utf32']) {
    const bytes = iconv.encode('A', encoding);
    const expected = iconv.decode(bytes, encoding);
    const decoder = iconv.getDecoder(encoding);
    assert.equal(decoder.write(bytes), '');
    bytes.fill(0);
    for (let i = 0; i < 100; i++) assert.equal(decoder.write(Buffer.alloc(0)), '');
    assert.equal(decoder.initialBufs.length, 1);
    assert.equal(decoder.end(), expected);
  }
});

test('frozen and subsequently changed options cannot change an in-flight conversion', () => {
  for (const encoding of ['utf16', 'utf32']) {
    assert.deepEqual(iconv.encode('a', encoding, Object.freeze({})), upstream.encode('a', encoding, {}));
    const options = { stripBOM: true };
    const decoder = iconv.getDecoder(encoding, options);
    options.stripBOM = false;
    assert.equal(decoder.write(iconv.encode('a', encoding)) + (decoder.end() || ''), 'a');
  }
  const inherited = Object.create({ addBOM: true });
  assert.equal(iconv.encode('a', 'utf8', inherited).toString('hex'), '61');
});

test('public inputs and options reject coercion and recursive defaults', () => {
  const hostile = { toString() { throw new Error('coercion'); } };
  for (const value of [0, null, undefined, {}, hostile]) {
    assert.throws(() => iconv.encode(value, 'utf8'), TypeError);
    assert.throws(() => iconv.getCodec(value), TypeError);
    assert.equal(iconv.encodingExists(value), false);
  }
  for (const value of ['abc', [], {}, null, new DataView(new ArrayBuffer(4))]) assert.throws(() => iconv.decode(value, 'utf8'), TypeError);
  for (const options of [true, [], { addBOM: 'yes' }, { stripBOM: 0 }, { defaultEncoding: 'utf32' }, { defaultEncoding: 'utf16be\n' }]) {
    assert.throws(() => iconv.getEncoder('utf32', options), TypeError);
  }
  const bytes = Uint8Array.from([1, 0x61, 2]);
  assert.equal(iconv.decode(bytes.subarray(1, 2), 'utf8'), 'a');
  assert.equal(iconv.encodingExists('constructor'), false);
});

test('custom aliases remain supported, cache resolved aliases, and reject cycles', () => {
  assert.equal(iconv.getCodec('UTF-16LE'), iconv.getCodec('ucs2'));
  assert.equal(iconv._codecDataCache.utf16le, iconv._codecDataCache.ucs2);
  iconv.encodings.vtesta = 'vtestb'; iconv.encodings.vtestb = 'vtesta';
  try { assert.throws(() => iconv.getCodec('vtesta'), /Cyclic/); }
  finally { delete iconv.encodings.vtesta; delete iconv.encodings.vtestb; }
});

test('stream encoders and decoders preserve output, frozen options, and backpressure', async () => {
  for (const encoding of ['utf8', 'utf16be', 'utf16', 'utf32', 'gb18030', 'big5hkscs', 'windows1251', 'utf7imap']) {
    const options = Object.freeze({ highWaterMark: 1 });
    const encoded = await collect(iconv.encodeStream(encoding, options), [text.slice(0, 4), text.slice(4)]);
    assert.deepEqual(encoded, iconv.encode(text, encoding));
    const decoded = await collect(iconv.decodeStream(encoding, options), Array.from(encoded, byte => Buffer.from([byte])));
    assert.equal(decoded, iconv.decode(encoded, encoding));
    assert.deepEqual(options, { highWaterMark: 1 });
  }
  const output = [];
  const stream = Readable.from(['a', '💩']).pipe(iconv.encodeStream('utf16be')).pipe(iconv.decodeStream('utf16be'));
  for await (const chunk of stream) output.push(chunk);
  assert.equal(output.join(''), 'a💩');
  const backpressure = iconv.encodeStream('utf8', { readableHighWaterMark: 1, writableHighWaterMark: 1 });
  assert.equal(backpressure.write('abc'), false);
  assert.equal((await collect(backpressure, ['def'])).toString(), 'abcdef');
  const bytes = await collect(iconv.encodeStream('utf32', { defaultEncoding: 'utf-32be' }), ['Hello']);
  assert.deepEqual(bytes, iconv.encode('Hello', 'utf32be', { addBOM: true }));
  assert.equal(await collect(iconv.decodeStream('utf16', { defaultEncoding: 'utf-16be' }), [Buffer.from([0, 0])]), '\0');
});

test('collect completes once and releases its listeners on success, error and early close', async () => {
  for (const outcome of ['success', 'error', 'close']) {
    const stream = iconv.decodeStream('utf8');
    let calls = 0;
    await new Promise((resolve, reject) => {
      stream.collect((error, result) => {
        calls++;
        try {
          if (outcome === 'success') { assert.equal(error, null); assert.equal(result, 'ok'); }
          else assert.ok(error);
          assert.equal(stream.listenerCount('data'), 0);
          resolve();
        } catch (failure) { reject(failure); }
      });
      if (outcome === 'success') stream.end(Buffer.from('ok'));
      else stream.destroy(outcome === 'error' ? new Error('broken') : undefined);
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    for (const event of ['error', 'end', 'close']) assert.equal(stream.listenerCount(event), 0, event);
  }
});

test('stream conversion errors reach collect and invalid collectors fail explicitly', async () => {
  await assert.rejects(collect(iconv.encodeStream('utf8'), [Buffer.from('no')]), /strings/);
  await assert.rejects(collect(iconv.decodeStream('utf8', { decodeStrings: false }), ['no']), /buffers/);
  const stream = iconv.encodeStream('utf8');
  assert.throws(() => stream.collect(null), TypeError); stream.destroy();
  const encoded = await collect(iconv.encodeStream('utf8', { encoding: 'ascii' }), ['💩']);
  assert.ok(Buffer.isBuffer(encoded)); assert.equal(encoded.toString(), '💩');
});

test('CommonJS and ESM expose equivalent conversion APIs and aliases', async () => {
  const esm = await import('../index.js');
  assert.equal(esm.default, iconv);
  for (const name of ['encode', 'decode', 'encodingExists', 'getCodec', 'getEncoder', 'getDecoder', 'encodeStream', 'decodeStream', 'enableStreamingAPI', 'IconvLiteEncoderStream', 'IconvLiteDecoderStream']) assert.equal(esm[name], iconv[name]);
  assert.equal(iconv.toEncoding, iconv.encode); assert.equal(iconv.fromEncoding, iconv.decode);
  assert.equal(iconv.supportsStreams, true);
});
