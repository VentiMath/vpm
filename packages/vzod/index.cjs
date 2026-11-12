"use strict";
// Independent interpreter for the application's schema language. No generated
// code, global configuration or upstream schema internals are involved.
const own = Object.hasOwn,
  thenable = (x) => x != null && typeof x.then === "function";
const lazySchemas = new WeakMap();
const put = (o, k, v) =>
  k === "__proto__"
    ? Object.defineProperty(o, k, {
        value: v,
        writable: true,
        enumerable: true,
        configurable: true,
      })
    : (o[k] = v);
const result = (value, issues = [], aborted = false) => ({
  value,
  issues,
  aborted,
});
const received = (v) =>
  v === null
    ? "null"
    : Array.isArray(v)
      ? "array"
      : typeof v === "number" && !Number.isFinite(v)
        ? String(v)
        : typeof v;
function defaultMessage(i, input) {
  switch (i.code) {
    case "invalid_type":
      return `Invalid input: expected ${i.expected}, received ${received(input)}`;
    case "invalid_value":
      return i.values.length === 1
        ? "Invalid input: expected " + JSON.stringify(i.values[0])
        : "Invalid option: expected one of " +
            i.values.map((v) => JSON.stringify(v)).join("|");
    case "too_small":
    case "too_big": {
      const small = i.code === "too_small",
        limit = small ? i.minimum : i.maximum,
        relation = (small ? ">" : "<") + (i.inclusive ? "=" : "");
      return `${small ? "Too small" : "Too big"}: expected ${i.origin} ${i.origin === "number" || i.origin === "int" ? "to be" : "to have"} ${relation}${limit}${i.origin === "string" ? " characters" : i.origin === "array" ? " items" : ""}`;
    }
    case "invalid_format":
      return i.format === "email"
        ? "Invalid email address"
        : i.format === "url"
          ? "Invalid URL"
          : `Invalid string: must match pattern ${i.pattern}`;
    case "unrecognized_keys":
      return `Unrecognized key${i.keys.length === 1 ? "" : "s"}: ${i.keys.map((k) => JSON.stringify(k)).join(", ")}`;
    default:
      return "Invalid input";
  }
}
function messageOption(option, issue) {
  if (typeof option === "string") return option;
  if (typeof option === "function") {
    const value = option(issue);
    return typeof value === "string" ? value : value?.message;
  }
  if (option && typeof option === "object") {
    const value = messageOption(option.error ?? option.message, issue);
    if (value !== undefined) return value;
    if (issue.input === undefined && option.required_error !== undefined)
      return option.required_error;
    if (
      issue.code === "invalid_type" &&
      option.invalid_type_error !== undefined
    )
      return option.invalid_type_error;
  }
}
function issue(schema, ctx, metadata, input, options) {
  const detail = { ...metadata, path: [...(metadata.path || [])] };
  if (
    options === undefined &&
    schema._options === undefined &&
    ctx.params?.error === undefined
  ) {
    detail.message = metadata.message ?? defaultMessage(detail, input);
    if (ctx.params?.reportInput) detail.input = input;
    return detail;
  }
  const extended = { ...detail, input, inst: schema, schema };
  detail.message =
    metadata.message ??
    messageOption(options, extended) ??
    messageOption(schema._options, extended) ??
    messageOption(ctx.params?.error, extended) ??
    defaultMessage(detail, input);
  if (ctx.params?.reportInput) detail.input = input;
  return detail;
}
function invalid(schema, ctx, input, expected, extra = {}) {
  return result(
    input,
    [issue(schema, ctx, { expected, code: "invalid_type", ...extra }, input)],
    true,
  );
}
function settle(value, ctx, fn) {
  if (!thenable(value)) return fn(value);
  if (!ctx.async) {
    Promise.resolve(value).catch(() => {});
    throw new Error(
      "Encountered Promise during synchronous parse. Use parseAsync instead.",
    );
  }
  return Promise.resolve(value).then(fn);
}
function sequence(items, fn, ctx) {
  const values = items.map(fn);
  return values.some(thenable)
    ? settle(Promise.all(values), ctx, (x) => x)
    : values;
}
function childContext(ctx, input) {
  return { ...ctx, depth: ctx.depth + 1, ancestors: [...ctx.ancestors, input] };
}
function append(parent, child, key) {
  for (const item of child.issues)
    parent.issues.push({ ...item, path: [key, ...item.path] });
  if (child.aborted) parent.aborted = true;
}
function copyDefault(value) {
  if (Array.isArray(value)) return value.map(copyDefault);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    const out = {};
    for (const key of Object.keys(value))
      put(out, key, copyDefault(value[key]));
    return out;
  }
  return value;
}
function countCharacters(value) {
  let n = value.length;
  for (let i = 0; i < value.length - 1; i++) {
    const c = value.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = value.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        n--;
        i++;
      }
    }
  }
  return n;
}
const emailPattern =
  /^(?!\.)(?!.*\.\.)[A-Z0-9_'+.\-]*[A-Z0-9_+\-]@(?:[A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
// Common immutable scalar fields can be accepted without creating a nested
// interpreter frame. Any transformation, callback or failure takes the full
// path, retaining issue order, custom messages and async behavior.
function acceptsScalar(schema, value) {
  const kind = schema._kind;
  if (schema._coerce) return false;
  if (kind === "optional" && !schema._checks.length)
    return (
      (value === undefined && !schema._fallback) ||
      acceptsScalar(schema._inner, value)
    );
  if (kind === "nullable" && !schema._checks.length)
    return value === null || acceptsScalar(schema._inner, value);
  if (kind === "unknown" || kind === "any") return !schema._checks.length;
  if (kind === "literal" || kind === "enum")
    return (
      !schema._checks.length && schema._values.some((v) => Object.is(v, value))
    );
  if (kind !== "string" && kind !== "number" && kind !== "boolean")
    return false;
  if (typeof value !== kind || (kind === "number" && !Number.isFinite(value)))
    return false;
  for (const check of schema._checks) {
    if (check.kind === "min" || check.kind === "max") {
      const n = kind === "string" ? countCharacters(value) : value;
      if (
        check.kind === "min"
          ? check.exclusive
            ? n <= check.limit
            : n < check.limit
          : check.exclusive
            ? n >= check.limit
            : n > check.limit
      )
        return false;
    } else if (check.kind === "int") {
      if (!Number.isSafeInteger(value)) return false;
    } else return false;
  }
  return true;
}
function runChecks(schema, out, ctx) {
  let current = out;
  for (const check of schema._checks)
    current = settle(current, ctx, (r) => {
      if (
        r.aborted &&
        (schema._kind === "number" ||
          (check.kind !== "min" && check.kind !== "max"))
      )
        return r;
      const value = r.value;
      if (check.kind === "refine")
        return settle((0, check.fn)(value), ctx, (ok) => {
          if (!ok) {
            r.issues.push(
              issue(
                schema,
                ctx,
                { code: "custom", path: check.options?.path || [] },
                value,
                check.options,
              ),
            );
            if (check.options?.abort) r.aborted = true;
          }
          return r;
        });
      if (check.kind === "super") {
        const context = {
          addIssue(entry) {
            const data = typeof entry === "string" ? { message: entry } : entry;
            const { fatal, continue: cont, ...info } = data;
            r.issues.push(
              issue(schema, ctx, { code: "custom", ...info }, value),
            );
            if (fatal || cont === false) r.aborted = true;
          },
        };
        return settle((0, check.fn)(value, context), ctx, () => r);
      }
      if (check.kind === "stringTransform") {
        r.value = (0, check.fn)(value);
        return r;
      }
      let metadata;
      if (check.kind === "min" || check.kind === "max") {
        const origin =
          typeof value === "string"
            ? "string"
            : Array.isArray(value)
              ? "array"
              : "number";
        if (
          schema._kind === "number"
            ? typeof value !== "number"
            : typeof value !== "string" && !Array.isArray(value)
        )
          return r;
        const n =
          origin === "string"
            ? countCharacters(value)
            : origin === "array"
              ? value.length
              : value;
        if (
          check.kind === "min"
            ? check.exclusive
              ? n <= check.limit
              : n < check.limit
            : check.exclusive
              ? n >= check.limit
              : n > check.limit
        )
          metadata = {
            origin,
            code: check.kind === "min" ? "too_small" : "too_big",
            [check.kind === "min" ? "minimum" : "maximum"]: check.limit,
            inclusive: !check.exclusive,
          };
      } else if (check.kind === "int") {
        if (!Number.isInteger(value)) {
          metadata = {
            expected: "int",
            format: "safeint",
            code: "invalid_type",
          };
          r.aborted = true;
        } else if (!Number.isSafeInteger(value))
          metadata = {
            note: "Integers must be within the safe integer range.",
            origin: "int",
            code: value > 0 ? "too_big" : "too_small",
            [value > 0 ? "maximum" : "minimum"]:
              value > 0 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER,
            inclusive: true,
          };
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        if (!check.regex.test(value))
          metadata = {
            origin: "string",
            code: "invalid_format",
            format: "regex",
            pattern: String(check.regex),
          };
      } else if (check.kind === "email") {
        if (!emailPattern.test(value))
          metadata = {
            origin: "string",
            code: "invalid_format",
            format: "email",
            pattern: String(emailPattern),
          };
      } else if (check.kind === "url") {
        try {
          new URL(value);
        } catch {
          metadata = { code: "invalid_format", format: "url" };
        }
      }
      if (metadata)
        r.issues.push(issue(schema, ctx, metadata, value, check.options));
      return r;
    });
  return current;
}
function read(schema, input, ctx) {
  if (ctx.depth > 256)
    return result(
      undefined,
      [
        issue(
          schema,
          ctx,
          {
            code: "custom",
            message: "Schema input exceeds the maximum nesting depth",
          },
          input,
        ),
      ],
      true,
    );
  const kind = schema._kind;
  let out;
  if (kind === "optional")
    out =
      input === undefined && !schema._inner._fallback
        ? result(undefined)
        : read(schema._inner, input, ctx);
  else if (kind === "nullable")
    out = input === null ? result(null) : read(schema._inner, input, ctx);
  else if (kind === "default")
    out =
      input === undefined
        ? result(
            copyDefault(
              typeof schema._default === "function"
                ? (0, schema._default)()
                : schema._default,
            ),
          )
        : read(schema._inner, input, ctx);
  else if (kind === "transform")
    out = settle(read(schema._inner, input, ctx), ctx, (r) =>
      r.issues.length
        ? r
        : settle((0, schema._transform)(r.value), ctx, (value) =>
            result(value),
          ),
    );
  else if (kind === "lazy") {
    if (!lazySchemas.has(schema))
      lazySchemas.set(schema, (0, schema._getter)());
    out = read(lazySchemas.get(schema), input, {
      ...ctx,
      depth: ctx.depth + 1,
    });
  } else if (kind === "unknown" || kind === "any") out = result(input);
  else if (kind === "literal" || kind === "enum")
    out = schema._values.some((v) => Object.is(v, input))
      ? result(input)
      : result(
          undefined,
          [
            issue(
              schema,
              ctx,
              { code: "invalid_value", values: [...schema._values] },
              input,
            ),
          ],
          true,
        );
  else if (kind === "string" || kind === "number" || kind === "boolean") {
    let value = input;
    if (schema._coerce) {
      try {
        value =
          kind === "string"
            ? String(value)
            : kind === "number"
              ? Number(value)
              : Boolean(value);
      } catch {
        return invalid(schema, ctx, input, kind);
      }
    }
    out =
      typeof value !== kind
        ? invalid(schema, ctx, value, kind)
        : kind === "number" && !Number.isFinite(value)
          ? invalid(schema, ctx, value, "number", { received: String(value) })
          : result(value);
  } else if (kind === "object" || kind === "array" || kind === "record") {
    if (
      kind === "array"
        ? !Array.isArray(input)
        : input === null || typeof input !== "object" || Array.isArray(input)
    )
      return runChecks(
        schema,
        invalid(
          schema,
          ctx,
          input,
          kind === "array" ? "array" : kind === "record" ? "record" : "object",
        ),
        ctx,
      );
    if (ctx.ancestors.includes(input))
      return result(
        undefined,
        [
          issue(
            schema,
            ctx,
            { code: "custom", message: "Cyclic schema input is not supported" },
            input,
          ),
        ],
        true,
      );
    const sub = childContext(ctx, input),
      keys =
        kind === "object"
          ? schema._keys
          : kind === "array"
            ? Array.from({ length: input.length }, (_, i) => i)
            : Object.keys(input);
    out = settle(
      sequence(
        keys,
        (key) => {
          const field = kind === "object" ? schema._shape[key] : schema._inner;
          const value = own(input, key) ? input[key] : undefined;
          return acceptsScalar(field, value)
            ? result(value)
            : read(field, value, sub);
        },
        ctx,
      ),
      ctx,
      (children) => {
        const r = result(kind === "array" ? [] : {});
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i],
            child = children[i];
          append(r, child, key);
          if (kind === "record") {
            const checked = read(schema._keySchema, key, {
              ...ctx,
              async: false,
            });
            if (checked.issues.length) {
              r.issues.push(
                issue(
                  schema,
                  ctx,
                  {
                    code: "invalid_key",
                    origin: "record",
                    issues: checked.issues,
                    path: [key],
                  },
                  key,
                ),
              );
              r.aborted = true;
              continue;
            }
          }
          if (kind === "array" || child.value !== undefined || own(input, key))
            put(r.value, key, child.value);
        }
        if (kind === "object" && schema._unknown !== "strip") {
          const extra = Object.keys(input).filter(
            (k) => !own(schema._shape, k),
          );
          if (schema._unknown === "strict" && extra.length) {
            r.issues.push(
              issue(
                schema,
                ctx,
                { code: "unrecognized_keys", keys: extra },
                input,
              ),
            );
            r.aborted = true;
          } else if (schema._unknown === "passthrough")
            for (const k of extra) put(r.value, k, input[k]);
        }
        return r;
      },
    );
  } else if (kind === "union") {
    // Synchronous branches short-circuit. Async branches are evaluated in schema
    // order too, preserving selection and keeping unused refinements idle.
    const failures = [];
    let selected = -1,
      selectedResult;
    const next = (index) => {
      if (index === schema._branches.length) {
        const dirty = failures.filter((x) => !x.aborted);
        if (dirty.length === 1) return dirty[0];
        return result(
          undefined,
          [
            issue(
              schema,
              ctx,
              { code: "invalid_union", errors: failures.map((x) => x.issues) },
              input,
            ),
          ],
          true,
        );
      }
      return settle(
        index === selected
          ? selectedResult
          : read(schema._branches[index], input, {
              ...ctx,
              depth: ctx.depth + 1,
            }),
        ctx,
        (r) => {
          if (!r.issues.length) return r;
          failures.push(r);
          return next(index + 1);
        },
      );
    };
    if (
      schema._selector &&
      input &&
      typeof input === "object" &&
      own(input, schema._selector.key)
    ) {
      selected = schema._selector.values.get(input[schema._selector.key]) ?? -1;
    }
    out =
      selected < 0
        ? next(0)
        : settle(
            read(schema._branches[selected], input, {
              ...ctx,
              depth: ctx.depth + 1,
            }),
            ctx,
            (r) => {
              if (!r.issues.length || !r.aborted) return r;
              selectedResult = r;
              return next(0);
            },
          );
  } else throw new TypeError("Unsupported schema kind: " + kind);
  return settle(out, ctx, (r) =>
    schema._checks.length ? runChecks(schema, r, ctx) : r,
  );
}
const errorMessages = new WeakMap(),
  errorStacks = new WeakMap();
