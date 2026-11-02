"use strict";
const util = require("./util.cjs"),
  wire = require("./wire.cjs");
class Service extends util.EventEmitter {
  constructor(impl, requestDelimited, responseDelimited) {
    super();
    if (typeof impl !== "function")
      throw TypeError("rpcImpl must be a function");
    this.rpcImpl = impl;
    this.requestDelimited = !!requestDelimited;
    this.responseDelimited = !!responseDelimited;
  }
  rpcCall(method, Request, Response, request, callback) {
    if (!request) throw TypeError("request is required");
    if (!callback)
      return util.asPromise(
        this.rpcCall,
        this,
        method,
        Request,
        Response,
        request,
      );
    try {
      if (!this.rpcImpl) throw Error("already ended");
      const bytes =
        Request[this.requestDelimited ? "encodeDelimited" : "encode"](
          request,
        ).finish();
      return this.rpcImpl(method, bytes, (err, data) => {
        if (err) {
          this.emit("error", err, method);
          return callback(err);
        }
        if (data === null) {
          this.end(true);
          return;
        }
        try {
          const message =
            data instanceof Response
              ? data
              : Response[this.responseDelimited ? "decodeDelimited" : "decode"](
                  data,
                );
          this.emit("data", message, method);
          callback(null, message);
        } catch (e) {
          this.emit("error", e, method);
          callback(e);
        }
      });
    } catch (e) {
      queueMicrotask(() => {
        this.emit("error", e, method);
        callback(e);
      });
    }
  }
  end(fromRemote) {
    const impl = this.rpcImpl;
    this.rpcImpl = null;
    if (impl) {
      if (!fromRemote) impl(null, null, null);
      this.emit("end").off();
    }
    return this;
  }
}
exports.build = "minimal";
exports.Reader = wire.Reader;
exports.BufferReader = wire.BufferReader;
exports.Writer = wire.Writer;
exports.BufferWriter = wire.BufferWriter;
exports.util = util;
exports.rpc = { Service };
exports.roots = Object.create(null);
exports.configure = () => {};
