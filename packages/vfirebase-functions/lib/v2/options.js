'use strict';
const {RESET_VALUE, ResetValue} = require('../common/options.js');
const {Expression} = require('../params/types.js');
const params = require('../params/index.js');
const logger = require('../logger/index.js');
const {serviceAccountFromShorthand} = require('../common/encoding.js');
const {requiresRole} = require('./security.js');

const limits = {
  event: [540, 'event-handling'], https: [3600, 'HTTPS and callable'],
  scheduledOrTask: [1800, 'scheduled or task queue'], identity: [7, 'blocking'],
};
const memory = Object.freeze(Object.fromEntries([
  ['128MiB', 128], ['256MiB', 256], ['512MiB', 512],
  ...[1, 2, 4, 8, 16, 32].map(gib => [`${gib}GiB`, gib * 1024]),
]));
const state = globalThis[Symbol.for('firebase-functions:v2:globalOptions')] ??= {};
const endpointFields = ['omit', 'concurrency', 'minInstances', 'maxInstances', 'ingressSettings', 'labels', 'timeoutSeconds', 'cpu'];
const annotationFields = ['concurrency', 'minInstances', 'maxInstances', 'ingressSettings', 'labels', 'vpcConnector', 'secrets'];
const list = value => typeof value === 'string' ? [value] : value;
const reset = value => value === null || value instanceof ResetValue;
const getGlobalOptions = () => state.value || {};

function setGlobalOptions(options) {
  if (state.value) logger.warn('Calling setGlobalOptions twice leads to undefined behavior');
  state.value = options;
}
function assertTimeoutSecondsValid(options, kind) {
  const value = options.timeoutSeconds === undefined ? getGlobalOptions().timeoutSeconds : options.timeoutSeconds;
  if (value === undefined || value instanceof Expression || value instanceof ResetValue) return;
  if (typeof value !== 'number') throw new Error(`timeoutSeconds must be a number, Expression, or RESET_VALUE. Got ${typeof value}.`);
  if (!Number.isFinite(value)) throw new Error(`timeoutSeconds must be a finite number. Got ${value}.`);
  if (!Object.hasOwn(limits, kind)) throw new Error(`Unknown function kind: ${kind}`);
  const [max, label] = limits[kind];
  if (value < 0 || value > max) throw new Error(`timeoutSeconds must be between 0 and ${max} for ${label} functions. Got ${value}.`);
}
function project(options, names, transforms) {
  const result = {};
  for (const name of names) if (Object.hasOwn(options, name)) result[name] = options[name];
  for (const [input, output, convert] of transforms) {
    if (Object.hasOwn(options, input)) result[output] = convert ? convert(options[input]) : options[input];
  }
  return result;
}
function network(options) {
  const {vpcConnector: connector, networkInterface: nic} = options;
  if (options.vpcEgress && options.vpcConnectorEgressSettings) logger.warn('vpcEgress and vpcConnectorEgressSettings are both set. Using vpcEgress');
  const egress = options.vpcEgress ?? options.vpcConnectorEgressSettings;
  if (connector === undefined && nic === undefined && egress === undefined) return;
  const liveNetwork = !!nic && !reset(nic);
  if (liveNetwork && !nic.network && !nic.subnetwork) throw new Error('At least one of network or subnetwork must be specified in networkInterface.');
  if (liveNetwork && connector) throw new Error('Cannot set both vpcConnector and networkInterface');
  if (reset(connector) && !liveNetwork || reset(nic) && !connector) return RESET_VALUE;
  const result = project(options, [], [['vpcConnector', 'connector'], ['networkInterface', 'networkInterfaces', value => [value]]]);
  if (egress !== undefined) result.egressSettings = egress;
  return result;
}

const endpointTransforms = [
  ['serviceAccount', 'serviceAccountEmail'],
  ['memory', 'availableMemoryMb', value => typeof value === 'object' ? value : memory[value]],
  ['region', 'region', list],
  ['secrets', 'secretEnvironmentVariables', values => values.map(value => ({key: typeof value === 'string' ? value : value.name}))],
];
const annotationTransforms = [
  ['memory', 'availableMemoryMb', value => memory[value]],
  ['region', 'regions', list],
  ['serviceAccount', 'serviceAccountEmail', serviceAccountFromShorthand],
  ['timeoutSeconds', 'timeout', value => `${value}s`],
  ['retry', 'failurePolicy', value => value ? {retry: true} : null],
];
function optionsToEndpoint(options, kind) {
  if (kind !== undefined) assertTimeoutSecondsValid(options, kind);
  const result = project(options, endpointFields, endpointTransforms);
  const vpc = network(options);
  if (vpc !== undefined) result.vpc = vpc;
  return result;
}
function optionsToTriggerAnnotations(options, kind) {
  if (kind !== undefined) assertTimeoutSecondsValid(options, kind);
  const result = project(options, annotationFields, annotationTransforms);
  const egress = options.vpcEgress ?? options.vpcConnectorEgressSettings;
  if (egress !== undefined) result.vpcConnectorEgressSettings = reset(egress) ? null : egress;
  return result;
}

Object.assign(exports, {
  MAX_EVENT_TIMEOUT_SECONDS: limits.event[0], MAX_HTTPS_TIMEOUT_SECONDS: limits.https[0],
  MAX_SCHEDULED_OR_TASK_TIMEOUT_SECONDS: limits.scheduledOrTask[0], MAX_IDENTITY_TIMEOUT_SECONDS: limits.identity[0],
  RESET_VALUE, requiresRole, getGlobalOptions, setGlobalOptions,
  clearGlobalOptions: () => {delete state.value;},
  assertTimeoutSecondsValid, optionsToEndpoint, optionsToTriggerAnnotations,
  __getSpec: () => ({globalOptions: getGlobalOptions(), params: params.declaredParams.map(parameter => parameter.toSpec())}),
});
