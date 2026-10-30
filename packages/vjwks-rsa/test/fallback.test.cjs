'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const jwks = require('..');
const { Cache } = require('../lib/state');
const { keys } = require('../../vjwa/test/helpers.cjs');
const rsa = { ...keys.RSA.publicKey.export({ format: 'jwk' }), kid: 'rsa', alg: 'RS256' };
const ec = { ...keys.ES256.publicKey.export({ format: 'jwk' }), kid: 'rsa', alg: 'ES256' };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = { cacheMaxAge: 1, cacheMaxAgeFallback: 5000 };

test('stale cache expiry is fixed, monotonic and exact, including repeated reads and LRU eviction', () => {
  let time = 0;
  const cache = new Cache(2, 100, () => time, 50);
  cache.set('rsa', 1);
  time = 100;
  assert.equal(cache.get('rsa'), undefined);
  assert.equal(cache.get('rsa', true), 1);
  time = 149;
  assert.equal(cache.get('rsa', true), 1);
  time = 150;
  assert.equal(cache.get('rsa', true), undefined);
  cache.set('rsa', 1); cache.set('ec', 2); cache.get('rsa', true); cache.set('new', 3);
  assert.equal(cache.get('ec', true), undefined);
  assert.equal(cache.get('rsa'), 1);
});

test('stale options validate functions, finite nonnegative durations and combined lifetime', () => {
  for (const options of [{ cacheMaxAgeFallback: -1 }, { cacheMaxAgeFallback: Infinity }, { cacheMaxAgeFallback: '100' }, { cacheMaxAgeFallback: 0.5 }, { cacheMaxAgeFallback: Number.MAX_SAFE_INTEGER }, { onStaleCacheFallback: true }]) {
    assert.throws(() => jwks({ fetcher: () => ({ keys: [rsa] }), ...options }), jwks.ArgumentError);
  }
});

test('fallback is opt-in and stays disabled with cache false or zero cache limits', async () => {
  for (const options of [{ cacheMaxAgeFallback: 0 }, { cache: false }, { cacheMaxAge: 0 }, { cacheMaxEntries: 0 }]) {
    let failed = false, hooks = 0;
    const client = jwks({ ...base, ...options, fetcher: () => { if (failed) throw Error('offline'); return { keys: [rsa] }; }, onStaleCacheFallback: () => { hooks++; } });
    await client.getSigningKey('rsa'); failed = true; await delay(5);
    await assert.rejects(client.getSigningKey('rsa'), /offline/);
    assert.equal(hooks, 0);
  }
});

test('outage fallback notifies every stale lookup without caching it as fresh; recovery rotates keys', async () => {
  let mode = 'first', requests = 0;
  const notifications = [];
  const client = jwks({ ...base, fetcher: () => { requests++; if (mode === 'offline') throw Error('offline'); return { keys: [mode === 'first' ? rsa : ec] }; }, onStaleCacheFallback: (...args) => { notifications.push(args); } });
  const key = await client.getSigningKey('rsa');
  mode = 'offline'; await delay(5);
  for (let i = 0; i < 3; i++) assert.equal(await client.getSigningKey('rsa'), key);
  assert.equal(requests, 4); assert.equal(notifications.length, 3);
  for (const [error, kid, stale] of notifications) { assert.equal(error.isEndpointUnavailable, true); assert.equal(kid, 'rsa'); assert.equal(stale, key); }
  await assert.rejects(client.getSigningKey('unknown'), /offline/);
  mode = 'rotated'; assert.notEqual((await client.getSigningKey('rsa')).getPublicKey(), key.getPublicKey());
  assert.equal(notifications.length, 3);
});

test('a removed key cannot reappear from stale storage during a subsequent outage', async () => {
  let mode = 'key';
  const client = jwks({ ...base, fetcher: () => { if (mode === 'offline') throw Error('offline'); return { keys: mode === 'key' ? [rsa] : [{ ...ec, kid: 'other' }] }; } });
  await client.getSigningKey('rsa'); await delay(5); mode = 'removed';
  await assert.rejects(client.getSigningKey('rsa'), jwks.SigningKeyNotFoundError);
  mode = 'offline'; await assert.rejects(client.getSigningKey('rsa'), /offline/);
});

