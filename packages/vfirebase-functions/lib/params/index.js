'use strict';
const types = require('./types.js'), {globalManifest} = require('../runtime/manifest.js');
const primary = Symbol.for('firebase-functions:params:declaredParams');
const major = require('../../package.json').version.split('.')[0];
const legacy = Symbol.for('firebase-functions:params:declaredParams:v' + major);
const declaredParams = globalThis[primary] ??= [];
globalThis[legacy] ??= [];

function replaceNamed(list, item) {
  // Preserve the public array's identity, including when callers have added
  // duplicate declarations. A replacement occupies the newest position.
  for (let index = list.length - 1; index >= 0; index--) if (list[index].name === item.name) list.splice(index, 1);
  list.push(item);
}
function declare(Type, name, options) {
  const parameter = new Type(name, options);
  const spec = parameter.toSpec();
  if (!Array.isArray(globalManifest.params)) globalManifest.params = [];
  replaceNamed(declaredParams, parameter);
  if (globalThis[legacy] !== declaredParams) replaceNamed(globalThis[legacy], parameter);
  replaceNamed(globalManifest.params, spec);
  return parameter;
}
function clearParams() {
  declaredParams.length = 0;
  globalThis[legacy].length = 0;
  delete globalManifest.params;
}
const api = {declaredParams, clearParams, Expression: types.Expression, BUCKET_PICKER: types.BUCKET_PICKER,
  select: types.select, multiSelect: types.multiSelect, expr: (strings, ...values) => new types.InterpolationExpression(strings, values)};
for (const [method, type] of Object.entries({Secret: 'SecretParam', JsonSecret: 'JsonSecretParam', String: 'StringParam', Boolean: 'BooleanParam', Int: 'IntParam', Float: 'FloatParam', List: 'ListParam'})) {
  api['define' + method] = (name, options = {}) => declare(types[type], name, options);
}
for (const [name, variable, field] of [['databaseURL', 'DATABASE_URL', 'databaseURL'], ['projectID', 'PROJECT_ID', 'projectId'], ['gcloudProject', 'GCLOUD_PROJECT', 'projectId'], ['storageBucket', 'STORAGE_BUCKET', 'storageBucket']]) {
  api[name] = new types.InternalExpression(variable, env => JSON.parse(env.FIREBASE_CONFIG || '{}')?.[field] || '');
}
const namespace = {...api};
module.exports = api;
Object.defineProperty(api, 'params_exports', {enumerable: true, get: () => namespace});
