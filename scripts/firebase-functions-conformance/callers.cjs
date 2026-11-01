'use strict';
// Builds the function shapes VentiMath's backend exports with the original
// firebase-functions 7.4.0 (on firebase-admin 14.5.0) and with
// vfirebase-functions (on vfirebase-admin), each in its own process, and drives
// them the way the Functions Framework does: HTTP functions behind one shared
// VPM Express host with the Framework's body parsing, and a Firestore trigger
// with a protobuf CloudEvent. Responses, logged entries and handler results
// must be identical.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
const roots = {
  upstream: path.join(__dirname, 'node_modules/firebase-functions'),
  vpm: path.resolve(__dirname, '../../packages/vfirebase-functions'),
};

async function child(library) {
  const root = roots[library];
  const exportsMap = require(path.join(root, 'package.json')).exports;
  const load = entry => require(path.join(root, exportsMap['./' + entry].require));
  const logs = [];
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    // Stack frames name each library's install path; compare the messages.
    console[level] = (...args) => logs.push([level, ...args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)).replace(/(?:\\n\s+at [^\\"]+)+/g, ''))]);
  }
  const {logger, setGlobalOptions} = load('v2');
  const {onRequest, onCall, HttpsError} = load('https');
  const {onSchedule} = load('scheduler');
  const {onTaskDispatched} = load('tasks');
  const {onDocumentCreated} = load('firestore');
  const {defineSecret} = load('params');
  setGlobalOptions({region: 'us-central1', maxInstances: 5});
  const apiKey = defineSecret('API_KEY');
  const functions = {
    api: onRequest({secrets: [apiKey]}, (request, response) => {
      logger.info('api request', {path: request.path, query: request.query, key: apiKey.value().length});
      response.status(201).json({ok: true, method: request.method, body: request.body});
    }),
    cors: onRequest({cors: true}, (request, response) => { response.send('cors ok'); }),
    fails: onRequest(async () => { throw new Error('handler failed'); }),
    grade: onCall(async request => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.', {hint: 'login'});
      logger.debug('grading', {uid: request.auth.uid, answer: request.data.answer});
      return {correct: request.data.answer === '42', uid: request.auth.uid};
    }),
    nightly: onSchedule('every day 03:00', async event => { logger.log('scheduled', event.scheduleTime, event.jobName); }),
    task: onTaskDispatched({retryConfig: {maxAttempts: 3}}, async request => { logger.warn('task', request.data, request.queueName, request.retryCount); }),
  };
  const created = [];
  const trigger = onDocumentCreated('rooms/{roomId}', event => {
    created.push({params: event.params, id: event.data.id, path: event.data.ref.path, data: JSON.parse(JSON.stringify(event.data.data())),
      createTime: event.data.createTime.toMillis(), type: event.type, document: event.document});
  });

  // Endpoint manifests, as the Firebase CLI reads them at deploy.
  const endpoints = Object.fromEntries(Object.entries({...functions, trigger}).map(([name, fn]) => [name, fn.__endpoint]));

  // Host: one VPM Express app with the Functions Framework's parsers.
  const express = require('../../packages/vexpress');
  const app = express();
  const keep = (request, response, buffer) => { request.rawBody = buffer; };
  app.use(express.json({limit: '32mb', verify: keep}));
  app.use(express.text({limit: '32mb', verify: keep}));
  app.use(express.raw({limit: '32mb', type: '*/*', verify: keep}));
  for (const [name, fn] of Object.entries(functions)) app.all('/' + name, fn);
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const base64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const idToken = base64({alg: 'none', typ: 'JWT'}) + '.' + base64({iss: 'https://securetoken.google.com/p', aud: 'p', sub: 'ada', user_id: 'ada', auth_time: 1, iat: 1, exp: 4102444800}) + '.';
  const call = async (name, init = {}) => {
    const response = await fetch(base + name, init);
    const headers = {};
    for (const key of ['content-type', 'access-control-allow-origin', 'access-control-allow-methods', 'vary']) if (response.headers.has(key)) headers[key] = response.headers.get(key);
    return {status: response.status, headers, body: await response.text()};
  };
  const json = body => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
  const out = {};
  out.api = await call('/api?term=1', json({answer: 7}));
  out.corsPreflight = await call('/cors', {method: 'OPTIONS', headers: {origin: 'https://ventimath.example', 'access-control-request-method': 'POST'}});
  out.cors = await call('/cors', {headers: {origin: 'https://ventimath.example'}});
  out.fails = await call('/fails');
  out.gradeSignedIn = await call('/grade', {...json({data: {answer: '42'}}), headers: {'content-type': 'application/json', authorization: 'Bearer ' + idToken}});
  out.gradeAnonymous = await call('/grade', json({data: {answer: '41'}}));
  out.gradeWrongMethod = await call('/grade');
  out.nightly = await call('/nightly', {method: 'POST', headers: {'x-cloudscheduler-jobname': 'nightly-job', 'x-cloudscheduler-scheduletime': '2026-10-31T03:00:00Z'}});
  out.task = await call('/task', {...json({data: {id: 'set-42'}}), headers: {'content-type': 'application/json', authorization: 'Bearer ' + idToken,
    'x-cloudtasks-queuename': 'grading', 'x-cloudtasks-taskretrycount': '2', 'x-cloudtasks-taskname': 't1', 'x-cloudtasks-taskexecutioncount': '2', 'x-cloudtasks-tasketa': '1700000000'}});
  server.close();

  // Firestore trigger: the protobuf CloudEvent the Functions Framework hands over.
  const {google} = require(path.join(roots.upstream, 'protos/compiledFirestore.js'));
  const name = 'projects/p/databases/(default)/documents/rooms/r1';
  const data = google.events.cloud.firestore.v1.DocumentEventData.encode({value: {name, createTime: {seconds: 1700000000, nanos: 5000000}, updateTime: {seconds: 1700000001},
    fields: {title: {stringValue: 'Number theory'}, seats: {integerValue: 12}, tags: {arrayValue: {values: [{stringValue: 'primes'}]}}, open: {booleanValue: true}}}}).finish();
  await trigger({specversion: '1.0', id: 'e1', source: '//firestore.googleapis.com/projects/p/databases/(default)', type: 'google.cloud.firestore.document.v1.created',
    time: '2023-11-14T22:13:20Z', subject: 'documents/rooms/r1', datacontenttype: 'application/protobuf', data: Buffer.from(data),
    project: 'p', location: 'nam5', database: '(default)', namespace: '(default)', document: 'rooms/r1'});
  out.trigger = created;
  return {out, logs, endpoints};
}

if (process.argv[2] === '--child') {
  child(process.argv[3]).then(result => process.stdout.write(JSON.stringify(result), () => process.exit()), error => { process.stderr.write(error.stack); process.exit(1); });
} else {
  const env = {...process.env, GCLOUD_PROJECT: 'p', API_KEY: 'secret-value', FIREBASE_CONFIG: JSON.stringify({projectId: 'p'}),
    // As under the Firebase emulator: tokens are decoded, not verified.
    FIREBASE_DEBUG_MODE: 'true', FUNCTIONS_EMULATOR: 'true', FIREBASE_DEBUG_FEATURES: JSON.stringify({skipTokenVerification: true})};
  const results = {};
  for (const library of ['upstream', 'vpm']) {
    const run = spawnSync(process.execPath, [__filename, '--child', library], {encoding: 'utf8', timeout: 180000, env, maxBuffer: 64 * 1024 * 1024});
    assert.equal(run.status, 0, library + '\n' + run.stderr.slice(-4000));
    results[library] = JSON.parse(run.stdout);
  }
  // Deploy-time discovery: the Firebase CLI runs the package's bin from the
  // functions directory and reads the manifest it writes.
  const fs = require('node:fs'), os = require('node:os');
  const manifests = {};
  for (const library of ['upstream', 'vpm']) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vfirebase-functions-discovery-'));
    try {
      const map = require(path.join(roots[library], 'package.json')).exports;
      const entry = name => JSON.stringify(path.join(roots[library], map['./' + name].require));
      fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({name: 'functions', main: 'index.js'}));
      fs.writeFileSync(path.join(directory, 'index.js'), `
        const {onRequest, onCall} = require(${entry('https')}), {onSchedule} = require(${entry('scheduler')});
        const {onDocumentCreated, onDocumentWritten} = require(${entry('firestore')}), {onTaskDispatched} = require(${entry('tasks')});
        const {defineSecret, defineString} = require(${entry('params')}), {setGlobalOptions} = require(${entry('v2')});
        setGlobalOptions({region: 'us-central1', maxInstances: 10});
        const key = defineSecret('API_KEY'), mode = defineString('MODE', {default: 'live'});
        exports.api = onRequest({secrets: [key], cors: true, memory: '512MiB'}, (q, r) => r.send(mode.value()));
        exports.grade = onCall({enforceAppCheck: false}, () => ({}));
        exports.nightly = onSchedule({schedule: 'every day 03:00', timeZone: 'America/New_York'}, async () => {});
        exports.created = onDocumentCreated('rooms/{roomId}', () => {});
        exports.written = onDocumentWritten({document: 'users/{uid}', database: 'other'}, () => {});
        exports.task = onTaskDispatched({retryConfig: {maxAttempts: 3}, rateLimits: {maxConcurrentDispatches: 5}}, async () => {});`);
      const output = path.join(directory, 'manifest.json');
      const bin = path.join(roots[library], require(path.join(roots[library], 'package.json')).bin['firebase-functions']);
      const run = spawnSync(process.execPath, [bin], {cwd: directory, encoding: 'utf8', timeout: 120000, env: {...process.env, FUNCTIONS_MANIFEST_OUTPUT_PATH: output, GCLOUD_PROJECT: 'p'}});
      assert.equal(run.status, 0, library + ' discovery\n' + run.stderr);
      manifests[library] = JSON.parse(fs.readFileSync(output, 'utf8'));
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  }
  assert.deepEqual(manifests.vpm, manifests.upstream);
  assert.equal(Object.keys(manifests.vpm.endpoints).length, 6);
  assert.deepEqual(results.vpm.out, results.upstream.out);
  // Express query objects have a null prototype. Upstream loses that field;
  // the independent serializer preserves it. Require exactly this difference.
  const baselineLog = JSON.parse(results.upstream.logs[0][1]);
  const actualLog = JSON.parse(results.vpm.logs[0][1]);
  assert.equal(baselineLog.query, '[Error - cannot serialize]');
  assert.deepEqual(actualLog.query, {term: '1'});
  assert.deepEqual({...actualLog, query: baselineLog.query}, baselineLog);
  assert.equal(results.vpm.logs[0][0], results.upstream.logs[0][0]);
  assert.deepEqual(results.vpm.logs.slice(1), results.upstream.logs.slice(1));
  assert.deepEqual(results.vpm.endpoints, results.upstream.endpoints);
  const {out} = results.vpm;
  assert.equal(out.api.status, 201); assert.equal(out.gradeSignedIn.status, 200); assert.match(out.gradeSignedIn.body, /"correct":true/); assert.equal(out.task.status, 204); assert.equal(out.gradeAnonymous.status, 401);
  assert.equal(out.trigger.length, 1); assert.equal(out.trigger[0].data.title, 'Number theory');
  console.log(`Firebase Functions callers match 7.4.0 except the preserved null-prototype query log: ${Object.keys(out).length} invocations (HTTP, CORS, errors, callable, scheduler, task queue, Firestore trigger), ${results.vpm.logs.length} log entries and ${Object.keys(results.vpm.endpoints).length} endpoint definitions, and the deploy manifest the bin writes for six functions.`);
}