test('invalid documents and ambiguous keys never use stale fallback', async () => {
  for (const document of [null, {}, { keys: [] }, { keys: [rsa, rsa] }, { keys: [{ ...rsa, use: 'enc' }] }]) {
    let mode = 'key';
    const client = jwks({ ...base, fetcher: () => { if (mode === 'offline') throw Error('offline'); return mode === 'key' ? { keys: [rsa] } : document; } });
    await client.getSigningKey('rsa'); await delay(5); mode = 'invalid';
    await assert.rejects(client.getSigningKey('rsa'), error => error.isEndpointUnavailable !== true);
    mode = 'offline'; await assert.rejects(client.getSigningKey('rsa'), /offline/);
  }
});

test('local rate limits and interceptor failures cannot trigger fallback with a forged indicator', async () => {
  const limited = jwks({ ...base, rateLimit: true, jwksRequestsPerMinute: 1, fetcher: () => ({ keys: [rsa] }) });
  await limited.getSigningKey('rsa'); await delay(5);
  await assert.rejects(limited.getSigningKey('rsa'), jwks.JwksRateLimitError);
  let fail = false;
  const client = jwks({ ...base, fetcher: () => ({ keys: [rsa] }), getKeysInterceptor: () => { if (fail) throw Object.assign(Error('interceptor'), { isEndpointUnavailable: true }); return []; } });
  await client.getSigningKey('rsa'); await delay(5); fail = true;
  await assert.rejects(client.getSigningKey('rsa'), /interceptor/);
});

test('concurrent stale reads share one failed refresh and notify each caller', async () => {
  let offline = false, requests = 0, hooks = 0;
  const client = jwks({ ...base, fetcher: async () => { requests++; await delay(2); if (offline) throw Error('offline'); return { keys: [rsa] }; }, onStaleCacheFallback: () => { hooks++; } });
  const key = await client.getSigningKey('rsa'); offline = true; await delay(5);
  const result = await Promise.all(Array.from({ length: 20 }, () => client.getSigningKey('rsa')));
  assert(result.every(value => value === key)); assert.equal(requests, 2); assert.equal(hooks, 20);
});

test('frozen and non-Error fetcher rejections normalize without hiding the endpoint failure', async () => {
  for (const failure of [Object.freeze(Object.assign(Error('frozen'), { code: 'ECONNRESET' })), null]) {
    await assert.rejects(jwks({ fetcher: () => Promise.reject(failure) }).getKeys(), error => error instanceof Error && error.isEndpointUnavailable === true && (failure === null || error.cause === failure));
  }
});

test('fallback hooks propagate thrown and asynchronous failures through Promise and callback APIs', async () => {
  for (const hook of [() => { throw Error('hook failed'); }, async () => { throw Error('hook failed'); }]) {
    let fail = false;
    const client = jwks({ ...base, fetcher: () => { if (fail) throw Error('offline'); return { keys: [rsa] }; }, onStaleCacheFallback: hook });
    await client.getSigningKey('rsa'); await delay(5); fail = true;
    await assert.rejects(client.getSigningKey('rsa'), /hook failed/);
    await new Promise(resolve => client.getSigningKey('rsa', (error, value) => { assert.match(error.message, /hook failed/); assert.equal(value, undefined); resolve(); }));
  }
});

test('HTTP outages and timeouts allow fallback; invalid UTF-8/JSON and oversized bodies do not', async t => {
  let mode = 'ok';
  const server = http.createServer((_req, res) => {
    if (mode === 'timeout') return;
    if (mode === 'offline') { res.writeHead(503); res.end(); return; }
    res.end(mode === 'ok' ? JSON.stringify({ keys: [rsa] }) : mode === 'json' ? '{broken' : mode === 'utf8' ? Buffer.from([255]) : 'x'.repeat(2048));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const uri = 'http://127.0.0.1:' + server.address().port;
  for (const failure of ['offline', 'timeout', 'json', 'utf8', 'size']) {
    mode = 'ok';
    const client = jwks({ ...base, jwksUri: uri, timeout: 100, maxResponseBytes: 1024 });
    const key = await client.getSigningKey('rsa'); await delay(5); mode = failure;
    if (failure === 'offline' || failure === 'timeout') assert.equal(await client.getSigningKey('rsa'), key);
    else await assert.rejects(client.getSigningKey('rsa'), error => error.isEndpointUnavailable !== true);
  }
});