class ZodError extends Error {
  constructor(issues) {
    // Validation errors need diagnostics, not an eager engine stack capture.
    const error = Object.create(new.target.prototype);
    error.name = "ZodError";
    error.issues = issues;
    return error;
  }
  get message() {
    let text = errorMessages.get(this);
    if (text === undefined) {
      text = JSON.stringify(this.issues, null, 2);
      errorMessages.set(this, text);
    }
    return text;
  }
  get stack() {
    let text = errorStacks.get(this);
    if (text === undefined) {
      text = new Error(this.message).stack.replace(/^Error/, "ZodError");
      errorStacks.set(this, text);
    }
    return text;
  }
  set stack(value) {
    errorStacks.set(this, value);
  }

  get errors() {
    return this.issues;
  }
  flatten(map = (i) => i.message) {
    const out = { formErrors: [], fieldErrors: {} };
    for (const i of this.issues) {
      if (!i.path.length) out.formErrors.push(map(i));
      else {
        const k = i.path[0];
        if (!own(out.fieldErrors, k)) put(out.fieldErrors, k, []);
        out.fieldErrors[k].push(map(i));
      }
    }
    return out;
  }
  format(map = (i) => i.message) {
    const out = { _errors: [] };
    const add = (i) => {
      if (i.code === "invalid_union") {
        for (const branch of i.errors)
          for (const sub of branch)
            add({ ...sub, path: [...i.path, ...sub.path] });
        return;
      }
      let node = out;
      for (const k of i.path) {
        if (!own(node, k)) put(node, k, { _errors: [] });
        node = node[k];
      }
      node._errors.push(map(i));
    };
    this.issues.forEach(add);
    return out;
  }
}
class Schema {
  constructor(kind, config = {}, options) {
    this._kind = kind;
    Object.assign(this, config);
    this._options = options;
    this._checks = [];
    this._fallback = kind === "default" || !!config._inner?._fallback;
  }
  _check(check) {
    const next = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this,
    );
    next._checks = [...this._checks, check];
    return next;
  }
  safeParse(input, params) {
    const r = read(this, input, {
      async: false,
      params,
      ancestors: [],
      depth: 0,
    });
    return r.issues.length
      ? { success: false, error: new ZodError(r.issues) }
      : { success: true, data: r.value };
  }
  parse(input, params) {
    const r = this.safeParse(input, params);
    if (!r.success) {
      if (Error.captureStackTrace) Error.captureStackTrace(r.error, this.parse);
      throw r.error;
    }
    return r.data;
  }
  async safeParseAsync(input, params) {
    const r = await read(this, input, {
      async: true,
      params,
      ancestors: [],
      depth: 0,
    });
    return r.issues.length
      ? { success: false, error: new ZodError(r.issues) }
      : { success: true, data: r.value };
  }
  async parseAsync(input, params) {
    const r = await this.safeParseAsync(input, params);
    if (!r.success) throw r.error;
    return r.data;
  }
  optional() {
    return new Schema("optional", { _inner: this });
  }
  nullable() {
    return new Schema("nullable", { _inner: this });
  }
  nullish() {
    return this.nullable().optional();
  }
  default(value) {
    return new Schema("default", { _inner: this, _default: value });
  }
  array() {
    return array(this);
  }
  or(other) {
    return union([this, other]);
  }
  refine(fn, options) {
    return this._check({ kind: "refine", fn, options });
  }
  superRefine(fn) {
    return this._check({ kind: "super", fn });
  }
  transform(fn) {
    return new Schema("transform", { _inner: this, _transform: fn });
  }
  min(limit, options) {
    return this._check({ kind: "min", limit, options });
  }
  max(limit, options) {
    return this._check({ kind: "max", limit, options });
  }
  nonempty(options) {
    return this.min(1, options);
  }
  length(limit, options) {
    return this.min(limit, options).max(limit, options);
  }
  positive(options) {
    return this._check({ kind: "min", limit: 0, exclusive: true, options });
  }
  nonnegative(options) {
    return this.min(0, options);
  }
  int(options) {
    return this._check({ kind: "int", options });
  }
  email(options) {
    return this._check({ kind: "email", options });
  }
  url(options) {
    return this._check({ kind: "url", options });
  }
  regex(regex, options) {
    return this._check({
      kind: "regex",
      regex: new RegExp(regex.source, regex.flags),
      options,
    });
  }
  trim() {
    return this._check({ kind: "stringTransform", fn: (s) => s.trim() });
  }
  toLowerCase() {
    return this._check({ kind: "stringTransform", fn: (s) => s.toLowerCase() });
  }
  toUpperCase() {
    return this._check({ kind: "stringTransform", fn: (s) => s.toUpperCase() });
  }
  extend(shape) {
    if (this._kind !== "object")
      throw new TypeError("extend requires an object schema");
    if (this._checks.length)
      throw new Error("Cannot extend an object with refinements");
    return object({ ...this._shape, ...shape }, this._options)._unknownMode(
      this._unknown,
    );
  }
  _unknownMode(mode) {
    const next = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this,
    );
    next._unknown = mode;
    return next;
  }
  strict() {
    return this._unknownMode("strict");
  }
  passthrough() {
    return this._unknownMode("passthrough");
  }
  strip() {
    return this._unknownMode("strip");
  }
  partial() {
    return object(
      Object.fromEntries(this._keys.map((k) => [k, this._shape[k].optional()])),
      this._options,
    )._unknownMode(this._unknown);
  }
  pick(mask) {
    return object(
      Object.fromEntries(
        this._keys.filter((k) => mask[k]).map((k) => [k, this._shape[k]]),
      ),
      this._options,
    )._unknownMode(this._unknown);
  }
  omit(mask) {
    return object(
      Object.fromEntries(
        this._keys.filter((k) => !mask[k]).map((k) => [k, this._shape[k]]),
      ),
      this._options,
    )._unknownMode(this._unknown);
  }
  unwrap() {
    if (!this._inner) throw new TypeError("This schema has no inner schema");
    return this._inner;
  }
  get shape() {
    return this._shape;
  }
  get element() {
    return this._inner;
  }
  get options() {
    return this._values || this._branches;
  }
  get enum() {
    return Object.fromEntries(this._values.map((v) => [v, v]));
  }
}
const string = (options) => new Schema("string", {}, options),
  number = (options) => new Schema("number", {}, options),
  boolean = (options) => new Schema("boolean", {}, options);
