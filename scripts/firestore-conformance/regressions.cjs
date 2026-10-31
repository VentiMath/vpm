'use strict';
// Reproduces defects in @google-cloud/firestore 9.4.0 with the original, then
// checks vgoogle-cloud-firestore. Each case runs in a fresh process so module
// loading and unhandled rejections are observed per library.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
const libraries = {
  upstream: path.join(__dirname, 'node_modules/@google-cloud/firestore'),
  vpm: path.resolve(__dirname, '../../packages/vgoogle-cloud-firestore'),
};

function run(library, body) {
  const source = `
    const library = require(${JSON.stringify(libraries[library])});
    let unhandled = 0;
    process.on('unhandledRejection', () => { unhandled++; });
    const within = (promise, ms) => Promise.race([promise.then(() => 'resolved', error => 'rejected: ' + (error instanceof Error ? error.message : 'string ' + JSON.stringify(error))),
      new Promise(resolve => setTimeout(() => resolve('pending after ' + ms + ' ms'), ms))]);
    (async () => { const result = await (async () => { ${body} })(); await new Promise(r => setTimeout(r, 50));
      process.stdout.write(JSON.stringify({result, unhandled}), () => process.exit()); })()
      .catch(error => process.stdout.write(JSON.stringify({thrown: error.stack}), () => process.exit()));`;
  const child = spawnSync(process.execPath, ['-e', source], {encoding: 'utf8', timeout: 120000});
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.thrown, undefined, result.thrown);
  return result;
}
const both = body => ({upstream: run('upstream', body), vpm: run('vpm', body)});

// Import: upstream requires @google-cloud/firestore-api eagerly, and 0.2.0
// loads its own google-gax 5 stack and protobufjs at import, which the
// package's own lazy-load tests forbid (they are skipped whenever an earlier
// test has already loaded gax, so they never run).
{
  const {upstream, vpm} = both(`
    const files = Object.keys(require.cache).map(f => f.replace(/\\\\/g, '/'));
    const has = pattern => files.some(f => pattern.test(f));
    return {modules: files.length, gax: has(/\\/v?google-gax\\//), protobufjs: has(/\\/v?protobufjs\\//), otel: has(/\\/(?:@opentelemetry\\/api|vopentelemetry-api)\\//)};`);
  assert.deepEqual({gax: upstream.result.gax, protobufjs: upstream.result.protobufjs, otel: upstream.result.otel}, {gax: true, protobufjs: true, otel: true});
  assert.deepEqual({gax: vpm.result.gax, protobufjs: vpm.result.protobufjs, otel: vpm.result.otel}, {gax: false, protobufjs: false, otel: false});
  assert.ok(upstream.result.modules > 300 && vpm.result.modules < 100, JSON.stringify([upstream.result.modules, vpm.result.modules]));
}

// One transport stack: once the client pool creates a GAPIC client, upstream
// has loaded two google-gax versions (its own ^6 and firestore-api 0.2.0's ^5).
{
  const {upstream, vpm} = both(`
    const db = new library.Firestore({projectId: 'p'});
    await db._clientPool.run('regression', false, async () => {});
    const versions = new Set();
    for (const file of Object.keys(require.cache)) {
      const match = file.replace(/\\\\/g, '/').match(/^(.*\\/v?google-gax)\\//);
      if (match) versions.add(require(match[1] + '/package.json').version);
    }
    await db.terminate();
    return [...versions].sort();`);
  assert.equal(upstream.result.length, 2, JSON.stringify(upstream.result));
  assert.equal(vpm.result.length, 1, JSON.stringify(vpm.result));
}

// Reads after terminate(): the stream request discards the client pool's
// rejection, so every read waits forever and the rejection is unhandled
// (which terminates Node by default). Writes already rejected.
{
  const {upstream, vpm} = both(`
    const db = new library.Firestore({projectId: 'p', ssl: false, host: '127.0.0.1:1'});
    await db.terminate();
    const listen = within(new Promise((resolve, reject) => db.collection('c').onSnapshot(resolve, reject)), 1500);
    return {
      query: await within(db.collection('c').get(), 1500), document: await within(db.doc('c/d').get(), 1500),
      count: await within(db.collection('c').count().get(), 1500), getAll: await within(db.getAll(db.doc('c/a')), 1500),
      listen: await listen, write: await within(db.doc('c/d').set({a: 1}), 1500)};`);
  const terminated = 'rejected: The client has already been terminated';
  assert.deepEqual(upstream.result, {query: 'pending after 1500 ms', document: 'pending after 1500 ms', count: 'pending after 1500 ms',
    getAll: 'pending after 1500 ms', listen: 'pending after 1500 ms', write: terminated});
  assert.ok(upstream.unhandled >= 4, String(upstream.unhandled));
  assert.deepEqual(vpm.result, {query: terminated, document: terminated, count: terminated, getAll: terminated, listen: terminated, write: terminated});
  assert.equal(vpm.unhandled, 0);
}

// terminate() with an active listener rejects with a bare string.
{
  const {upstream, vpm} = both(`
    const db = new library.Firestore({projectId: 'p', ssl: false, host: '127.0.0.1:1'});
    const unsubscribe = db.collection('c').onSnapshot(() => {}, () => {});
    const outcome = await within(db.terminate(), 1000);
    unsubscribe();
    await db.terminate();
    return outcome;`);
  assert.match(upstream.result, /^rejected: string "All onSnapshot\(\) listeners must be unsubscribed/);
  assert.match(vpm.result, /^rejected: All onSnapshot\(\) listeners must be unsubscribed/);
}

console.log('Reproduced and fixed eager gax/protobufjs/OpenTelemetry loading, duplicate gax stacks, reads that hang with unhandled rejections after terminate(), and string rejections from terminate().');
