'use strict';
const { Buffer, isUtf8 } = require('node:buffer');
const { types } = require('node:util');
const jwa = require('vjwa');
const ALGORITHMS = Object.freeze(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512',
  'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512']);
const methods = Object.create(null);
for (const algorithm of [...ALGORITHMS, 'none']) methods[algorithm] = jwa(algorithm);
const invalidCompact = /[^A-Za-z0-9_.-]/;
const wideCharacter = /[\u0100-\uffff]/;
// Bun's Buffer.write can consume invalid ASCII as base64 values. It needs the
// full round trip; Node's decoder permits the byte-count invariant below.
const checkDecodedLength = !process.versions.bun;
let decodingScratch;
function decodedLengthMatches(payload) {
  // Bounded scratch storage avoids allocating a payload Buffer on verification.
  // Clear every written byte before returning; decoded payloads are not retained.
  const scratch = decodingScratch ||= Buffer.alloc(65536);
  for (let offset = 0; offset < payload.length; offset += 87380) {
    const part = payload.slice(offset, offset + 87380); // complete 4-character groups
    let count = 0;
    try {
      count = scratch.write(part, 'base64url');
      if (count !== Math.floor(part.length * 3 / 4)) return false;
      if (!checkDecodedLength && scratch.toString('base64url', 0, count) !== part) return false;
    } finally { scratch.fill(0); }
  }
  return true;
}
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const signingHeaders = { values: new Map() }, parsedHeaders = { values: new Map() };
function recalled(cache, key) {
  const saved = cache.values.get(key);
  if (saved) return saved;
  if (cache.key === key) {
    // Admit only repeated headers. Unique key IDs do not churn the hot set.
    if (cache.values.size === 15) cache.values.delete(cache.values.keys().next().value);
    cache.values.set(key, cache.value);
    return cache.value;
  }
}
function remember(cache, key, value) {
  if (key.length <= 4096) {
    cache.key = key;
    cache.value = value;
  }
  return value;
}

