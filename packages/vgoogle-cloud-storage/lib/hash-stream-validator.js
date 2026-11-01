'use strict';
// Source-informed independent implementation of the Storage 8.4.0 contract.
// Copyright 2022 Google LLC; Apache-2.0 attribution retained for the API contract.
const {Transform} = require('node:stream');
const {createHash} = require('node:crypto');
const {CRC32C_DEFAULT_VALIDATOR_GENERATOR} = require('./crc32c.js');

class HashStreamValidator extends Transform {
    #crc;
    #md5;
    #digest = '';
    constructor(options = {}) {
        super();
        this.crc32cEnabled = !!options.crc32c;
        this.md5Enabled = !!options.md5;
        this.updateHashesOnly = !!options.updateHashesOnly;
        this.crc32cExpected = options.crc32cExpected;
        this.md5Expected = options.md5Expected;
        if (this.crc32cEnabled) this.#crc = options.crc32cInstance || (options.crc32cGenerator || CRC32C_DEFAULT_VALIDATOR_GENERATOR)();
        if (this.md5Enabled) this.#md5 = createHash('md5');
    }
    get crc32c() { return this.#crc?.toString(); }
    get md5Digest() {
        // Inspection must not consume the active hash or cache a partial digest.
        return this.#md5 ? this.#md5.copy().digest('base64') : this.#digest;
    }
    _transform(chunk, encoding, callback) {
        try {
            // A downstream data listener may mutate the shared chunk synchronously.
            this.#crc?.update(chunk);
            this.#md5?.update(chunk);
        } catch (error) { callback(error); return; }
        this.push(chunk, encoding);
        callback();
    }
    _flush(callback) {
        try {
            if (this.#md5) {
                this.#digest = this.#md5.digest('base64');
                this.#md5 = undefined;
            }
            if (!this.updateHashesOnly) {
                const crcFailed = this.crc32cEnabled && (!this.crc32cExpected || !this.test('crc32c', this.crc32cExpected));
                const md5Failed = this.md5Enabled && (!this.md5Expected || !this.test('md5', this.md5Expected));
                if (crcFailed || md5Failed) {
                    // Resolve lazily: File also imports this stream.
                    const {RequestError, FileExceptionMessages} = require('./file.js');
                    const error = new RequestError(FileExceptionMessages.DOWNLOAD_MISMATCH);
                    error.code = 'CONTENT_DOWNLOAD_MISMATCH';
                    callback(error);
                    return;
                }
            }
        } catch (error) { callback(error); return; }
        callback();
    }
    test(hash, sum) {
        const expected = Buffer.isBuffer(sum) ? sum.toString('base64') : sum;
        if (hash === 'crc32c') return this.#crc ? this.#crc.validate(expected) : false;
        if (hash === 'md5' && this.md5Enabled) return this.md5Digest === expected;
        return false;
    }
}
exports.HashStreamValidator = HashStreamValidator;
