"use strict";
const http2 = require("node:http2"),
  net = require("node:net"),
  tls = require("node:tls");
const { connectionOptions } = require("./credentials.cjs");
const state = {
  IDLE: 0,
  CONNECTING: 1,
  READY: 2,
  TRANSIENT_FAILURE: 3,
  SHUTDOWN: 4,
};
function destination(target, secure) {
  if (typeof target !== "string" || !target)
    throw TypeError("Channel target must be a nonempty string");
  if (target.startsWith("unix:"))
    return {
      path: target.replace(/^unix:(?:\/\/)?/, ""),
      host: "localhost",
      authority: "localhost",
    };
  let address = target;
  if (address.startsWith("dns:"))
    address = address.replace(/^dns:\/\/(?:[^/]*)\//, "");
  else if (address.startsWith("ipv4:") || address.startsWith("ipv6:"))
    address = address.slice(address.indexOf(":") + 1);
  if (address.includes(",") || /[\s/?#]/.test(address))
    throw Error("Unsupported gRPC target: " + target);
  const url = new URL((secure ? "https://" : "http://") + address);
  if (url.username || url.password)
    throw Error("Credentials are not allowed in a gRPC target");
  return {
    host: url.hostname.replace(/^\[|\]$/g, ""),
    port: Number(url.port || 443),
    authority: url.hostname + ":" + (url.port || 443),
  };
}
function interruptible(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const cancel = () => reject(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", cancel);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", cancel);
        reject(error);
      },
    );
  });
}
const until = (time, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      resolve();
    };
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      reject(signal.reason);
    };
    const timer = setTimeout(done, time);
    signal?.addEventListener("abort", cancel, { once: true });
  });
