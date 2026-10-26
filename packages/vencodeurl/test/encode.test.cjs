'use strict';

const assert = require('node:assert/strict');
const { IncomingMessage, ServerResponse } = require('node:http');
const { Socket } = require('node:net');
const test = require('node:test');
const encodeUrl = require('..');
const upstream = require('./fixtures/encodeurl-2.0.0.cjs');

test('preserves ordinary whole URLs and their delimiters', () => {
  for (const url of ['', '/', '/a/b?x=1&y=2#section', 'https://user:pass@example.com:8080/a', 'http://[::1]:8080/a']) {
    assert.equal(encodeUrl(url), url);
  }
});

test('retains encodeurl characters that encodeURI would escape', () => {
  assert.equal(encodeUrl('/a\\b^c|d[e]'), '/a\\b^c|d[e]');
});

test('encodes spaces, quotes, markup characters, braces, and backticks', () => {
  assert.equal(encodeUrl('/a b"<>`{}'), '/a%20b%22%3C%3E%60%7B%7D');
});

test('encodes every ASCII control character and DEL', () => {
  for (const code of [...Array(32).keys(), 127]) {
    assert.equal(encodeUrl('/' + String.fromCharCode(code)), '/' + '%' + code.toString(16).toUpperCase().padStart(2, '0'));
  }
});

test('encodes non-ASCII text as UTF-8 bytes', () => {
  assert.equal(encodeUrl('/café/你好/😀'), '/caf%C3%A9/%E4%BD%A0%E5%A5%BD/%F0%9F%98%80');
});

test('preserves every existing byte escape and its hex letter case', () => {
  for (let byte = 0; byte < 256; byte++) {
    const hex = byte.toString(16).padStart(2, '0');
    const url = `/%${hex}/%${hex.toUpperCase()}`;
    assert.equal(encodeUrl(url), url);
  }
  assert.equal(encodeUrl('/%aB%Cd'), '/%aB%Cd');
});

test('preserves escapes regardless of whether they represent valid UTF-8', () => {
  assert.equal(encodeUrl('/%FF%ED%A0%80%F0'), '/%FF%ED%A0%80%F0');
});

test('repairs bare percent signs and escapes with non-hex digits', () => {
  for (const [input, output] of [['%', '%25'], ['%GG', '%25GG'], ['%aZ', '%25aZ'], ['%zap', '%25zap']]) {
    assert.equal(encodeUrl(input), output);
  }
});

test('fixes upstream incomplete escapes ending in one hex digit', () => {
  for (const digit of '0123456789abcdefABCDEF') {
    const input = '/value%' + digit;
    assert.equal(upstream(input), input);
    assert.equal(encodeUrl(input), '/value%25' + digit);
  }
});

test('fixes upstream double encoding after an invalid percent escape', () => {
  assert.equal(upstream('%%20'), '%25%2520');
  assert.equal(upstream('%2%20'), '%252%2520');
  for (const [input, output] of [
    ['%%20', '%25%20'], ['%2%20', '%252%20'], ['%%%2F', '%25%25%2F'],
    ['%a%FF', '%25a%FF'], ['% %20', '%25%20%20'], ['%2F%', '%2F%25'],
  ]) assert.equal(encodeUrl(input), output);
});

test('replaces a single unpaired surrogate at any position', () => {
  for (const surrogate of ['\ud800', '\udbff', '\udc00', '\udfff']) {
    assert.equal(encodeUrl(surrogate), '%EF%BF%BD');
    assert.equal(encodeUrl('/a' + surrogate + 'b'), '/a%EF%BF%BDb');
  }
});

test('fixes upstream crashes on consecutive unpaired surrogates', () => {
  for (const input of ['\ud800\ud800', '\udc00\udc00', '\udfff\udfff\udfff']) {
    assert.throws(() => upstream(input), URIError);
    assert.equal(encodeUrl(input), '%EF%BF%BD'.repeat(input.length));
  }
});

test('preserves valid pairs beside unpaired surrogates', () => {
  assert.equal(encodeUrl('\ud800\ud83d\ude00\udc00'), '%EF%BF%BD%F0%9F%98%80%EF%BF%BD');
  assert.equal(encodeUrl('\ud800\udc00'), '%F0%90%80%80');
  assert.equal(encodeUrl('\udbff\udfff'), '%F4%8F%BF%BF');
});

