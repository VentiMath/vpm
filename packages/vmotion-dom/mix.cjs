"use strict";
const { color, mixColor } = require("./color.cjs");
const number = /[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/iy;
const hex = /^#(?:[a-f\d]{8}|[a-f\d]{6}|[a-f\d]{4}|[a-f\d]{3})(?![\w-])/i;
const blocked = new Set(["__proto__", "prototype", "constructor"]);
function progress(p) {
  if (!Number.isFinite(p)) throw new RangeError("mix progress must be finite");
}
function round(n) {
  if (!Number.isFinite(n)) throw new TypeError("mixed values must be finite");
  return Math.abs(n) < 1e16 ? Math.round(n * 1e5) / 1e5 : n;
}
function endFunction(text, start) {
  let depth = 0,
    quote;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (quote) {
      if (c === quote) quote = undefined;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return i + 1;
  }
  throw new TypeError("unclosed CSS function");
}
function scan(source) {
  if (typeof source !== "string" && !Number.isFinite(source))
    throw new TypeError("complex values require a string or finite number");
  const text = String(source),
    values = [],
    split = [],
    indexes = { color: [], number: [], var: [] },
    types = [],
    opaque = [];
  let literal = 0,
    i = 0,
    depth = 0;
  while (i < text.length) {
    const c = text[i],
      rest = text.slice(i);
    let end, value, type;
    if (c === '"' || c === "'") {
      const start = i++;
      let closed = false;
      for (; i < text.length; i++) {
        if (text[i] === "\\") {
          i++;
          continue;
        }
        if (text[i] === c) {
          i++;
          closed = true;
          break;
        }
      }
      if (!closed) throw new TypeError("unclosed CSS string");
      opaque.push(text.slice(start, i));
      continue;
    }
    const boundary = i === 0 || !/[\w-]/.test(text[i - 1]);
    if (boundary && /^url\(/i.test(rest)) {
      end = endFunction(text, i + 3);
      opaque.push(text.slice(i, end));
      i = end;
      continue;
    }
    if (boundary && /^var\(/.test(rest)) {
      end = endFunction(text, i + 3);
      value = text.slice(i, end);
      type = "var";
    } else if (boundary && /^(?:rgba?|hsla?)\(/i.test(rest)) {
      const opening = text.indexOf("(", i);
      end = endFunction(text, opening);
      value = color.parse(text.slice(i, end));
      type = "color";
    } else if (boundary && /^transparent(?![\w-])/i.test(rest)) {
      end = i + 11;
      value = color.parse("transparent");
      type = "color";
    } else if (c === "#" && hex.test(rest)) {
      const match = hex.exec(rest)[0];
      end = i + match.length;
      value = color.parse(match);
      type = "color";
    } else if (boundary || !/[a-zA-Z_]/.test(text[i - 1] || "")) {
      number.lastIndex = i;
      const match = number.exec(text);
      if (match) {
        value = Number(match[0]);
        if (!Number.isFinite(value))
          throw new TypeError("nonfinite CSS number");
        end = number.lastIndex;
        type = "number";
      }
    }
    if (type) {
      split.push(text.slice(literal, i));
      indexes[type].push(values.length);
      values.push(value);
      types.push(type);
      literal = end;
      i = end;
    } else {
      if (/[a-zA-Z_]/.test(c)) {
        i++;
        while (i < text.length && /[\w-]/.test(text[i])) i++;
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")" && --depth < 0)
        throw new TypeError("unbalanced CSS function");
      i++;
    }
  }
  if (depth) throw new TypeError("unclosed CSS function");
  split.push(text.slice(literal));
  return { info: { values, split, indexes, types }, opaque };
}
const syntaxKeys = [],
  syntaxValues = [];
let syntaxSlot = 0;
function tokenize(source) {
  const cacheable = typeof source === "string" && source.length <= 4096;
  if (cacheable) {
    const index = syntaxKeys.indexOf(source);
    if (index !== -1) return syntaxValues[index];
  }
  const parsed = scan(source);
  if (cacheable) {
    syntaxKeys[syntaxSlot] = source;
    syntaxValues[syntaxSlot] = parsed;
    syntaxSlot = (syntaxSlot + 1) & 7;
  }
  return parsed;
}
function analyseComplexValue(value) {
  const info = tokenize(value).info;
  return {
    values: info.values.map((v) => (v && typeof v === "object" ? { ...v } : v)),
    split: info.split.slice(),
    types: info.types.slice(),
    indexes: {
      color: info.indexes.color.slice(),
      number: info.indexes.number.slice(),
      var: info.indexes.var.slice(),
    },
  };
}
const parseComplexValue = (value) => analyseComplexValue(value).values;
function buildTransformer({ split, types }) {
  split = split.slice();
  types = types.slice();
  return (values) => {
    if (values.length !== types.length)
      throw new TypeError("complex component count changed");
    let text = split[0];
    for (let i = 0; i < types.length; i++)
      text +=
        (types[i] === "color"
          ? color.transform(values[i])
          : types[i] === "number"
            ? round(values[i])
            : values[i]) + split[i + 1];
    return text;
  };
}
function createTransformer(value) {
  return buildTransformer(analyseComplexValue(value));
}
function hasComplexValues(value) {
  if (typeof value !== "string") return false;
  return tokenize(value).info.values.length > 0;
}
const complex = {
  test: (value) =>
    typeof value === "string" &&
    Number.isNaN(Number(value)) &&
    hasComplexValues(value),
  parse: parseComplexValue,
  createTransformer,
  getAnimatableNone(value) {
    const info = tokenize(value).info;
    return buildTransformer(info)(
      info.values.map((v, i) =>
        info.types[i] === "number"
          ? 0
          : info.types[i] === "color"
            ? { ...v, alpha: 0 }
            : v,
      ),
    );
  },
};
const invisibleValues = new Set(["none", "hidden"]);
function mixImmediate(a, b) {
  return (p) => {
    progress(p);
    return p <= 0 ? a : b;
  };
}
function mixVisibility(a, b) {
  return (p) => {
    progress(p);
    return invisibleValues.has(a) ? (p <= 0 ? a : b) : p >= 1 ? b : a;
  };
}
function mixComplex(a, b) {
  const from = tokenize(a),
    to = tokenize(b),
    x = from.info,
    y = to.info;
  if (invisibleValues.has(a) || invisibleValues.has(b))
    return mixVisibility(a, b);
  if (
    from.opaque.length !== to.opaque.length ||
    from.opaque.some((v, i) => v !== to.opaque[i]) ||
    x.indexes.color.length !== y.indexes.color.length ||
    x.indexes.var.length !== y.indexes.var.length ||
    x.indexes.number.length < y.indexes.number.length
  )
    return mixImmediate(a, b);
  if (!y.values.length) return mixImmediate(a, b);
  const used = { color: 0, number: 0, var: 0 },
    mixers = y.types.map((type, i) => {
      const origin = x.values[x.indexes[type][used[type]++]];
      return type === "color"
        ? mixColor(origin, y.values[i])
        : type === "var"
          ? mixImmediate(origin, y.values[i])
          : (p) => round(origin + (y.values[i] - origin) * p);
    }),
    split = y.split;
  return (p) => {
    progress(p);
    let result = split[0];
    for (let i = 0; i < mixers.length; i++)
      result += mixers[i](p) + split[i + 1];
    return result;
  };
}
function own(value) {
  if (value && typeof value === "object") {
    if (!color.test(value))
      throw new TypeError("mixed containers support scalar and color values");
    return color.parse(value);
  }
  return value;
}
function mixArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
    throw new TypeError("mix arrays require matching lengths");
  const start = a.map(own),
    end = b.map(own),
    mixers = start.map((v, i) => mix(v, end[i])),
    out = start.slice();
  return (p) => {
    progress(p);
    for (let i = 0; i < out.length; i++) out[i] = mixers[i](p);
    return out;
  };
}
function mixObject(a, b) {
  if (
    !a ||
    !b ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) ||
    Array.isArray(b)
  )
    throw new TypeError("mix objects require records");
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])],
    out = {},
    mixers = [];
  for (const key of keys) {
    if (blocked.has(key)) throw new TypeError("unsafe mixed property");
    out[key] = own(Object.hasOwn(b, key) ? b[key] : a[key]);
    if (Object.hasOwn(a, key) && Object.hasOwn(b, key))
      mixers.push([key, mix(own(a[key]), own(b[key]))]);
  }
  return (p) => {
    progress(p);
    for (const [key, blend] of mixers) out[key] = blend(p);
    return out;
  };
}
function getMixer(value) {
  return typeof value === "number"
    ? numeric
    : color.test(value)
      ? mixColor
      : Array.isArray(value)
        ? mixArray
        : value && typeof value === "object"
          ? mixObject
          : mixComplex;
}
function numeric(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b))
    throw new TypeError("numeric mixing requires finite endpoints");
  return (p) => {
    progress(p);
    return a + (b - a) * p;
  };
}
function mix(a, b, p) {
  if (p !== undefined) return numeric(a, b)(p);
  return getMixer(a)(a, b);
}
module.exports = {
  mix,
  getMixer,
  mixArray,
  mixObject,
  mixComplex,
  mixImmediate,
  mixVisibility,
  invisibleValues,
  complex,
  hasComplexValues,
  analyseComplexValue,
  parseComplexValue,
  buildTransformer,
  createTransformer,
};
