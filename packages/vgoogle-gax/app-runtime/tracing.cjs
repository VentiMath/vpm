"use strict";
const api = require("vopentelemetry-api");
function checkTracingEnabled(settings) {
  const configured = process.env.GOOGLE_SDK_NODE_ENABLE_TRACING?.trim();
  return configured
    ? ["true", "1"].includes(configured.toLowerCase())
    : !!settings?.enableTelemetryTracing;
}
function resolveStaticTraceContext(settings = {}) {
  const args = settings.otherArgs ?? {},
    parts = (settings.apiName ?? "").split("."),
    version = parts.findIndex((x) => /^v\d/.test(x));
  return {
    gcpClientService: version > 0 ? parts[version - 1] : undefined,
    serverAddress: args.servicePath,
    serverPort: args.port,
  };
}
function trace(dynamic, statics, fn, streaming, callback, attempt, parent) {
  const name = attempt
    ? (dynamic.apiName ? dynamic.apiName + "/" : "") + dynamic.methodName
    : dynamic.clientName + "." + dynamic.methodName;
  return api.trace
    .getTracer("google-gax", require("../package.json").version)
    .startActiveSpan(
      name,
      { kind: attempt ? api.SpanKind.CLIENT : api.SpanKind.INTERNAL },
      parent ?? api.context.active(),
      (span) => {
        const attributes = {
          "gcp.client.service": statics.gcpClientService,
          "gcp.client.version": statics.gcpVersion,
          "server.address": statics.serverAddress,
          "server.port": statics.serverPort,
        };
        if (attempt) {
          attributes["rpc.system.name"] = dynamic.rpcType ?? "grpc";
          attributes["rpc.method"] =
            (dynamic.apiName ? dynamic.apiName + "/" : "") + dynamic.methodName;
          attributes["gcp.grpc.resend_count"] = dynamic.resendCount ?? 0;
        }
        span.setAttributes(
          Object.fromEntries(
            Object.entries(attributes).filter(([, v]) => v !== undefined),
          ),
        );
        let ended = false;
        const finish = (error) => {
          if (ended) return;
          ended = true;
          if (error) {
            span.setStatus({
              code: api.SpanStatusCode.ERROR,
              message: error.message,
            });
            span.recordException(error);
          }
          span.end();
        };
        try {
          const cb =
            callback &&
            api.context.bind(api.context.active(), (error, ...args) => {
              finish(error);
              callback(error, ...args);
            });
          const result = fn(cb);
          if (!callback) {
            if (streaming && result?.once) {
              result.once("error", finish);
              result.once("end", () => finish());
              result.once("close", () => finish());
            } else if (result?.then) {
              result.then(() => finish(), finish);
            } else finish();
          }
          return result;
        } catch (error) {
          finish(error);
          throw error;
        }
      },
    );
}
const traceCall = (dynamic, statics, fn, streaming = false, callback) =>
  trace(dynamic, statics, fn, streaming, callback, false);
const traceAttempt = (
  dynamic,
  statics,
  fn,
  streaming = false,
  callback,
  parent,
) => trace(dynamic, statics, fn, streaming, callback, true, parent);
module.exports = {
  checkTracingEnabled,
  resolveStaticTraceContext,
  traceCall,
  traceAttempt,
  clearMetadataCache() {},
};
