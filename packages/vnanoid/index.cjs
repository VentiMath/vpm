'use strict';
const {randomFillSync} = require('node:crypto');
module.exports = require('./engine.cjs').createSecure(bytes => randomFillSync(bytes), bytes => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('latin1'), bytes => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64url'), bytes => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('hex'));
