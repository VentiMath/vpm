'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const mode = process.argv[2];
if (!mode) {
  for (const implementation of ['upstream', 'vpm']) {
    const result = spawnSync(process.execPath, [__filename, implementation], {encoding: 'utf8', timeout: 30000});
    assert.equal(result.status, 0, result.stdout + result.stderr);
    process.stdout.write(result.stdout);
  }
} else main().catch(error => {console.error(error); process.exitCode = 1;});

async function main() {
  const vpm = mode === 'vpm';
  const root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
  const {FirebaseAppInternals, FirebaseApp} = require(root + '/lib/app/firebase-app');
  const {AppStore, defaultAppStore} = require(root + '/lib/app/lifecycle');
  const valid = () => ({access_token: 'test-only-token', expires_in: 3600});
  let calls = 0;
  const acquisition = Promise.withResolvers();
  const shared = new FirebaseAppInternals({getAccessToken() {calls++; return acquisition.promise;}});
  const forced = Array.from({length: 20}, () => shared.getToken(true));
  acquisition.resolve(valid());
  await Promise.all(forced);
  assert.equal(calls, vpm ? 1 : 20, 'concurrent forced refresh ownership');

  let attempts = 0;
  const retry = new FirebaseAppInternals({getAccessToken() {
    if (++attempts === 1) throw new Error('synchronous provider failure');
    return valid();
  }});
  let threwSynchronously = false;
  try {const request = retry.getToken(); await assert.rejects(request, /synchronous provider failure/);}
  catch (error) {assert.match(error.message, /synchronous provider failure/); threwSynchronously = true;}
  assert.equal(threwSynchronously, !vpm);
  const second = retry.getToken();
  if (vpm) assert.equal((await second).accessToken, valid().access_token);
  else assert.equal(second, undefined, 'upstream remains refreshing after a synchronous throw');

  if (vpm) {
    let rejectNext = false;
    const lease = new FirebaseAppInternals({getAccessToken() {
      return rejectNext ? Promise.reject(new Error('temporary')) : valid();
    }});
    let observed;
    lease.addAuthTokenListener(value => {observed = lease.getCachedToken().accessToken; assert.equal(observed, value);});
    const cached = await lease.getToken();
    rejectNext = true;
    await assert.rejects(lease.getToken(true), /temporary/);
    assert.equal(await lease.getToken(), cached, 'a failed forced refresh keeps a healthy cache');
    rejectNext = false;
    assert.equal((await lease.getToken(true)).accessToken, observed);
  }

  for (const expires_in of [NaN, Infinity, -1, 0]) {
    const malformed = new FirebaseAppInternals({getAccessToken: () => ({access_token: 'private-token-value', expires_in})});
    if (vpm) await assert.rejects(malformed.getToken(), error => error.code === 'app/invalid-credential' && !String(error).includes('private-token-value'));
    else await malformed.getToken();
  }
  const malformed = new FirebaseAppInternals({getAccessToken: () => ({access_token: 'private-token-value', expires_in: 'invalid'})});
  await assert.rejects(malformed.getToken(), error => {
    assert.equal(String(error).includes('private-token-value'), !vpm, 'malformed response must not disclose tokens');
    if (vpm) assert.ok(!JSON.stringify(error).includes('private-token-value'));
    return true;
  });

  const local = new AppStore();
  const localApp = local.initializeApp({projectId: 'p'}, 'local-owner');
  if (vpm) {await local.deleteApp(localApp); assert.deepEqual(local.getApps(), []);}
  else {assert.throws(() => local.deleteApp(localApp), /does not exist/); await localApp.delete();}
  const owned = defaultAppStore.initializeApp({projectId: 'p'}, 'identity');
  const imposter = {name: 'identity', options: {}};
  if (vpm) {assert.throws(() => defaultAppStore.deleteApp(imposter), /Invalid app argument/); assert.equal(defaultAppStore.getApp('identity'), owned); await owned.delete();}
  else {await defaultAppStore.deleteApp(imposter); assert.throws(() => defaultAppStore.getApp('identity'), /does not exist/);}

  const services = new FirebaseApp({projectId: 'p'}, 'service-names');
  let made = 0;
  for (const name of ['constructor', '__proto__', 'toString']) {
    const service = services.getOrInitService(name, () => {made++; return {name};});
    if (vpm) assert.equal(service.name, name);
  }
  assert.equal(made, vpm ? 3 : 0);
  await services.delete();

  const app = new FirebaseApp({projectId: 'p'}, 'closing');
  const cleanup = Promise.withResolvers();
  let cleanups = 0;
  app.getOrInitService('slow', () => ({delete() {cleanups++; return cleanup.promise;}}));
  const first = app.delete(), again = app.delete();
  assert.equal(first === again, vpm);
  if (vpm) assert.throws(() => app.getOrInitService('late', () => ({})), {code: 'app/app-deleted'});
  else app.getOrInitService('late', () => ({}));
  cleanup.resolve(); await Promise.all([first, again]);
  assert.equal(cleanups, vpm ? 1 : 2);

  const failed = new FirebaseApp({projectId: 'p'}, 'failed-cleanup');
  let visited = false;
  failed.getOrInitService('fails', () => ({delete() {throw new Error('cleanup failed');}}));
  failed.getOrInitService('second', () => ({delete() {visited = true;}}));
  if (vpm) {
    await assert.rejects(failed.delete(), /cleanup failed/);
    assert.throws(() => failed.getOrInitService('later', () => ({})), {code: 'app/app-deleted'});
  } else assert.throws(() => failed.delete(), /cleanup failed/);
  assert.equal(visited, vpm);

  // Each implementation lives in a disposable process: the upstream control
  // actually demonstrates Object.prototype pollution without touching callers.
  const options = JSON.parse('{"projectId":"p","__proto__":{"vpmOptionPollution":true}}');
  const isolated = new FirebaseApp(options, 'options');
  assert.equal({}.vpmOptionPollution === true, !vpm);
  if (vpm) {
    assert.equal(Object.hasOwn(isolated.options, '__proto__'), true);
    const record = Object.assign(Object.create(null), {value: 1});
    const detached = new FirebaseApp({extra: record}, 'null-prototype');
    record.value = 2; assert.equal(detached.options.extra.value, 1);
    const cycle = {}; cycle.self = cycle;
    assert.throws(() => new FirebaseApp(cycle, 'cycles'), /must not contain cycles/);
    const store = new AppStore();
    let deep = {value: 1};
    for (let i = 0; i < 20000; i++) deep = {nested: deep};
    const deepApp = store.initializeApp({extra: deep}, 'deep-options');
    assert.equal(store.initializeApp({extra: deep}, 'deep-options'), deepApp);
    let shared = {value: 1};
    for (let i = 0; i < 100; i++) shared = {left: shared, right: shared};
    const sharedApp = store.initializeApp({extra: shared}, 'shared-options');
    assert.equal(store.initializeApp({extra: shared}, 'shared-options'), sharedApp);
    const recursive = new FirebaseApp({}, 'recursive');
    assert.throws(() => recursive.getOrInitService('same', () => recursive.getOrInitService('same', () => ({}))), /Recursive initialization/);
    assert.throws(() => recursive.getOrInitService('delete', () => recursive.delete()), /service initializer/);
    assert.deepEqual(recursive.getOrInitService('same', () => ({recovered: true})), {recovered: true});
    await recursive.delete(); await deepApp.delete(); await sharedApp.delete(); await detached.delete();
  }
  delete Object.prototype.vpmOptionPollution;
  await isolated.delete();
  console.log(`${mode}: app registry, token, service teardown and snapshot controls passed`);
}
