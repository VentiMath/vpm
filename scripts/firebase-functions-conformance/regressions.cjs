'use strict';
// Reproduces defects in firebase-functions 7.4.0 with the original, then checks
// vfirebase-functions. Each case runs in a fresh process per library.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
const roots = {
  upstream: path.join(__dirname, 'node_modules/firebase-functions'),
  vpm: path.resolve(__dirname, '../../packages/vfirebase-functions'),
};

function run(library, body) {
  const source = `
    const root = ${JSON.stringify(roots[library])};
    const exportsMap = require(root + '/package.json').exports;
    const load = entry => require(require('node:path').join(root, exportsMap['./' + entry].require));
    (async () => { const result = await (async () => { ${body} })();
      process.stdout.write(JSON.stringify({result}), () => process.exit()); })()
      .catch(error => process.stdout.write(JSON.stringify({thrown: error.stack}), () => process.exit()));`;
  const child = spawnSync(process.execPath, ['-e', source], {encoding: 'utf8', timeout: 120000, cwd: roots[library], env: {...process.env, GCLOUD_PROJECT: 'p'}});
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.thrown, undefined, result.thrown);
  return result.result;
}
const both = body => ({upstream: run('upstream', body), vpm: run('vpm', body)});

// Importing an entry point loads every provider and each provider's Firebase
// Admin service: `firebase-functions/v2`, imported for its logger, loads the
// Firestore client, a gax stack and the Realtime Database client.
{
  const measure = entry => both(`
    const started = performance.now();
    load(${JSON.stringify(entry)});
    const files = Object.keys(require.cache).map(f => f.replace(/\\\\/g, '/'));
    const has = pattern => files.some(f => pattern.test(f));
    return {modules: files.length, firestore: has(/\\/v?(?:google-cloud-firestore|@google-cloud\\/firestore)\\//), database: has(/@firebase\\/database-compat\\//),
      admin: has(/\\/v?firebase-admin\\//)};`);
  const v2 = measure('v2'), https = measure('https'), firestore = measure('firestore');
  assert.deepEqual([v2.upstream.firestore, v2.upstream.database, v2.upstream.admin], [true, true, true]);
  assert.deepEqual([v2.vpm.firestore, v2.vpm.database, v2.vpm.admin], [false, false, false]);
  assert.ok(v2.upstream.modules > 500 && v2.vpm.modules < 50, JSON.stringify(v2));
  assert.ok(https.upstream.admin && !https.vpm.admin && https.vpm.modules < 50, JSON.stringify(https));
  assert.ok(firestore.upstream.firestore && !firestore.vpm.firestore && firestore.vpm.modules < 80, JSON.stringify(firestore));
}

// onInit: concurrent first invocations each run the initialization callback,
// because the "done" flag is set only after the callback resolves.
{
  const {upstream, vpm} = both(`
    const {onInit} = load('v2'), {onRequest} = load('https');
    let runs = 0;
    onInit(async () => { runs++; await new Promise(resolve => setTimeout(resolve, 20)); });
    const handler = onRequest(async (request, response) => { response.status(200).send('ok'); });
    const response = () => ({statusCode: 0, headersSent: false, status(code) { this.statusCode = code; return this; }, send() { this.headersSent = true; return this; }, on() {}});
    const request = () => ({headers: {}, header: () => undefined, get: () => undefined, method: 'GET', url: '/'});
    const responses = Array.from({length: 5}, response);
    await Promise.all(responses.map(r => handler(request(), r)));
    await handler(request(), response());
    return {runs, statuses: responses.map(r => r.statusCode)};`);
  assert.deepEqual(upstream, {runs: 5, statuses: [200, 200, 200, 200, 200]});
  assert.deepEqual(vpm, {runs: 1, statuses: [200, 200, 200, 200, 200]});
}

// The bin documents `firebase-functions [functionsDir]` but reads the
// directory only when two or more arguments are given.
{
  const fs = require('node:fs'), os = require('node:os');
  const outcome = library => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vfirebase-functions-bin-'));
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'vfirebase-functions-cwd-'));
    try {
      const map = require(path.join(roots[library], 'package.json')).exports;
      fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({main: 'index.js'}));
      fs.writeFileSync(path.join(directory, 'index.js'), `exports.api = require(${JSON.stringify(path.join(roots[library], map['./https'].require))}).onRequest((q, r) => r.send('ok'));`);
      const output = path.join(elsewhere, 'manifest.json');
      const bin = path.join(roots[library], require(path.join(roots[library], 'package.json')).bin['firebase-functions']);
      const run = spawnSync(process.execPath, [bin, directory], {cwd: elsewhere, encoding: 'utf8', timeout: 60000, env: {...process.env, FUNCTIONS_MANIFEST_OUTPUT_PATH: output, GCLOUD_PROJECT: 'p'}});
      return run.status === 0 ? Object.keys(JSON.parse(fs.readFileSync(output, 'utf8')).endpoints) : 'failed';
    } finally {
      fs.rmSync(directory, {recursive: true, force: true}); fs.rmSync(elsewhere, {recursive: true, force: true});
    }
  };
  assert.equal(outcome('upstream'), 'failed');
  assert.deepEqual(outcome('vpm'), ['api']);
}

console.log('Reproduced and fixed eager provider and Firebase Admin loading at import (Firestore, gax and the Realtime Database client), onInit running once per concurrent first invocation, and the bin ignoring its directory argument.');
