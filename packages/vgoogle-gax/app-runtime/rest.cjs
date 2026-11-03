"use strict";
const { Readable } = require("node:stream"),
  protobuf = require("vprotobufjs"),
  serializer = require("vproto3-json-serializer"),
  { GoogleAuth } = require("vgoogle-auth-library");
const { JsonProtoCache } = require("../build/src/jsonProtoCache"),
  {
    GoogleError,
    Status,
    httpCode,
    constructSettings,
    camel,
  } = require("./settings.cjs"),
  { PathTemplate } = require("./paths.cjs");
const cache = new JsonProtoCache(),
  defaultToObjectOptions = {
    longs: String,
    enums: String,
    bytes: Buffer,
    defaults: true,
    oneofs: true,
  };
function protobufFromJSON(json, refresh = false) {
  return cache.load(protobuf, json, refresh, (snapshot) =>
    protobuf.Root.fromJSON(snapshot).resolveAll(),
  );
}
const get = (obj, key) =>
  key.split(".").reduce((value, part) => value?.[part], obj);
function remove(obj, key) {
  const keys = key.split(".");
  let value = obj;
  for (const part of keys.slice(0, -1)) {
    if (!value?.[part]) return;
    value = value[part];
  }
  delete value[keys.at(-1)];
}
function encodeRequest(rpc, request) {
  rpc.resolve();
  const json = serializer.toProto3JSON(
      rpc.resolvedRequestType.fromObject(request ?? {}),
    ),
    options = rpc.options ?? {};
  const rules = [
    options,
    ...(options["(google.api.http).additional_bindings"] ?? []),
  ];
  let selected;
  for (const rule of rules) {
    for (const verb of ["get", "post", "put", "patch", "delete"]) {
      const template = rule["(google.api.http)." + verb] ?? rule[verb];
      if (!template) continue;
      const values = {};
      for (const match of template.matchAll(/\{([\w.]+)(?:=[^}]+)?\}/g))
        values[match[1]] = get(json, match[1]);
      try {
        const rendered = new PathTemplate(template).render(values);
        selected = {
          verb,
          path: rendered
            .split("/")
            .map((part) => encodeURIComponent(part).replaceAll("%3A", ":"))
            .join("/"),
          bodyField: rule["(google.api.http).body"] ?? rule.body,
          values,
        };
        break;
      } catch {}
    }
    if (selected) break;
  }
  if (!selected)
    throw new TypeError("No matching HTTP annotation for " + rpc.name);
  const query = structuredClone(json),
    body =
      selected.bodyField === "*"
        ? query
        : selected.bodyField
          ? get(query, selected.bodyField)
          : undefined;
  for (const name of Object.keys(selected.values)) remove(query, name);
  if (selected.bodyField && selected.bodyField !== "*")
    remove(query, selected.bodyField);
  const params = new URLSearchParams();
  function visit(value, prefix) {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, prefix);
    } else if (typeof value === "object") {
      for (const [key, item] of Object.entries(value))
        visit(item, prefix ? prefix + "." + key : key);
    } else params.append(prefix, String(value));
  }
  if (selected.bodyField !== "*") visit(query, "");
  return {
    method: selected.verb.toUpperCase(),
    path: selected.path + (params.size ? "?" + params : ""),
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
async function* jsonArray(source) {
  const decoder = new TextDecoder();
  let state = "start",
    pieces = [],
    depth = 0,
    string = false,
    escaped = false,
    started = false;
  function* accept(text) {
    let begin = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (state === "start") {
        if (/[\t\n\r ]/.test(c)) continue;
        if (c !== "[") throw new SyntaxError("Expected JSON array");
        state = "value";
        continue;
      }
      if (state === "done") {
        if (!/[\t\n\r ]/.test(c)) throw new SyntaxError("Trailing JSON data");
        continue;
      }
      if (!started) {
        if (/[\t\n\r ]/.test(c)) continue;
        if (c === "]" && (state === "value" || state === "comma")) {
          state = "done";
          continue;
        }
        if (state === "comma") {
          if (c !== ",") throw new SyntaxError("Expected array comma");
          state = "required";
          continue;
        }
        if (c === "]") throw new SyntaxError("Trailing array comma");
        started = true;
        begin = i;
      }
      if (string) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') string = false;
      } else if (c === '"') string = true;
      else if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") {
        if (depth === 0 && c === "]") {
          pieces.push(text.slice(begin, i));
          yield JSON.parse(pieces.join(""));
          pieces = [];
          started = false;
          state = "done";
          continue;
        }
        depth--;
        if (depth < 0) throw new SyntaxError("Invalid JSON nesting");
      }
      if (!string && depth === 0 && (c === "}" || c === "]" || c === '"')) {
        // An object/string is complete before the next chunk's delimiter arrives.
        // Emit now so a slow stream cannot hold a complete response until timeout.
        pieces.push(text.slice(begin, i + 1));
        yield JSON.parse(pieces.join(""));
        pieces = [];
        started = false;
        state = "comma";
      } else if (!string && depth === 0 && c === ",") {
        pieces.push(text.slice(begin, i));
        yield JSON.parse(pieces.join(""));
        pieces = [];
        started = false;
        state = "required";
      }
    }
    if (started) pieces.push(text.slice(begin));
  }
  for await (const chunk of source)
    yield* accept(decoder.decode(chunk, { stream: true }));
  yield* accept(decoder.decode());
  if (state !== "done" || started)
    throw new SyntaxError("Truncated JSON array");
}
function bodyStream(response) {
  const body = response.data ?? response.body;
  if (!body) throw new Error("Missing response body");
  return typeof body.getReader === "function" ? Readable.fromWeb(body) : body;
}
async function bytes(response) {
  const parts = [];
  for await (const chunk of bodyStream(response))
    parts.push(Buffer.from(chunk));
  return Buffer.concat(parts).toString("utf8");
}
function decode(rpc, json) {
  const message = serializer.fromProto3JSON(rpc.resolvedResponseType, json);
  if (!message) throw new TypeError("Malformed response for " + rpc.name);
  return rpc.resolvedResponseType.toObject(message, defaultToObjectOptions);
}
function makeStub(service, auth, options) {
  const requests = new Set();
  let closed = false;
  const stub = {
    close() {
      closed = true;
      for (const controller of requests) controller.abort();
    },
  };
  for (const rpc of service.methodsArray) {
    rpc.resolve();
    if (rpc.requestStream) continue;
    stub[camel(rpc.name)] = (
      request,
      headers = {},
      callOptions = {},
      callback,
    ) => {
      const controller = new AbortController();
      let timedOut = false,
        settled = false,
        cancelled = false,
        timer,
        output;
      const deadline = Number(callOptions.deadline),
        timeout = Number.isFinite(deadline)
          ? Math.max(0, deadline - Date.now())
          : Infinity;
      const errorFor = (error) => {
        const result = new GoogleError(error?.message ?? String(error), {
          cause: error,
        });
        for (const key of [
          "httpStatusCode",
          "statusDetails",
          "metadata",
          "reason",
          "domain",
          "errorInfoMetadata",
        ])
          if (error?.[key] !== undefined) result[key] = error[key];
        result.code = timedOut
          ? Status.DEADLINE_EXCEEDED
          : cancelled
            ? Status.CANCELLED
            : typeof error?.code === "number" &&
                error.code >= 0 &&
                error.code <= 16
              ? error.code
              : httpCode(error?.response?.status ?? 503);
        return result;
      };
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        requests.delete(controller);
        callback?.(error, value);
      };
      const cancel = () => {
        cancelled = true;
        controller.abort();
        if (!rpc.responseStream)
          finish(errorFor(new GoogleError("Call cancelled")));
        else output?.destroy();
      };
      const execute = async () => {
        if (closed)
          throw Object.assign(new GoogleError("Client closed"), {
            code: Status.CANCELLED,
          });
        const encoded = encodeRequest(rpc, request),
          base =
            (options.protocol ?? "https") +
            "://" +
            (options.servicePath ?? options.apiEndpoint) +
            ":" +
            (options.port ?? 443),
          url = base + encoded.path;
        requests.add(controller);
        if (Number.isFinite(timeout))
          timer = setTimeout(
            () => {
              timedOut = true;
              controller.abort();
            },
            Math.min(timeout, 2147483647),
          );
        const flat = {};
        for (const [key, value] of Object.entries(headers ?? {}))
          flat[key] = Array.isArray(value) ? value.join(",") : String(value);
        flat["content-type"] = "application/json";
        const response = await auth.fetch(url, {
          method: encoded.method,
          headers: flat,
          body: ["GET", "DELETE"].includes(encoded.method)
            ? undefined
            : encoded.body,
          signal: controller.signal,
          responseType: "stream",
          retry: false,
          validateStatus: (status) => status !== 401 && status !== 403,
        });
        if (!response.ok) {
          const text = await bytes(response);
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = {
              message: text.slice(0, 1024) || "Empty HTTP error response",
              code: response.status,
            };
          }
          const error = GoogleError.parseHttpError(data);
          error.httpStatusCode = response.status;
          if (!data?.error?.status) error.code = httpCode(response.status);
          throw error;
        }
        return response;
      };
      if (rpc.responseStream) {
        output = Readable.from(
          (async function* () {
            try {
              const response = await execute();
              for await (const value of jsonArray(bodyStream(response)))
                yield decode(rpc, value);
            } catch (error) {
              if (!cancelled || timedOut) throw errorFor(error);
            } finally {
              controller.abort();
              clearTimeout(timer);
              requests.delete(controller);
            }
          })(),
          { objectMode: true },
        );
        output.cancel = cancel;
        output.once("close", () => {
          cancelled = true;
          controller.abort();
          clearTimeout(timer);
          requests.delete(controller);
        });
        return output;
      }
      execute()
        .then(
          async (response) => {
            const value =
              response.status === 204
                ? decode(rpc, {})
                : decode(rpc, JSON.parse(await bytes(response)));
            finish(null, value);
          },
          (error) => finish(errorFor(error)),
        )
        .catch((error) => finish(errorFor(error)));
      return { cancel };
    };
  }
  return stub;
}
class GrpcClient {
  constructor(options = {}) {
    this.auth = options.auth ?? new GoogleAuth(options);
    this.options = { ...options };
    this.fallback = true;
    this.grpcVersion = require("../package.json").version;
  }
  static clearProtoCache() {
    cache.clear();
  }
  static protobufFromJSON = protobufFromJSON;
  loadProtoJSON(json, refresh = false) {
    return protobufFromJSON(json, refresh);
  }
  loadProto(json) {
    return this.loadProtoJSON(json);
  }
  constructSettings(service, config, overrides, headers = {}, tracing) {
    const builder = (_tests, extra = {}) => {
      const result = {};
      for (const source of [headers, extra])
        for (const [key, value] of Object.entries(source)) {
          if (source === extra && key.toLowerCase() === "x-goog-api-client")
            continue;
          result[key] = Array.isArray(value) ? [...value] : [String(value)];
        }
      return result;
    };
    return constructSettings(
      service,
      config,
      overrides,
      Status,
      {
        metadataBuilder: builder,
        servicePath: this.options.servicePath ?? this.options.apiEndpoint,
        port: this.options.port,
      },
      tracing ?? this.options.enableTelemetryTracing,
    );
  }
  async createStub(service, options = {}) {
    const opts = { ...this.options, ...options },
      universe = opts.universeDomain ?? "googleapis.com",
      actual = await this.auth.getUniverseDomain?.();
    if (actual && actual !== universe)
      throw new Error(
        "Configured universe domain does not match credential universe domain",
      );
    return makeStub(service, this.auth, opts);
  }
  static createByteLengthFunction(message) {
    return (value) => message.encode(value).finish().length;
  }
}
module.exports = {
  GrpcClient,
  protobufFromJSON,
  defaultToObjectOptions,
  encodeRequest,
  jsonArray,
};
