"use strict";
const {
  Client,
  makeClientConstructor,
  loadPackageDefinition,
} = require("./client.cjs");
const { Channel } = require("./channel.cjs"),
  { ChannelCredentials } = require("./credentials.cjs");
const { Metadata } = require("../build/src/metadata"),
  { CallCredentials } = require("../build/src/call-credentials");
const {
  Status: status,
  LogVerbosity: logVerbosity,
  Propagate: propagate,
} = require("../build/src/constants");
const {
  ConnectivityState: connectivityState,
} = require("../build/src/connectivity-state");
const {
  CompressionAlgorithms: compressionAlgorithms,
} = require("../build/src/compression-algorithms");
const credentials = {
  createInsecure: ChannelCredentials.createInsecure,
  createSsl: ChannelCredentials.createSsl,
  createFromSecureContext: ChannelCredentials.createFromSecureContext,
  createEmpty: CallCredentials.createEmpty,
  createFromMetadataGenerator: CallCredentials.createFromMetadataGenerator,
  createFromGoogleCredential: CallCredentials.createFromGoogleCredential,
  combineCallCredentials: (first, ...rest) =>
    rest.reduce((value, next) => value.compose(next), first),
  combineChannelCredentials: (first, ...rest) =>
    rest.reduce((value, next) => value.compose(next), first),
};
class StatusBuilder {
  withCode(code) {
    this.code = code;
    return this;
  }
  withDetails(details) {
    this.details = details;
    return this;
  }
  withMetadata(metadata) {
    this.metadata = metadata;
    return this;
  }
  build() {
    const result = {};
    for (const key of ["code", "details", "metadata"])
      if (this[key] !== undefined) result[key] = this[key];
    return result;
  }
}
const api = {
  credentials,
  Metadata,
  CallCredentials,
  ChannelCredentials,
  Client,
  Channel,
  makeClientConstructor,
  makeGenericClientConstructor: makeClientConstructor,
  loadPackageDefinition,
  status,
  logVerbosity,
  connectivityState,
  propagate,
  compressionAlgorithms,
  StatusBuilder,
  closeClient: (client) => client.close(),
  waitForClientReady: (client, deadline, callback) =>
    client.waitForReady(deadline, callback),
  getClientChannel: (client) => Client.prototype.getChannel.call(client),
  load() {
    throw Error("Use vgrpc-proto-loader and loadPackageDefinition");
  },
  loadObject() {
    throw Error("Use vgrpc-proto-loader and loadPackageDefinition");
  },
  setLogger: (logger) => require("../build/src/logging").setLogger(logger),
  setLogVerbosity: (level) =>
    require("../build/src/logging").setLoggerVerbosity(level),
};
// Server/diagnostic/experimental compatibility is deliberately separate. Importing
// the application client, including its ESM facade, never evaluates these modules.
function deferred(file, name) {
  let loaded;
  const get = () => loaded || (loaded = require("../build/src/index")[name]);
  const proxy = new Proxy(function () {}, {
    get(_target, key) {
      return Reflect.get(get(), key);
    },
    apply(_target, receiver, args) {
      return Reflect.apply(get(), receiver, args);
    },
    construct(_target, args, target) {
      return Reflect.construct(get(), args, target === proxy ? get() : target);
    },
  });
  return proxy;
}
for (const [file, names] of Object.entries({
  server: ["Server"],
  "server-credentials": ["ServerCredentials"],
  "client-interceptors": [
    "ListenerBuilder",
    "RequesterBuilder",
    "InterceptingCall",
    "InterceptorConfigurationError",
  ],
  channelz: ["getChannelzServiceDefinition", "getChannelzHandlers"],
  admin: ["addAdminServicesToServer"],
  "server-interceptors": [
    "ServerListenerBuilder",
    "ResponderBuilder",
    "ServerInterceptingCall",
  ],
  orca: ["ServerMetricRecorder"],
}))
  for (const name of names) api[name] = deferred(file, name);
api.experimental = new Proxy(
  {},
  {
    get(_target, key) {
      return require("../build/src/experimental")[key];
    },
    ownKeys() {
      return Reflect.ownKeys(require("../build/src/experimental"));
    },
    getOwnPropertyDescriptor(_target, key) {
      return {
        value: require("../build/src/experimental")[key],
        enumerable: true,
        configurable: true,
      };
    },
  },
);
module.exports = api;
