'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const {verify, createPublicKey} = require('node:crypto');
const upstream = require('../../../scripts/consumers/node_modules/gtoken');
const vpm = require('..');
const key = fs.readFileSync(path.join(__dirname, '../test/key.pem'), 'utf8');
const publicKey = createPublicKey(key);
const data = {access_token: 'benchmark-token', expires_in: 3600, token_type: 'Bearer'};
const options = {email: 'service@example.test', key, scope: ['scope-a', 'scope-b']};
function verifyAssertion(assertion) {
  const [header, payload, signature] = assertion.split('.');
  assert(verify('RSA-SHA256', Buffer.from(header + '.' + payload), publicKey, Buffer.from(signature, 'base64url')));
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.iss, options.email); assert.equal(claims.scope, 'scope-a scope-b');
}
const cases = [];
const add = (name, make, validate, async = true) => cases.push({name, make, validate, async});
add('client construction', lib => () => new lib.GoogleToken(options), token => assert.equal(token.iss, options.email), false);
add('cached token', async lib => {
  const token = new lib.GoogleToken({...options, transporter: {request: async () => ({data})}});
  await token.getToken(); return () => token.getToken();
}, token => assert.equal(token.access_token, data.access_token));
add('expiry check', lib => {
  const token = new lib.GoogleToken(options); token.rawToken = data; token.expiresAt = Date.now() + 3600000;
  return () => token.isTokenExpiring();
}, result => assert.equal(result, false), false);
add('signed refresh, reused client', lib => {
  let assertion;
  const token = new lib.GoogleToken({...options, transporter: {request: async opts => { assertion = opts.data.assertion; return {data}; }}});
  return async () => ({token: await token.getToken({forceRefresh: true}), assertion});
}, result => { assert.equal(result.token.access_token, data.access_token); verifyAssertion(result.assertion); });
add('signed refresh, new client', lib => () => {
  const token = new lib.GoogleToken({...options, transporter: {request: async () => ({data})}});
  return token.getToken();
}, token => assert.equal(token.access_token, data.access_token));
add('eight concurrent forced refreshes', lib => {
  let calls = 0;
  const token = new lib.GoogleToken({...options, transporter: {request: async () => { calls++; return {data}; }}});
  return async () => {
    const before = calls;
    const tokens = await Promise.all(Array.from({length: 8}, () => token.getToken({forceRefresh: true})));
    return {tokens, calls: calls - before, expected: lib === upstream ? 8 : 1};
  };
}, result => { assert.equal(result.tokens.length, 8); assert(result.tokens.every(token => token.access_token === data.access_token)); assert.equal(result.calls, result.expected); });
(async () => {
  const server = http.createServer((request, response) => { request.resume(); request.on('end', () => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(data)); }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/token';
  const agents = [];
  add('HTTP signed refresh', lib => {
    const {Gaxios} = lib === upstream ? require('../../../scripts/consumers/node_modules/gaxios') : require('../../vgaxios');
    const agent = new http.Agent({keepAlive: true}); agents.push(agent);
    const client = new Gaxios({noProxy: ['*'], agent});
    const token = new lib.GoogleToken({...options, transporter: {request: opts => client.request({...opts, url})}});
    return () => token.getToken({forceRefresh: true});
  }, token => assert.equal(token.access_token, data.access_token));
  await require('../../../scripts/bench-paired.cjs').run({
    root: path.resolve(__dirname, '..'), upstream, vpm, cases,
    files: ['index.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', 'test/key.pem', '../vjws/index.js', '../vjwa/index.js', '../vgaxios/index.js', '../vgaxios/lib/gaxios.js', '../vgaxios/lib/retry.js', '../vnode-fetch/index.js', '../vextend/index.js', '../vis-stream/index.js', '../../scripts/consumers/node_modules/gtoken/build/src/index.js', '../../scripts/consumers/node_modules/gaxios/build/src/gaxios.js', '../../scripts/consumers/package-lock.json'],
    cleanup: async () => { for (const agent of agents) agent.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  });
})().catch(error => { console.error(error); process.exitCode = 1; });
