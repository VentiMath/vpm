'use strict';
// Reproduces defects in @google-cloud/firestore-api 0.7.1 with the original,
// then checks vgoogle-cloud-firestore-api. Each case runs in a fresh process
// so unhandled rejections and module loading are observed per library.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
const libraries = {
  upstream: path.join(__dirname, 'node_modules/@google-cloud/firestore-api'),
  vpm: path.resolve(__dirname, '../../packages/vgoogle-cloud-firestore-api'),
};

function run(library, body) {
  const source = `
    const library = require(${JSON.stringify(libraries[library])});
    let unhandled = 0;
    process.on('unhandledRejection', () => { unhandled++; });
    const credentials = {credentials: {client_email: 'bogus', private_key: 'bogus'}, projectId: 'bogus'};
    (async () => { const result = await (async () => { ${body} })(); await new Promise(r => setTimeout(r, 50)); process.stdout.write(JSON.stringify({result, unhandled}), () => process.exit()); })()
      .catch(error => process.stdout.write(JSON.stringify({thrown: error.constructor.name + ': ' + error.message})));`;
  const child = spawnSync(process.execPath, ['-e', source], {encoding: 'utf8', timeout: 60000});
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
}
function both(body) {
  return {upstream: run('upstream', body), vpm: run('vpm', body)};
}

// Importing the package: upstream loads its gax stack and the 1.3 MB static
// protos module eagerly.
{
  const {upstream, vpm} = both(`
    const before = Object.keys(require.cache).length;
    return {modules: Object.keys(require.cache).length, gax: Object.keys(require.cache).some(f => /[/\\\\]v?google-gax[/\\\\]/.test(f)),
      protos: Object.keys(require.cache).some(f => /protos[/\\\\]protos\\.js$/.test(f))};`);
  assert.equal(upstream.result.gax, true); assert.equal(upstream.result.protos, true);
  assert.equal(vpm.result.gax, false); assert.equal(vpm.result.protos, false);
  assert.ok(vpm.result.modules < 10 && upstream.result.modules > 100, JSON.stringify([upstream.result.modules, vpm.result.modules]));
}

// The routing header is written into the caller's options object.
{
  const {upstream, vpm} = both(`
    const client = new library.v1.FirestoreClient(credentials);
    client.innerApiCalls.getDocument = () => Promise.resolve([{}]);
    client.initialize = () => Promise.resolve();
    const options = {};
    await client.getDocument({name: 'projects/p/databases/d/documents/c/a'}, options);
    return options;`);
  assert.equal(upstream.result.otherArgs.headers['x-goog-request-params'], 'name=projects%2Fp%2Fdatabases%2Fd%2Fdocuments%2Fc%2Fa');
  assert.deepEqual(vpm.result, {});
}

// A request without its routed parent message throws synchronously upstream.
{
  const {upstream, vpm} = both(`
    const client = new library.v1.FirestoreClient(credentials);
    let header;
    client.innerApiCalls.updateDocument = (request, options) => { header = options.otherArgs.headers['x-goog-request-params']; return Promise.resolve([{}]); };
    client.initialize = () => Promise.resolve();
    try { await client.updateDocument({}); return header; } catch (error) { return 'threw ' + error.constructor.name; }`);
  assert.equal(upstream.result, 'threw TypeError');
  assert.equal(vpm.result, 'document.name=');
}

// A failed stub is reported to the caller, and upstream also re-throws it as an
// unhandled rejection, which terminates Node by default.
{
  const {upstream, vpm} = both(`
    const client = new library.v1.FirestoreClient(credentials);
    client._gaxGrpc.createStub = () => Promise.reject(new Error('stub failed'));
    try { await client.getDocument({name: 'n'}); return 'resolved'; } catch (error) { return error.message; }`);
  assert.equal(upstream.result, 'stub failed'); assert.ok(upstream.unhandled > 0);
  assert.equal(vpm.result, 'stub failed'); assert.equal(vpm.unhandled, 0);
}

// close() does not wait for the locations client, and its failure becomes an
// unhandled rejection instead of rejecting close().
{
  const {upstream, vpm} = both(`
    const client = new library.v1.FirestoreClient(credentials);
    await client.initialize();
    client.locationsClient.close = () => Promise.reject(new Error('locations close failed'));
    try { await client.close(); return 'resolved'; } catch (error) { return error.message; }`);
  assert.equal(upstream.result, 'resolved'); assert.ok(upstream.unhandled > 0);
  assert.equal(vpm.result, 'locations close failed'); assert.equal(vpm.unhandled, 0);
}

