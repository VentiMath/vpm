'use strict';
// Shared runtime for the Firestore API clients. Upstream generates one copy of
// this logic per method; here each service is a table of methods (see
// firestore.js and admin.js) and every method shares one implementation.
// Derived from @google-cloud/firestore-api 0.7.1 (Apache-2.0, Google LLC).

const {PassThrough} = require('node:stream');
const logging = require('vgoogle-logging-utils');
const {version} = require('../package.json');

const CLOSED = 'The client has already been closed.';
const log = logging.log('firestore-api');

function universeDomain(opts) {
  if (opts?.universe_domain && opts?.universeDomain && opts.universe_domain !== opts.universeDomain) {
    throw new Error('Please set either universe_domain or universeDomain, but not both.');
  }
  const fromEnv = typeof process === 'object' && typeof process.env === 'object'
    ? process.env.GOOGLE_CLOUD_UNIVERSE_DOMAIN
    : undefined;
  return opts?.universeDomain ?? opts?.universe_domain ?? fromEnv ?? 'googleapis.com';
}

// Status details arrive as protobuf Any values. Decode the ones this service
// knows; keep the rest as they arrived instead of discarding them.
function decodeDetails(details, root) {
  return details.map(detail => {
    const anyValue = detail && (detail.$type?.fullName === '.google.protobuf.Any' || detail.constructor?.name === 'Any');
    if (!anyValue) return detail;
    const url = detail.type_url ?? detail.typeUrl;
    const prefix = 'type.googleapis.com/';
    if (typeof url !== 'string' || !url.startsWith(prefix)) return detail;
    try {
      return root.lookupType(url.slice(prefix.length)).decode(detail.value);
    } catch {
      return detail;
    }
  });
}

// gax caches loaded protos by a hash of the serialized JSON, which costs about
// 0.6 ms per client construction. The JSON here is one module object, so key
// the same results by identity: per gax client class or module, then per JSON.
const loaded = new WeakMap();
function cached(owner, json, load) {
  let byJson = loaded.get(owner);
  if (!byJson) loaded.set(owner, byJson = new WeakMap());
  let value = byJson.get(json);
  if (value === undefined) byJson.set(json, value = load());
  return value;
}
// The parsed root used for LRO decoders and status details. Upstream parses
// the JSON again on every error that carries details.
function protobufRoot(gaxModule, json) {
  return cached(gaxModule, json, () => gaxModule.protobufFromJSON(json));
}

// Read a dotted request field without throwing on a missing parent message.
function field(request, path) {
  let value = request;
  for (const key of path.split('.')) value = value?.[key];
  return value;
}

// Upstream mutates the caller's options to add the routing header. Copy the
// two nested records instead, so reused option objects are left unchanged.
function withRouting(gaxModule, options, params) {
  const otherArgs = options?.otherArgs ?? {};
  const headers = {...otherArgs.headers, 'x-goog-request-params': gaxModule.routingHeader.fromParams(params)};
  return {...options, otherArgs: {...otherArgs, headers}};
}

// Routing rules: [header, dottedField] pairs, or {regex: [...], from} for
// fields whose header values are captured from a resource name.
function routingParams(rule, request) {
  if (rule.regex) {
    const params = {};
    const value = field(request, rule.from);
    if (value !== undefined && value !== null) {
      for (const [pattern, group] of rule.regex) {
        const match = value.toString().match(pattern);
        if (match) params[group] = match.groups?.[group] ?? value;
      }
    }
    return params;
  }
  const params = {};
  for (const [header, path] of rule) params[header] = field(request, path)?.toString() ?? '';
  return params;
}

function splitArguments(optionsOrCallback, callback) {
  if (typeof optionsOrCallback === 'function' && callback === undefined) return [{}, optionsOrCallback];
  return [optionsOrCallback || {}, callback];
}

