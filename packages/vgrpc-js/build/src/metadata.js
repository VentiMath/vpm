"use strict";
// Independent metadata container; protocol names and validation follow gRPC's wire contract.
const own = (object, name, value) =>
  Object.defineProperty(object, name, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
const copied = (value) => (Buffer.isBuffer(value) ? Buffer.from(value) : value);
const encoded = (value) =>
  Buffer.isBuffer(value) ? value.toString("base64") : value;
function entry(key, value) {
  const name = key.toLowerCase();
  if (!/^[:0-9a-z_.-]+$/.test(name))
    throw Error(`Metadata key "${name}" contains illegal characters`);
  if (value != null) {
    if (name.endsWith("-bin")) {
      if (!Buffer.isBuffer(value))
        throw Error("keys that end with '-bin' must have Buffer values");
    } else {
      if (Buffer.isBuffer(value))
        throw Error("keys that don't end with '-bin' must have String values");
      if (!/^[ -~]*$/.test(value))
        throw Error(
          `Metadata string value "${value}" contains illegal characters`,
        );
    }
  }
  return name;
}
class Metadata {
  constructor(options = {}) {
    this.internalRepr = new Map();
    this.options = options;
  }
  set(key, value) {
    this.internalRepr.set(entry(key, value), [value]);
  }
  add(key, value) {
    const name = entry(key, value),
      list = this.internalRepr.get(name);
    if (list) list.push(value);
    else this.internalRepr.set(name, [value]);
  }
  get(key) {
    return this.internalRepr.get(key.toLowerCase()) || [];
  }
  remove(key) {
    this.internalRepr.delete(key.toLowerCase());
  }
  getMap() {
    const result = {};
    for (const [key, values] of this.internalRepr)
      if (values.length) own(result, key, copied(values[0]));
    return result;
  }
  clone() {
    const result = new Metadata(this.options);
    for (const [key, values] of this.internalRepr)
      result.internalRepr.set(key, values.map(copied));
    return result;
  }
  merge(other) {
    for (const [key, values] of other.internalRepr)
      this.internalRepr.set(key, [
        ...(this.internalRepr.get(key) || []),
        ...values,
      ]);
  }
  setOptions(value) {
    this.options = value;
  }
  getOptions() {
    return this.options;
  }
  setOpaque(key, value) {
    (this.opaqueData ||= new Map()).set(key, value);
  }
  getOpaque(key) {
    return this.opaqueData?.get(key);
  }
  toJSON() {
    const result = {};
    for (const [key, values] of this.internalRepr) own(result, key, values);
    return result;
  }
  toHttp2Headers() {
    const result = {};
    for (const [key, values] of this.internalRepr)
      if (!key.startsWith(":"))
        own(
          result,
          key,
          values.length === 1 ? encoded(values[0]) : values.map(encoded),
        );
    return result;
  }
  static fromHttp2Headers(headers) {
    const result = new Metadata();
    for (const key of Object.keys(headers)) {
      if (key.startsWith(":") || headers[key] === undefined) continue;
      const name = key.toLowerCase();
      const values = Array.isArray(headers[key])
        ? headers[key]
        : [headers[key]];
      try {
        for (const value of values) {
          if (name.endsWith("-bin")) {
            for (const item of name.startsWith("grpc-")
              ? [value]
              : value.split(","))
              result.add(name, Buffer.from(item.trim(), "base64"));
          } else result.add(name, value);
        }
      } catch {
        /* Invalid wire metadata is ignored, not echoed into requests. */
      }
    }
    return result;
  }
}
exports.Metadata = Metadata;
