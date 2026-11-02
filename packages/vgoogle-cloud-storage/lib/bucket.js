"use strict";
const { Readable } = require("node:stream");
const { createReadStream } = require("node:fs");
const { pipeline } = require("node:stream/promises");
const path = require("node:path");
const { snapshot } = require("./save.js");
const settle = (operation, callback) =>
  callback
    ? operation.then((values) => callback(null, ...values), callback)
    : operation;
class Bucket {
  constructor(storage, name, options = {}) {
    if (typeof name !== "string" || !name)
      throw TypeError("A bucket name is needed to use Cloud Storage.");
    this.name = name.replace(/^gs:\/\//, "").replace(/\/$/, "");
    this.id = this.name;
    this.storage = storage;
    this.parent = storage;
    this.userProject = options.userProject;
    this.instancePreconditionOpts = snapshot(options.preconditionOpts || {});
    this.metadata = {};
    this.interceptors = [];
  }
  getRequestInterceptors() {
    return [
      ...this.storage.getRequestInterceptors(),
      ...this.interceptors
        .filter((x) => typeof x.request === "function")
        .map((x) => x.request),
    ];
  }
  request(options, callback) {
    const uri = /^https?:\/\//i.test(options.uri || "")
      ? options.uri
      : this.storage.baseUrl +
        "/b/" +
        encodeURIComponent(this.name) +
        (options.uri || "");
    this.storage.makeAuthenticatedRequest(
      {
        ...options,
        uri,
        qs: {
          ...(this.userProject ? { userProject: this.userProject } : {}),
          ...options.qs,
        },
        _interceptors: [
          ...this.interceptors
            .filter((x) => typeof x.request === "function")
            .map((x) => x.request),
          ...(options._interceptors || []),
        ],
      },
      callback,
    );
  }
  _request(options) {
    return new Promise((resolve, reject) =>
      this.request(options, (error, body, response) =>
        error ? reject(error) : resolve([body, response]),
      ),
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
  delete(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const input = snapshot(options || {}),
      { ignoreNotFound, ...query } = input;
    return settle(
      this._request({
        method: "DELETE",
        qs: { ...this.instancePreconditionOpts, ...query },
        maxRetries: 0,
      }).then(
        ([, response]) => [response],
        (error) => {
          if (input.ignoreNotFound && error.code === 404) return [];
          throw error;
        },
      ),
      callback,
    );
  }
  create(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    return this.storage.createBucket(this.name, options, callback);
  }
  file(name, options) {
    return new (require("./file.js").File)(this, name, options);
  }
  getFiles(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const input = snapshot(options || {});
    const operation = (async () => {
      const automatic = input.autoPaginate !== false,
        files = [],
        seen = new Set();
      let query = { ...input },
        last,
        next = null,
        calls = 0;
      delete query.autoPaginate;
      delete query.maxApiCalls;
      do {
        const [body] = await this._request({
          uri: "/o",
          method: "GET",
          qs: query,
        });
        last = body;
        calls++;
        if (body?.items !== undefined && !Array.isArray(body.items))
          throw TypeError("Invalid Storage listing response");
        for (const metadata of body.items || []) {
          const file = this.file(metadata.name, {
            generation: input.versions ? metadata.generation : undefined,
          });
          file.metadata = metadata;
          files.push(file);
        }
        const token = body.nextPageToken;
        next = token ? { ...input, pageToken: token } : null;
        if (
          !automatic ||
          !token ||
          (input.maxApiCalls && calls >= input.maxApiCalls) ||
          (input.maxResults && files.length >= input.maxResults)
        )
          break;
        if (seen.has(token))
          throw Error("Storage listing repeated a page token");
        seen.add(token);
        query = {
          ...query,
          pageToken: token,
          ...(input.maxResults
            ? { maxResults: input.maxResults - files.length }
            : {}),
        };
      } while (true);
      return [files, next, last];
    })();
    return settle(operation, callback);
  }
  getFilesStream(options = {}) {
    const bucket = this,
      input = snapshot(options);
    return Readable.from(
      (async function* () {
        let query = { ...input, autoPaginate: false },
          count = 0,
          calls = 0;
        const seen = new Set();
        while (query) {
          const [files, next] = await bucket.getFiles(query);
          calls++;
          for (const file of files) {
            yield file;
            if (input.maxResults && ++count >= input.maxResults) return;
          }
          if (input.maxApiCalls && calls >= input.maxApiCalls) return;
          if (next) {
            if (seen.has(next.pageToken))
              throw Error("Storage listing repeated a page token");
            seen.add(next.pageToken);
          }
          query = next;
        }
      })(),
    );
  }
  upload(local, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const input = snapshot(options || {}),
      destination = input.destination;
    const file =
      destination instanceof require("./file.js").File
        ? destination
        : this.file(destination || path.basename(String(local)));
    delete input.destination;
    const operation = pipeline(
      createReadStream(local),
      file.createWriteStream(input),
    ).then(() => [file, file.metadata]);
    return settle(operation, callback);
  }
}
exports.Bucket = Bucket;