test('preserves String conversion for primitives, missing values, and objects', () => {
  for (const input of [undefined, null, false, 42, 123n, Symbol('name'), new URL('https://example.com/a%20b')]) {
    assert.equal(encodeUrl(input), upstream(input));
  }
  assert.equal(encodeUrl(), 'undefined');
  assert.equal(encodeUrl({ toString: () => '/custom path' }), '/custom%20path');
});

test('coerces once with the string hint before repairing the result', () => {
  const hints = [];
  const input = { [Symbol.toPrimitive](hint) { hints.push(hint); return '/\ud800\ud800%a'; } };
  assert.equal(encodeUrl(input), '/%EF%BF%BD%EF%BF%BD%25a');
  assert.deepEqual(hints, ['string']);
});

test('propagates user-defined coercion errors', () => {
  const error = new Error('conversion failed');
  assert.throws(() => encodeUrl({ toString() { throw error; } }), caught => caught === error);
  assert.throws(() => encodeUrl(Object.create(null)), TypeError);
});

test('produces Location header values accepted by Node HTTP', () => {
  const request = new IncomingMessage(new Socket());
  const response = new ServerResponse(request);
  const encoded = encodeUrl('/\ud800\ud800\r\n%a');
  response.setHeader('Location', encoded);
  assert.equal(response.getHeader('Location'), '/%EF%BF%BD%EF%BF%BD%0D%0A%25a');
  request.socket.destroy();
});

// Independent byte-by-byte reference: no production regexp, encodeURI, or
// toWellFormed(). Repair UTF-16 explicitly, then encode UTF-8 using Buffer.
const literal = new Set("!#$&'()*+,-./0123456789:;=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz|~");
function hex(code) {
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
}
function reference(input) {
  let output = '';
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i);
    if (code === 37 && hex(input.charCodeAt(i + 1)) && hex(input.charCodeAt(i + 2))) {
      output += input.slice(i, i + 3);
      i += 2;
      continue;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + next - 0xdc00;
        i++;
      } else code = 0xfffd;
    } else if (code >= 0xdc00 && code <= 0xdfff) code = 0xfffd;
    const character = String.fromCodePoint(code);
    if (literal.has(character)) output += character;
    else for (const byte of Buffer.from(character, 'utf8')) output += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
  }
  return output;
}

test('matches an independent encoder for all 65,536 UTF-16 code units', () => {
  for (let code = 0; code <= 0xffff; code++) {
    const input = '/' + String.fromCharCode(code);
    assert.equal(encodeUrl(input), reference(input), 'U+' + code.toString(16));
  }
});

test('matches an independent encoder across short surrogate and percent sequences', () => {
  const alphabet = ['\ud800', '\udbff', '\udc00', '\udfff', '%', 'a'];
  function visit(input, remaining) {
    assert.equal(encodeUrl(input), reference(input), JSON.stringify(input));
    if (remaining) for (const next of alphabet) visit(input + next, remaining - 1);
  }
  visit('', 5);
});

test('matches the independent encoder and is idempotent for generated UTF-16 strings', () => {
  let seed = 0x2468abcd;
  function random(max) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; }
  for (let i = 0; i < 2000; i++) {
    let input = '';
    const length = random(64);
    for (let j = 0; j < length; j++) input += String.fromCharCode(random(65536));
    input += ['%a', '%%20', '%2F', '\ud800\ud800'][random(4)];
    const encoded = encodeUrl(input);
    assert.equal(encoded, reference(input), JSON.stringify(input));
    assert.equal(encodeUrl(encoded), encoded);
  }
});

test('matches encodeurl 2.0.0 on ordinary well-formed inputs', () => {
  let seed = 0x13579abc;
  function random(max) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed % max; }
  const pieces = ['/', 'a', '?q=', '&x=', ' ', '#', '<', 'é', '😀', '你好', '%20', '%2f', '%FF', '\\', '\r\n'];
  for (let i = 0; i < 2000; i++) {
    let input = i % 2 ? 'https://example.com/' : '/';
    for (let j = 0; j < 12; j++) input += pieces[random(pieces.length)];
    assert.equal(encodeUrl(input), upstream(input), JSON.stringify(input));
  }
});

test('handles long paths and repeated calls without regexp state leaking', () => {
  const raw = ('/plain%20path/é/%a').repeat(1000) + '\ud800\ud800';
  const expected = reference(raw);
  for (let i = 0; i < 10; i++) {
    assert.equal(encodeUrl(raw), expected);
    assert.equal(encodeUrl('/untouched'), '/untouched');
    assert.equal(encodeUrl('%a'), '%25a');
  }
});
