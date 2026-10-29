'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const {GoogleToken, TokenError} = require('..');
const {Gaxios} = require('../../vgaxios');
const key = fs.readFileSync(path.join(__dirname, 'key.pem'), 'utf8');
const email = 'test@example.test';
const data = {access_token: 'access', id_token: 'id', expires_in: 3600, token_type: 'Bearer'};
const make = (request = async () => ({data}), options = {}) => new GoogleToken({email, key, scope: ['a', 'b'], transporter: {request}, ...options});
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const code = expected => error => { assert(error instanceof TokenError); assert.equal(error.code, expected); return true; };

test('signs a verifiable RS256 assertion and preserves public token API', async () => {
  let options;
  const token = make(async opts => { options = opts; return {data}; }, {sub: 'subject@example.test', additionalClaims: {target_audience: 'https://app.example.test'}});
  const start = Date.now();
  const result = await token.getToken();
  const [header, payload, signature] = options.data.assertion.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), {alg: 'RS256'});
  assert(crypto.verify('RSA-SHA256', Buffer.from(header + '.' + payload), crypto.createPublicKey(key), Buffer.from(signature, 'base64url')));
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.iss, email); assert.equal(claims.scope, 'a b'); assert.equal(claims.sub, 'subject@example.test');
  assert.equal(claims.target_audience, 'https://app.example.test'); assert.equal(claims.exp - claims.iat, 3600);
  assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(options.url, claims.aud); assert.equal(options.maxRedirects, 0); assert.equal(options.timeout, 30000);
  assert.equal(options.maxContentLength, 1048576); assert.equal(options.retryConfig.totalTimeout, 30000);
  assert.equal(options.data.grant_type, 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  assert.equal(token.accessToken, 'access'); assert.equal(token.idToken, 'id'); assert.equal(token.tokenType, 'Bearer');
  assert.equal(token.refreshToken, undefined); assert.equal(token.email, undefined); assert.equal(token.hasExpired(), false);
  assert(token.expiresAt >= start + 3600000 && token.expiresAt <= Date.now() + 3600000);
  assert.deepEqual(result, data); assert(Object.isFrozen(result));
  assert.equal(await token.getToken(), result);
});
test('concurrent forced refreshes share one request and promise', async () => {
  const pending = deferred(); let calls = 0;
  const token = make(() => { calls++; return pending.promise; });
  const first = token.getToken({forceRefresh: true});
  const second = token.getToken({forceRefresh: true});
  assert.equal(first, second); await tick(); assert.equal(calls, 1);
  pending.resolve({data}); assert.equal(await first, await second);
});
test('callbacks are asynchronous and report both success and failure once', async () => {
  const token = make(); await token.getToken(); let sync = true;
  const promise = new Promise((resolve, reject) => token.getToken((error, value) => { try { assert.equal(sync, false); assert.equal(error, null); assert.equal(value.access_token, 'access'); resolve(); } catch (e) { reject(e); } }));
  sync = false; await promise;
  await new Promise(resolve => new GoogleToken().getToken(error => { code('MISSING_CREDENTIALS')(error); resolve(); }));
});
test('stale completion and cleanup cannot replace or detach a new flight', async () => {
  const old = deferred(), fresh = deferred(); let calls = 0;
  const token = make(() => ++calls === 1 ? old.promise : fresh.promise);
  const first = token.getToken(); const rejected = assert.rejects(first, code('STALE_CONFIGURATION'));
  await tick(); token.scope = 'changed'; const second = token.getToken(); await rejected;
  old.resolve({data: {...data, access_token: 'old'}}); await tick();
  assert.equal(token.getToken({forceRefresh: true}), second); assert.equal(calls, 2);
  fresh.resolve({data: {...data, access_token: 'new'}}); await second; assert.equal(token.accessToken, 'new');
});
test('changing configuration invalidates a completed cache', async () => {
  let count = 0; const token = make(async () => ({data: {...data, access_token: 'token' + ++count}}));
  await token.getToken(); token.sub = 'different'; await token.getToken(); assert.equal(count, 2);
  token.additionalClaims = {target_audience: 'audience'}; await token.getToken(); assert.equal(count, 3);
});
test('copies and freezes claims before asynchronous work', async () => {
  const claims = {nested: {value: 'first'}}; let assertion;
  const token = make(async opts => { assertion = opts.data.assertion; return {data}; }, {additionalClaims: claims});
  claims.nested.value = 'second'; await token.getToken();
  assert.equal(JSON.parse(Buffer.from(assertion.split('.')[1], 'base64url')).nested.value, 'first');
  assert.throws(() => { token.additionalClaims.nested.value = 'third'; }, TypeError);
});
test('aborting one waiter leaves other waiters running', async () => {
  const pending = deferred(); let transportSignal;
  const token = make(opts => { transportSignal = opts.signal; return pending.promise; });
  const abort = new AbortController(); const first = token.getToken({signal: abort.signal}); const second = token.getToken();
  await tick(); abort.abort('private reason'); await assert.rejects(first, code('ABORT_ERR')); assert.equal(transportSignal.aborted, false);
  pending.resolve({data}); assert.equal((await second).access_token, 'access');
});
test('last aborted waiter cancels transport and permits a fresh request', async () => {
  const pending = deferred(); let count = 0, signal;
  const token = make(opts => { signal = opts.signal; return ++count === 1 ? pending.promise : Promise.resolve({data}); });
  const abort = new AbortController(); const promise = token.getToken({signal: abort.signal});
  await tick(); abort.abort(); await assert.rejects(promise, code('ABORT_ERR')); assert.equal(signal.aborted, true);
  await token.getToken(); pending.resolve({data: {...data, access_token: 'stale'}}); await tick(); assert.equal(token.accessToken, 'access');
});
test('pre-aborted signal never starts an exchange', async () => {
  let count = 0; const controller = new AbortController(); controller.abort();
  await assert.rejects(make(async () => { count++; return {data}; }).getToken({signal: controller.signal}), code('ABORT_ERR')); assert.equal(count, 0);
});
test('deadline settles even a non-cooperative transporter and ignores late results', async () => {
  const pending = deferred(); let signal;
  const token = make(opts => { signal = opts.signal; return pending.promise; }, {timeout: 15});
  await assert.rejects(token.getToken(), code('ETIMEDOUT')); assert.equal(signal.aborted, true);
  pending.resolve({data}); await tick(); assert.equal(token.rawToken, undefined);
  token.timeout = 30000; token.transporter = {request: async () => ({data})}; await token.getToken(); assert.equal(token.accessToken, 'access');
});
for (const expires_in of ['3600', null, -1, Infinity, NaN, 1.5, Number.MAX_SAFE_INTEGER]) test('rejects invalid expiry ' + String(expires_in), async () => {
  const token = make(async () => ({data: {...data, expires_in}}));
  await assert.rejects(token.getToken(), code('INVALID_RESPONSE')); assert.equal(token.expiresAt, undefined);
});
test('zero expiry and an ID token without expiry remain immediately refreshable', async () => {
  const token = make(async () => ({data: {...data, expires_in: 0}})); await token.getToken(); assert(token.hasExpired());
  const id = make(async () => ({data: {id_token: 'only-id'}})); await id.getToken(); assert.equal(id.idToken, 'only-id'); assert(id.hasExpired());
});
for (const value of [null, [], {}, {access_token: 42}, Object.create({access_token: 'inherited'})]) test('rejects invalid response ' + JSON.stringify(value), async () => {
  await assert.rejects(make(async () => ({data: value})).getToken(), code('INVALID_RESPONSE'));
});
test('failed forced refresh clears token and expiry without modifying frozen errors', async () => {
  const token = make(); await token.getToken();
  token.transporter = {request: async () => { throw Object.freeze({message: 'private', config: {assertion: 'secret'}, response: {status: 400, data: {error: 'invalid_grant', error_description: 'secret'}}}); }};
  await assert.rejects(token.getToken({forceRefresh: true}), error => { assert.equal(error.code, 'invalid_grant'); assert.equal(error.status, 400); assert.doesNotMatch(require('node:util').inspect(error), /secret|private|assertion|error_description/); assert.equal(error.cause, undefined); return true; });
  assert.equal(token.rawToken, undefined); assert.equal(token.expiresAt, undefined);
});
test('redacts unknown errors including JSON parser excerpts and credentials', async () => {
  await assert.rejects(make(async () => { throw new Error('private-key-secret'); }).getToken(), error => { assert.equal(error.message, 'Token request failed'); assert.equal(error.config, undefined); return true; });
});
test('revocation uses POST body, coalesces and preserves configuration', async () => {
  const pending = deferred(); let calls = 0;
  const token = make(opts => { calls++; assert.equal(opts.url, 'https://oauth2.googleapis.com/revoke'); assert.equal(opts.method, 'POST'); assert.deepEqual(opts.data, {token: 'a&b?c'}); return pending.promise; }, {eagerRefreshThresholdMillis: 5000});
  token.rawToken = {access_token: 'a&b?c'}; token.expiresAt = Date.now() + 100000;
  const first = token.revokeToken(); assert.equal(token.revokeToken(), first); await tick(); assert.equal(calls, 1);
  pending.resolve({data: ''}); await first; assert.equal(token.rawToken, undefined); assert.equal(token.expiresAt, undefined); assert.equal(token.eagerRefreshThresholdMillis, 5000); assert.equal(token.key, key);
});
test('revocation cancels old refresh and serializes the next refresh', async () => {
  const old = deferred(), revoking = deferred(); let count = 0;
  const token = make(opts => opts.url.endsWith('/revoke') ? revoking.promise : ++count === 1 ? old.promise : Promise.resolve({data: {...data, access_token: 'new'}}));
  token.rawToken = {...data}; token.expiresAt = 0;
  const refresh = token.getToken(); const rejection = assert.rejects(refresh, code('TOKEN_REVOKED')); await tick();
  const revoke = token.revokeToken(); const next = token.getToken(); await rejection; await tick(); assert.equal(count, 1);
  old.resolve({data: {...data, access_token: 'old'}}); revoking.resolve({data: ''}); await revoke; await next; assert.equal(token.accessToken, 'new');
});
test('revocation failure retains current token and sanitizes the error', async () => {
  const token = make(async () => { throw {response: {status: 500, data: {error: 'private token'}}}; }); token.rawToken = {...data};
  await assert.rejects(token.revokeToken(), error => { assert.equal(error.status, 500); assert.doesNotMatch(error.message, /private/); return true; }); assert.equal(token.accessToken, 'access');
});
test('revocation callback and missing-token error', async () => {
  const token = make(); await token.getToken(); await new Promise((resolve, reject) => token.revokeToken(error => error ? reject(error) : resolve()));
  await assert.rejects(token.revokeToken(), code('MISSING_CREDENTIALS'));
});
test('validates options and recovers after a mutable option is repaired', async () => {
  for (const options of [{timeout: 0}, {timeout: NaN}, {maxResponseSize: -1}, {eagerRefreshThresholdMillis: -1}, {transporter: {}}]) assert.throws(() => make(undefined, options), code('INVALID_OPTIONS'));
  const token = make(); token.timeout = 0; await assert.rejects(token.getToken(), code('INVALID_OPTIONS')); token.timeout = 30000; await token.getToken();
  await assert.rejects(token.getToken({forceRefresh: 'yes'}), code('INVALID_OPTIONS'));
});
test('requires issuer and RSA private key and validates reserved claims', async () => {
  await assert.rejects(make(undefined, {email: undefined}).getToken(), code('MISSING_CREDENTIALS'));
  await assert.rejects(make(undefined, {key: 'bad'}).getToken(), code('INVALID_CREDENTIALS'));
  const ec = crypto.generateKeyPairSync('ec', {namedCurve: 'P-256'}).privateKey.export({format: 'pem', type: 'pkcs8'});
  await assert.rejects(make(undefined, {key: ec}).getToken(), code('INVALID_CREDENTIALS'));
  for (const additionalClaims of [{aud: 'https://attacker.test'}, {exp: Infinity}, {exp: 1}, {scope: []}]) await assert.rejects(make(undefined, {additionalClaims}).getToken(), code('INVALID_CLAIMS'));
});
test('bounds and sanitizes credential files; reads JSON, PEM and uppercase extensions', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vgtoken-test-'));
  const file = path.join(directory, 'key.JSON'), token = make();
  try {
    fs.writeFileSync(file, JSON.stringify({private_key: key, client_email: email})); assert.deepEqual(await token.getCredentials(file), {privateKey: key, clientEmail: email});
    const loader = make(undefined, {key: undefined, email: undefined, keyFile: file}); await loader.getToken(); assert.equal(loader.key, key); assert.equal(loader.iss, email);
    fs.writeFileSync(file, '{"secret":"sensitive-credential",'); await assert.rejects(token.getCredentials(file), error => { code('INVALID_CREDENTIALS')(error); assert.doesNotMatch(error.message, /sensitive/); return true; });
    fs.writeFileSync(file, Buffer.from([0xff])); await assert.rejects(token.getCredentials(file), code('INVALID_CREDENTIALS'));
    fs.writeFileSync(file, 'x'.repeat(1048577)); await assert.rejects(token.getCredentials(file), code('INVALID_CREDENTIALS'));
    fs.writeFileSync(file, '{}'); await assert.rejects(token.getCredentials(file), code('MISSING_CREDENTIALS'));
    await assert.rejects(token.getCredentials(path.join(directory, 'missing.pem')), code('INVALID_CREDENTIALS'));
    await assert.rejects(token.getCredentials('certificate.p12'), code('UNKNOWN_CERTIFICATE_TYPE'));
    const folder = path.join(directory, 'directory.pem'); fs.mkdirSync(folder); await assert.rejects(token.getCredentials(folder), code('INVALID_CREDENTIALS'));
    assert.equal((await token.getCredentials(path.join(__dirname, 'key.pem'))).privateKey, key);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
test('actual VPM HTTP transport encodes forms, refuses redirects and enforces body limits', async () => {
  const client = new Gaxios({noProxy: ['*']}); let mode = 'token', received, visits = 0;
  const server = http.createServer((request, response) => { visits++; let body = ''; request.on('data', chunk => body += chunk); request.on('end', () => { received = {url: request.url, type: request.headers['content-type'], body}; response.setHeader('content-type', 'application/json'); if (mode === 'redirect') { response.writeHead(307, {location: '/leak'}); response.end(); } else response.end(JSON.stringify(mode === 'large' ? {...data, access_token: 'x'.repeat(4096)} : data)); }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const token = make(options => client.request({...options, url: 'http://127.0.0.1:' + server.address().port + new URL(options.url).pathname, retry: false, retryConfig: {retry: 0}}), {maxResponseSize: 1024});
    await token.getToken(); assert.equal(received.type, 'application/x-www-form-urlencoded'); assert(new URLSearchParams(received.body).get('assertion'));
    token.rawToken = {access_token: 'a&b=c'}; await token.revokeToken(); assert.equal(received.url, '/revoke'); assert.equal(new URLSearchParams(received.body).get('token'), 'a&b=c');
    mode = 'redirect'; const before = visits; await assert.rejects(token.getToken()); assert.equal(visits, before + 1);
    mode = 'large'; await assert.rejects(token.getToken()); assert.equal(token.rawToken, undefined);
  } finally { client.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('a waiter can abort during revocation without cancelling revocation', async () => {
  const pending = deferred(); const token = make(() => pending.promise); token.rawToken = {...data};
  const revocation = token.revokeToken(), controller = new AbortController();
  const waiting = token.getToken({signal: controller.signal}); controller.abort();
  await assert.rejects(waiting, code('ABORT_ERR')); assert.equal(token.accessToken, 'access');
  pending.resolve({data: ''}); await revocation; assert.equal(token.accessToken, undefined);
});
test('deadline also rejects synchronous transport stalls before publishing cache', async () => {
  const token = make(async () => { const end = performance.now() + 15; while (performance.now() < end) {} return {data}; }, {timeout: 5});
  await assert.rejects(token.getToken(), code('ETIMEDOUT')); assert.equal(token.rawToken, undefined);
});
test('a forged local error from a transporter is sanitized', async () => {
  await assert.rejects(make(async () => { throw new TokenError('INVALID_CREDENTIALS', 'private secret'); }).getToken(), error => { assert.equal(error.message, 'Token request failed'); return true; });
});
test('changing private keys invalidates the imported signing key', async () => {
  const replacement = crypto.generateKeyPairSync('rsa', {modulusLength: 2048}); let assertion;
  const token = make(async options => { assertion = options.data.assertion; return {data}; }); await token.getToken();
  token.key = replacement.privateKey.export({format: 'pem', type: 'pkcs8'}); await token.getToken();
  const [header, payload, signature] = assertion.split('.');
  assert(crypto.verify('RSA-SHA256', Buffer.from(header + '.' + payload), replacement.publicKey, Buffer.from(signature, 'base64url')));
  assert.equal(crypto.verify('RSA-SHA256', Buffer.from(header + '.' + payload), crypto.createPublicKey(key), Buffer.from(signature, 'base64url')), false);
});
