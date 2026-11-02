"use strict";
const { teenyRequest } = require("vteeny-request");
const { randomUUID } = require("node:crypto");
const { ApiError } = require("./errors.js");
const { snapshot } = require("./save.js");
const abortError = (signal) =>
  signal?.reason instanceof Error
    ? signal.reason
    : Object.assign(new Error("Storage request aborted"), {
        name: "AbortError",
        code: "ABORT_ERR",
      });
const headers = (value) =>
  value?.entries ? Object.fromEntries(value.entries()) : { ...value };
const retryable = (error) =>
  [
    408,
    429,
    500,
    502,
    503,
    504,
    "ECONNRESET",
    "EAI_AGAIN",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNREFUSED",
    "EPIPE",
  ].includes(error?.code) ||
  [408, 429, 500, 502, 503, 504].includes(error?.response?.statusCode);
exports.retryable = retryable;
// Own destination, options and headers before authentication can yield.
function plan(storage, supplied) {
  let options = snapshot(supplied);
  options.uri = new URL(options.uri || options.url, storage.baseUrl + "/").href;
  options.headers = headers(options.headers);
  const interceptors = [
    ...storage.getRequestInterceptors(),
    ...(options._interceptors || []),
  ];
  delete options._interceptors;
  for (const apply of interceptors) options = apply(options) || options;
  options.headers = headers(options.headers);
  options.method = (options.method || "GET").toUpperCase();
  options.headers["User-Agent"] ??=
    "vgoogle-cloud-storage/" + require("../package.json").version;
  options.headers["x-goog-gcs-idempotency-token"] ??= randomUUID();
  options.timeout ??= storage.timeout || 0;
  options.forever ??= true;
  return options;
}
async function authorize(storage, options, auth) {
  if (options.signal?.aborted) throw abortError(options.signal);
  if (!storage.customEndpoint || storage.useAuthWithCustomEndpoint) {
    const supplied = {
      ...options,
      url: options.uri,
      headers: headers(options.headers),
    };
    const result = auth.authorizeRequest
      ? await auth.authorizeRequest(supplied)
      : { headers: await auth.getRequestHeaders(options.uri) };
    options = {
      ...options,
      headers: { ...options.headers, ...headers(result.headers) },
    };
  }
  if (options.signal?.aborted) throw abortError(options.signal);
  return options;
}
function responseError(response, body, accepted = []) {
  if (
    (response.statusCode >= 200 && response.statusCode < 300) ||
    accepted.includes(response.statusCode)
  )
    return;
  const parsed = body && typeof body === "object" ? body.error || body : {};
  return new ApiError(
    {
      message:
        parsed.message || response.statusMessage || "Storage request failed",
      code: response.statusCode,
      errors: parsed.errors,
    },
    response,
  );
}
// Resumable sessions legitimately return empty 200/308 responses even when
// their content type says JSON. Read those protocol responses without asking
// the generic HTTP adapter to parse an empty document.
function dispatch(options, callback) {
  if (!options.resumableResponse) return teenyRequest(options, callback);
  const stream = teenyRequest(options);
  let response,
    text = "",
    settled = false;
  const finish = (error, body) => {
    if (settled) return;
    settled = true;
    callback(error, response, body);
  };
  stream.once("response", (value) => {
    response = value;
  });
  stream.once("error", (error) => finish(error));
  stream.once("close", () => {
    if (!stream.readableEnded)
      finish(
        Object.assign(new Error("Incomplete session response"), {
          code: "ERR_STREAM_PREMATURE_CLOSE",
        }),
      );
  });
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    text += chunk;
  });
  stream.once("end", () => {
    let body = text;
    try {
      if (
        text &&
        /^application\/json(?:\s*;|$)/i.test(
          response.headers["content-type"] || "",
        )
      )
        body = JSON.parse(text);
    } catch (error) {
      finish(error);
      return;
    }
    finish(null, body);
  });
  return stream;
}
exports.request = function request(storage, supplied, callback) {
  let options;
  try {
    options = plan(storage, supplied);
  } catch (error) {
    queueMicrotask(() => callback(error));
    return;
  }
  const auth = storage.authClient,
    policy = { ...storage.retryOptions },
    started = Date.now();
  const idempotent =
    ["GET", "HEAD", "DELETE"].includes(options.method) ||
    options.idempotent === true;
  const max =
    options.maxRetries ??
    (policy.autoRetry && idempotent ? policy.maxRetries : 0);
  let settled = false,
    timer,
    attempt = 0;
  const signal = options.signal;
  const finish = (...args) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    callback(...args);
  };
  const cancel = () => finish(abortError(signal));
  signal?.addEventListener("abort", cancel, { once: true });
  async function send() {
    if (settled) return;
    try {
      const authenticated = await authorize(storage, options, auth);
      if (settled) return;
      dispatch(authenticated, (error, response, body) => {
        if (settled) return;
        error ||= responseError(response, body, options.acceptedStatuses);
        if (
          error &&
          attempt < max &&
          (policy.retryableErrorFn || retryable)(error)
        ) {
          const wait = Math.min(
            1000 * Math.pow(policy.retryDelayMultiplier, attempt++),
            policy.maxRetryDelay * 1000,
          );
          if (Date.now() - started + wait < policy.totalTimeout * 1000) {
            timer = setTimeout(send, wait);
            return;
          }
        }
        finish(error || null, body, response);
      });
    } catch (error) {
      finish(error);
    }
  }
  if (signal?.aborted) cancel();
  else void send();
};
exports.requestPromise = (storage, options) =>
  new Promise((resolve, reject) =>
    exports.request(storage, options, (error, body, response) =>
      error ? reject(error) : resolve([body, response]),
    ),
  );
exports.open = async function open(storage, supplied) {
  const options = plan(storage, supplied),
    auth = storage.authClient,
    authenticated = await authorize(storage, options, auth);
  return new Promise((resolve, reject) => {
    const stream = teenyRequest(authenticated);
    stream.once("error", reject);
    stream.once("response", (response) => {
      stream.pause();
      const error = responseError(response, null);
      if (error) {
        stream.destroy(error);
        reject(error);
      } else resolve({ stream, response });
    });
    stream.read(0);
  });
};
