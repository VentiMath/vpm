'use strict';
// This standalone process advances the two clocks used by the implementations.
// Timers remain real; advancing waits out upstream's 1 ms clock sampling cache.
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
let time = 10000;
const clocks = new Set([globalThis.performance, performance]);
const descriptors = [...clocks].map(clock => [clock, Object.getOwnPropertyDescriptor(clock, 'now')]);
const originalDate = Date.now;
for (const clock of clocks) Object.defineProperty(clock, 'now', { configurable: true, value: () => time });
Date.now = () => time;
async function advance(amount) { time += amount; await new Promise(resolve => setTimeout(resolve, 5)); }
(async () => {
  const rsa = { ...require('../../packages/vjwa/test/helpers.cjs').keys.RSA.publicKey.export({ format: 'jwk' }), kid: 'rsa', alg: 'RS256' };
  const results = {};
  for (const [name, target] of [['upstream', require('./node_modules/jwks-rsa')], ['vpm', require('../../packages/vjwks-rsa')]]) {
    let fail = false, requests = 0, hooks = 0;
    const client = target({ cacheMaxAge: 100, cacheMaxAgeFallback: 50, fetcher: async () => { requests++; if (fail) throw Error('offline'); return { keys: [rsa] }; }, onStaleCacheFallback() { hooks++; } });
    await client.getSigningKey('rsa'); fail = true;
    await advance(110); await client.getSigningKey('rsa');
    await advance(50);
    let expiredAccepted = false;
    try { await client.getSigningKey('rsa'); expiredAccepted = true; } catch (error) { assert.match(error.message, /offline/); }
    results[name] = { expiredAccepted, requests, hooks };
  }
  assert.deepEqual(results.upstream, { expiredAccepted: true, requests: 2, hooks: 1 });
  assert.deepEqual(results.vpm, { expiredAccepted: false, requests: 3, hooks: 1 });
  console.log('Fixed-clock upstream control reproduces stale-key re-caching past the fallback deadline; VPM retries and rejects at the original deadline.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  Date.now = originalDate;
  for (const [clock, descriptor] of descriptors) { if (descriptor) Object.defineProperty(clock, 'now', descriptor); else delete clock.now; }
});
