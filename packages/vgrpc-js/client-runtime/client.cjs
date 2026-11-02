"use strict";
const { Channel } = require("./channel.cjs"),
  { RpcCall } = require("./call.cjs"),
  { Metadata } = require("../build/src/metadata");
const channels = new WeakMap();
function optional(args, unary) {
  const parts = args.slice(),
    callback = typeof parts.at(-1) === "function" ? parts.pop() : undefined;
  if (unary && !callback) throw TypeError("Incorrect arguments passed");
  let metadata = new Metadata(),
    options = {};
  if (parts[0] instanceof Metadata) metadata = parts.shift();
  if (parts[0] != null) options = parts.shift();
  if (parts.length || typeof options !== "object")
    throw TypeError("Incorrect arguments passed");
  if (options.parent || options.propagate_flags)
    throw Error(
      "Parent-call propagation is outside the application client contract",
    );
  if (options.interceptors?.length || options.interceptor_providers?.length)
    throw Error(
      "Custom interceptors are outside the application client contract",
    );
  return { metadata, options, callback };
}
class Client {
  constructor(address, credentials, options = {}) {
    for (const name of [
      "channelOverride",
      "channelFactoryOverride",
      "callInvocationTransformer",
      "interceptors",
      "interceptor_providers",
    ])
      if (
        options[name] &&
        (!Array.isArray(options[name]) || options[name].length)
      )
        throw Error(name + " is outside the application client contract");
    channels.set(this, new Channel(address, credentials, options));
  }
  getChannel() {
    return channels.get(this);
  }
  close() {
    this.getChannel().close();
  }
  waitForReady(deadline, callback) {
    const channel = this.getChannel(),
      lease = {},
      abort = new AbortController();
    let timer;
    channel.add(lease);
    if (Number.isFinite(Number(deadline)))
      timer = setTimeout(
        () => abort.abort(Error("Failed to connect before the deadline")),
        Math.max(0, Number(deadline) - Date.now()),
      );
    const finish = (error) => {
      clearTimeout(timer);
      channel.remove(lease);
      callback(error);
    };
    channel.ready(true, abort.signal).then(() => finish(), finish);
  }
  makeUnaryRequest(path, serialize, deserialize, message, ...args) {
    const p = optional(args, true),
      call = new RpcCall(
        this.getChannel(),
        { path, serialize, deserialize, responseStream: false },
        p.metadata,
        p.options,
        p.callback,
      );
    call.end(message);
    return call;
  }
  makeServerStreamRequest(path, serialize, deserialize, message, ...args) {
    const p = optional(args, false),
      call = new RpcCall(
        this.getChannel(),
        { path, serialize, deserialize, responseStream: true },
        p.metadata,
        p.options,
      );
    call.end(message);
    return call;
  }
  makeClientStreamRequest(path, serialize, deserialize, ...args) {
    const p = optional(args, true);
    return new RpcCall(
      this.getChannel(),
      { path, serialize, deserialize, responseStream: false },
      p.metadata,
      p.options,
      p.callback,
    );
  }
  makeBidiStreamRequest(path, serialize, deserialize, ...args) {
    const p = optional(args, false);
    return new RpcCall(
      this.getChannel(),
      { path, serialize, deserialize, responseStream: true },
      p.metadata,
      p.options,
    );
  }
}
const forbidden = (name) =>
  ["__proto__", "prototype", "constructor"].includes(name);
function makeClientConstructor(methods, serviceName) {
  class Service extends Client {}
  for (const name of Object.keys(methods)) {
    if (forbidden(name)) continue;
    if (name.startsWith("$")) throw Error("Method names cannot start with $");
    const descriptor = { ...methods[name] },
      method = descriptor.requestStream
        ? descriptor.responseStream
          ? "makeBidiStreamRequest"
          : "makeClientStreamRequest"
        : descriptor.responseStream
          ? "makeServerStreamRequest"
          : "makeUnaryRequest";
    const invoke = function (...args) {
      return Client.prototype[method].call(
        this,
        descriptor.path,
        descriptor.requestSerialize,
        descriptor.responseDeserialize,
        ...args,
      );
    };
    Object.assign(invoke, descriptor);
    Object.defineProperty(Service.prototype, name, {
      value: invoke,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    if (descriptor.originalName && !forbidden(descriptor.originalName))
      Object.defineProperty(Service.prototype, descriptor.originalName, {
        value: invoke,
        enumerable: true,
        writable: true,
        configurable: true,
      });
  }
  Service.service = methods;
  Service.serviceName = serviceName;
  return Service;
}
function loadPackageDefinition(definition) {
  const result = {};
  for (const fullName of Object.keys(definition)) {
    const parts = fullName.split(".");
    if (parts.some(forbidden)) continue;
    let target = result;
    for (const part of parts.slice(0, -1)) {
      if (!Object.hasOwn(target, part))
        Object.defineProperty(target, part, {
          value: {},
          enumerable: true,
          writable: true,
          configurable: true,
        });
      target = target[part];
    }
    const value = definition[fullName],
      name = parts.at(-1);
    Object.defineProperty(target, name, {
      value: "format" in value ? value : makeClientConstructor(value, name),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return result;
}
module.exports = { Client, makeClientConstructor, loadPackageDefinition };
