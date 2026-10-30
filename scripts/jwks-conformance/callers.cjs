'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createPublicKey } = require('node:crypto');
const nock = require('./node_modules/nock');
const jwt = require('./node_modules/jsonwebtoken');
const { keys } = require('../../packages/vjwa/test/helpers.cjs');
const { load } = require('./firebase.cjs');

module.exports = async function run(target, upstream = false) {
  target ||= upstream ? require('./node_modules/jwks-rsa') : require('../../packages/vjwks-rsa');
  const observed = { clients: [], calls: 0 };
  const sdk = load(target, observed);
  const rsa = { ...keys.RSA.publicKey.export({ format: 'jwk' }), kid: 'rsa', alg: 'RS256', use: 'sig' };
  const ec = { ...keys.ES256.publicKey.export({ format: 'jwk' }), kid: 'ec', alg: 'ES256', use: 'sig' };
  let document = { keys: [rsa, ec] }, requests = 0, status = 200;
  const server = http.createServer((_req, res) => { requests++; res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(document)); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const agent = new http.Agent({ keepAlive: true });
  const uri = 'http://127.0.0.1:' + server.address().port + '/jwks';
  nock.disableNetConnect(); nock.enableNetConnect('127.0.0.1');
  try {
    const fetcher = new sdk.JwksFetcher(uri, agent);
    assert(fetcher.client instanceof target.JwksClient);
    assert.equal(fetcher.client.options.cache, false);
    assert.equal(fetcher.client.options.requestAgent, agent);
    const fetched = await fetcher.fetchPublicKeys();
    assert.deepEqual(Object.keys(fetched).sort(), ['ec', 'rsa']);
    assert.deepEqual(createPublicKey(fetched.rsa).export({ format: 'jwk' }), keys.RSA.publicKey.export({ format: 'jwk' }));
    assert.equal(await fetcher.fetchPublicKeys(), fetched); assert.equal(requests, 1);
    const now = Date.now();
    assert(fetcher.publicKeysExpireAt > now + 21599000 && fetcher.publicKeysExpireAt <= now + 21600000);
    const verifier = new sdk.PublicKeySignatureVerifier(fetcher);
    const token = (pair, algorithm, kid, payload = {}) => jwt.sign({ sub: 'student', ...payload }, pair.privateKey, { algorithm, ...(kid === undefined ? {} : { keyid: kid }) });
    await verifier.verify(token(keys.RSA, 'RS256', 'rsa'));
    await verifier.verify(token(keys.ES256, 'ES256', 'ec'));
    await verifier.verify(token(keys.RSA, 'RS256', undefined));
    await assert.rejects(verifier.verify(token(keys.RSA, 'RS256', 'missing')), { code: sdk.JwtErrorCode.NO_MATCHING_KID });
    await assert.rejects(verifier.verify(token(keys.RSA, 'RS256', 'ec')), { code: sdk.JwtErrorCode.INVALID_SIGNATURE });
    const valid = token(keys.RSA, 'RS256', 'rsa'), parts = valid.split('.');
    const badSignature = Buffer.from(parts[2], 'base64url'); badSignature[0] ^= 1; parts[2] = badSignature.toString('base64url');
    await assert.rejects(verifier.verify(parts.join('.')), { code: sdk.JwtErrorCode.INVALID_SIGNATURE });
    await assert.rejects(verifier.verify(token(keys.RSA, 'RS256', 'rsa', { exp: 1 })), { code: sdk.JwtErrorCode.TOKEN_EXPIRED });
    assert.equal(requests, 1, 'all warm verification uses the actual SDK six-hour cache');
    document = { keys: [{ ...rsa, kid: 'rotated' }] }; fetcher.publicKeysExpireAt = 0;
    await verifier.verify(token(keys.RSA, 'RS256', 'rotated'));
    await assert.rejects(verifier.verify(valid), { code: sdk.JwtErrorCode.NO_MATCHING_KID });
    assert.equal(requests, 2);
    status = 503; fetcher.publicKeysExpireAt = 0;
    await assert.rejects(verifier.verify(token(keys.RSA, 'RS256', 'rotated')), { code: sdk.JwtErrorCode.KEY_FETCH_ERROR });
    status = 200; await verifier.verify(token(keys.RSA, 'RS256', 'rotated'));

    // Exercise the App Check claims and signature path unchanged. Only its fixed
    // Google JWKS endpoint is intercepted with a local fixture response.
    const endpoint = nock('https://firebaseappcheck.googleapis.com').get('/v1/jwks').once().reply(200, { keys: [rsa] });
    const appcheck = new sdk.AppCheckTokenVerifier({ options: { projectId: 'fixture-project' } });
    const claims = { sub: 'fixture-app', aud: ['projects/fixture-project'], iss: 'https://firebaseappcheck.googleapis.com/fixture-project', exp: Math.floor(Date.now() / 1000) + 600 };
    const signed = token(keys.RSA, 'RS256', 'rsa', claims);
    assert.equal((await appcheck.verifyToken(signed)).app_id, 'fixture-app');
    assert.equal((await appcheck.verifyToken(signed)).sub, 'fixture-app');
    await assert.rejects(appcheck.verifyToken(token(keys.RSA, 'RS256', 'rsa', { ...claims, aud: ['projects/wrong'] })), { code: 'app-check/invalid-argument' });
    await assert.rejects(appcheck.verifyToken(token(keys.RSA, 'RS256', 'unknown', claims)), { code: 'app-check/invalid-argument' });
    await assert.rejects(appcheck.verifyToken(token(keys.RSA, 'RS256', 'rsa', { ...claims, exp: 1 })), { code: 'app-check/app-check-token-expired' });
    assert(endpoint.isDone()); assert.deepEqual(nock.pendingMocks(), []);
    assert.equal(observed.clients.length, 2); assert.equal(observed.calls, 5);
    console.log(`${upstream ? 'Upstream 4.1.0' : 'VPM'} through Firebase Admin 14.5.0: RSA/EC verification, missing kid, bad signature, expiry, six-hour cache, rotation/removal, outage/recovery and actual App Check claims/signatures; ${observed.calls} observed JWKS calls.`);
  } finally {
    nock.cleanAll(); nock.enableNetConnect(); agent.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
};
if (require.main === module) module.exports(undefined, process.argv.includes('--upstream')).catch(error => { console.error(error); process.exitCode = 1; });
