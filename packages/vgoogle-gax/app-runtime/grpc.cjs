"use strict";
const grpc = require("vgrpc-js"),
  loader = require("vgrpc-proto-loader"),
  { GoogleAuth } = require("vgoogle-auth-library");
const { JsonProtoCache } = require("../build/src/jsonProtoCache"),
  { constructSettings, Status } = require("./settings.cjs");
const cache = new JsonProtoCache();
class GrpcClient {
  constructor(options = {}) {
    this.auth = options.auth ?? new GoogleAuth(options);
    this.grpc = options.grpc ?? grpc;
    this.grpcVersion = require("vgrpc-js/package.json").version;
    this.fallback = false;
    this.options = { ...options };
  }
  static defaultOptions() {
    return {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    };
  }
  static clearProtoCache() {
    cache.clear();
  }
  loadProtoJSON(json, refresh = false) {
    return cache.load(this.grpc, json, refresh, (snapshot) =>
      this.grpc.loadPackageDefinition(
        loader.fromJSON(snapshot, GrpcClient.defaultOptions()),
      ),
    );
  }
  metadataBuilder(headers = {}) {
    const base = new this.grpc.Metadata();
    for (const [key, value] of Object.entries(headers))
      for (const item of Array.isArray(value) ? value : [value])
        base.add(key, String(item));
    return (_tests, extra = {}) => {
      const metadata = base.clone();
      for (const [key, value] of Object.entries(extra)) {
        if (key.toLowerCase() === "x-goog-api-client") continue;
        if (Array.isArray(value))
          for (const item of value) metadata.add(key, String(item));
        else metadata.set(key, String(value));
      }
      return metadata;
    };
  }
  constructSettings(service, config, overrides, headers, tracing) {
    return constructSettings(
      service,
      config,
      overrides,
      Status,
      {
        metadataBuilder: this.metadataBuilder(headers),
        servicePath: this.options.servicePath ?? this.options.apiEndpoint,
        port: this.options.port,
      },
      tracing ?? this.options.enableTelemetryTracing,
    );
  }
  async createStub(Client, options = {}) {
    const opts = { ...this.options, ...options };
    let endpoint = opts.servicePath ?? opts.apiEndpoint;
    if (!endpoint)
      throw new TypeError("A servicePath or apiEndpoint is required");
    const port = Number(opts.port ?? 443);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new TypeError("Invalid service port");
    const universe = opts.universeDomain ?? "googleapis.com",
      fromAuth = await this.auth.getUniverseDomain?.();
    if (fromAuth && universe !== fromAuth)
      throw new Error(
        "Configured universe domain does not match credential universe domain",
      );
    if (
      opts.clientCertSource ||
      process.env.GOOGLE_API_USE_CLIENT_CERTIFICATE === "true"
    )
      throw new TypeError(
        "Automatic client certificate discovery is outside the application contract; pass explicit cert/key or sslCreds",
      );
    let credentials = opts.sslCreds;
    if (!credentials) {
      if (!!opts.cert !== !!opts.key)
        throw new TypeError("Both client certificate and key are required");
      const ssl = this.grpc.credentials.createSsl(
          opts.rootCerts ?? null,
          opts.key ? Buffer.from(opts.key) : null,
          opts.cert ? Buffer.from(opts.cert) : null,
        ),
        client = await this.auth.getClient();
      credentials = this.grpc.credentials.combineChannelCredentials(
        ssl,
        this.grpc.credentials.createFromGoogleCredential(client),
      );
    }
    const channel = {
      "grpc.max_receive_message_length": -1,
      "grpc.max_send_message_length": -1,
      "grpc.initial_reconnect_backoff_ms": 1000,
    };
    for (const [key, value] of Object.entries(opts))
      if (key.startsWith("grpc.") || key.startsWith("grpc-node."))
        channel[key.replace(/^grpc\.grpc\./, "grpc.")] = value;
    return new Client(endpoint + ":" + port, credentials, channel);
  }
  static createByteLengthFunction(message) {
    return (value) => message.encode(value).finish().length;
  }
}
module.exports = {
  GrpcClient,
  grpc,
  GoogleAuth,
  ChannelCredentials: grpc.ChannelCredentials,
  createByteLengthFunction: GrpcClient.createByteLengthFunction,
};