function defineClient(spec) {
  const {className, service, stubProperty, json, config, scopes, methods, pathTemplates = [], longRunning} = spec;

  class Client {
    _terminated = false;
    // Set when close() starts; _terminated is set once the channel is closed.
    _closing = false;
    _opts;
    _providedCustomServicePath;
    _gaxModule;
    _gaxGrpc;
    _protos;
    _defaults;
    _universeDomain;
    _servicePath;
    _log = log;
    auth;
    descriptors = {page: {}, stream: {}, longrunning: {}, batching: {}};
    warn;
    innerApiCalls;
    locationsClient;

    constructor(opts, gaxInstance) {
      // Static members resolve through the constructor, so subclasses can override them.
      const staticMembers = this.constructor;
      this._universeDomain = universeDomain(opts);
      this._servicePath = 'firestore.' + this._universeDomain;
      const servicePath = opts?.servicePath || opts?.apiEndpoint || this._servicePath;
      this._providedCustomServicePath = !!(opts?.servicePath || opts?.apiEndpoint);
      const port = opts?.port || staticMembers.port;
      const clientConfig = opts?.clientConfig ?? {};
      const fallback = opts?.fallback ?? (typeof window !== 'undefined' && typeof window?.fetch === 'function');
      opts = Object.assign({servicePath, port, clientConfig, fallback}, opts);
      // Request numeric enum values if REST transport is used.
      opts.numericEnums = true;
      if (servicePath !== this._servicePath && !('scopes' in opts)) opts.scopes = staticMembers.scopes;
      gaxInstance ??= require('vgoogle-gax');
      this._gaxModule = opts.fallback ? gaxInstance.fallback : gaxInstance;
      this._gaxGrpc = new this._gaxModule.GrpcClient(opts);
      this._opts = opts;
      this.auth = this._gaxGrpc.auth;
      this.auth.useJWTAccessWithScope = true;
      this.auth.defaultServicePath = this._servicePath;
      if (servicePath === this._servicePath) this.auth.defaultScopes = staticMembers.scopes;
      this.locationsClient = new this._gaxModule.LocationsClient(this._gaxGrpc, opts);

      const clientHeader = [`gax/${this._gaxModule.version}`, `gapic/${version}`];
      if (typeof process === 'object' && 'versions' in process) clientHeader.push(`gl-node/${process.versions.node}`);
      else clientHeader.push(`gl-web/${this._gaxModule.version}`);
      clientHeader.push(`${opts.fallback ? 'rest' : 'grpc'}/${this._gaxGrpc.grpcVersion}`);
      if (opts.libName && opts.libVersion) clientHeader.push(`${opts.libName}/${opts.libVersion}`);

      this._protos = cached(this._gaxGrpc.constructor, json, () => this._gaxGrpc.loadProtoJSON(json));
      if (pathTemplates.length) {
        this.pathTemplates = {};
        for (const [name, template] of pathTemplates) this.pathTemplates[name + 'PathTemplate'] = new this._gaxModule.PathTemplate(template);
      }
      for (const method of methods) {
        if (method.kind === 'paged') this.descriptors.page[method.name] = new this._gaxModule.PageDescriptor('pageToken', 'nextPageToken', method.resources);
        if (method.kind === 'server' || method.kind === 'bidi') {
          const type = method.kind === 'server' ? this._gaxModule.StreamType.SERVER_STREAMING : this._gaxModule.StreamType.BIDI_STREAMING;
          this.descriptors.stream[method.name] = new this._gaxModule.StreamDescriptor(type, !!opts.fallback, !!opts.gaxServerStreamingRetries);
        }
      }
      if (longRunning) {
        const root = protobufRoot(this._gaxModule, json);
        const lroOptions = {auth: this.auth, grpc: 'grpc' in this._gaxGrpc ? this._gaxGrpc.grpc : undefined};
        if (opts.fallback) {
          lroOptions.protoJson = root;
          lroOptions.httpRules = longRunning.httpRules;
        }
        this.operationsClient = this._gaxModule.lro(lroOptions).operationsClient(opts);
        for (const method of methods) {
          if (method.kind !== 'lro') continue;
          const response = root.lookup(method.response), metadata = root.lookup(method.metadata);
          this.descriptors.longrunning[method.name] = new this._gaxModule.LongrunningDescriptor(this.operationsClient, response.decode.bind(response), metadata.decode.bind(metadata));
        }
      }
      this._defaults = this._gaxGrpc.constructSettings(service, config, opts.clientConfig || {}, {'x-goog-api-client': clientHeader.join(' ')});
      this.innerApiCalls = {};
      this.warn = this._gaxModule.warn;
    }

    initialize() {
      if (this[stubProperty]) return this[stubProperty];
      this[stubProperty] = this._gaxGrpc.createStub(
        this._opts.fallback ? this._protos.lookupService(service) : field(this._protos, service),
        this._opts, this._providedCustomServicePath);
      for (const {name} of methods) {
        // A failed stub is reported through each call, not as an unhandled rejection.
        const callPromise = this[stubProperty].then(stub => (...args) => {
          if (this._terminated) {
            if (name in this.descriptors.stream) {
              const stream = new PassThrough({objectMode: true});
              setImmediate(() => stream.emit('error', new this._gaxModule.GoogleError(CLOSED)));
              return stream;
            }
            // gax turns this rejection into a GoogleError with the message as-is;
            // rejecting with an Error would make it wrap the error's string form.
            return Promise.reject(CLOSED);
          }
          return stub[name].apply(stub, args);
        }, error => () => { throw error; });
        const descriptor = this.descriptors.page[name] || this.descriptors.stream[name] || this.descriptors.longrunning[name] || undefined;
        this.innerApiCalls[name] = this._gaxModule.createApiCall(callPromise, this._defaults[name], descriptor, this._opts.fallback);
      }
      return this[stubProperty];
    }

    static get servicePath() {
      if (typeof process === 'object' && typeof process.emitWarning === 'function') {
        process.emitWarning('Static servicePath is deprecated, please use the instance method instead.', 'DeprecationWarning');
      }
      return 'firestore.googleapis.com';
    }
    static get apiEndpoint() {
      if (typeof process === 'object' && typeof process.emitWarning === 'function') {
        process.emitWarning('Static apiEndpoint is deprecated, please use the instance method instead.', 'DeprecationWarning');
      }
      return 'firestore.googleapis.com';
    }
    get apiEndpoint() { return this._servicePath; }
    get universeDomain() { return this._universeDomain; }
    static get port() { return 443; }
    static get scopes() { return scopes.slice(); }

    getProjectId(callback) {
      if (callback) {
        this.auth.getProjectId(callback);
        return;
      }
      return this.auth.getProjectId();
    }

    getLocation(request, options, callback) {
      return this.locationsClient.getLocation(request, options, callback);
    }
    listLocationsAsync(request, options) {
      return this.locationsClient.listLocationsAsync(request, options);
    }

    close() {
      if (this[stubProperty] && !this._terminated) {
        this._closing = true;
        return this[stubProperty].then(async stub => {
          this._log.info('ending gRPC channel');
          this._terminated = true;
          stub.close();
          await this.locationsClient.close();
          await this.operationsClient?.close();
        });
      }
      return Promise.resolve();
    }

    // Promise results with Any status details are decoded with this service's
    // protos. Upstream does this for ordinary calls only; it applies to
    // long-running and paged calls too.
    _decodeError(error) {
      if (error && typeof error === 'object' && 'statusDetails' in error && Array.isArray(error.statusDetails)) {
        error.statusDetails = decodeDetails(error.statusDetails, protobufRoot(this._gaxModule, json));
      }
      throw error;
    }
  }

  Object.defineProperty(Client, 'name', {value: className});
  for (const method of methods) define(Client.prototype, method);
  for (const [name, template, params] of pathTemplates) definePath(Client.prototype, name, template, params);
  if (longRunning) defineOperations(Client.prototype);
  return Client;
}

