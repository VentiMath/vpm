'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const {spawnSync} = require('node:child_process');

if (!process.argv.includes('--child')) {
    const outcomes = [];
    for (const variant of ['upstream', 'vpm']) {
        const run = spawnSync(process.execPath, [__filename, '--child', variant], {encoding: 'utf8', timeout: 30000});
        assert.equal(run.status, 0, run.stderr || run.stdout);
        outcomes.push(JSON.parse(run.stdout));
    }
    assert.deepEqual(outcomes[1], outcomes[0]);
    console.log('CRC32C: 260 vector lengths, five chunkings, resumed seeds and files match the bitwise reference; table isolation, numeric bounds and sliced-view controls pass.');
} else (async () => {
    const original = process.argv.at(-1) === 'upstream';
    const library = require(original ? './node_modules/@google-cloud/storage' : '../../packages/vgoogle-cloud-storage');
    const {CRC32C, CRC32C_EXTENSION_TABLE, CRC32C_EXTENSIONS, CRC32C_DEFAULT_VALIDATOR_GENERATOR} = library;
    function reference(bytes, seed = 0) {
        let crc = seed ^ -1;
        for (const byte of bytes) {
            crc ^= byte & 255;
            for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0x82f63b78 : 0);
        }
        return crc ^ -1;
    }
    const values = [];
    for (const length of [...Array.from({length: 257}, (_, i) => i), 1023, 1024, 65536]) {
        const storage = Buffer.alloc(length + 9);
        for (let i = 0; i < storage.length; i++) storage[i] = (i * 73 + length * 19) & 255;
        const bytes = storage.subarray(3, length + 3), expected = reference(bytes), before = Buffer.from(storage);
        for (const step of [1, 7, 8, 19, length || 1]) {
            const crc = new CRC32C();
            for (let offset = 0; offset < length; offset += step) crc.update(bytes.subarray(offset, offset + step));
            assert.equal(crc.valueOf(), expected);
            assert.equal(crc.toBuffer().readInt32BE(), expected);
            assert.ok(crc.validate(expected));
            assert.ok(crc.validate(crc.toString()));
            assert.ok(crc.validate(crc.toBuffer()));
            assert.ok(crc.validate({toString: () => crc.toString()}));
            assert.equal(crc.validate(Buffer.alloc(3)), false);
        }
        assert.deepEqual(storage, before);
        const half = Math.floor(length / 2), resumed = CRC32C.from(reference(bytes.subarray(0, half)));
        resumed.update(bytes.subarray(half)); assert.equal(resumed.valueOf(), expected);
        values.push(expected);
    }
    const known = new CRC32C(); known.update(Buffer.from('123456789'));
    assert.equal(known.valueOf() >>> 0, 0xe3069283);
    assert.equal(JSON.stringify(known), JSON.stringify(known.toString()));
    assert.notEqual(CRC32C_DEFAULT_VALIDATOR_GENERATOR(), CRC32C_DEFAULT_VALIDATOR_GENERATOR());
    assert.equal(CRC32C.CRC32C_EXTENSION_TABLE, CRC32C_EXTENSION_TABLE);
    assert.equal(CRC32C.CRC32C_EXTENSIONS, CRC32C_EXTENSIONS);
    for (const value of ['rth90Q==', 'rth90Q', ' rth90Q==\n']) assert.equal(CRC32C.from(value).toString(), 'rth90Q==');
    for (const input of ['', Buffer.alloc(3), Buffer.alloc(5)]) assert.throws(() => CRC32C.from(input), RangeError);

    const backing = Uint8Array.from([99, 99, 0x12, 0x34, 0x56, 0x78, 99]);
    for (const view of [backing.subarray(2, 6), new DataView(backing.buffer, 2, 4)]) {
        if (original) assert.throws(() => CRC32C.from(view), RangeError);
        else assert.equal(CRC32C.from(view).toString(), 'EjRWeA==');
    }
    const foreign = require('node:vm').runInNewContext('new Uint8Array([0x12,0x34,0x56,0x78])');
    assert.equal(CRC32C.from(foreign).toString(), 'EjRWeA==');
    assert.equal(CRC32C.from(foreign.buffer).toString(), 'EjRWeA==');

    for (const input of [0x80000000, 0xffffffff]) {
        const crc = CRC32C.from(input);
        if (original) assert.throws(() => crc.toBuffer(), RangeError);
        else {
            assert.equal(crc.valueOf(), input | 0);
            assert.equal(crc.toBuffer().readInt32BE(), input | 0);
            assert.ok(crc.validate(input));
            assert.ok(crc.validate(input | 0));
        }
    }
    for (const input of [-0x80000001, 0x100000000, -0x100000000]) {
        if (original) assert.throws(() => CRC32C.from(input).toBuffer(), RangeError);
        else assert.throws(() => CRC32C.from(input), RangeError);
    }
    if (!original) for (const input of [NaN, Infinity, 0.5, '1']) assert.throws(() => new CRC32C(input), RangeError);

    const oldTable = new Int32Array(CRC32C_EXTENSION_TABLE), originalTable = CRC32C.CRC32C_EXTENSION_TABLE;
    try {
        CRC32C_EXTENSION_TABLE.fill(0);
        let crc = new CRC32C(); crc.update(Buffer.from('123456789'));
        assert.equal(crc.valueOf() === known.valueOf(), !original);
        CRC32C_EXTENSION_TABLE.set(oldTable);
        CRC32C.CRC32C_EXTENSION_TABLE = new Int32Array(256);
        crc = new CRC32C(); crc.update(Buffer.from('123456789'));
        assert.equal(crc.valueOf() === known.valueOf(), !original);
    } finally {CRC32C_EXTENSION_TABLE.set(oldTable); CRC32C.CRC32C_EXTENSION_TABLE = originalTable;}

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-crc32c-'));
    try {
        const file = path.join(directory, 'fixture.bin'), bytes = Buffer.alloc(196608);
        for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 83 + 11) & 255;
        fs.writeFileSync(file, bytes);
        const crc = await CRC32C.fromFile(file);
        assert.equal(crc.valueOf(), reference(bytes));
        await assert.rejects(CRC32C.fromFile(path.join(directory, 'missing')), error => error.code === 'ENOENT');
        values.push(crc.valueOf());
    } finally {fs.rmSync(directory, {recursive: true, force: true});}
    process.stdout.write(JSON.stringify(values));
})().catch(error => {console.error(error); process.exitCode = 1;});