function object(shape, options) {
  const snapshot = Object.freeze({ ...shape });
  return new Schema(
    "object",
    { _shape: snapshot, _keys: Object.keys(snapshot), _unknown: "strip" },
    options,
  );
}
const array = (inner, options) =>
  new Schema("array", { _inner: inner }, options);
function union(branches, options) {
  const schema = new Schema("union", { _branches: [...branches] }, options);
  if (branches.length > 1 && branches.every((s) => s._kind === "object")) {
    for (const key of branches[0]._keys) {
      const values = new Map();
      let valid = true;
      for (let i = 0; i < branches.length; i++) {
        const field = branches[i]._shape[key];
        if (!field || field._kind !== "literal") {
          valid = false;
          break;
        }
        for (const value of field._values) {
          if (values.has(value)) valid = false;
          values.set(value, i);
        }
      }
      if (valid) {
        schema._selector = { key, values };
        break;
      }
    }
  }
  return schema;
}
const literal = (value, options) =>
  new Schema(
    "literal",
    { _values: Array.isArray(value) ? [...value] : [value] },
    options,
  );
const enumeration = (values, options) =>
  new Schema(
    "enum",
    { _values: Array.isArray(values) ? [...values] : Object.values(values) },
    options,
  );
function record(key, value, options) {
  if (value === undefined)
    return new Schema("record", { _keySchema: string(), _inner: key });
  if (key._kind !== "string")
    throw new TypeError("This package supports string-key records");
  return new Schema("record", { _keySchema: key, _inner: value }, options);
}
const lazy = (getter) => new Schema("lazy", { _getter: getter }),
  unknown = () => new Schema("unknown"),
  any = () => new Schema("any");
const api = {
  string,
  number,
  boolean,
  object,
  array,
  union,
  literal,
  enum: enumeration,
  record,
  lazy,
  unknown,
  any,
  email: (options) => string().email(options),
  url: (options) => string().url(options),
  strictObject: (shape, options) => object(shape, options).strict(),
  looseObject: (shape, options) => object(shape, options).passthrough(),
  coerce: {
    string: (options) => new Schema("string", { _coerce: true }, options),
    number: (options) => new Schema("number", { _coerce: true }, options),
    boolean: (options) => new Schema("boolean", { _coerce: true }, options),
  },
  ZodError,
  ZodType: Schema,
  ZodIssueCode: Object.freeze({
    invalid_type: "invalid_type",
    invalid_value: "invalid_value",
    invalid_union: "invalid_union",
    invalid_format: "invalid_format",
    too_small: "too_small",
    too_big: "too_big",
    custom: "custom",
    unrecognized_keys: "unrecognized_keys",
    invalid_key: "invalid_key",
  }),
};
module.exports = { ...api, z: api, default: api };
