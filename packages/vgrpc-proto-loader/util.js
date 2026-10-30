'use strict';
// Derived from @grpc/proto-loader 0.8.1. Copyright gRPC authors, Apache-2.0.
const fs = require('node:fs');
const path = require('node:path');
const Protobuf = require('vprotobufjs');
function makeRoot(options) {
  const root = new Protobuf.Root();
  if (options && options.includeDirs) {
    const dirs = options.includeDirs;
    if (!Array.isArray(dirs)) throw new Error('The includeDirs option must be an array');
    const resolve = root.resolvePath;
    root.resolvePath = (origin, target) => {
      if (path.isAbsolute(target)) return target;
      for (const directory of dirs) {
        const file = path.join(directory, target);
        try { fs.accessSync(file, fs.constants.R_OK); return file; } catch {}
      }
      process.emitWarning(`${target} not found in any of the include paths ${dirs}`);
      return resolve(origin, target);
    };
  }
  return root;
}
exports.loadRoot = async (filename, options) => makeRoot(options).load(filename, options || {});
exports.loadRootSync = (filename, options) => makeRoot(options).loadSync(filename, options || {});
exports.addCommonProtos = function addCommonProtos() {
  // Static paths keep bundlers able to discover all four extra well-known types.
  const api = require('vprotobufjs/google/protobuf/api.json');
  const descriptor = require('vprotobufjs/google/protobuf/descriptor.json');
  const sourceContext = require('vprotobufjs/google/protobuf/source_context.json');
  const type = require('vprotobufjs/google/protobuf/type.json');
  for (const [name, value] of [['api', api], ['descriptor', descriptor], ['source_context', sourceContext], ['type', type]]) {
    Protobuf.common(name, value.nested.google.nested.protobuf.nested);
  }
};
