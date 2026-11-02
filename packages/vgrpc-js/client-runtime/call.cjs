"use strict";
const { Duplex } = require("node:stream"),
  http2 = require("node:http2"),
  zlib = require("node:zlib");
const { Metadata } = require("../build/src/metadata");
const { StreamDecoder } = require("../build/src/stream-decoder");
const { isEmptyCallCredentials } = require("../build/src/call-credentials");
const { until } = require("./channel.cjs");
const names = [
  "OK",
  "CANCELLED",
  "UNKNOWN",
  "INVALID_ARGUMENT",
  "DEADLINE_EXCEEDED",
  "NOT_FOUND",
  "ALREADY_EXISTS",
  "PERMISSION_DENIED",
  "RESOURCE_EXHAUSTED",
  "FAILED_PRECONDITION",
  "ABORTED",
  "OUT_OF_RANGE",
  "UNIMPLEMENTED",
  "INTERNAL",
  "UNAVAILABLE",
  "DATA_LOSS",
  "UNAUTHENTICATED",
];
function failure(code, details, metadata = new Metadata()) {
  return Object.assign(Error(`${code} ${names[code]}: ${details}`), {
    code,
    details,
    metadata,
  });
}
function timeoutHeader(ms) {
  for (const [scale, suffix] of [
    [1, "m"],
    [1000, "S"],
    [60000, "M"],
    [3600000, "H"],
  ]) {
    const n = Math.ceil(ms / scale);
    if (n < 1e8) return Math.max(1, n) + suffix;
  }
  return "99999999H";
}
const duration = (value) =>
  typeof value === "string" && /^\d+(?:\.\d+)?s$/.test(value)
    ? Number(value.slice(0, -1)) * 1000
    : undefined;
const resetCode = (code) =>
  ({ 0: 13, 1: 13, 2: 13, 3: 13, 6: 13, 7: 14, 8: 1, 9: 13, 11: 8, 12: 7 })[
    code
  ] ?? 14;
const httpCode = (code) =>
  ({ 400: 13, 401: 16, 403: 7, 404: 12, 429: 14, 502: 14, 503: 14, 504: 14 })[
    code
  ] ?? 2;
