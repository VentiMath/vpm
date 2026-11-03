"use strict";
const protobuf = require("vprotobufjs"),
  settings = require("./settings.cjs"),
  calls = require("./calls.cjs"),
  transport = require("./grpc.cjs"),
  paths = require("./paths.cjs"),
  tracing = require("./tracing.cjs"),
  rest = require("./rest.cjs");
class LocationsClient {
  constructor(gax, options = {}) {
    this.gax = gax;
    this.options = { ...options };
    this.auth = gax.auth;
    this.closed = false;
    this.descriptors = {
      page: {
        listLocations: new calls.PageDescriptor(
          "pageToken",
          "nextPageToken",
          "locations",
        ),
      },
    };
  }
  async initialize() {
    if (this.closed) throw new settings.GoogleError("Client closed");
    if (!this.stub) {
      const schema = this.gax.loadProtoJSON(
        require("../build/protos/locations.json"),
      );
      const service = this.gax.fallback
        ? schema.lookupService("google.cloud.location.Locations")
        : schema.google.cloud.location.Locations;
      this.stub = this.gax.createStub(service, {
        ...this.options,
        servicePath:
          this.options.servicePath ??
          this.options.apiEndpoint ??
          "cloud.googleapis.com",
        port: this.options.port ?? 443,
      });
    }
    return this.stub;
  }
  getLocation(request, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    options = this.routed(request, options);
    return calls.createApiCall(
      this.initialize().then((s) => s.getLocation.bind(s)),
      new settings.CallSettings(),
    )(request, options, callback);
  }
  listLocations(request, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    options = this.routed(request, options);
    return calls.createApiCall(
      this.initialize().then((s) => s.listLocations.bind(s)),
      new settings.CallSettings(),
      new calls.PageDescriptor("pageToken", "nextPageToken", "locations"),
    )(request, options, callback);
  }
  routed(request, options = {}) {
    return {
      ...options,
      otherArgs: {
        ...options.otherArgs,
        headers: {
          ...options.otherArgs?.headers,
          "x-goog-request-params": paths.routingHeader.fromParams({
            name: request?.name ?? "",
          }),
        },
      },
    };
  }
  listLocationsAsync(request, options) {
    options = this.routed(request, options);
    return this.descriptors.page.listLocations.asyncIterate(
      this.listLocations.bind(this),
      request,
      options,
    );
  }
  async close() {
    this.closed = true;
    if (this.stub) (await this.stub).close();
  }
}
const warned = new Set();
function warn(code, message, type = "Warning") {
  if (warned.has(code)) return;
  warned.add(code);
  process.emitWarning(message, { code, type });
}
const api = {
  loggingUtils: require("vgoogle-logging-utils"),
  ...settings,
  ...calls,
  ...transport,
  ...paths,
  ...tracing,
  protobuf,
  protobufMinimal: require("vprotobufjs/minimal"),
  serializer: require("vproto3-json-serializer"),
  googleAuthLibrary: require("vgoogle-auth-library"),
  LocationsClient,
  warn,
  version: require("../package.json").version,
  makeUUID: require("node:crypto").randomUUID,
  protobufFromJSON: rest.protobufFromJSON,
};
// Administration/LROs are retained compatibility, loaded only when explicitly used.
for (const name of [
  "OperationsClient",
  "IamClient",
  "LongrunningDescriptor",
  "Operation",
])
  api[name] = class {
    constructor(...args) {
      return new (require("../build/src/index.js")[name])(...args);
    }
  };
for (const name of ["operation", "lro"])
  api[name] = (...args) => require("../build/src/index.js")[name](...args);
const fallback = {
  ...api,
  GrpcClient: rest.GrpcClient,
  defaultToObjectOptions: rest.defaultToObjectOptions,
  fallback: true,
};
api.fallback = fallback;
fallback.lro = (...args) => require("../build/src/fallback.js").lro(...args);
module.exports = api;

for (const name of ["LocationProtos", "IamProtos", "operationsProtos"])
  for (const target of [api, fallback])
    Object.defineProperty(target, name, {
      enumerable: true,
      value: new Proxy(
        {},
        { get: (_target, key) => require("../build/src/index.js")[name][key] },
      ),
    });
