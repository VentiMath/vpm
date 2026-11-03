'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const metadata = require('../package.json');
const entry = name => path.join(root, metadata.exports['./' + name].require);
const loaded = code => {
  const child = spawnSync(process.execPath, ['-e', `(async () => { ${code} })()`], {encoding: 'utf8', env: {...process.env, GCLOUD_PROJECT: 'p'}});
  assert.equal(child.status, 0, child.stderr);
  // The logger writes JSON lines to stdout; the result is the last line.
  return JSON.parse(child.stdout.trim().split('\n').at(-1));
};

test('public entries expose the application scope and preserve the Firebase CLI bin', () => {
  const original = require('../../../scripts/firebase-functions-conformance/node_modules/firebase-functions/package.json');
  for(const name of ['logger','params','v2','v2/https','v2/firestore','v2/scheduler','v2/tasks'])assert.ok(metadata.exports['./'+name]);
  for(const name of ['v1','v2/database','v2/pubsub','v2/storage','v2/ai','v2/dataconnect'])assert.equal(metadata.exports['./'+name],undefined);
  assert.equal(require(root).logger,require('../lib/logger/index.js').logger);
  assert.deepEqual(Object.keys(metadata.bin), Object.keys(original.bin));
  assert.deepEqual(Object.keys(metadata.dependencies).sort(), ['vcors', 'vexpress', 'vprotobufjs']);
});

test('importing v2 loads providers and Firebase Admin services on first use', () => {
  const result = loaded(`
    const files = () => Object.keys(require.cache).map(f => f.replace(/\\\\/g, '/'));
    const heavy = () => files().filter(f => /\\/(vfirebase-admin|vgoogle-cloud-firestore|vexpress)\\//.test(f)).length;
    const v2 = require(${JSON.stringify(entry('v2'))});
    const atImport = {modules: files().length, heavy: heavy()};
    v2.logger.info('ready');
    const trigger = v2.firestore.onDocumentCreated('rooms/{id}', () => {});
    const afterDefinition = heavy();
    process.stdout.write(JSON.stringify({atImport, afterDefinition, endpoint: Object.keys(trigger.__endpoint.eventTrigger.eventFilters)}));`);
  assert.ok(result.atImport.modules < 40, JSON.stringify(result));
  assert.equal(result.atImport.heavy, 0);
  assert.equal(result.afterDefinition, 0, 'defining a trigger does not load Firestore');
  assert.deepEqual(result.endpoint, ['database', 'namespace']);
});

test('ES module entry points import without loading the Realtime Database client', async () => {
  const v2 = await import(path.join(root, metadata.exports['./v2'].import));
  const https = await import(path.join(root, metadata.exports['./https'].import));
  const firestore = await import(path.join(root, metadata.exports['./firestore'].import));
  assert.equal(typeof v2.logger.info, 'function');
  assert.equal(typeof https.onRequest, 'function');
  assert.equal(typeof firestore.onDocumentCreated, 'function');
});

test('onInit runs once for concurrent first invocations, and again after a failure', async () => {
  const result = loaded(`
    const {onInit} = require(${JSON.stringify(entry('v2'))}), {onRequest} = require(${JSON.stringify(entry('https'))});
    let runs = 0;
    onInit(async () => { runs++; await new Promise(r => setTimeout(r, 10)); if (runs === 1) throw new Error('first init fails'); });
    const handler = onRequest((q, r) => r.status(200).send('ok'));
    const response = () => ({statusCode: 0, headersSent: false, status(c) { this.statusCode = c; return this; }, send() { this.headersSent = true; return this; }, on() {}});
    const request = () => ({headers: {}, header: () => undefined, get: () => undefined});
    const first = await Promise.allSettled([1, 2, 3].map(() => handler(request(), response())));
    const ok = await Promise.all([1, 2, 3].map(async () => { const r = response(); await handler(request(), r); return r.statusCode; }));
    process.stdout.write(JSON.stringify({runs, first: first.map(r => r.status), ok}));`);
  assert.deepEqual(result, {runs: 2, first: ['rejected', 'rejected', 'rejected'], ok: [200, 200, 200]});
});

test('omitted providers are absent from the package, not copied behind unavailable exports',()=>{
  for(const name of ['v1','v2/providers/database.js','v2/providers/pubsub.js','v2/providers/storage.js','v2/providers/ai','v2/providers/dataconnect']){const file=path.join(root,'lib',name);if(fs.existsSync(file)){assert(fs.statSync(file).isDirectory());assert.equal(fs.readdirSync(file,{recursive:true}).filter(n=>/\.(js|mjs)$/.test(n)).length,0);}}
});

test('the bin writes the deploy manifest for a functions directory argument', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vfirebase-functions-test-'));
  try {
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({main: 'index.js'}));
    fs.writeFileSync(path.join(directory, 'index.js'), `exports.api = require(${JSON.stringify(entry('https'))}).onRequest((q, r) => r.send('ok'));`);
    const output = path.join(directory, 'manifest.json');
    const run = spawnSync(process.execPath, [path.join(root, metadata.bin['firebase-functions']), directory], {cwd: os.tmpdir(), encoding: 'utf8',
      env: {...process.env, FUNCTIONS_MANIFEST_OUTPUT_PATH: output, GCLOUD_PROJECT: 'p'}});
    assert.equal(run.status, 0, run.stderr);
    const manifest = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.deepEqual(Object.keys(manifest.endpoints), ['api']);
    assert.deepEqual(manifest.endpoints.api.httpsTrigger, {});
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
