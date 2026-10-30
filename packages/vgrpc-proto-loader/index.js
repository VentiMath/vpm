'use strict';
// Derived from @grpc/proto-loader 0.8.1. Copyright gRPC authors, Apache-2.0.
const Protobuf = require('vprotobufjs');
const descriptor = require('vprotobufjs/ext/descriptor');
const camelCase = require('vlodash.camelcase');
const {loadRoot, loadRootSync, addCommonProtos} = require('./util');
exports.Long = require('vlong');
exports.isAnyExtension = function isAnyExtension(obj) {
  return obj !== null && (typeof obj === 'object' || typeof obj === 'function') &&
    '@type' in obj && typeof obj['@type'] === 'string';
};
exports.IdempotencyLevel = {
  IDEMPOTENCY_UNKNOWN: 'IDEMPOTENCY_UNKNOWN',
  NO_SIDE_EFFECTS: 'NO_SIDE_EFFECTS',
  IDEMPOTENT: 'IDEMPOTENT',
};
const descriptorOptions = {longs: String, enums: String, bytes: String, defaults: true, oneofs: true, json: true};

// Keep ordinary object dictionaries, including their enumerable own keys, but
// never invoke Object.prototype's legacy setter for a schema-supplied name.
function put(object, key, value) {
  if (key === '__proto__') Object.defineProperty(object, key, {value, enumerable: true, writable: true, configurable: true});
  else object[key] = value;
}
function methodOptions(options) {
  const result = {deprecated: false, idempotency_level: 'IDEMPOTENCY_UNKNOWN', uninterpreted_option: []};
  for (const item of options || []) {
    for (const key of Object.keys(item)) {
      if (key === 'uninterpreted_option') result.uninterpreted_option.push(item[key]);
      else put(result, key, item[key]);
    }
  }
  return result;
}
function createPackageDefinition(root, options) {
  root.resolveAll();
  const files = root.toDescriptor('proto3').file;
  const buffers = files.map(file => {
    const bytes = descriptor.FileDescriptorProto.encode(file).finish();
    return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  });
  // Root descriptor export already visits every message. Reuse those private
  // descriptors instead of rebuilding them for every RPC request and response.
  const descriptors = new Map();
  function indexTypes(types, prefix) {
    for (const type of types || []) {
      const name = prefix + '.' + type.name;
      descriptors.set(name, type);
      indexTypes(type.nestedType, name);
    }
  }
  for (const file of files) indexTypes(file.messageType, file.package ? '.' + file.package : '');
  const codecs = new Map();
  function messageDefinition(type) {
    let codec = codecs.get(type);
    if (!codec) {
      codec = {
        serialize(arg) {
          if (Array.isArray(arg)) throw new Error(`Failed to serialize message: expected object with ${type.name} structure, got array instead`);
          return type.encode(type.fromObject(arg)).finish();
        },
        deserialize(bytes) { return type.toObject(type.decode(bytes), options); },
      };
      codecs.set(type, codec);
    }
    const reflected = descriptors.get(type.fullName) || type.toDescriptor('proto3');
    return {
      format: 'Protocol Buffer 3 DescriptorProto',
      // Each public definition gets its own mutable descriptor object, as
      // upstream does. No cache survives this one load operation.
      type: reflected.$type.toObject(reflected, descriptorOptions),
      fileDescriptorProtos: buffers,
      serialize: codec.serialize,
      deserialize: codec.deserialize,
    };
  }
  function serviceDefinition(service, name) {
    const result = {};
    for (const method of service.methodsArray) {
      const request = messageDefinition(method.resolvedRequestType);
      const response = messageDefinition(method.resolvedResponseType);
      put(result, method.name, {
        path: '/' + name + '/' + method.name,
        requestStream: !!method.requestStream,
        responseStream: !!method.responseStream,
        requestSerialize: request.serialize,
        requestDeserialize: request.deserialize,
        responseSerialize: response.serialize,
        responseDeserialize: response.deserialize,
        originalName: camelCase(method.name),
        requestType: request,
        responseType: response,
        options: methodOptions(method.parsedOptions),
      });
    }
    return result;
  }
  const result = {};
  function visit(object, prefix) {
    const name = prefix ? prefix + '.' + object.name : object.name;
    if (object instanceof Protobuf.Type) put(result, name, messageDefinition(object));
    else if (object instanceof Protobuf.Service) put(result, name, serviceDefinition(object, name));
    else if (object instanceof Protobuf.Enum) {
      const reflected = object.toDescriptor('proto3');
      put(result, name, {format: 'Protocol Buffer 3 EnumDescriptorProto', type: reflected.$type.toObject(reflected, descriptorOptions), fileDescriptorProtos: buffers});
    } else if (object instanceof Protobuf.Namespace) {
      for (const child of object.nestedArray) visit(child, name);
    }
  }
  visit(root, '');
  return result;
}
exports.load = async function load(filename, options) {
  return createPackageDefinition(await loadRoot(filename, options), options);
};
exports.loadSync = function loadSync(filename, options) {
  return createPackageDefinition(loadRootSync(filename, options), options);
};
exports.fromJSON = function fromJSON(json, options) {
  return createPackageDefinition(Protobuf.Root.fromJSON(json), options || {});
};
exports.loadFileDescriptorSetFromBuffer = function loadFileDescriptorSetFromBuffer(bytes, options) {
  return createPackageDefinition(Protobuf.Root.fromDescriptor(descriptor.FileDescriptorSet.decode(bytes)), options || {});
};
exports.loadFileDescriptorSetFromObject = function loadFileDescriptorSetFromObject(object, options) {
  return createPackageDefinition(Protobuf.Root.fromDescriptor(descriptor.FileDescriptorSet.fromObject(object)), options || {});
};
addCommonProtos();
