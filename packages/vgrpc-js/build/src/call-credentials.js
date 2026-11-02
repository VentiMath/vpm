"use strict";
// Independently implemented request credential plans. See PROVENANCE.json.
const { Metadata } = require("./metadata");
const plans = new WeakMap();
const invoke = (generator, options) =>
  new Promise((resolve, reject) => {
    generator(options, (error, metadata) => {
      // A failed authentication callback must never become a successful one just
      // because it also supplied metadata.
      if (error != null) reject(error);
      else if (metadata == null)
        reject(new Error("Metadata generator returned no metadata"));
      else resolve(metadata);
    });
  });
class CallCredentials {
  static createEmpty() {
    return new CredentialPlan([]);
  }
  static createFromMetadataGenerator(generator) {
    if (typeof generator !== "function")
      throw new TypeError("Metadata generator must be a function");
    return new CredentialPlan([generator]);
  }
  static createFromGoogleCredential(client) {
    return new GoogleCredential(client);
  }
  compose(other) {
    const left = plans.get(this),
      right = plans.get(other);
    if (right?.length === 0) return this;
    if (left?.length === 0) return other;
    return new CredentialPlan([...(left || [this]), ...(right || [other])]);
  }
  _equals(other) {
    if (this === other) return true;
    const left = plans.get(this),
      right = plans.get(other);
    if (!left || !right || left.length !== right.length) return false;
    return left.every(
      (item, i) =>
        item === right[i] ||
        (typeof item !== "function" &&
          typeof right[i] !== "function" &&
          item._equals(right[i])),
    );
  }
}
class CredentialPlan extends CallCredentials {
  constructor(parts) {
    super();
    plans.set(this, parts);
  }
  generateMetadata(options) {
    const parts = plans.get(this);
    if (parts.length === 0) return Promise.resolve(new Metadata());
    if (parts.length === 1 && typeof parts[0] === "function")
      return invoke(parts[0], options);
    // Start every generator before awaiting; merge by plan order, never finish order.
    return Promise.all(
      parts.map((part) => {
        if (typeof part === "function") return invoke(part, options);
        try {
          return part.generateMetadata(options);
        } catch (error) {
          return Promise.reject(error);
        }
      }),
    ).then((values) => {
      const result = new Metadata();
      for (const value of values) result.merge(value);
      return result;
    });
  }
}
class GoogleCredential extends CallCredentials {
  constructor(client) {
    super();
    this.client = client;
  }
  async generateMetadata(options) {
    const client = this.client;
    const headers =
      typeof client.getRequestHeaders === "function"
        ? await client.getRequestHeaders(options.service_url)
        : await new Promise((resolve, reject) => {
            client.getRequestMetadata(options.service_url, (error, values) =>
              error ? reject(error) : resolve(values),
            );
          });
    if (!headers) throw new Error("Headers not set by metadata plugin");
    const result = new Metadata();
    if (typeof headers.forEach === "function") {
      // Google Auth 10 returns WHATWG Headers; Map-like adapters work too.
      headers.forEach((value, name) => result.add(name, value));
    } else {
      for (const name of Object.keys(headers)) result.add(name, headers[name]);
    }
    return result;
  }
}
function isEmptyCallCredentials(value) {
  return plans.get(value)?.length === 0;
}
module.exports = { CallCredentials, isEmptyCallCredentials };
