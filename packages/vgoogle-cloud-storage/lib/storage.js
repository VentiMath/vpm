"use strict";
const { GoogleAuth } = require("vgoogle-auth-library");
const { storageEndpoint } = require("./storage-endpoint.js");
const transport = require("./transport.js");
const { snapshot } = require("./save.js");
const IdempotencyStrategy = Object.freeze({
  0: "RetryAlways",
  1: "RetryConditional",
  2: "RetryNever",
  RetryAlways: 0,
  RetryConditional: 1,
  RetryNever: 2,
});
const defaults = {
  autoRetry: true,
  maxRetries: 3,
  retryDelayMultiplier: 2,
  totalTimeout: 600,
  maxRetryDelay: 64,
  idempotencyStrategy: 1,
  retryableErrorFn: transport.retryable,
};
class Storage {
  constructor(supplied = {}) {
    const options = snapshot(supplied);
    this.universeDomain = options.universeDomain || "googleapis.com";
    const endpoint = storageEndpoint(
      options,
      process.env.STORAGE_EMULATOR_HOST,
      this.universeDomain,
    );
    Object.assign(this, endpoint);
    Object.defineProperty(this, "emulatorHost", {
      value: endpoint.emulatorHost,
      enumerable: true,
    });
    this.projectId = options.projectId || "{{projectId}}";
    this.timeout = options.timeout;
    this.useAuthWithCustomEndpoint = options.useAuthWithCustomEndpoint === true;
    this.authClient =
      options.authClient ||
      new GoogleAuth({
        ...options.clientOptions,
        projectId: options.projectId,
        credentials: options.credentials,
        keyFilename: options.keyFilename,
        keyFile: options.keyFilename,
        universeDomain: this.universeDomain,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
    this.retryOptions = { ...defaults, ...options.retryOptions };
    this.globalInterceptors = [...(options.interceptors_ || [])];
    this.interceptors = [];
    this.makeAuthenticatedRequest = (options, callback) =>
      transport.request(this, options, callback);
    this.makeAuthenticatedRequest.authClient = this.authClient;
    this.crc32cGenerator =
      options.crc32cGenerator || (() => new (require("./crc32c.js").CRC32C)());
  }
  getRequestInterceptors() {
    return [...this.globalInterceptors, ...this.interceptors]
      .filter((value) => typeof value.request === "function")
      .map((value) => value.request);
  }
  request(options, callback) {
    return this.makeAuthenticatedRequest(
      {
        ...options,
        uri: /^https?:\/\//i.test(options.uri)
          ? options.uri
          : this.baseUrl + options.uri,
      },
      callback,
    );
  }
  getProjectId(callback) {
    const operation =
      this.projectId === "{{projectId}}"
        ? this.authClient.getProjectId().then((id) => (this.projectId = id))
        : Promise.resolve(this.projectId);
    return callback
      ? operation.then((id) => callback(null, id), callback)
      : operation;
  }
  bucket(name, options) {
    return new (require("./bucket.js").Bucket)(this, name, options);
  }
  createBucket(name, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const input = snapshot(options || {}),
      bucket = this.bucket(name);
    const operation = this.getProjectId()
      .then((project) =>
        transport.requestPromise(this, {
          uri: this.baseUrl + "/b",
          method: "POST",
          qs: { project },
          json: { ...input, name },
          maxRetries: 0,
        }),
      )
      .then(([metadata]) => {
        bucket.metadata = metadata;
        return [bucket, metadata];
      });
    return callback
      ? operation.then((values) => callback(null, ...values), callback)
      : operation;
  }
}
exports.Storage = Storage;
exports.IdempotencyStrategy = IdempotencyStrategy;
exports.RETRYABLE_ERR_FN_DEFAULT = transport.retryable;
exports.ExceptionMessages = Object.freeze({
  EXPIRATION_DATE_INVALID: "The expiration date provided was invalid.",
  EXPIRATION_DATE_PAST: "An expiration date cannot be in the past.",
});
