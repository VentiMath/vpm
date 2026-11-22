"use strict";
const v = require("./versions.cjs");
const ANY = Symbol("SemVer ANY");
const zero = "0.0.0";
function Comparator(input, options) {
  if (!(this instanceof Comparator)) return new Comparator(input, options);
  this.options = v.normalize(options);
  this.loose = !!this.options.loose;
  if (input instanceof Comparator) input = input.value;
  const match = /^(<=|>=|<|>|=)?\s*(.*)$/.exec(input.trim());
  this.operator = match[1] === "=" ? "" : match[1] || "";
  this.semver = match[2] ? new v.SemVer(match[2], this.options) : ANY;
  this.value = this.semver === ANY ? "" : this.operator + this.semver.version;
}
Comparator.ANY = ANY;
Comparator.prototype.toString = function () {
  return this.value;
};
Comparator.prototype.test = function (value) {
  if (this.semver === ANY) return true;
  try {
    return v.cmp(value, this.operator, this.semver, this.options);
  } catch {
    return false;
  }
};
function partial(text, options) {
  const pattern = options.loose
    ? /^[v=]*(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-?([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
    : /^[v=]*(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  const match = pattern.exec(text);
  if (!match) throw new TypeError("Invalid range version " + text);
  const nums = match
    .slice(1, 4)
    .map((n) => (n === undefined || /[xX*]/.test(n) ? null : Number(n)));
  if (!options.loose)
    for (const n of match.slice(1, 4))
      if (n && /^\d+$/.test(n) && n.length > 1 && n[0] === "0")
        throw new TypeError("Leading zero in range");
  for (let i = 0; i < 3; i++) {
    if (nums[i] !== null && nums[i] > Number.MAX_SAFE_INTEGER)
      throw new TypeError("Invalid range component");
    if (i && nums[i - 1] === null && nums[i] !== null)
      throw new TypeError("Numeric component after wildcard");
  }
  if (match[4] && match[3] === undefined)
    throw new TypeError("Suffix needs three components");
  if (nums[2] !== null) new v.SemVer(text.split("+")[0], options);
  return {
    nums,
    pre: nums[2] === null ? "" : match[4] || "",
    build: match[5] || "",
  };
}
const base = (p) =>
  p.nums.map((n) => n ?? 0).join(".") + (p.pre ? "-" + p.pre : "");
function expand(token, options) {
  if (!token) return [""];
  if (/^(?:[~^](?:>)?)?\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*$/.test(token))
    return [""];
  const m = /^(\^|~>|~|<=|>=|<|>|=)?(.*)$/.exec(token),
    op = m[1] || "",
    p = partial(m[2], options);
  const [a, b, c] = p.nums,
    pre = options.includePrerelease ? "-0" : "";
  if (a === null) return op === ">" || op === "<" ? ["<0.0.0-0"] : [""];
  const start = base(p);
  if (op === "^") {
    const upper =
      a > 0
        ? [a + 1, 0, 0]
        : b === null
          ? [1, 0, 0]
          : b > 0
            ? [0, b + 1, 0]
            : c === null
              ? [0, 1, 0]
              : [0, 0, c + 1];
    return [
      ">=" + start + (p.pre || c !== null ? "" : pre),
      "<" + upper.join(".") + "-0",
    ];
  }
  if (op === "~" || op === "~>")
    return [
      ">=" + start + (p.pre || c !== null ? "" : pre),
      "<" + (b === null ? [a + 1, 0, 0] : [a, b + 1, 0]).join(".") + "-0",
    ];
  if (b !== null && c !== null) return [(op === "=" ? "" : op) + start];
  const upper = (b === null ? [a + 1, 0, 0] : [a, b + 1, 0]).join(".");
  if (op === ">") return [">=" + upper + pre];
  if (op === ">=") return [">=" + start + pre];
  if (op === "<") return ["<" + start + "-0"];
  if (op === "<=") return ["<" + upper + "-0"];
  return [">=" + start + pre, "<" + upper + "-0"];
}
function parseSet(input, options) {
  const hyphen = input.trim().match(/^(\S+)\s+-\s+(\S+)$/);
  let tokens;
  if (hyphen) {
    const a = partial(hyphen[1], options),
      b = partial(hyphen[2], options),
      pre = options.includePrerelease ? "-0" : "";
    tokens = [];
    if (a.nums[0] !== null) tokens.push(">=" + base(a) + (a.pre ? "" : pre));
    if (b.nums[0] !== null) {
      if (b.nums[1] === null) tokens.push("<" + (b.nums[0] + 1) + ".0.0-0");
      else if (b.nums[2] === null)
        tokens.push("<" + b.nums[0] + "." + (b.nums[1] + 1) + ".0-0");
      else
        tokens.push(
          options.includePrerelease && !b.pre
            ? "<" + [b.nums[0], b.nums[1], b.nums[2] + 1].join(".") + "-0"
            : "<=" + base(b),
        );
    }
  } else {
    const compact = input
      .replace(/(\S+)=\s+/g, (all, prefix) =>
        prefix.endsWith("=") || /^[<>]v$/.test(prefix) ? all : prefix + "=",
      )
      .replace(/(^|\s)(\+\S+)\s+=\s*/g, "$1$2= ")
      .replace(/(^|\s)(~>|~|\^)\s+(?=\+)/g, "$1$2")
      .replace(/(^|\s)(<=|>=|<|>|=|\^|~>|~)\s+(?=[v0-9*xX])/g, "$1$2");
    tokens = [];
    for (const token of compact.trim().split(/\s+/)) {
      try {
        tokens.push(...expand(token, options));
      } catch (e) {
        if (!options.loose) throw e;
      }
    }
  }
  if (hyphen && !tokens.length) tokens.push("");
  if (!tokens.length) throw new TypeError("Invalid range");
  const values = [...new Set(tokens)].filter(
    (x) =>
      !(x === ">=0.0.0-0" && options.includePrerelease) &&
      !(x === ">=0.0.0" && !options.includePrerelease),
  );
  if (values.includes("<0.0.0-0")) return [new Comparator("<0.0.0-0", options)];
  const useful = values.filter(Boolean);
  return (useful.length ? useful : [""]).map((x) => new Comparator(x, options));
}
function Range(input, options) {
  if (!(this instanceof Range)) return new Range(input, options);
  this.options = v.normalize(options);
  this.loose = !!this.options.loose;
  this.includePrerelease = !!this.options.includePrerelease;
  if (input instanceof Range) {
    if (
      input.loose === this.loose &&
      input.includePrerelease === this.includePrerelease
    )
      return input;
    input = input.raw;
  }
  if (input instanceof Comparator) input = input.value;
  if (typeof input !== "string") throw new TypeError("Invalid range");
  this.raw = input.trim().replace(/\s+/g, " ");
  const key = cacheKey(input, this.options);
  if (compiled.has(key)) {
    const saved = compiled.get(key);
    if (saved === null) throw new TypeError("Invalid range");
    this.set = copySet(saved.set, this.options);
    this.range = saved.range;
    return;
  }
  this.set = [];
  for (const part of input.split("||"))
    try {
      this.set.push(parseSet(part, this.options));
    } catch (e) {
      if (!this.loose) throw e;
    }
  if (!this.set.length) throw new TypeError("Invalid range");
  if (this.set.length > 1) {
    this.set = this.set.filter((s) => s[0].value !== "<0.0.0-0");
    if (!this.set.length)
      this.set = [[new Comparator("<0.0.0-0", this.options)]];
    if (this.set.some((s) => s.length === 1 && s[0].semver === ANY))
      this.set = [[new Comparator("", this.options)]];
  }
  this.format();
  const snapshot = Object.create(Range.prototype);
  Object.assign(snapshot, this, { options: { ...this.options } });
  snapshot.set = copySet(this.set, snapshot.options);
  remember(key, snapshot);
}
Range.prototype.format = function () {
  this.range = this.set
    .map((s) => s.map((c) => c.value).join(" "))
    .join("||")
    .trim();
  return this.range;
};
Range.prototype.toString = function () {
  return this.range;
};
function testSet(set, version, options) {
  if (!set.every((c) => c.test(version))) return false;
  if (!version.prerelease.length || options.includePrerelease) return true;
  return set.some(
    (c) =>
      c.semver !== ANY &&
      c.semver.prerelease.length &&
      c.semver.compareMain(version) === 0,
  );
}
Range.prototype.test = function (input) {
  const version = v.parse(input, this.options);
  return !!version && this.set.some((s) => testSet(s, version, this.options));
};
function intersection(a, b, options) {
  const all = [...a, ...b];
  const exact = all.find((c) => c.semver !== ANY && !c.operator);
  if (exact) return all.every((c) => c.test(exact.semver));
  let lower, upper;
  for (const c of all) {
    if (c.semver === ANY) continue;
    if (c.operator.startsWith(">")) {
      if (
        !lower ||
        v.gt(c.semver, lower.semver) ||
        (v.eq(c.semver, lower.semver) && c.operator === ">")
      )
        lower = c;
    } else if (
      !upper ||
      v.lt(c.semver, upper.semver) ||
      (v.eq(c.semver, upper.semver) && c.operator === "<")
    )
      upper = c;
  }
  if (
    !options.includePrerelease &&
    upper?.operator === "<" &&
    v.lte(upper.semver, zero)
  )
    return false;
  return (
    !lower ||
    !upper ||
    v.lt(lower.semver, upper.semver) ||
    (v.eq(lower.semver, upper.semver) &&
      lower.operator === ">=" &&
      upper.operator === "<=")
  );
}
Range.prototype.intersects = function (other, options) {
  if (!(other instanceof Range)) throw new TypeError("Expected a Range");
  const opts = v.normalize(options);
  return this.set.some((a) => other.set.some((b) => intersection(a, b, opts)));
};
Comparator.prototype.intersects = function (other, options) {
  if (!(other instanceof Comparator))
    throw new TypeError("Expected a Comparator");
  return intersection([this], [other], v.normalize(options));
};
// Convenience calls share only private compiled ranges. Public Range instances
// stay mutable without exposing or modifying this bounded cache.
const compiled = new Map();
function cacheKey(range, opts) {
  return (
    (opts.loose ? "l" : "s") + (opts.includePrerelease ? "p" : "r") + range
  );
}
function remember(key, value) {
  if (compiled.size >= 256) compiled.delete(compiled.keys().next().value);
  compiled.set(key, value);
}
function copySet(set, options) {
  return set.map((group) =>
    group.map((comparator) => {
      const copy = Object.assign(
        Object.create(Comparator.prototype),
        comparator,
        { options },
      );
      if (comparator.semver !== ANY) {
        const version = comparator.semver;
        copy.semver = Object.assign(
          Object.create(v.SemVer.prototype),
          version,
          {
            options,
            prerelease: version.prerelease.slice(),
            build: version.build.slice(),
          },
        );
      }
      return copy;
    }),
  );
}
function compile(range, options) {
  if (typeof range !== "string") return new Range(range, options);
  const key = cacheKey(range, v.normalize(options));
  if (!compiled.has(key))
    try {
      new Range(range, options);
    } catch (error) {
      remember(key, null);
      throw error;
    }
  const saved = compiled.get(key);
  if (saved === null) throw new TypeError("Invalid range");
  return saved;
}
const satisfies = (version, range, options) => {
  try {
    return compile(range, options).test(version);
  } catch {
    return false;
  }
};
const validRange = (range, options) => {
  try {
    return compile(range, options).range || "*";
  } catch {
    return null;
  }
};
const intersects = (a, b, options) =>
  compile(a, options).intersects(compile(b, options), options);
const toComparators = (range, options) =>
  new Range(range, options).set.map((s) => s.map((c) => c.value));
function select(versions, range, options, maximum) {
  let parsed;
  try {
    parsed = new Range(range, options);
  } catch {
    return null;
  }
  let chosen = null;
  for (const version of versions)
    if (
      parsed.test(version) &&
      (chosen === null ||
        (maximum
          ? v.gt(version, chosen, options)
          : v.lt(version, chosen, options)))
    )
      chosen = version;
  return chosen;
}
module.exports = {
  Comparator,
  Range,
  satisfies,
  validRange,
  intersects,
  toComparators,
  maxSatisfying: (vs, r, o) => select(vs, r, o, true),
  minSatisfying: (vs, r, o) => select(vs, r, o, false),
};
