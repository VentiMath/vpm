"use strict";
const MAX = Number.MAX_SAFE_INTEGER;
const normalize = (options) =>
  typeof options === "object" && options !== null
    ? options
    : { loose: !!options };
function numeric(value) {
  return /^\d+$/.test(String(value));
}
function compareIdentifiers(a, b) {
  const an = numeric(a),
    bn = numeric(b);
  if (an && bn) {
    a = Number(a);
    b = Number(b);
  } else if (an !== bn) return an ? -1 : 1;
  return a === b ? 0 : a < b ? -1 : 1;
}
function SemVer(input, options) {
  if (!(this instanceof SemVer)) return new SemVer(input, options);
  const opts = normalize(options);
  if (input instanceof SemVer) {
    if (
      input.loose === !!opts.loose &&
      input.includePrerelease === !!opts.includePrerelease
    )
      return input;
    input = input.version;
  }
  if (typeof input !== "string" || input.length > 256)
    throw new TypeError("Invalid version: " + String(input));
  const clean = input.trim();
  const match = (
    opts.loose
      ? /^[v=\s]*(\d+)\.(\d+)\.(\d+)(?:-?([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
      : /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
  ).exec(clean);
  if (!match) throw new TypeError("Invalid version: " + input);
  this.options = opts;
  this.loose = !!opts.loose;
  this.includePrerelease = !!opts.includePrerelease;
  this.raw = input;
  this.major = Number(match[1]);
  this.minor = Number(match[2]);
  this.patch = Number(match[3]);
  if (this.major > MAX || this.minor > MAX || this.patch > MAX)
    throw new TypeError("Version component exceeds safe integer");
  this.prerelease = match[4]
    ? match[4].split(".").map((id) => {
        if (numeric(id)) {
          if (!opts.loose && id.length > 1 && id[0] === "0")
            throw new TypeError("Leading zero in prerelease");
          const n = Number(id);
          if (n < MAX) return n;
        }
        return id;
      })
    : [];
  this.build = match[5] ? match[5].split(".") : [];
  this.format();
}
SemVer.prototype.format = function () {
  this.version =
    this.major +
    "." +
    this.minor +
    "." +
    this.patch +
    (this.prerelease.length ? "-" + this.prerelease.join(".") : "");
  return this.version;
};
SemVer.prototype.toString = function () {
  return this.version;
};
SemVer.prototype.compareMain = function (other) {
  const b = new SemVer(other, this.options);
  for (const key of ["major", "minor", "patch"])
    if (this[key] !== b[key]) return this[key] < b[key] ? -1 : 1;
  return 0;
};
function sequence(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i === a.length) return -1;
    if (i === b.length) return 1;
    const order = compareIdentifiers(a[i], b[i]);
    if (order) return order;
  }
  return 0;
}
SemVer.prototype.comparePre = function (other) {
  const b = new SemVer(other, this.options);
  if (!this.prerelease.length || !b.prerelease.length)
    return this.prerelease.length ? -1 : b.prerelease.length ? 1 : 0;
  return sequence(this.prerelease, b.prerelease);
};
SemVer.prototype.compare = function (other) {
  return this.compareMain(other) || this.comparePre(other);
};
SemVer.prototype.compareBuild = function (other) {
  return sequence(this.build, new SemVer(other, this.options).build);
};
function parse(value, options, throwErrors = false) {
  try {
    return new SemVer(value, options);
  } catch (e) {
    if (throwErrors) throw e;
    return null;
  }
}
const valid = (value, options) => parse(value, options)?.version || null;
const clean = (value, options) =>
  valid(value.trim().replace(/^[=v]+/, ""), options);
const compare = (a, b, options) => new SemVer(a, options).compare(b);
const compareBuild = (a, b, options) =>
  compare(a, b, options) || new SemVer(a, options).compareBuild(b);
function diff(a, b) {
  const first = new SemVer(a),
    second = new SemVer(b);
  if (!first.compare(second)) return null;
  const high = first.compare(second) > 0 ? first : second,
    low = high === first ? second : first;
  if (low.prerelease.length && !high.prerelease.length) {
    if (!low.patch && !low.minor) return "major";
    if (!low.patch && high.major === low.major) return "minor";
    if (high.major === low.major && high.minor === low.minor) return "patch";
  }
  const pre = high.prerelease.length;
  for (const key of ["major", "minor", "patch"])
    if (first[key] !== second[key]) return (pre ? "pre" : "") + key;
  return "prerelease";
}
function coerce(value, options = {}) {
  options = normalize(options);
  if (value instanceof SemVer) return value;
  if (typeof value === "number") value = String(value);
  if (typeof value !== "string") return null;
  const rx = /(^|[^\d])(\d{1,16})(?:\.(\d{1,16}))?(?:\.(\d{1,16}))?(?!\d)/g;
  let chosen, match;
  while ((match = rx.exec(value))) {
    const start = match.index + match[1].length;
    const suffix = options.includePrerelease
      ? /^(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?/.exec(
          value.slice(rx.lastIndex),
        )[0]
      : "";
    const end = rx.lastIndex + suffix.length;
    if (!chosen || end > chosen.end) chosen = { match, start, end, suffix };
    if (!options.rtl) break;
    rx.lastIndex = start + match[2].length;
  }
  if (!chosen) return null;
  const fields = chosen.match.slice(2).map((v) => v || "0");
  const suffix = chosen.suffix;
  return parse(fields.join(".") + suffix, options);
}
const api = {
  SemVer,
  parse,
  valid,
  clean,
  compare,
  compareBuild,
  coerce,
  diff,
  compareIdentifiers,
  rcompareIdentifiers: (a, b) => compareIdentifiers(b, a),
  rcompare: (a, b, o) => compare(b, a, o),
  compareLoose: (a, b) => compare(a, b, true),
  major: (v, o) => new SemVer(v, o).major,
  minor: (v, o) => new SemVer(v, o).minor,
  patch: (v, o) => new SemVer(v, o).patch,
  prerelease: (v, o) => {
    const p = parse(v, o);
    return p?.prerelease.length ? p.prerelease : null;
  },
  sort: (list, o) => list.sort((a, b) => compareBuild(a, b, o)),
  rsort: (list, o) => list.sort((a, b) => compareBuild(b, a, o)),
  gt: (a, b, o) => compare(a, b, o) > 0,
  gte: (a, b, o) => compare(a, b, o) >= 0,
  lt: (a, b, o) => compare(a, b, o) < 0,
  lte: (a, b, o) => compare(a, b, o) <= 0,
  eq: (a, b, o) => compare(a, b, o) === 0,
  neq: (a, b, o) => compare(a, b, o) !== 0,
};
api.cmp = (a, op, b, o) => {
  if (op === "===")
    return (
      (a instanceof SemVer ? a.version : a) ===
      (b instanceof SemVer ? b.version : b)
    );
  if (op === "!==") return !api.cmp(a, "===", b, o);
  const method = {
    "": "eq",
    "=": "eq",
    "==": "eq",
    "!=": "neq",
    ">": "gt",
    ">=": "gte",
    "<": "lt",
    "<=": "lte",
  }[op];
  if (!method) throw new TypeError("Invalid comparison operator " + op);
  return api[method](a, b, o);
};
module.exports = { ...api, normalize };
