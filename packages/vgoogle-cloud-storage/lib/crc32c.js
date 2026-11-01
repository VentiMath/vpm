"use strict";
// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, '__esModule', {value: true});

const {createReadStream} = require('node:fs');
// Reflected Castagnoli polynomial. Derive byte-position tables once; public
// inspection tables are copies, never the state used by a running checksum.
const polynomial = 0x82f63b78;
const tables = Array.from({length: 8}, () => new Int32Array(256));
for (let byte = 0; byte < 256; byte++) {
    let value = byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? polynomial : 0);
    tables[0][byte] = value;
}
for (let byte = 0; byte < 256; byte++) {
    let value = tables[0][byte];
    for (let position = 1; position < 8; position++) {
        value = tables[0][value & 255] ^ (value >>> 8);
        tables[position][byte] = value;
    }
}
const [t0, t1, t2, t3, t4, t5, t6, t7] = tables;
const CRC32C_EXTENSIONS = Object.freeze(Array.from(t0, value => value >>> 0));
const CRC32C_EXTENSION_TABLE = new Int32Array(t0);
const CRC32C_EXCEPTION_MESSAGES = Object.freeze({
    INVALID_INIT_BASE64_RANGE: length => `base64-encoded data expected to equal 4 bytes, not ${length}`,
    INVALID_INIT_BUFFER_LENGTH: length => `Buffer expected to equal 4 bytes, not ${length}`,
    INVALID_INIT_INTEGER: value => `Number expected to be a safe, unsigned 32-bit integer, not ${value}`,
});
const validNumber = value => Number.isInteger(value) && value >= -0x80000000 && value <= 0xffffffff;

class CRC32C {
    #value;
    constructor(initialValue = 0) {
        if (!validNumber(initialValue)) throw new RangeError(CRC32C_EXCEPTION_MESSAGES.INVALID_INIT_INTEGER(initialValue));
        this.#value = initialValue | 0;
    }
    update(input) {
        let crc = this.#value ^ -1;
        const bytes = Buffer.isBuffer(input) || input instanceof Uint8Array ? input : undefined;
        if (bytes) {
            let i = 0;
            const end = bytes.length - 7;
            for (; i < end; i += 8) {
                const first = crc ^ (bytes[i] | bytes[i + 1] << 8 | bytes[i + 2] << 16 | bytes[i + 3] << 24);
                crc = t7[first & 255] ^ t6[(first >>> 8) & 255] ^ t5[(first >>> 16) & 255] ^ t4[first >>> 24]
                    ^ t3[bytes[i + 4]] ^ t2[bytes[i + 5]] ^ t1[bytes[i + 6]] ^ t0[bytes[i + 7]];
            }
            for (; i < bytes.length; i++) crc = t0[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
        } else {
            // Preserve the old iterable input path; the public contract uses bytes.
            for (const byte of input) crc = t0[(crc ^ byte) & 255] ^ (crc >>> 8);
        }
        this.#value = crc ^ -1;
    }
    valueOf() {return this.#value;}
    toBuffer() {const result = Buffer.allocUnsafe(4); result.writeInt32BE(this.#value); return result;}
    toString() {return this.toBuffer().toString('base64');}
    toJSON() {return this.toString();}
    validate(input) {
        if (typeof input === 'number') return validNumber(input) && (input | 0) === this.#value;
        if (Buffer.isBuffer(input)) return input.length === 4 && input.readInt32BE() === this.#value;
        return (typeof input === 'string' ? input : input.toString()) === this.toString();
    }
    static fromBuffer(input) {
        const buffer = Buffer.isBuffer(input) ? input : ArrayBuffer.isView(input)
            ? Buffer.from(input.buffer, input.byteOffset, input.byteLength) : Buffer.from(input);
        if (buffer.length !== 4) throw new RangeError(CRC32C_EXCEPTION_MESSAGES.INVALID_INIT_BUFFER_LENGTH(buffer.length));
        return new CRC32C(buffer.readInt32BE());
    }
    static fromString(input) {
        const buffer = Buffer.from(input, 'base64');
        if (buffer.length !== 4) throw new RangeError(CRC32C_EXCEPTION_MESSAGES.INVALID_INIT_BASE64_RANGE(buffer.length));
        return CRC32C.fromBuffer(buffer);
    }
    static fromNumber(value) {return new CRC32C(value);}
    static from(value) {
        if (typeof value === 'number') return this.fromNumber(value);
        if (typeof value === 'string') return this.fromString(value);
        if (value && typeof value === 'object' && 'byteLength' in value) return this.fromBuffer(value);
        return this.fromString(value.toString());
    }
    static async fromFile(file) {
        const result = new CRC32C();
        for await (const chunk of createReadStream(file)) result.update(chunk);
        return result;
    }
}
CRC32C.CRC32C_EXTENSIONS = CRC32C_EXTENSIONS;
CRC32C.CRC32C_EXTENSION_TABLE = CRC32C_EXTENSION_TABLE;
const CRC32C_DEFAULT_VALIDATOR_GENERATOR = () => new CRC32C();
Object.assign(exports, {CRC32C, CRC32C_EXTENSIONS, CRC32C_EXTENSION_TABLE, CRC32C_EXCEPTION_MESSAGES, CRC32C_DEFAULT_VALIDATOR_GENERATOR});
