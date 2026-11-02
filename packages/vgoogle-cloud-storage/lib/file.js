"use strict";
const { createHash } = require("node:crypto");
const { snapshot } = require("./save.js");
const { FileExceptionMessages, RequestError } = require("./errors.js");
const { URLSigner, normalizeHeaders } = require("./signer.js");
const methods = {
  read: "GET",
  write: "PUT",
  delete: "DELETE",
  resumable: "POST",
};
const settle = (operation, callback) =>
  callback
    ? operation.then((values) => callback(null, ...values), callback)
    : operation;
class File {
  constructor(bucket, name, options = {}) {
    if (typeof name !== "string" || !name)
      throw TypeError("A file name is required.");
    this.name = name;
    this.id = name;
    this.bucket = bucket;
    this.parent = bucket;
    this.storage = bucket.storage;
    this.metadata = {};
    this.interceptors = [];
    this.generation = options.generation;
    this.userProject = options.userProject || bucket.userProject;
    this.kmsKeyName = options.kmsKeyName;
    this.instancePreconditionOpts = snapshot(options.preconditionOpts || {});
    this.instanceRetryValue = this.storage.retryOptions.autoRetry;
    this.crc32cGenerator =
      options.crc32cGenerator || this.storage.crc32cGenerator;
    if (options.encryptionKey) this.setEncryptionKey(options.encryptionKey);
  }
  getRequestInterceptors() {
    return [
      ...this.bucket.getRequestInterceptors(),
      ...this.interceptors
        .filter((x) => typeof x.request === "function")
        .map((x) => x.request),
    ];
  }
  _options(options) {
    return {
      ...options,
      uri: /^https?:\/\//i.test(options.uri || "")
        ? options.uri
        : this.storage.baseUrl +
          "/b/" +
          encodeURIComponent(this.bucket.name) +
          "/o/" +
          encodeURIComponent(this.name) +
          (options.uri || ""),
      qs: {
        ...(this.generation !== undefined
          ? { generation: this.generation }
          : {}),
        ...(this.userProject ? { userProject: this.userProject } : {}),
        ...options.qs,
      },
      headers: { ...this.encryptionHeaders, ...options.headers },
      _interceptors: [...this.bucket.interceptors, ...this.interceptors]
        .filter((x) => typeof x.request === "function")
        .map((x) => x.request),
    };
  }
  request(options, callback) {
    this.storage.makeAuthenticatedRequest(this._options(options), callback);
  }
  _request(options) {
    return new Promise((resolve, reject) =>
      this.request(options, (error, body, response) =>
        error ? reject(error) : resolve([body, response]),
      ),
    );
  }
  shouldRetryBasedOnPreconditionAndIdempotencyStrat(options) {
    const mode = this.storage.retryOptions.idempotencyStrategy;
    return (
      mode !== 2 &&
      (mode !== 1 ||
        options?.ifGenerationMatch !== undefined ||
        this.instancePreconditionOpts.ifGenerationMatch !== undefined)
    );
  }
  save(input, options, callback) {
    return require("./save.js").save(this, input, options, callback);
  }
  createWriteStream(options) {
    return require("./upload-stream.js").createWriteStream(
      this,
      options,
      /^(?:text\/|application\/(?:json|javascript|xml|.+\+json|.+\+xml)|image\/svg\+xml)/i,
    );
  }
  startSimpleUpload_(destination, options) {
    return require("./simple-upload.js").startSimpleUpload(
      this,
      destination,
      options,
    );
  }
  startResumableUpload_(destination, options) {
    try {
      return require("./resumable-upload.js").start(this, destination, options);
    } catch (error) {
      destination.destroy(error);
    }
  }
  createResumableUpload(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    return settle(
      require("./resumable-upload.js")
        .createURI(this, options)
        .then((uri) => [uri]),
      callback,
    );
  }
  getMetadata(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    return settle(
      this._request({ method: "GET", qs: snapshot(options || {}) }).then(
        ([body, response]) => {
          this.metadata = body;
          return [body, response];
        },
      ),
      callback,
    );
  }
  setMetadata(metadata, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    return settle(
      this._request({
        method: "PATCH",
        json: snapshot(metadata),
        qs: { ...this.instancePreconditionOpts, ...snapshot(options || {}) },
        maxRetries: 0,
      }).then(([body, response]) => {
        this.metadata = body;
        return [body, response];
      }),
      callback,
    );
  }
  exists(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    return settle(
      this.getMetadata(options).then(
        () => [true],
        (error) => {
          if (error.code === 404) return [false];
          throw error;
        },
      ),
      callback,
    );
  }
  delete(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const input = snapshot(options || {}),
      { ignoreNotFound, ...query } = input;
    const operation = this._request({
      method: "DELETE",
      qs: { ...this.instancePreconditionOpts, ...query },
      maxRetries: this.shouldRetryBasedOnPreconditionAndIdempotencyStrat(query)
        ? undefined
        : 0,
    }).then(
      ([, response]) => [response],
      (error) => {
        if (ignoreNotFound && error.code === 404) return [];
        throw error;
      },
    );
    return settle(operation, callback);
  }
  getSignedUrl(input, callback) {
    let operation;
    try {
      const cfg = snapshot(input);
      if (!Object.hasOwn(methods, cfg.action))
        throw TypeError("Invalid signed URL action");
      const extensionHeaders = normalizeHeaders(cfg.extensionHeaders || {}),
        queryParams = { ...cfg.queryParams };
      if (cfg.action === "resumable")
        extensionHeaders["x-goog-resumable"] = "start";
      if (typeof cfg.responseType === "string")
        queryParams["response-content-type"] = cfg.responseType;
      if (typeof cfg.promptSaveAs === "string")
        queryParams["response-content-disposition"] =
          'attachment; filename="' + cfg.promptSaveAs + '"';
      if (typeof cfg.responseDisposition === "string")
        queryParams["response-content-disposition"] = cfg.responseDisposition;
      if (this.generation !== undefined)
        queryParams.generation = String(this.generation);
      this.signer ??= new URLSigner(
        this.storage.authClient,
        this.bucket,
        this,
        this.storage,
      );
      operation = this.signer
        .getSignedUrl({
          ...cfg,
          method: methods[cfg.action],
          extensionHeaders,
          queryParams,
        })
        .then((url) => [url]);
    } catch (error) {
      operation = Promise.reject(error);
    }
    return settle(operation, callback);
  }
  generateSignedPostPolicyV4(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    return settle(
      require("./post-policy.js")(this, options).then((policy) => [policy]),
      callback,
    );
  }
  setEncryptionKey(value) {
    if (value === undefined || value === null) {
      this.encryptionKey = null;
      this.encryptionHeaders = {};
      return this;
    }
    const bytes =
      typeof value === "string"
        ? Buffer.from(value, "base64")
        : Buffer.from(value);
    if (bytes.length !== 32)
      throw RangeError("Encryption key must contain 32 bytes");
    this.encryptionKey = bytes;
    this.encryptionHeaders = {
      "x-goog-encryption-algorithm": "AES256",
      "x-goog-encryption-key": bytes.toString("base64"),
      "x-goog-encryption-key-sha256": createHash("sha256")
        .update(bytes)
        .digest("base64"),
    };
    return this;
  }
  createReadStream(options) {
    return require("./download.js").createReadStream(this, options);
  }
  download(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    return settle(require("./download.js").download(this, options), callback);
  }
  publicUrl() {
    return (
      this.storage.apiEndpoint +
      "/" +
      encodeURIComponent(this.bucket.name) +
      "/" +
      this.name.split("/").map(encodeURIComponent).join("/")
    );
  }
}
module.exports = {
  File,
  FileExceptionMessages,
  RequestError,
  ActionToHTTPMethod: methods,
};