// Operation helpers dereference a missing request.
{
  const {upstream, vpm} = both(`
    const client = new library.v1.FirestoreAdminClient(credentials);
    let header;
    client.operationsClient.getOperation = (request, options) => { header = options.otherArgs.headers['x-goog-request-params']; return Promise.resolve([{}]); };
    try { await client.getOperation(undefined); return header; } catch (error) { return 'threw ' + error.constructor.name; }`);
  assert.equal(upstream.result, 'threw TypeError');
  assert.equal(vpm.result, 'name=');
}

// A closed client's server stream reports the closure only after retry-request's
// two no-response retries (2-3 s, then 4-5 s of backoff).
{
  const {upstream, vpm} = both(`
    const client = new library.v1.FirestoreClient(credentials);
    client._gaxGrpc.createStub = async () => ({close() {}});
    await client.initialize();
    const closing = client.close();
    const started = Date.now();
    const stream = client.runQuery({parent: 'p'});
    const outcome = await Promise.race([
      new Promise(resolve => { stream.on('error', error => resolve(error.message)); stream.resume(); }),
      new Promise(resolve => setTimeout(() => resolve('pending'), 1500))]);
    await closing;
    return {outcome, fast: Date.now() - started < 1000};`);
  assert.deepEqual(upstream.result, {outcome: 'pending', fast: false});
  assert.deepEqual(vpm.result, {outcome: 'The client has already been closed.', fast: true});
}

// A missing path argument fails inside the template with the engine's
// property-access TypeError, which names neither the method nor the argument.
{
  const {upstream, vpm} = both(`
    const client = new library.v1.FirestoreAdminClient(credentials);
    try { return client.indexPath('p', 'd', 'c'); } catch (error) { return error.constructor.name + ': ' + error.message; }`);
  assert.match(upstream.result, /^TypeError: .*\b(?:undefined|toString)\b/);
  assert.doesNotMatch(upstream.result, /index(?:Path)?\b.*required/);
  assert.equal(vpm.result, 'TypeError: indexPath: index is required.');
}

// Status details: an Any this service cannot decode is dropped upstream, and
// long-running and paged calls skip decoding entirely.
{
  const {upstream, vpm} = both(`
    const {protobuf} = require(${JSON.stringify(path.join(__dirname, 'node_modules/google-gax'))});
    const root = protobuf.Root.fromJSON(require(${JSON.stringify(path.join(libraries.upstream, 'build/protos/protos.json'))}));
    const Any = protobuf.Root.fromJSON(require(${JSON.stringify(path.join(__dirname, 'node_modules/google-gax/build/protos/status.json'))})).lookupType('google.protobuf.Any');
    const Index = root.lookupType('google.firestore.admin.v1.Index');
    const known = Any.create({type_url: 'type.googleapis.com/google.firestore.admin.v1.Index', value: Index.encode({name: 'idx'}).finish()});
    const unknown = Any.create({type_url: 'type.googleapis.com/example.Unknown', value: Buffer.from([1])});
    const client = new library.v1.FirestoreAdminClient(credentials);
    client.initialize = () => Promise.resolve();
    const fail = () => Promise.reject(Object.assign(new Error('failed'), {statusDetails: [known, unknown]}));
    const details = async call => { try { await call(); } catch (error) { return error.statusDetails.map(d => d.name ?? d.type_url); } };
    client.innerApiCalls.getIndex = fail; client.innerApiCalls.createIndex = fail; client.innerApiCalls.listIndexes = fail;
    return {unary: await details(() => client.getIndex({name: 'n'})), lro: await details(() => client.createIndex({parent: 'p'})), paged: await details(() => client.listIndexes({parent: 'p'}))};`);
  assert.deepEqual(upstream.result, {unary: ['idx'], lro: ['type.googleapis.com/google.firestore.admin.v1.Index', 'type.googleapis.com/example.Unknown'], paged: ['type.googleapis.com/google.firestore.admin.v1.Index', 'type.googleapis.com/example.Unknown']});
  assert.deepEqual(vpm.result, {unary: ['idx', 'type.googleapis.com/example.Unknown'], lro: ['idx', 'type.googleapis.com/example.Unknown'], paged: ['idx', 'type.googleapis.com/example.Unknown']});
}

console.log('Reproduced and fixed eager gax/protos loading, caller option mutation, synchronous routing throws, unhandled stub and close rejections, delayed closed-stream errors, missing operation requests, unchecked path arguments, and dropped or undecoded status details.');
