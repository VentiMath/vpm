'use strict';
const path = require('node:path'), {pathToFileURL} = require('node:url');
const {globalManifest} = require('./manifest.js'), {requiresAPI} = require('../common/api.js');
const isObject = value => value !== null && typeof value === 'object';
const put = (object, key, value) => Object.defineProperty(object, key, {value, enumerable: true, configurable: true, writable: true});
function extension(value) {
  if (!isObject(value) || typeof value.instanceId !== 'string' || !isObject(value.params) || value.events && !Array.isArray(value.events)) return;
  const ref = typeof value.FIREBASE_EXTENSION_REFERENCE === 'string' ? {ref: value.FIREBASE_EXTENSION_REFERENCE}
    : typeof value.FIREBASE_EXTENSION_LOCAL_PATH === 'string' ? {localPath: value.FIREBASE_EXTENSION_LOCAL_PATH} : null;
  if (!ref) return;
  const params = {};
  for (const [raw, parameter] of Object.entries(value.params)) {
    let key = raw;
    if (raw.startsWith('_') && raw !== '_EVENT_ARC_REGION') {
      const [, prefix, suffix = ''] = /^_([^_]+)_?(.*)$/.exec(raw);
      const namespaces = {FUNCTION: 'function', V2FUNCTION: 'v2function'};
      const namespace = Object.hasOwn(namespaces, prefix) ? namespaces[prefix] : undefined;
      key = (namespace ? 'firebaseextensions.v1beta.' + namespace : 'undefined') + '/' +
        suffix.toLowerCase().replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
    }
    put(params, key, Array.isArray(parameter) ? parameter.join(',') : parameter);
  }
  return {params, ...ref, events: value.events || []};
}
function extractStack(source, endpoints, requiredAPIs, extensions, prefix = '') {
  // Traverse depth-first with explicit frames. Only ancestor cycles are errors:
  // an exported group may intentionally appear under more than one name.
  const ancestors = new Set([source]);
  const frames = [{source, prefix, entries: Object.entries(source), index: 0}];
  while (frames.length) {
    const frame = frames.at(-1);
    if (frame.index === frame.entries.length) {ancestors.delete(frame.source); frames.pop(); continue;}
    const [name, value] = frame.entries[frame.index++], fullName = frame.prefix + name;
    if (typeof value === 'function' && isObject(value.__endpoint)) {
      if (Object.hasOwn(endpoints, fullName)) throw new Error(`Duplicate function endpoint "${fullName}"`);
      put(endpoints, fullName, {...value.__endpoint, entryPoint: fullName.replace(/-/g, '.')});
      if (Array.isArray(value.__requiredAPIs)) requiredAPIs.push(...value.__requiredAPIs);
    } else {
      const item = extension(value);
      if (item) put(extensions, value.instanceId, item);
      else if (isObject(value)) {
        if (ancestors.has(value)) throw new Error(`Circular function export group at "${fullName}"`);
        ancestors.add(value);
        frames.push({source: value, prefix: fullName + '-', entries: Object.entries(value), index: 0});
      }
    }
  }
}
function mergeRequiredAPIs(values) {
  const groups = new Map();
  for (const {api, reason} of values) {
    if (!groups.has(api)) groups.set(api, new Set());
    groups.get(api).add(reason);
  }
  return Array.from(groups, ([api, reasons]) => ({api, reason: Array.from(reasons).join(' ')}));
}
async function loadModule(directory) {
  const location = path.resolve(directory);
  try {return require(location);}
  catch (error) {
    if (!['ERR_REQUIRE_ESM', 'ERR_REQUIRE_ASYNC_MODULE'].includes(error?.code)) throw error;
    return import(pathToFileURL(require.resolve(location)).href);
  }
}
async function loadStack(directory) {
  const source = await loadModule(directory), endpoints = {}, extensions = {}, requiredAPIs = [];
  extractStack(source, endpoints, requiredAPIs, extensions);
  for (const {api, reason} of requiredAPIs) requiresAPI(api, reason);
  globalManifest.extensions = {...extensions, ...(isObject(globalManifest.extensions) ? globalManifest.extensions : {})};
  globalManifest.requiredAPIs ||= [];
  const names = new Set(Array.isArray(globalManifest.params) ? globalManifest.params.map(item => item.name) : []);
  for (const symbol of Object.getOwnPropertySymbols(globalThis)) {
    if (!symbol.description?.startsWith('firebase-functions:params:declaredParams:v') || !Array.isArray(globalThis[symbol])) continue;
    for (const parameter of globalThis[symbol]) if (typeof parameter?.toSpec === 'function') {
      const spec = parameter.toSpec();
      if (!names.has(spec.name)) {
        if (!Array.isArray(globalManifest.params)) globalManifest.params = [];
        globalManifest.params.push(spec); names.add(spec.name);
      }
    }
  }
  return {specVersion: 'v1alpha1', endpoints, ...globalManifest};
}
module.exports = {extractStack, mergeRequiredAPIs, loadStack};
