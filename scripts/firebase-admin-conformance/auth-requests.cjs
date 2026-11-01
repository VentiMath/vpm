'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http');
const {spawnSync} = require('node:child_process');
const variant = process.argv[2];
if (!variant) {
  for (const kind of ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, [__filename, kind], {encoding: 'utf8', timeout: 60000});
    assert.equal(child.status, 0, child.stdout + child.stderr);
  }
  console.log('Auth requests: normal wire data, resource encoding, request ownership, project lookup/retry and malformed server errors pass.');
} else main().catch(error => {console.error(error); process.exitCode = 1;});

async function main() {
  const vpm = variant === 'vpm', root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
  const {FirebaseApp} = require(root + '/lib/app/firebase-app');
  const {AuthRequestHandler, TenantAwareAuthRequestHandler} = require(root + '/lib/auth/auth-api-request');
  const {ApiSettings} = require(root + '/lib/utils/api-request');
  const utils = require(root + '/lib/utils/index');
  const app = new FirebaseApp({projectId: 'project', credential: {getAccessToken: async () => ({access_token: 'test-only', expires_in: 3600})}}, 'requests');
  const handler = new AuthRequestHandler(app);
  const builder = handler.getAuthUrlBuilder();
  assert.equal(await builder.getUrl('/accounts:lookup'), 'https://identitytoolkit.googleapis.com/v1/projects/project/accounts:lookup');
  const base = 'https://identitytoolkit.googleapis.com/v1/projects/project';
  const tenantBuilder = new TenantAwareAuthRequestHandler(app, 'tenant').getAuthUrlBuilder();
  assert.equal(await tenantBuilder.getUrl('/accounts:lookup'), base + '/tenants/tenant/accounts:lookup');
  assert.equal(await builder.getUrl('/config?updateMask={updateMask}', {updateMask: 'signIn.email.enabled,displayName'}), base + '/config?updateMask=signIn.email.enabled,displayName');
  const resource = 'oidc/a?x=1#fragment';
  const url = await builder.getUrl('/providers/{providerId}', {providerId: resource});
  assert.equal(url, base + '/providers/' + (vpm ? encodeURIComponent(resource) : resource));
  const mask = await builder.getUrl('/config?updateMask={updateMask}', {updateMask: 'email,displayName&other=true'});
  assert.equal(new URL(mask).searchParams.has('other'), !vpm);
  const replacement = await builder.getUrl('/providers/{providerId}', {providerId: '$&'});
  assert.equal(replacement, base + '/providers/' + (vpm ? '%24%26' : '{providerId}'));
  const prototypeParams = Object.create({providerId: 'inherited'});
  assert.equal(await builder.getUrl('/providers/{providerId}', prototypeParams), base + '/providers/' + '{providerId}');
  for (const name of ['.', '..']) {
    const operation = () => builder.getUrl('/providers/{providerId}', {providerId: name});
    if (vpm) assert.throws(operation, {code: 'auth/argument-error'});
    else assert.equal(await operation(), base + '/providers/' + name);
  }
  if (vpm) assert.throws(() => builder.getUrl('/providers/{providerId}', {providerId: '\ud800'}), {code: 'auth/argument-error'});
  const strangeApp = new FirebaseApp({projectId: 'p/{providerId}?override=1'}, 'strange');
  const strangeUrl = await new AuthRequestHandler(strangeApp).getAuthUrlBuilder().getUrl('/providers/{providerId}', {providerId: 'oidc.one'});
  assert.equal(strangeUrl, vpm
    ? 'https://identitytoolkit.googleapis.com/v1/projects/p%2F%7BproviderId%7D%3Foverride%3D1/providers/oidc.one'
    : 'https://identitytoolkit.googleapis.com/v1/projects/p/oidc.one?override=1/providers/oidc.one');

  // Hold only project discovery. Validation and HTTP dispatch remain the SDK's.
  const findProject = utils.findProjectId;
  try {
    let discoveries = 0, release;
    const shared = new AuthRequestHandler(app).getAuthUrlBuilder();
    // Every discovery gets the same promise, so the original can finish too.
    const deferred = new Promise(resolve => {release = resolve;});
    utils.findProjectId = () => {discoveries++; return deferred;};
    const pending = Array.from({length: 12}, () => shared.getUrl('/accounts:lookup'));
    await Promise.resolve(); release('project'); await Promise.all(pending);
    assert.equal(discoveries, vpm ? 1 : 12);
    await shared.getUrl('/accounts:lookup'); assert.equal(discoveries, vpm ? 1 : 12);
    let attempts = 0;
    utils.findProjectId = async () => {if (++attempts === 1) throw Error('discovery retry'); return 'project';};
    const retry = new AuthRequestHandler(app).getAuthUrlBuilder();
    await assert.rejects(retry.getUrl('/accounts:lookup'), /discovery retry/);
    assert.equal(await retry.getUrl('/accounts:lookup'), base + '/accounts:lookup');
    assert.equal(attempts, 2);

    let finish;
    const wait = new Promise(resolve => {finish = resolve;});
    utils.findProjectId = () => wait;
    const mutable = new AuthRequestHandler(app), data = {localId: ['before'], nested: {enabled: true}}, params = {providerId: 'before'};
    const settings = new ApiSettings('/providers/{providerId}', 'POST').setRequestValidator(request => {request.validated = true;});
    let sent;
    mutable.httpClient.send = async request => {sent = request; return {data: {ok: true}};};
    const request = mutable.invokeRequestHandler(mutable.getAuthUrlBuilder(), settings, data, params);
    data.localId[0] = 'after'; data.nested.enabled = false; params.providerId = 'after';
    finish('project'); assert.deepEqual(await request, {ok: true});
    assert.equal(sent.data.localId[0], vpm ? 'before' : 'after');
    assert.equal(sent.data.nested.enabled, vpm);
    assert.equal(sent.url, base + '/providers/' + (vpm ? 'before' : 'after'));
    assert.equal(Object.hasOwn(data, 'validated'), !vpm);
    sent.headers['test-mutation'] = 'bad';
    await mutable.invokeRequestHandler(mutable.getAuthUrlBuilder(), settings, {}, {providerId: 'one'});
    assert.equal(Object.hasOwn(sent.headers, 'test-mutation'), !vpm);
    delete sent.headers['test-mutation'];
  } finally {utils.findProjectId = findProject;}

  // Real local HTTP proves encoding and diagnostic conversion survive the
  // shared transport. The test supplies only fake credentials, never live keys.
  let status = 200, responseBody = '{"users":[{"localId":"one"}]}', contentType = 'application/json', seen;
  const server = http.createServer(async (request, response) => {
    let body = ''; for await (const chunk of request) body += chunk;
    seen = {url: request.url, body: body && JSON.parse(body), authorization: request.headers.authorization};
    response.writeHead(status, {'content-type': contentType}); response.end(responseBody);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const previousHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:' + server.address().port;
  try {
    const network = new AuthRequestHandler(app);
    assert.deepEqual(await network.getAccountInfoByUid('one'), {users: [{localId: 'one'}]});
    assert.deepEqual(seen, {url: '/identitytoolkit.googleapis.com/v1/projects/project/accounts:lookup', body: {localId: ['one']}, authorization: 'Bearer owner'});
    const endpoint = new ApiSettings('/providers/{providerId}', 'POST');
    await network.invokeRequestHandler(network.getAuthUrlBuilder(), endpoint, {key: 'value'}, {providerId: resource});
    assert.equal(seen.url, '/identitytoolkit.googleapis.com/v1/projects/project/providers/' + (vpm ? encodeURIComponent(resource) : 'oidc/a?x=1'));
    status = 400;
    const capture = async () => {try {await network.getAccountInfoByUid('one'); throw Error('expected rejection');} catch (error) {return error;}};
    responseBody = '{"error":{"message":"USER_NOT_FOUND"}}';
    assert.equal((await capture()).code, 'auth/user-not-found');
    for (const code of [7, {}, '__proto__', 'constructor', 'toString']) {
      responseBody = JSON.stringify({error: {message: code}});
      const error = await capture();
      if (vpm) {assert.equal(error.code, 'auth/internal-error'); assert.equal(error.httpResponse.status, 400); assert.ok(error.cause);}
      else assert.ok(error instanceof TypeError, String(code) + ': ' + error);
    }
    responseBody = '<html>temporary failure</html>'; contentType = 'text/html';
    const error = await capture();
    assert.equal(error.code, vpm ? 'auth/internal-error' : 'app/unable-to-parse-response');
    if (vpm) assert.equal(error.httpResponse.data, responseBody);
  } finally {
    if (previousHost === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    else process.env.FIREBASE_AUTH_EMULATOR_HOST = previousHost;
    await new Promise(resolve => server.close(resolve));
  }
}