class Channel {
  constructor(target, credentials, options = {}) {
    this.target = target;
    this.options = { ...options };
    this.state = state.IDLE;
    this.watchers = new Set();
    this.calls = new Set();
    this.sessions = new Set();
    this.shutdown = new AbortController();
    this.retryBytes = 0;
    this.address = destination(target, credentials?._isSecure());
    this.credentials = connectionOptions(
      credentials,
      this.address.host,
      this.options,
    );
    if (
      options["grpc.http_connect_target"] ||
      options["grpc.http_connect_creds"]
    )
      throw Error(
        "HTTP CONNECT proxies are outside the application client contract",
      );
    this.authority =
      options["grpc.default_authority"] || this.address.authority;
    this.backoff = Number(options["grpc.initial_reconnect_backoff_ms"] ?? 1000);
    if (
      options["grpc.lb_policy_name"] &&
      options["grpc.lb_policy_name"] !== "pick_first"
    )
      throw Error("This client supports pick_first load balancing");
    this.config = options["grpc.service_config"]
      ? JSON.parse(options["grpc.service_config"])
      : {};
    if (
      this.config.loadBalancingConfig?.some(
        (policy) => !Object.hasOwn(policy, "pick_first"),
      ) ||
      (this.config.loadBalancingPolicy &&
        this.config.loadBalancingPolicy !== "pick_first")
    )
      throw Error("This client supports pick_first load balancing");
    if (this.config.retryThrottling)
      throw Error(
        "Retry throttling is outside the application client contract",
      );
    for (const config of this.config.methodConfig || []) {
      if (config.hedgingPolicy)
        throw Error("Hedging is outside the application client contract");
      const policy = config.retryPolicy;
      if (
        policy &&
        (!Number.isInteger(policy.maxAttempts) ||
          policy.maxAttempts < 2 ||
          !/^\d+(?:\.\d+)?s$/.test(policy.initialBackoff) ||
          !/^\d+(?:\.\d+)?s$/.test(policy.maxBackoff) ||
          Number(policy.initialBackoff.slice(0, -1)) <= 0 ||
          Number(policy.maxBackoff.slice(0, -1)) <= 0 ||
          !(policy.backoffMultiplier > 0) ||
          !Array.isArray(policy.retryableStatusCodes))
      )
        throw Error("Invalid retry policy");
    }
    if (!(this.backoff >= 0 && Number.isFinite(this.backoff)))
      throw Error("Invalid reconnect backoff");
  }
  getTarget() {
    return this.target;
  }
  getConnectivityState(connect) {
    if (connect && this.state === state.IDLE) this.connect().catch(() => {});
    return this.state;
  }
  change(next) {
    if (this.state === next) return;
    this.state = next;
    for (const watch of [...this.watchers])
      if (watch.state !== next) {
        this.watchers.delete(watch);
        clearTimeout(watch.timer);
        queueMicrotask(() => watch.callback());
      }
  }
  watchConnectivityState(previous, deadline, callback) {
    if (this.state !== previous) {
      queueMicrotask(() => callback());
      return;
    }
    const watch = { state: previous, callback };
    this.watchers.add(watch);
    const delay = Number(deadline) - Date.now();
    if (Number.isFinite(delay))
      watch.timer = setTimeout(
        () => {
          this.watchers.delete(watch);
          callback(Error("Deadline exceeded"));
        },
        Math.max(0, delay),
      );
  }
  connect() {
    if (this.state === state.SHUTDOWN)
      return Promise.reject(Error("Channel has been shut down"));
    if (this.session && !this.session.closed && !this.session.destroyed)
      return this.connecting || Promise.resolve(this.session);
    this.change(state.CONNECTING);
    const connection = this.credentials,
      address = this.address;
    const options = {
      ...connection.tls,
      settings: {
        initialWindowSize: Number(
          this.options["grpc-node.flow_control_window"] ?? 65535,
        ),
      },
      maxSessionMemory: Number(
        this.options["grpc-node.max_session_memory"] ?? 32,
      ),
    };
    if (address.path)
      options.createConnection = () =>
        connection.secure
          ? tls.connect({
              ...connection.tls,
              path: address.path,
              ALPNProtocols: ["h2"],
            })
          : net.connect(address.path);
    const session = http2.connect(
      `${connection.secure ? "https" : "http"}://${address.path ? "localhost" : address.authority}`,
      options,
    );
    this.session = session;
    this.sessions.add(session);
    if (!this.calls.size) session.unref();
    session.on("error", () => {});
    session.on("goaway", () => {
      if (this.session === session) {
        this.session = undefined;
        this.connecting = undefined;
        if (this.state !== state.SHUTDOWN) this.change(state.IDLE);
      }
      session.close();
    });
    session.once("close", () => {
      this.sessions.delete(session);
      clearInterval(session.vpmPing);
      if (this.session === session) {
        this.session = undefined;
        this.connecting = undefined;
        if (this.state !== state.SHUTDOWN) this.change(state.IDLE);
      }
    });
    this.connecting = new Promise((resolve, reject) => {
      let settled = false;
      const failed = (error) => {
        if (settled) return;
        settled = true;
        session.removeListener("connect", ready);
        if (this.session === session) {
          this.session = undefined;
          this.connecting = undefined;
          if (this.state !== state.SHUTDOWN)
            this.change(state.TRANSIENT_FAILURE);
        }
        session.destroy();
        reject(error);
      };
      const ready = () => {
        if (settled) return;
        settled = true;
        session.removeListener("error", failed);
        if (this.state === state.SHUTDOWN) {
          session.destroy();
          reject(Error("Channel has been shut down"));
          return;
        }
        this.connecting = undefined;
        this.change(state.READY);
        const period = Number(this.options["grpc.keepalive_time_ms"]);
        if (Number.isFinite(period) && period > 0)
          session.vpmPing = setInterval(() => {
            if (
              session.closed ||
              session.destroyed ||
              session.vpmPinging ||
              (!this.calls.size &&
                !this.options["grpc.keepalive_permit_without_calls"])
            )
              return;
            session.vpmPinging = true;
            const timeout = setTimeout(
              () => session.destroy(Error("Keepalive timeout")),
              Number(this.options["grpc.keepalive_timeout_ms"] ?? 20000),
            );
            timeout.unref();
            session.ping((error) => {
              clearTimeout(timeout);
              session.vpmPinging = false;
              if (error) session.destroy(error);
            });
          }, period).unref();
        resolve(session);
      };
      session.once("connect", ready);
      session.once("error", failed);
      session.once("close", () => failed(Error("Connection closed")));
    });
    return this.connecting;
  }
  async ready(wait, signal) {
    if (signal?.aborted) throw signal.reason;
    if (
      this.state === state.READY &&
      this.session &&
      !this.session.closed &&
      !this.session.destroyed
    )
      return this.session;
    signal = AbortSignal.any([
      this.shutdown.signal,
      ...(signal ? [signal] : []),
    ]);
    let pause = this.backoff;
    for (;;) {
      if (signal?.aborted) throw signal.reason;
      try {
        return await interruptible(this.connect(), signal);
      } catch (error) {
        if (!wait || this.state === state.SHUTDOWN) throw error;
        await until(pause, signal);
        pause = Math.min(
          pause * 1.6,
          Number(this.options["grpc.max_reconnect_backoff_ms"] ?? 120000),
        );
      }
    }
  }
  add(call) {
    this.calls.add(call);
    this.session?.ref();
  }
  remove(call) {
    this.calls.delete(call);
    if (!this.calls.size) for (const session of this.sessions) session.unref();
  }
  close() {
    if (this.state === state.SHUTDOWN) return;
    this.change(state.SHUTDOWN);
    this.shutdown.abort(Error("Channel has been shut down"));
    for (const session of this.sessions) {
      if (!this.calls.size || session.connecting) session.destroy();
      else session.close();
    }
  }
  methodConfig(method) {
    const [service, name] = method.replace(/^\//, "").split("/");
    let best,
      rank = -1;
    for (const config of this.config.methodConfig || [])
      for (const match of config.name || []) {
        if (
          (match.service && match.service !== service) ||
          (match.method && match.method !== name)
        )
          continue;
        const score = (match.service ? 1 : 0) + (match.method ? 1 : 0);
        if (score > rank) {
          rank = score;
          best = config;
        }
      }
    return best || {};
  }
}
module.exports = { Channel, state, until };
