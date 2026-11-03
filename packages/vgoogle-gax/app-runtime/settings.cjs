"use strict";
const Status = {};
"OK CANCELLED UNKNOWN INVALID_ARGUMENT DEADLINE_EXCEEDED NOT_FOUND ALREADY_EXISTS PERMISSION_DENIED RESOURCE_EXHAUSTED FAILED_PRECONDITION ABORTED OUT_OF_RANGE UNIMPLEMENTED INTERNAL UNAVAILABLE DATA_LOSS UNAUTHENTICATED"
  .split(" ")
  .forEach((name, i) => {
    Status[name] = i;
    Status[i] = name;
  });
class GoogleError extends Error {
  static parseHttpError(input) {
    const data = input?.error ?? input ?? {},
      http = Number(data.code) || 500;
    return Object.assign(
      new GoogleError(data.message || "HTTP request failed"),
      {
        code: Status[data.status] ?? httpCode(http),
        httpStatusCode: http,
        statusDetails: data.details ?? [],
      },
    );
  }
  static parseGRPCStatusDetails(error) {
    const buffers = error.metadata?.get?.("grpc-status-details-bin");
    if (!buffers?.length) return error;
    try {
      const root = require("vprotobufjs").Root.fromJSON(
          require("../build/protos/status.json"),
        ),
        status = root.lookupType("google.rpc.Status"),
        details = [];
      for (const bytes of buffers)
        for (const detail of status.decode(bytes).details ?? []) {
          const name = (detail.type_url ?? detail.typeUrl ?? "")
            .split("/")
            .at(-1);
          let decoded;
          try {
            decoded = root.lookupType(name).decode(detail.value);
          } catch {
            decoded = detail;
          }
          details.push(decoded);
          if (name === "google.rpc.ErrorInfo")
            Object.assign(error, {
              reason: decoded.reason,
              domain: decoded.domain,
              errorInfoMetadata: decoded.metadata,
            });
        }
      if (details.length) error.statusDetails = details;
    } catch {}
    return error;
  }
}
const httpCode = (code) =>
  ({
    400: 3,
    401: 16,
    403: 7,
    404: 5,
    409: 10,
    429: 8,
    499: 1,
    500: 13,
    501: 12,
    503: 14,
    504: 4,
  })[code] ?? (code >= 500 ? 13 : 2);
class RetryOptions {
  constructor(
    retryCodes = [],
    backoffSettings = {},
    shouldRetryFn,
    getResumptionRequestFn,
  ) {
    this.retryCodes = retryCodes && [...retryCodes];
    this.backoffSettings = backoffSettings && { ...backoffSettings };
    this.shouldRetryFn = shouldRetryFn;
    this.getResumptionRequestFn = getResumptionRequestFn;
  }
}
const createRetryOptions = (...args) => new RetryOptions(...args);
const createBackoffSettings = (
  initialRetryDelayMillis,
  retryDelayMultiplier,
  maxRetryDelayMillis,
  initialRpcTimeoutMillis,
  rpcTimeoutMultiplier,
  maxRpcTimeoutMillis,
  totalTimeoutMillis,
) => ({
  initialRetryDelayMillis,
  retryDelayMultiplier,
  maxRetryDelayMillis,
  initialRpcTimeoutMillis,
  rpcTimeoutMultiplier,
  maxRpcTimeoutMillis,
  totalTimeoutMillis,
});
const createDefaultBackoffSettings = () =>
  createBackoffSettings(100, 1.3, 60000, 20000, 1, 20000, 600000);
