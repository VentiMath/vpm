'use strict';
const logger = require('../../logger/index.js'), snapshots = require('../../common/providers/firestore.js');
const {Change} = require('../../common/change.js'), {withInit} = require('../../common/onInit.js');
const {wrapTraceContext} = require('../trace.js'), {addV1Compat} = require('../compat.js');
const {FunctionDefinition} = require('../../runtime/definition.js');
const {DocumentPattern, normalize} = require('../../runtime/document-pattern.js');
const prefix = 'google.cloud.firestore.document.v1.';
const pathOf = event => `projects/${event.project}/databases/${event.database}/documents/${event.document}`;
function getOpts(value) {
  if (typeof value === 'string') return {document: normalize(value), database: '(default)', namespace: '(default)', opts: {}};
  const {document, database, namespace, ...opts} = value;
  return {document: typeof document === 'string' ? normalize(document) : document,
    database: database || '(default)', namespace: namespace || '(default)', opts};
}
function payloadFormat(event) {
  if (Buffer.isBuffer(event.data) || event.datacontenttype?.includes('application/protobuf')) return 'protobuf';
  if (event.datacontenttype?.includes('application/json')) return 'json';
  logger.error(`Cannot determine payload type, datacontenttype is ${event.datacontenttype}, failing out.`);
  throw new Error('Error: Cannot parse event payload.');
}
function snapshot(event, before) {
  const format = payloadFormat(event), resource = pathOf(event);
  if (format === 'protobuf') return snapshots[before ? 'createBeforeSnapshotFromProtobuf' : 'createSnapshotFromProtobuf'](event.data, resource, event.database);
  const document = event.data?.[before ? 'oldValue' : 'value'];
  return snapshots[before ? 'createBeforeSnapshotFromJson' : 'createSnapshotFromJson'](event.data, resource, document?.createTime, document?.updateTime, event.database);
}
const createSnapshot = event => snapshot(event, false);
const createBeforeSnapshot = event => snapshot(event, true);
const makeParams = (document, pattern) => ({...pattern.extractMatches(document)});
function eventEnvelope(event, params, data) {
  const {datacontenttype, dataschema, ...out} = event;
  out.params = params;
  out.data = data;
  if ('authtype' in event) {
    out.authType = event.authtype; out.authId = event.authid;
    delete out.authtype; delete out.authid;
  }
  return out;
}
function makeFirestoreEvent(type, event, params) {
  return eventEnvelope(event, params, !event.data ? undefined : snapshot(event, !type.startsWith(prefix + 'created')));
}
function makeChangedFirestoreEvent(event, params) {
  let data;
  if (event.data) {
    if (payloadFormat(event) === 'protobuf') {
      const pair = snapshots.createSnapshotPairFromProtobuf(event.data, pathOf(event), event.database);
      data = new Change(pair.before, pair.after);
    } else data = new Change(createBeforeSnapshot(event), createSnapshot(event));
  }
  return eventEnvelope(event, params, data);
}
function makeEndpoint(type, opts, document, database, namespace, compiled) {
  const eventFilters = {database, namespace}, eventFilterPathPatterns = {};
  const pattern = typeof document !== 'string' || (compiled ?? new DocumentPattern(document)).hasWildcards();
  (pattern ? eventFilterPathPatterns : eventFilters).document = document;
  return new FunctionDefinition(opts, 'event').endpoint({eventTrigger: {
    eventType: type, eventFilters, eventFilterPathPatterns, retry: opts.retry ?? false,
  }});
}
function getV1Context(event) {
  const operation = event.type?.startsWith(prefix) && event.type.slice(prefix.length).split('.')[0];
  const names = {written: 'write', created: 'create', updated: 'update', deleted: 'delete'};
  const legacy = Object.hasOwn(names, operation) ? names[operation] : undefined;
  return {eventId: event.id, timestamp: event.time,
    eventType: legacy ? 'providers/cloud.firestore/eventTypes/document.' + legacy : event.type,
    resource: {service: 'firestore.googleapis.com', name: pathOf(event)}, params: event.params,
    authType: event.authType, authId: event.authId};
}
function define(type, configuration, handler, changed) {
  const {document, database, namespace, opts} = getOpts(configuration);
  const invoke = wrapTraceContext(withInit(handler));
  const fixed = typeof document === 'string' ? new DocumentPattern(document) : null;
  const fn = raw => {
    const pattern = fixed ?? new DocumentPattern(document.value());
    const params = makeParams(raw.document, pattern);
    const event = changed ? makeChangedFirestoreEvent(raw, params) : makeFirestoreEvent(type, raw, params);
    addV1Compat(event, {context: () => getV1Context(event), [changed ? 'change' : 'snapshot']: () => event.data});
    return invoke(event);
  };
  fn.run = handler;
  fn.__endpoint = makeEndpoint(type, opts, document, database, namespace, fixed);
  return fn;
}
const onOperation = (type, options, handler) => define(type, options, handler, false);
const onChangedOperation = (type, options, handler) => define(type, options, handler, true);
const api = {Change, createSnapshot, createBeforeSnapshot, getOpts, getV1Context, makeChangedFirestoreEvent,
  makeEndpoint, makeFirestoreEvent, makeParams, onOperation, onChangedOperation};
for (const operation of ['written', 'created', 'updated', 'deleted']) {
  for (const authenticated of [false, true]) {
    const type = prefix + operation + (authenticated ? '.withAuthContext' : '');
    api[operation + (authenticated ? 'EventWithAuthContextType' : 'EventType')] = type;
    const name = 'onDocument' + operation[0].toUpperCase() + operation.slice(1) + (authenticated ? 'WithAuthContext' : '');
    api[name] = (options, handler) => define(type, options, handler, operation === 'written' || operation === 'updated');
  }
}
const namespace = {...api};
module.exports = api;
Object.defineProperty(api, 'firestore_exports', {enumerable: true, get: () => namespace});
