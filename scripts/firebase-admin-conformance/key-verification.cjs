'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const variant = process.argv[2];
if (!variant) {
  for (const kind of ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, [__filename, kind], {encoding: 'utf8', timeout: 60000});
    assert.equal(child.status, 0, child.stdout + child.stderr);
  }
  console.log('Auth keys: real certificate/JWKS HTTP controls, immutable key snapshots, cache directives, no-kid algorithms and one-fetch verification pass.');
} else main().catch(error => {console.error(error); process.exitCode = 1;});

async function main() {
  const vpm = variant === 'vpm', root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
  const {UrlKeyFetcher, JwksFetcher, PublicKeySignatureVerifier, JwtErrorCode} = require(root + '/lib/utils/jwt');
  const key = require('./upstream/test/resources/mock.key.json').private_key;
  const publicKey = crypto.createPublicKey(key), pem = publicKey.export({type: 'spki', format: 'pem'});
  const jwk = {...publicKey.export({format: 'jwk'}), alg: 'RS256', use: 'sig', kid: '__proto__'};
  let calls = 0, cacheControl = 'max-age=60', age, body = {fixture: pem};
  const server = http.createServer((request, response) => {
    calls++;
    response.setHeader('content-type', 'application/json');
    response.setHeader('cache-control', cacheControl);
    if (age !== undefined) response.setHeader('age', age);
    response.end(JSON.stringify(request.url === '/jwks' ? {keys: [jwk]} : body));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const outcome = async operation => {try {await operation(); return 'ok';} catch (error) {return error.code || error.message;}};
  try {
    const cached = new UrlKeyFetcher(url + '/certs');
    const first = await cached.fetchPublicKeys();
    assert.equal(Reflect.set(first, 'fixture', 'altered'), !vpm);
    assert.equal((await cached.fetchPublicKeys()).fixture, vpm ? pem : 'altered');
    for (const [header, upstreamCalls, vpmCalls] of [
      ['max-age=Infinity', 1, 2], ['max-age=garbage', 1, 2], ['max-age=1e6', 1, 2], ['max-age=-1', 2, 2],
      ['max-age=60, no-store', 1, 2], ['max-age=60, no-cache', 1, 2],
      ['MAX-AGE=60', 2, 1], ['max-age="60"', 1, 1],
      ['max-age=60, max-age=90', 1, 2],
      ['extension="x,max-age=60", max-age=30', 1, 1], ['extension="x,max-age=60"', 1, 2],
    ]) {
      cacheControl = header; calls = 0;
      const fetcher = new UrlKeyFetcher(url + '/certs');
      await fetcher.fetchPublicKeys(); await fetcher.fetchPublicKeys();
      assert.equal(calls, vpm ? vpmCalls : upstreamCalls, header);
    }
    cacheControl = 'max-age="60"'; calls = 0;
    const quoted = new UrlKeyFetcher(url + '/certs');
    await quoted.fetchPublicKeys();
    const realNow = Date.now;
    try {Date.now = () => realNow() + 61000; await quoted.fetchPublicKeys();}
    finally {Date.now = realNow;}
    assert.equal(calls, vpm ? 2 : 1, 'quoted max-age expires instead of becoming NaN');
    cacheControl = 'max-age=60'; age = '120'; calls = 0;
    const aged = new UrlKeyFetcher(url + '/certs');
    await aged.fetchPublicKeys(); await aged.fetchPublicKeys();
    assert.equal(calls, vpm ? 2 : 1);
    age = undefined;
    const keys = await new JwksFetcher(url + '/jwks').fetchPublicKeys();
    assert.equal(Object.hasOwn(keys, '__proto__'), vpm);
    if (vpm) assert.match(keys.__proto__, /PUBLIC KEY/);
    for (body of [[], {fixture: null}, {fixture: 123}]) {
      const result = await outcome(() => new UrlKeyFetcher(url + '/certs').fetchPublicKeys());
      assert.equal(result, vpm ? 'Invalid public key response.' : 'ok');
    }
    const mint = algorithm => {
      const input = [{alg: algorithm, typ: 'JWT'}, {sub: 'one', exp: 4102444800}].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
      return input + '.' + crypto.sign(algorithm === 'RS256' ? 'RSA-SHA256' : 'RSA-SHA512', Buffer.from(input), key).toString('base64url');
    };
    let fetches = 0;
    const verifier = new PublicKeySignatureVerifier({fetchPublicKeys: async () => {fetches++; return {fixture: pem};}});
    assert.equal(await outcome(() => verifier.verify(mint('RS256'))), 'ok');
    // Allow the original callback's unnecessary request to settle too.
    await Promise.resolve();
    assert.equal(fetches, vpm ? 1 : 2);
    assert.equal(await outcome(() => verifier.verify(mint('RS512'))), vpm ? JwtErrorCode.INVALID_SIGNATURE : 'ok');
    if (vpm) {
      const {certificateLifetime, KeyCache} = require(root + '/lib/utils/key-cache');
      assert.equal(certificateLifetime({'Cache-Control': 'max-age=10', Date: new Date(3000).toUTCString(), Age: '2'}, 5000, 6000), 7000);
      assert.equal(certificateLifetime({'cache-control': 'max-age=10', age: 'bad'}, 0, 0), 0);
      assert.equal(certificateLifetime({'cache-control': 'max-age=10, x="unterminated'}, 0, 0), 0);
      let attempts = 0;
      const cache = new KeyCache(() => {if (++attempts === 1) throw Error('retry'); return {keys: {k: pem}, lifetime: 0};});
      await assert.rejects(cache.read(), /retry/);
      await cache.read(); assert.equal(cache.keys, undefined, 'noncacheable keys are not retained');
    }
  } finally {await new Promise(resolve => server.close(resolve));}
}