function define(prototype, method) {
  const {name, kind, routing} = method;
  const routed = (client, request, options) => routing ? withRouting(client._gaxModule, options, routingParams(routing, request)) : options;
  switch (kind) {
    case 'unary':
    case 'lro':
    case 'paged':
      prototype[name] = function (request, optionsOrCallback, callback) {
        request = request || {};
        let [options, cb] = splitArguments(optionsOrCallback, callback);
        options = routed(this, request, options);
        this.initialize();
        const label = kind === 'paged' ? 'values' : 'response';
        this._log.info(`${name} request %j`, request);
        const wrapped = cb ? (error, response, ...rest) => {
          this._log.info(`${name} ${label} %j`, kind === 'lro' ? rest[0] : response);
          cb(error, response, ...rest);
        } : undefined;
        return this.innerApiCalls[name](request, options, wrapped)?.then(result => {
          this._log.info(`${name} ${label} %j`, kind === 'lro' ? result[1] : result[0]);
          return result;
        }, error => this._decodeError(error));
      };
      if (kind === 'lro') {
        const check = 'check' + name[0].toUpperCase() + name.slice(1) + 'Progress';
        prototype[check] = async function (operationName) {
          this._log.info(`${name} long-running`);
          const request = new this._gaxModule.operationsProtos.google.longrunning.GetOperationRequest({name: operationName});
          const [operation] = await this.operationsClient.getOperation(request);
          return new this._gaxModule.Operation(operation, this.descriptors.longrunning[name], this._gaxModule.createDefaultBackoffSettings());
        };
      }
      if (kind === 'paged') {
        prototype[name + 'Stream'] = function (request, options) {
          request = request || {};
          options = routed(this, request, options || {});
          const settings = this._defaults[name].merge(options);
          this.initialize();
          this._log.info(`${name} stream %j`, request);
          return this.descriptors.page[name].createStream(this.innerApiCalls[name], request, settings);
        };
        prototype[name + 'Async'] = function (request, options) {
          request = request || {};
          options = routed(this, request, options || {});
          const settings = this._defaults[name].merge(options);
          this.initialize();
          this._log.info(`${name} iterate %j`, request);
          return this.descriptors.page[name].asyncIterate(this.innerApiCalls[name], request, settings);
        };
      }
      break;
    case 'server':
      prototype[name] = function (request, options) {
        request = request || {};
        options = routed(this, request, options || {});
        // A closing client's stream fails with "already been closed" before any
        // response, which retry-request treats as retryable: upstream reports
        // it only after two backoff retries, about seven seconds later.
        if (this._closing) options = {...options, retryRequestOptions: {...options.retryRequestOptions, noResponseRetries: 0}};
        this.initialize();
        this._log.info(`${name} stream %j`, options);
        return this.innerApiCalls[name](request, options);
      };
      break;
    case 'bidi':
      prototype[name] = function (options) {
        this.initialize();
        this._log.info(`${name} stream %j`, options);
        return this.innerApiCalls[name](null, options);
      };
      break;
    default:
      throw new Error('Unknown method kind: ' + kind);
  }
}