function trailers(headers) {
  const metadata = Metadata.fromHttp2Headers(headers),
    text = String(headers["grpc-status"] ?? "");
  const code = /^(?:[0-9]|1[0-6])$/.test(text) ? Number(text) : 2;
  let details = String(
    headers["grpc-message"] ??
      (text ? "Invalid grpc-status" : "No grpc-status received"),
  );
  try {
    details = decodeURIComponent(details);
  } catch {}
  metadata.remove("grpc-status");
  metadata.remove("grpc-message");
  return { code, details, metadata };
}
class RpcCall extends Duplex {
  constructor(channel, definition, metadata, options, callback) {
    super({ objectMode: true, autoDestroy: false });
    if (channel.state === 4) throw Error("Channel has been shut down");
    this.channel = channel;
    this.definition = definition;
    this.metadata = metadata.clone();
    this.options = { ...options };
    this.callback = callback;
    this.abort = new AbortController();
    this.pending = [];
    this.replay = [];
    this.replayBytes = 0;
    this.attempts = 0;
    this.transparent = 0;
    this.done = false;
    this.committed = false;
    const config = channel.methodConfig(definition.path);
    this.policy =
      channel.options["grpc.enable_retries"] === 0
        ? undefined
        : config.retryPolicy;
    this.deadline = Math.min(
      Number(options.deadline ?? Infinity),
      config.timeout
        ? Date.now() + (duration(config.timeout) ?? Infinity)
        : Infinity,
    );
    this.receiveLimit = Number(
      channel.options["grpc.max_receive_message_length"] ?? 4 * 1024 * 1024,
    );
    this.sendLimit = Number(
      channel.options["grpc.max_send_message_length"] ?? -1,
    );
    this.retryLimit = Number(
      channel.options["grpc.per_rpc_retry_buffer_size"] ?? 256 * 1024,
    );
    this.waitForReady =
      metadata.getOptions().waitForReady ?? config.waitForReady ?? false;
    if (config.maxResponseMessageBytes != null)
      this.receiveLimit =
        this.receiveLimit < 0
          ? Number(config.maxResponseMessageBytes)
          : Math.min(this.receiveLimit, Number(config.maxResponseMessageBytes));
    if (config.maxRequestMessageBytes != null)
      this.sendLimit =
        this.sendLimit < 0
          ? Number(config.maxRequestMessageBytes)
          : Math.min(this.sendLimit, Number(config.maxRequestMessageBytes));
    this.encoding = ["identity", "deflate", "gzip"][
      channel.options["grpc.default_compression_algorithm"] ?? 0
    ];
    if (!this.encoding) throw Error("Unsupported compression algorithm");
    if (Number.isFinite(this.deadline))
      this.timer = setTimeout(
        () => this.cancelWithStatus(4, "Deadline exceeded"),
        Math.max(0, this.deadline - Date.now()),
      );
    channel.add(this);
    queueMicrotask(() => this.start());
  }
  _read() {
    this.wire?.resume();
  }
  _write(message, encoding, callback) {
    if (this.done) {
      callback();
      return;
    }
    try {
      let bytes = this.definition.serialize(message);
      if (!Buffer.isBuffer(bytes))
        throw TypeError("Serializer must return a Buffer");
      if (this.sendLimit >= 0 && bytes.length > this.sendLimit) {
        this.cancelWithStatus(
          8,
          `Sent message larger than max (${bytes.length} vs ${this.sendLimit})`,
        );
        callback();
        return;
      }
      const compressed = this.encoding !== "identity";
      if (compressed)
        bytes =
          this.encoding === "gzip"
            ? zlib.gzipSync(bytes)
            : zlib.deflateSync(bytes);
      const frame = Buffer.allocUnsafe(bytes.length + 5);
      frame[0] = compressed ? 1 : 0;
      frame.writeUInt32BE(bytes.length, 1);
      bytes.copy(frame, 5);
      if (!this.committed) {
        this.replayBytes += frame.length;
        this.channel.retryBytes += frame.length;
        if (
          this.replayBytes <= this.retryLimit &&
          this.channel.retryBytes <=
            Number(
              this.channel.options["grpc.retry_buffer_size"] ??
                16 * 1024 * 1024,
            )
        )
          this.replay.push(frame);
        else this.commit();
      }
      this.pending.push({ frame, callback });
      this.flush();
    } catch (error) {
      this.cancelWithStatus(
        13,
        "Request message serialization failure: " + error.message,
      );
      callback();
    }
  }
  _final(callback) {
    if (this.done) {
      callback();
      return;
    }
    this.halfClosed = true;
    this.endCallback = callback;
    this.flush();
  }
  _destroy(error, callback) {
    this.destroyError = error;
    if (!this.done)
      this.cancelWithStatus(
        error?.code ?? 1,
        error?.message || "Cancelled on client",
      );
    callback(error);
  }
  flush() {
    if (!this.wire || this.done || this.replaying) return;
    while (this.pending.length) {
      const entry = this.pending.shift();
      const wire = this.wire;
      wire.write(entry.frame, (error) => {
        entry.callback();
        if (error && !this.done) this.networkFailure(error, wire);
      });
    }
    if (this.halfClosed && !this.wire.writableEnded) {
      this.wire.end();
      const callback = this.endCallback;
      this.endCallback = undefined;
      callback?.();
    }
  }
  commit() {
    this.committed = true;
    this.replay = [];
    this.channel.retryBytes -= this.replayBytes;
    this.replayBytes = 0;
  }
  async start(retry = false) {
    if (this.done) return;
    if (Date.now() >= this.deadline) {
      this.cancelWithStatus(4, "Deadline exceeded");
      return;
    }
    this.attempts++;
    let session,
      phase = "auth";
    try {
      const auth = this.options.credentials
        ? this.channel.credentials.auth.compose(this.options.credentials)
        : this.channel.credentials.auth;
      const host = this.options.host || this.channel.authority;
      // The request metadata was already detached in the constructor. Empty
      // credential plans need neither another clone nor an asynchronous plugin.
      let metadata = this.metadata;
      if (!isEmptyCallCredentials(auth)) {
        const boundary = this.definition.path.lastIndexOf("/");
        const generated = await auth.generateMetadata({
          method_name: this.definition.path.slice(boundary + 1),
          service_url: `${this.channel.credentials.secure ? "https" : "http"}://${host.replace(/:443$/, "")}${this.definition.path.slice(0, boundary)}`,
        });
        if (this.done) return;
        metadata = this.metadata.clone();
        metadata.merge(generated);
      }
      phase = "connect";
      session = await this.channel.ready(
        !!this.waitForReady,
        this.abort.signal,
      );
      if (this.done) return;
      session.ref();
      const headers = {
        ...metadata.toHttp2Headers(),
        ":method": "POST",
        ":scheme": this.channel.credentials.secure ? "https" : "http",
        ":authority": host,
        ":path": this.definition.path,
        "content-type": "application/grpc",
        te: "trailers",
        "grpc-accept-encoding": "identity,deflate,gzip",
        "user-agent": [
          this.channel.options["grpc.primary_user_agent"],
          "vgrpc-js/1.14.7",
          this.channel.options["grpc.secondary_user_agent"],
        ]
          .filter(Boolean)
          .join(" "),
      };
      if (this.encoding !== "identity")
        headers["grpc-encoding"] = this.encoding;
      if (Number.isFinite(this.deadline))
        headers["grpc-timeout"] = timeoutHeader(
          Math.max(1, this.deadline - Date.now()),
        );
      if (retry)
        headers["grpc-previous-rpc-attempts"] = String(
          this.attempts - 1 - this.transparent,
        );
      const wire = session.request(headers);
      this.wire = wire;
      this.session = session;
      const socket = session.socket;
      this.peer = socket?.remoteAddress
        ? `${socket.remoteAddress}:${socket.remotePort}`
        : this.channel.getTarget();
      this.authContext = socket?.encrypted
        ? {
            transportSecurityType: "ssl",
            sslPeerCertificate: socket.getPeerCertificate(),
          }
        : null;
      const decoder = new StreamDecoder(this.receiveLimit),
        state = {
          headers: false,
          status: undefined,
          messages: 0,
          value: undefined,
          encoding: "identity",
          bytes: 0,
        };
      this.responseState = state;
      wire.on("response", (response) => {
        if (this.done || this.wire !== wire) return;
        if (response["grpc-status"] !== undefined) {
          state.status = trailers(response);
          state.pushback = response["grpc-retry-pushback-ms"];
          return;
        }
        state.headers = true;
        this.commit();
        state.httpStatus = Number(response[":status"]);
        state.encoding = String(response["grpc-encoding"] || "identity");
        if (state.httpStatus !== 200) {
          state.status = {
            code: httpCode(state.httpStatus),
            details: "Received HTTP status code " + state.httpStatus,
            metadata: Metadata.fromHttp2Headers(response),
          };
        } else if (
          !/^application\/grpc(?:[+;]|$)/i.test(
            String(response["content-type"] || ""),
          )
        ) {
          state.status = {
            code: 2,
            details: "Invalid gRPC content-type",
            metadata: new Metadata(),
          };
        }
        this.emit("metadata", Metadata.fromHttp2Headers(response));
      });
      wire.on("trailers", (headers) => {
        if (this.wire === wire) {
          state.status = trailers(headers);
          state.pushback = headers["grpc-retry-pushback-ms"];
        }
      });
      wire.on("data", (chunk) => {
        if (this.done || this.wire !== wire || state.status) return;
        try {
          state.bytes += chunk.length;
          for (const frame of decoder.write(chunk)) {
            state.bytes -= frame.length;
            if (frame[0] > 1) throw Error("Invalid compressed message flag");
            let payload = frame.subarray(5);
            if (frame[0]) {
              const options =
                this.receiveLimit < 0
                  ? {}
                  : { maxOutputLength: Math.max(1, this.receiveLimit) };
              if (state.encoding === "gzip")
                payload = zlib.gunzipSync(payload, options);
              else if (state.encoding === "deflate")
                payload = zlib.inflateSync(payload, options);
              else
                throw Error(
                  "Unsupported response compression: " + state.encoding,
                );
            }
            if (this.receiveLimit >= 0 && payload.length > this.receiveLimit)
              throw Object.assign(Error("Received message larger than max"), {
                code: 8,
              });
            const value = this.definition.deserialize(payload);
            state.messages++;
            this.commit();
            if (this.definition.responseStream) {
              if (!this.push(value)) wire.pause();
            } else if (state.messages === 1) state.value = value;
            else {
              this.cancelWithStatus(12, "Too many responses received");
              return;
            }
          }
        } catch (error) {
          this.cancelWithStatus(
            error.code === 8 ||
              /larger than max|maxOutputLength|buffer larger/i.test(
                error.message,
              )
              ? 8
              : 13,
            "Response message parsing error: " + error.message,
          );
        }
      });
      const ended = () => {
        if (this.done || this.wire !== wire) return;
        let status = state.status || {
          code:
            session.closed || session.destroyed
              ? 14
              : wire.rstCode
                ? resetCode(wire.rstCode)
                : 2,
          details: "No grpc-status received",
          metadata: new Metadata(),
        };
        if (status.code === 0 && state.bytes)
          status = {
            code: 13,
            details: "Incomplete gRPC message",
            metadata: status.metadata,
          };
        if (
          status.code === 0 &&
          !this.definition.responseStream &&
          state.messages === 0
        )
          status = {
            code: 12,
            details: "No message received",
            metadata: status.metadata,
          };
        if (
          !state.status &&
          wire.rstCode === http2.constants.NGHTTP2_REFUSED_STREAM
        ) {
          this.networkFailure(Error("Stream refused"), wire);
          return;
        }
        this.completeAttempt(status, state, wire);
      };
      // Only a missing status needs a turn for transport reset state to settle.
      wire.on("end", () => (state.status ? ended() : setImmediate(ended)));
      wire.on("error", (error) => this.networkFailure(error, wire));
      wire.on("close", () => {
        if (!this.done && this.wire === wire && !wire.readableEnded)
          this.networkFailure(
            Error("HTTP/2 stream closed before trailers"),
            wire,
          );
      });
      if (retry) {
        this.replaying = true;
        const queued = new Set(this.pending.map((item) => item.frame));
        for (const frame of this.replay)
          if (!queued.has(frame)) wire.write(frame);
        this.replaying = false;
      }
      this.flush();
    } catch (error) {
      if (this.done) return;
      if (
        error.code === "ERR_HTTP2_GOAWAY_SESSION" &&
        !this.committed &&
        this.transparent++ < 3
      ) {
        this.start(true);
        return;
      }
      this.finish({
        code:
          error.code >= 1 && error.code <= 16
            ? error.code
            : phase === "auth"
              ? 2
              : 14,
        details:
          (phase === "auth"
            ? "Getting metadata from plugin failed with error: "
            : "") + (error.message || String(error)),
        metadata: new Metadata(),
      });
    }
  }
  networkFailure(error, wire) {
    if (this.done || this.wire !== wire) return;
    if (
      wire.rstCode === http2.constants.NGHTTP2_REFUSED_STREAM &&
      !this.committed &&
      this.transparent++ < 3
    ) {
      this.wire = undefined;
      wire.close();
      this.start(true);
      return;
    }
    this.completeAttempt(
      {
        code:
          this.session?.closed || this.session?.destroyed
            ? 14
            : wire.rstCode
              ? resetCode(wire.rstCode)
              : 14,
        details: error.message || "Connection dropped",
        metadata: new Metadata(),
      },
      this.responseState || {},
      wire,
    );
  }
  completeAttempt(status, state, wire) {
    if (this.done || this.wire !== wire) return;
    const policy = this.policy,
      codes = policy?.retryableStatusCodes || [];
    if (
      !this.committed &&
      policy &&
      this.attempts - this.transparent < Math.min(5, this.policy.maxAttempts) &&
      codes.some(
        (code) => code === status.code || code === names[status.code],
      ) &&
      state.pushback !== "-1"
    ) {
      let delay =
        state.pushback !== undefined
          ? Number(state.pushback)
          : Math.min(
              (duration(policy.initialBackoff) || 100) *
                Math.pow(policy.backoffMultiplier || 2, this.attempts - 1),
              duration(policy.maxBackoff) || 10000,
            );
      if (!Number.isFinite(delay) || delay < 0) {
        this.finish(status);
        return;
      }
      this.wire = undefined;
      wire.close();
      until(delay, this.abort.signal).then(
        () => this.start(true),
        () => {},
      );
      return;
    }
    this.finish(status, state.value);
  }
  finish(status, value) {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.timer);
    this.abort.abort(Error("Call finished"));
    this.commit();
    const wire = this.wire;
    this.wire = undefined;
    if (wire && !wire.closed) wire.close(http2.constants.NGHTTP2_CANCEL);
    for (const entry of this.pending.splice(0)) entry.callback();
    this.endCallback?.();
    this.endCallback = undefined;
    this.channel.remove(this);
    queueMicrotask(() => {
      const error =
        status.code === 0
          ? null
          : failure(status.code, status.details, status.metadata);
      try {
        if (this.callback) this.callback(error, value);
        else if (error && !this.destroyError) this.emit("error", error);
      } finally {
        this.emit("status", status);
        this.push(null);
      }
    });
  }
  cancel() {
    this.cancelWithStatus(1, "Cancelled on client");
  }
  cancelWithStatus(code, details) {
    this.finish({ code, details, metadata: new Metadata() });
  }
  getPeer() {
    return this.peer || this.channel.getTarget();
  }
  getAuthContext() {
    return this.authContext ?? null;
  }
  getDeadline() {
    return this.deadline;
  }
}
module.exports = { RpcCall, failure };
