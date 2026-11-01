'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http');
const {spawnSync} = require('node:child_process');
const variant = process.argv[2];
if (!variant) {
  const outcomes = [];
  for (const library of ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, [__filename, library], {encoding: 'utf8', timeout: 60000});
    assert.equal(child.status, 0, child.stdout + child.stderr);
    outcomes.push(JSON.parse(child.stdout));
  }
  assert.deepEqual(outcomes[0], outcomes[1]);
  console.log(`Auth user operations: ${outcomes[0][1].length} normal HTTP requests and ${outcomes[0][0].length} results match; mutation, sparse-array, malformed-result and input-ownership controls pass.`);
} else main().catch(error => {console.error(error); process.exitCode = 1;});

async function main() {
  const vpm = variant === 'vpm', calls = [];
  let batchReply = {};
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const input = JSON.parse(Buffer.concat(chunks).toString());
    calls.push({path: request.url, data: input, authorization: request.headers.authorization});
    let output;
    if (request.url.endsWith('/accounts:batchDelete')) output = batchReply;
    else if (request.url.endsWith('/accounts:update')) output = {localId: input.localId};
    else output = {users: [{localId: input.localId[0], email: 'test@example.com', disabled: false}]};
    response.writeHead(200, {'content-type': 'application/json'});
    response.end(JSON.stringify(output));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:' + server.address().port;
  const root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
  const {initializeApp, deleteApp} = require(root + '/lib/app');
  const {getAuth} = require(root + '/lib/auth');
  const app = initializeApp({projectId: 'p', credential: {getAccessToken: async () => ({access_token: 'fixture', expires_in: 3600})}});
  const auth = getAuth(app);
  const outcome = async callback => {
    try {return {value: await callback()};} catch (error) {return {code: error.code, type: error.constructor.name};}
  };
  try {
    const normal = [];
    normal.push((await auth.getUser('one')).uid);
    normal.push((await auth.updateUser('one', {disabled: true})).uid);
    normal.push((await auth.updateUser('one', {displayName: null, photoURL: null, phoneNumber: null, providersToUnlink: ['google.com']})).uid);
    normal.push((await auth.updateUser('one', {providerToLink: {providerId: 'email', uid: 'new@example.com'}})).uid);
    await auth.revokeRefreshTokens('one');
    normal.push(await auth.deleteUsers(['one', 'two']));
    batchReply = {errors: [{index: 1, localId: 'two', message: 'NOT_DISABLED: fixture'}]};
    const partial = await auth.deleteUsers(['one', 'two', 'three']);
    normal.push({successCount: partial.successCount, failureCount: partial.failureCount,
      errors: partial.errors.map(({index, error}) => ({index, code: error.code, message: error.message}))});
    batchReply = {};
    const ordinaryCalls = calls.map(call => ({...call, data: call.data.validSince === undefined ? call.data : {...call.data, validSince: '<now>'}}));

    const ids = ['one'], deleting = auth.deleteUsers(ids);
    ids.push('two');
    assert.equal((await deleting).successCount, vpm ? 1 : 2);
    assert.deepEqual(calls.at(-1).data.localIds, ['one']);
    const customIterable = ['one'];
    customIterable[Symbol.iterator] = function* () {yield 'other';};
    await auth.deleteUsers(customIterable);
    assert.deepEqual(calls.at(-1).data.localIds, ['one']);
    assert.equal((await outcome(() => auth.deleteUsers(new Array(100000000)))).code, 'auth/maximum-user-count-exceeded');
    const sparse = await outcome(() => auth.deleteUsers(new Array(1)));
    if (vpm) assert.equal(sparse.code, 'auth/invalid-uid');
    else {assert.equal(sparse.value.successCount, 1); assert.deepEqual(calls.at(-1).data.localIds, []);}

    for (const indices of [[-1], [1], [0.5], ['0'], [null], [0, 0]]) {
      batchReply = {errors: indices.map(index => ({index, localId: 'one', message: 'FAIL'}))};
      const result = await outcome(() => auth.deleteUsers(['one']));
      if (vpm) assert.equal(result.code, 'auth/internal-error');
      else assert.equal(result.value.failureCount, indices.length);
    }
    batchReply = {};
    const properties = {constructor: null, disabled: true};
    await auth.updateUser('one', properties);
    if (vpm) assert.deepEqual(properties, {constructor: null, disabled: true});
    else {assert.equal(properties.localId, 'one'); assert.equal(properties.disableUser, true); assert.equal(properties.disabled, undefined);}
    class Changes {constructor() {this.providerToLink = {providerId: 'phone', uid: '+15555550100'};}}
    const frozenChanges = Object.freeze(new Changes());
    const classResult = await outcome(() => auth.updateUser('one', frozenChanges));
    if (vpm) {assert.equal(classResult.value.uid, 'one'); assert.equal(frozenChanges.providerToLink.providerId, 'phone');}
    else assert.equal(classResult.type, 'TypeError');

    const marker = 'vpmAuthInputMarker';
    const unsafe = JSON.parse('{"__proto__":{"vpmAuthInputMarker":true},"disabled":true}');
    let polluted;
    try {await auth.updateUser('one', unsafe); polluted = Object.hasOwn(Object.prototype, marker);}
    finally {delete Object.prototype[marker];}
    assert.equal(polluted, !vpm);
    const bothProviders = await outcome(() => auth.updateUser('one', {
      providerToLink: {providerId: 'google.com', uid: 'external'}, providersToUnlink: 'github.com',
    }));
    if (vpm) assert.equal(bothProviders.code, 'auth/argument-error');
    else assert.equal(bothProviders.value.uid, 'one');
    process.stdout.write(JSON.stringify([normal, ordinaryCalls]));
  } finally {
    await deleteApp(app);
    await new Promise(resolve => server.close(resolve));
  }
}