function capitalize(text) {
  return text[0].toUpperCase() + text.slice(1);
}

function definePath(prototype, name, template, params) {
  // Method arguments are camelCase; template variables are snake_case.
  const variable = param => param.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
  prototype[name + 'Path'] = function (...args) {
    const values = {};
    params.forEach((param, i) => {
      // Upstream fails inside the template with "Cannot read properties of undefined".
      if (args[i] === undefined || args[i] === null) throw new TypeError(`${name}Path: ${param} is required.`);
      values[variable(param)] = args[i];
    });
    return this.pathTemplates[name + 'PathTemplate'].render(values);
  };
  for (const param of params) {
    prototype['match' + capitalize(param) + 'From' + capitalize(name) + 'Name'] = function (resource) {
      return this.pathTemplates[name + 'PathTemplate'].match(resource)[variable(param)];
    };
  }
}

function defineOperations(prototype) {
  for (const name of ['getOperation', 'cancelOperation', 'deleteOperation']) {
    prototype[name] = function (request, optionsOrCallback, callback) {
      request = request || {};
      let [options, cb] = splitArguments(optionsOrCallback, callback);
      options = withRouting(this._gaxModule, options, {name: request.name ?? ''});
      return this.operationsClient[name](request, options, cb);
    };
  }
  prototype.listOperationsAsync = function (request, options) {
    request = request || {};
    options = withRouting(this._gaxModule, options || {}, {name: request.name ?? ''});
    return this.operationsClient.listOperationsAsync(request, options);
  };
}

module.exports = {defineClient};
