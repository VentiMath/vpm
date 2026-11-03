'use strict';
// Measure logging CPU with an output sink, not terminal or Cloud Logging I/O.
// Only the selected implementation is loaded in a timed worker.
const assert = require('node:assert/strict'), path = require('node:path');
const roots = {upstream: path.resolve(__dirname, '../../../scripts/firebase-functions-conformance/node_modules/firebase-functions'), vpm: path.resolve(__dirname, '..')};
function logging(root, call) {
  const common = require(path.join(root, 'lib/logger/common.js'));
  let line;
  for (const key of Object.keys(common.UNPATCHED_CONSOLE)) common.UNPATCHED_CONSOLE[key] = output => {line = output;};
  const logger = require(path.join(root, 'lib/logger/index.js'));
  return () => {call(logger); return line;};
}
const cases = [
  {name: 'declaration / app task queue', make: root => {
    const {onTaskDispatched}=require(path.join(root,'lib/v2/providers/tasks.js'));
    const options={invoker:['tasks@example.iam.gserviceaccount.com'],timeoutSeconds:60,retryConfig:{maxAttempts:100,minBackoffSeconds:5,maxBackoffSeconds:300},rateLimits:{maxConcurrentDispatches:1}};
    return ()=>onTaskDispatched(options,()=>{}).__endpoint;
  },validate:value=>{assert.equal(value.taskQueueTrigger.retryConfig.maxAttempts,100);assert.equal(value.taskQueueTrigger.rateLimits.maxConcurrentDispatches,1);assert.equal(value.timeoutSeconds,60)}},
  {name:'task / initialized emulator request',async:true,make:root=>{
    process.env.FUNCTIONS_EMULATOR='true';
    const {onTaskDispatched}=require(path.join(root,'lib/v2/providers/tasks.js'));
    let seen;const fn=onTaskDispatched(async request=>{seen=request.data.id});
    const request={method:'POST',headers:{'content-type':'application/json'},body:{data:{id:42}},header(name){return this.headers[name.toLowerCase()]},get(name){return this.header(name)}};
    return async()=>{let status;const response={status(code){status=code;return this},end(){},send(){}};await fn(request,response);return {status,id:seen};};
  },validate:value=>assert.deepEqual(value,{status:204,id:42})},
  {name:'parameter / validation specification',make:root=>{
    const {StringParam}=require(path.join(root,'lib/params/types.js'));
    return ()=>new StringParam('NAME',{default:'guest',input:{text:{validationRegex:/^[a-z]+$/}}}).toSpec();
  },validate:value=>{assert.equal(value.default,'guest');assert.equal(value.input.text.validationRegex,'^[a-z]+$')}},
  {name: 'logger / formatted status', make: root => logging(root, log => log.info('saved %d records', 3)), validate: output => assert.deepEqual(JSON.parse(output), {severity: 'INFO', message: 'saved 3 records'})},
  {name: 'logger / structured request', make: root => {
    const data = {path: '/api/rooms', method: 'GET', count: 12, elapsed: 1.25};
    return logging(root, log => log.info('request', data));
  }, validate: output => assert.deepEqual(JSON.parse(output), {path: '/api/rooms', method: 'GET', count: 12, elapsed: 1.25, severity: 'INFO', message: 'request'})},
  {name: 'logger / nested data', make: root => {
    const entry = {severity: 'INFO', message: 'rooms', rooms: Array.from({length: 10}, (_, id) => ({id, tags: ['math', 'practice'], open: true}))};
    return logging(root, log => log.write(entry));
  }, validate: output => {const data = JSON.parse(output); assert.equal(data.rooms.length, 10); assert.deepEqual(data.rooms[9], {id: 9, tags: ['math', 'practice'], open: true});}},
  {name: 'initializer / already initialized handler', async: true, make: async root => {
    const {onInit, withInit} = require(path.join(root, 'lib/common/onInit.js'));
    onInit(() => {});
    const handler = withInit(value => value + 1);
    await handler(41);
    return () => handler(41);
  }, validate: output => assert.equal(output, 42)},
  {name: 'declaration / HTTP endpoint', make: root => {
    const {onRequest} = require(path.join(root, 'lib/v2/providers/https.js'));
    const options = {cors: true, memory: '1GiB', timeoutSeconds: 540, secrets: ['API_KEY']};
    return () => onRequest(options, () => {}).__endpoint;
  }, validate: endpoint => {assert.equal(endpoint.availableMemoryMb, 1024); assert.equal(endpoint.timeoutSeconds, 540); assert.deepEqual(endpoint.secretEnvironmentVariables, [{key: 'API_KEY'}]);}},
  {name: 'declaration / serialize 64 fresh endpoints', make: root => {
    const {stackToWire} = require(path.join(root, 'lib/runtime/manifest.js'));
    const {RESET_VALUE} = require(path.join(root, 'lib/common/options.js'));
    return () => stackToWire({specVersion: 'v1alpha1', endpoints: Object.fromEntries(Array.from({length: 64}, (_, i) => ['api' + i,
      {platform: 'gcfv2', minInstances: RESET_VALUE, maxInstances: RESET_VALUE, labels: {service: 'api'}, httpsTrigger: {}}]))});
  }, validate: manifest => {assert.equal(Object.keys(manifest.endpoints).length, 64); assert.equal(manifest.endpoints.api63.minInstances, null);}},
  {name: 'request / initialized HTTP handler', async: true, make: root => {
    const {onRequest} = require(path.join(root, 'lib/v2/providers/https.js'));
    const request = {headers: {}}, response = {value: 0};
    const handler = onRequest((request, response) => {response.value = 42;});
    return async () => {await handler(request, response); return response.value;};
  }, validate: output => assert.equal(output, 42)},
  ...['encode', 'decode'].map(operation => ({name: `callable / ${operation} structured payload`, make: root => {
    const convert = require(path.join(root, 'lib/common/providers/https.js'))[operation];
    const data = {calendarId: 'fall', events: Array.from({length: 8}, (_, id) => ({id, title: 'Practice', tags: ['math', 'club']}))};
    return () => convert(data);
  }, validate: output => {assert.equal(output.calendarId, 'fall'); assert.equal(output.events.length, 8); assert.deepEqual(output.events[7], {id: 7, title: 'Practice', tags: ['math', 'club']});}})),
  {name: 'request / callable without token headers', async: true, make: root => {
    const {EventEmitter} = require('node:events');
    const common = require(path.join(root, 'lib/logger/common.js'));
    for (const name of Object.keys(common.UNPATCHED_CONSOLE)) common.UNPATCHED_CONSOLE[name] = () => {};
    const {onCallHandler} = require(path.join(root, 'lib/common/providers/https.js'));
    const handler = onCallHandler({cors: {origin: false}}, request => request.data.value + 1, 'gcfv2');
    const request = {method: 'POST', headers: {}, body: {data: {value: 41}}, header: name => name.toLowerCase() === 'content-type' ? 'application/json' : undefined};
    return async () => {
      const response = new EventEmitter();
      response.status = () => response;
      response.send = body => {response.body = body; response.emit('finish');};
      await handler(request, response);
      return response.body;
    };
  }, validate: output => assert.deepEqual(output, {result: 42})},
  {name: 'trace / portable header extraction', make: root => {
    const {extractTraceContext} = require(path.join(root, 'lib/common/trace.js'));
    const carrier = {traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'};
    return () => extractTraceContext(carrier);
  }, validate: context => assert.deepEqual(context, {version: '00', traceId: '0af7651916cd43dd8448eb211c80319c', parentId: 'b7ad6b7169203331', sample: true})},
  {name: 'trace / legacy decimal span extraction', make: root => {
    const {extractTraceContext} = require(path.join(root, 'lib/common/trace.js'));
    const carrier = {'x-cloud-trace-context': '0af7651916cd43dd8448eb211c80319c/42;o=1'};
    return () => extractTraceContext(carrier);
  }, validate: context => assert.deepEqual(context, {version: '00', traceId: '0af7651916cd43dd8448eb211c80319c', parentId: '2a', sample: true})},
  {name: 'discovery / 64 grouped endpoints', make: root => {
    const {extractStack} = require(path.join(root, 'lib/runtime/loader.js'));
    const source = {api: Object.fromEntries(Array.from({length: 64}, (_, i) => ['fn' + i,
      Object.assign(() => {}, {__endpoint: {platform: 'gcfv2', httpsTrigger: {}}})]))};
    return () => {const endpoints = {}; extractStack(source, endpoints, [], {}); return endpoints;};
  }, validate: endpoints => {assert.equal(Object.keys(endpoints).length, 64); assert.equal(endpoints['api-fn63'].entryPoint, 'api.fn63');}},
  {name: 'secret / runtime string read', make: root => {
    const {defineSecret} = require(path.join(root, 'lib/params/index.js'));
    process.env.VPM_BENCH_SECRET = 'benchmark-fixture-value';
    const parameter = defineSecret('VPM_BENCH_SECRET');
    return () => parameter.value();
  }, validate: output => assert.equal(output, 'benchmark-fixture-value')},
  {name: 'declaration / Firestore written trigger', make: root => {
    const {onDocumentWritten} = require(path.join(root, 'lib/v2/providers/firestore.js'));
    const options = {document: 'problems/{problemId}', retry: true};
    return () => onDocumentWritten(options, () => {}).__endpoint;
  }, validate: endpoint => {assert.equal(endpoint.eventTrigger.eventFilterPathPatterns.document, 'problems/{problemId}'); assert.equal(endpoint.eventTrigger.retry, true);}},
  {name: 'event / materialize changed protobuf documents', make: root => {
    const load = require('node:module').createRequire(path.join(root, 'package.json'));
    const admin = load(root === roots.vpm ? 'vfirebase-admin/app' : 'firebase-admin/app');
    const app = admin.initializeApp({projectId: 'vpm-benchmark'}, 'vpm-benchmark');
    require(path.join(root, 'lib/common/app.js')).setApp(app);
    const {DocumentEventData} = require(path.join(root, 'protos/compiledFirestore.js')).google.events.cloud.firestore.v1;
    const name = 'projects/vpm-benchmark/databases/(default)/documents/problems/one';
    const document = title => ({name, createTime: {seconds: 1}, updateTime: {seconds: 2}, fields: {title: {stringValue: title}}});
    const data = DocumentEventData.encode(DocumentEventData.create({oldValue: document('before'), value: document('after')})).finish();
    const event = {project: 'vpm-benchmark', database: '(default)', document: 'problems/one', datacontenttype: 'application/protobuf', data};
    const {makeChangedFirestoreEvent} = require(path.join(root, 'lib/v2/providers/firestore.js'));
    return () => makeChangedFirestoreEvent(event, {problemId: 'one'});
  }, validate: event => {assert.deepEqual(event.data.before.data(), {title: 'before'}); assert.deepEqual(event.data.after.data(), {title: 'after'}); assert.equal(event.data.after.ref.path, 'problems/one');}},
];
require('../../../scripts/bench-process.cjs').run({root: path.resolve(__dirname, '..'), upstream: roots.upstream, vpm: roots.vpm, cases,
  files: ['package.json', 'lib', 'protos', 'bench/compare.cjs', '../vcors/index.js', '../vfirebase-admin/lib', '../vgoogle-cloud-firestore/build/src', '../vprotobufjs/src', '../vprotobufjs/minimal.js', '../vlong/index.js',
    '../../scripts/firebase-functions-conformance/node_modules/protobufjs/src',
    '../../scripts/firebase-functions-conformance/node_modules/protobufjs/minimal.js',
    '../../scripts/firebase-functions-conformance/node_modules/long/index.js',
    '../../scripts/firebase-functions-conformance/node_modules/long/dist' ,
    '../../scripts/firebase-functions-conformance/node_modules/firebase-functions/lib',
    '../../scripts/firebase-functions-conformance/node_modules/firebase-functions/protos',
    '../../scripts/firebase-functions-conformance/node_modules/firebase-admin/lib',
    '../../scripts/firebase-functions-conformance/node_modules/@google-cloud/firestore/build/src',
    '../../scripts/firebase-functions-conformance/node_modules/cors/lib']
}).catch(error => {console.error(error); process.exitCode = 1;});
