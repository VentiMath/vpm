'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const parser = require('vbody-parser');
const createBodyParser = require('../lib/body_parser');
const { incoming, invoke } = require('../../vbody-parser/test/helpers.cjs');

// Independent reference: the original five checked VPM parser factories.
function reference() {
  const options = { limit: '1024mb', verify(req, res, buffer) { req.rawBody = buffer; } };
  const chain = [parser.json({ ...options, type: 'application/cloudevents+json' }), parser.json(options),
    parser.text(options), parser.urlencoded({ ...options, extended: true }), parser.raw({ ...options, type: '*/*' })];
  return (req, res, next) => {
    let index = 0;
    function advance(error) {
      if (error || index === chain.length) next(error);
      else chain[index++](req, res, advance);
    }
    advance();
  };
}
async function result(middleware, headers, body) {
  const req = incoming(headers);
  const error = await invoke(middleware, req, req => req.end(body));
  return { body: req.body, raw: req.rawBody?.toString('hex'), error: error ?
    { name: error.name, status: error.status, type: error.type, charset: error.charset, encoding: error.encoding } : undefined };
}
const before = reference(), after = createBodyParser();
async function compare(headers, body) {
  assert.deepEqual(await result(after, headers, body), await result(before, headers, body), JSON.stringify(headers));
}

test('dispatch agrees with checked parsers for ASCII and non-ASCII media spans', async () => {
  for (const [type, body] of [
    ['application/json', '{"a":1}'], ['application/cloudevents+json', '{"id":"1"}'],
    ['text/plain', 'hello'], ['application/x-www-form-urlencoded', 'a[b]=1'],
  ]) {
    for (const name of [type, type.toUpperCase(), type.replace(/[a-z]/g, (c, i) => i % 2 ? c.toUpperCase() : c)]) {
      for (const [prefix, suffix] of [
        ['', ''], [' \t', '\t '], ['\u00a0', ''], ['', '\u00a0'], ['\ufeff', ''], ['', '\ufeff'],
        ['\r', ''], ['', '\n'], ['', '\u0000'], ['', ',text/plain'], ['', 'x'],
      ]) {
        for (const parameters of ['', '; charset="UTF-8"; note="a;b"']) {
          await compare({ 'content-length': String(Buffer.byteLength(body)), 'content-type': prefix + name + suffix + parameters }, body);
        }
      }
    }
  }
});

test('dispatch preserves full parameter syntax and charset checks', async () => {
  for (const type of ['application/json', 'application/cloudevents+json', 'text/plain', 'application/x-www-form-urlencoded']) {
    for (const suffix of [';', '; invalid', '; charset=', '; charset="unterminated', '; charset=utf-8 junk',
      '; charset=iso-8859-1', '; charset=unknown', '; charset=utf-8; charset=unknown', '; __proto__=x', '; note="café"']) {
      await compare({ 'content-length': '2', 'content-type': type + suffix }, '{}');
    }
  }
});

test('dispatch preserves own-header, unknown-type and framing decisions', async () => {
  for (const type of [undefined, null, 42, [], {}, 'application/problem+json', 'application/xml', 'text/json', 'constructor']) {
    await compare({ 'content-length': '2', 'content-type': type }, '{}');
  }
  await compare(Object.assign(Object.create({ 'content-type': 'application/json' }), { 'content-length': '2' }), '{}');
  for (const length of [undefined, '', 'invalid', '2junk', '2', '3']) {
    await compare({ 'content-length': length, 'content-type': 'application/json' }, '{}');
  }
  await compare({ 'transfer-encoding': 'chunked', 'content-type': 'application/json' }, '{}');
});