function algorithmMethod(algorithm) {
  if (!algorithm) {
    const error = new Error('Missing algorithm parameter for jws.verify');
    error.code = 'MISSING_ALGORITHM';
    throw error;
  }
  if (typeof algorithm !== 'string' || !Object.hasOwn(methods, algorithm)) {
    throw new TypeError(typeof algorithm === 'string'
      ? JSON.stringify(algorithm) + ' is not a valid algorithm.' : 'algorithm must be a supported string');
  }
  return methods[algorithm];
}
function bytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (types.isAnyArrayBuffer(value)) return Buffer.from(value);
  return null;
}
function payloadBytes(value, encoding) {
  const binary = bytes(value);
  if (binary !== null) return binary;
  const text = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : JSON.stringify(value);
  if (typeof text !== 'string') throw new TypeError('payload must be bytes, a string or JSON-serializable data');
  return Buffer.from(text, encoding || 'utf8');
}
function validHeader(header) {
  if (header === null || typeof header !== 'object' || Array.isArray(header) ||
    !Object.hasOwn(header, 'alg') || typeof header.alg !== 'string' || !header.alg) return false;
  // Only encoded compact payloads are supported. Unknown critical extensions
  // must not be ignored; b64:true is the one understood extension mode.
  if (Object.hasOwn(header, 'b64') && header.b64 !== true) return false;
  if (Object.hasOwn(header, 'crit') && (!Array.isArray(header.crit) ||
    header.crit.length !== 1 || header.crit[0] !== 'b64' || header.b64 !== true)) return false;
  return true;
}
function prepareHeader(header) {
  if (!header || typeof header !== 'object' || Array.isArray(header)) throw new TypeError('header must be an object');
  // Select the algorithm from exactly what is serialized, after getters/toJSON.
  // A changing getter cannot make the signed header name a different algorithm.
  const json = JSON.stringify(header);
  if (typeof json !== 'string') throw new TypeError('header must serialize to a JSON object');
  const cached = recalled(signingHeaders, json);
  if (cached) return cached;
  const snapshot = JSON.parse(json);
  if (!validHeader(snapshot)) throw new TypeError('invalid or unsupported JWS header');
  return remember(signingHeaders, json, Object.freeze({ encoded: Buffer.from(json).toString('base64url'), method: algorithmMethod(snapshot.alg), algorithm: snapshot.alg }));
}
function selectKey(options, signing) {
  const secret = options.secret;
  if (secret != null) return secret;
  const key = signing ? options.privateKey : options.publicKey;
  return key != null ? key : options.key;
}
function signPrepared(header, payload, key, encoding) {
  const input = header.encoded + '.' + payloadBytes(payload, encoding).toString('base64url');
  return input + '.' + header.method.sign(input, key);
}
function sign(options) {
  const header = prepareHeader(options.header);
  return signPrepared(header, options.payload, selectKey(options, true), options.encoding);
}
function canonical(token, start, end) {
  const remainder = (end - start) % 4;
  if (remainder === 1) return false;
  if (!remainder) return true;
  const last = alphabet.indexOf(token[end - 1]);
  return remainder === 2 ? (last & 15) === 0 : (last & 3) === 0;
}
function largePayloadIsCanonical(token, first, second) {
  // With canonical lengths/tail bits, ignoring even one ASCII character
  // reduces the decoded byte count. Exclude alphabet aliases and characters
  // that could truncate to Latin-1. Bun also compares the exact re-encoding.
  const payload = token.slice(first + 1, second);
  return !invalidCompact.test(token.slice(0, first)) && !invalidCompact.test(token.slice(second + 1)) &&
    (!checkDecodedLength || (!payload.includes('+') && !payload.includes('/') && !wideCharacter.test(payload))) &&
    decodedLengthMatches(payload);
}
function parse(value, fullHeader = true) {
  const token = typeof value === 'string' ? value : bytes(value)?.toString('utf8');
  if (typeof token !== 'string') return null;
  const first = token.indexOf('.');
  const second = token.indexOf('.', first + 1);
  if (first < 1 || second < 0 || token.indexOf('.', second + 1) !== -1 ||
    !canonical(token, 0, first) || !canonical(token, first + 1, second) || !canonical(token, second + 1, token.length)) return null;
  if (second - first > 4096) {
    if (!largePayloadIsCanonical(token, first, second)) return null;
  } else if (invalidCompact.test(token)) return null;
  const encoded = token.slice(0, first);
  let saved = recalled(parsedHeaders, encoded);
  if (!saved) {
    const headerBytes = Buffer.from(encoded, 'base64url');
    const json = headerBytes.toString('utf8');
    // Invalid UTF-8 always decodes with a replacement character. The uncommon
    // replacement case needs native validation because U+FFFD can also be valid.
    if (json.includes('\ufffd') && !isUtf8(headerBytes)) return null;
    let header;
    try { header = JSON.parse(json); } catch { return null; }
    if (!validHeader(header)) return null;
    // Only private immutable metadata is reused. Decoding always returns fresh
    // objects; neither decoded values, payloads nor key material enter a cache.
    saved = remember(parsedHeaders, encoded, { json, alg: header.alg });
    if (fullHeader) return { token, first, second, header };
  }
  let header;
  if (fullHeader) header = JSON.parse(saved.json); else header = saved;
  return { token, first, second, header };
}
function verifyParsed(parsed, algorithm, method, key) {
  if (parsed === null || parsed.header.alg !== algorithm) return false;
  const input = parsed.token.slice(0, parsed.second);
  const signature = parsed.token.slice(parsed.second + 1);
  return method.verify(input, signature, key);
}
function verify(token, algorithm, key) {
  const method = algorithmMethod(algorithm);
  return verifyParsed(parse(token, false), algorithm, method, key);
}
function decodeParsed(parsed, options) {
  if (parsed === null) return null;
  const payload = Buffer.from(parsed.token.slice(parsed.first + 1, parsed.second), 'base64url');
  const json = parsed.header.typ === 'JWT' || options?.json;
  if (json && !isUtf8(payload)) throw new SyntaxError('JSON payload must be valid UTF-8');
  return { header: parsed.header,
    payload: json ? JSON.parse(payload.toString('utf8')) : payload.toString(options?.encoding || 'utf8'),
    signature: parsed.token.slice(parsed.second + 1) };
}
function decode(token, options) { return decodeParsed(parse(token), options); }
module.exports = { ALGORITHMS, algorithmMethod, bytes, payloadBytes, prepareHeader, selectKey, signPrepared, sign, parse, verifyParsed, verify, decodeParsed, decode };