function cloneRetry(value) {
  return value == null
    ? value
    : new RetryOptions(
        value.retryCodes,
        value.backoffSettings,
        value.shouldRetryFn,
        value.getResumptionRequestFn,
      );
}
class CallSettings {
  constructor(value = {}, base) {
    this.timeout = value.timeout ?? base?.timeout ?? 30000;
    this.autoPaginate = value.autoPaginate ?? base?.autoPaginate ?? true;
    this.maxResults = value.maxResults ?? base?.maxResults;
    this.apiName = value.apiName ?? base?.apiName;
    this.retryRequestOptions =
      value.retryRequestOptions ?? base?.retryRequestOptions;
    this.enableTelemetryTracing =
      value.enableTelemetryTracing ?? base?.enableTelemetryTracing;
    this.enableTelemetryLogging =
      value.enableTelemetryLogging ?? base?.enableTelemetryLogging;
    this.isBundling = value.isBundling ?? base?.isBundling;
    this.bundleOptions = value.bundleOptions ?? base?.bundleOptions;
    this.longrunning = value.longrunning ?? base?.longrunning;
    this.resumableUpload = value.resumableUpload ?? base?.resumableUpload;
    this.retry = cloneRetry(
      base?.retry && value.retry !== null ? base.retry : value.retry,
    );
    if (base?.retry && value.retry !== null) {
      const retry = this.retry;
      const backoff = (retry.backoffSettings ??= {});
      if (base.retry.retryCodes) {
        backoff.initialRpcTimeoutMillis = this.timeout;
        backoff.maxRpcTimeoutMillis = this.timeout;
        backoff.totalTimeoutMillis = this.timeout;
      }
      if (value.retry) {
        if (value.retry.retryCodes !== undefined)
          retry.retryCodes = value.retry.retryCodes && [
            ...value.retry.retryCodes,
          ];
        Object.assign(backoff, value.retry.backoffSettings);
        if (value.retry.shouldRetryFn !== undefined)
          retry.shouldRetryFn = value.retry.shouldRetryFn;
        if (value.retry.getResumptionRequestFn !== undefined)
          retry.getResumptionRequestFn = value.retry.getResumptionRequestFn;
      }
    }
    if (this.retry && value.maxRetries !== undefined) {
      const backoff = (this.retry.backoffSettings ??= {});
      backoff.maxRetries = value.maxRetries;
      delete backoff.totalTimeoutMillis;
    }
    const args = value.otherArgs;
    this.otherArgs = {
      ...base?.otherArgs,
      ...args,
      options: { ...(args?.options ?? base?.otherArgs?.options) },
      headers: { ...(args?.headers ?? base?.otherArgs?.headers) },
    };
  }
  merge(options) {
    return new CallSettings(options ?? {}, this);
  }
}
const camel = (name) =>
  name
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
function constructSettings(
  serviceName,
  config,
  overrides = {},
  retryNames = Status,
  otherArgs = {},
  enableTelemetryTracing,
) {
  const base = config.interfaces?.[serviceName];
  if (!base) return null;
  const custom = overrides.interfaces?.[serviceName] ?? {},
    result = {};
  for (const [method, defaults] of Object.entries(base.methods ?? {})) {
    const spec = { ...defaults, ...custom.methods?.[method] },
      codes = { ...base.retry_codes, ...custom.retry_codes },
      params = { ...base.retry_params, ...custom.retry_params },
      raw = params[spec.retry_params_name] ?? {},
      backoff = {};
    for (const [key, value] of Object.entries(raw)) backoff[camel(key)] = value;
    const retry = new RetryOptions(
      (codes[spec.retry_codes_name] ?? []).map((name) =>
        Number(retryNames[name]),
      ),
      backoff,
    );
    result[camel(method)] = new CallSettings({
      timeout: spec.timeout_millis,
      retry,
      apiName: serviceName,
      otherArgs: { ...otherArgs, internalMethodName: method },
      enableTelemetryTracing,
    });
  }
  return result;
}
module.exports = {
  Status,
  GoogleError,
  httpCode,
  RetryOptions,
  createRetryOptions,
  createBackoffSettings,
  createDefaultBackoffSettings,
  CallSettings,
  constructSettings,
  camel,
};
