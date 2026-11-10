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
function word(code) { return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95 || code === 45; }
function letter(code) { return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95; }
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
    const c = text[i], code = text.charCodeAt(i);
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
    const boundary = i === 0 || !word(text.charCodeAt(i - 1));
    if (boundary && (code === 117 || code === 85) && /^url\(/i.test(text.slice(i))) {
      end = endFunction(text, i + 3);
      opaque.push(text.slice(i, end));
      i = end;
      continue;
    }
    if (boundary && code === 118 && text.startsWith("var(", i)) {
      end = endFunction(text, i + 3);
      value = text.slice(i, end);
      type = "var";
    } else if (boundary && (code === 114 || code === 82 || code === 104 || code === 72) && /^(?:rgba?|hsla?)\(/i.test(text.slice(i))) {
      const opening = text.indexOf("(", i);
      end = endFunction(text, opening);
      value = color.parse(text.slice(i, end));
      type = "color";
    } else if (boundary && (code === 116 || code === 84) && /^transparent(?![\w-])/i.test(text.slice(i))) {
      end = i + 11;
      value = color.parse("transparent");
      type = "color";
    } else if (c === "#" && hex.test(text.slice(i))) {
      const match = hex.exec(text.slice(i))[0];
      end = i + match.length;
      value = color.parse(match);
      type = "color";
    } else if (((code >= 48 && code <= 57) || code === 43 || code === 45 || code === 46) && (boundary || !letter(text.charCodeAt(i - 1)))) {
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
      if (letter(code)) {
        i++;
        while (i < text.length && word(text.charCodeAt(i))) i++;
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
    syntaxSlot = (syntaxSlot + 1) & 1;
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
    starts = [], deltas = [], mixers = [], split = y.split, types = y.types;
  for (let i = 0; i < types.length; i++) {
    const type = types[i], origin = x.values[x.indexes[type][used[type]++]];
    if (type === "number") { starts[i] = origin; deltas[i] = y.values[i] - origin; }
    else mixers[i] = type === "color" ? mixColor(origin, y.values[i]) : mixImmediate(origin, y.values[i]);
  }
  // Common two/three-dimensional shadows have numeric lengths followed by one
  // color. Specialize this shape without changing the generic CSS grammar.
  if ((types.length === 3 || types.length === 4) && types.at(-1) === "color" && types.slice(0,-1).every(type => type === "number")) {
    const a = starts[0], da = deltas[0], b = starts[1], db = deltas[1],
      c = starts[2], dc = deltas[2], colorAt = mixers[types.length - 1],
      s0 = split[0], s1 = split[1], s2 = split[2], s3 = split[3], s4 = split[4];
    return types.length === 3 ? p => {
      progress(p);
      return s0 + round(a + da*p) + s1 + round(b + db*p) + s2 + colorAt(p) + s3;
    } : p => {
      progress(p);
      return s0 + round(a + da*p) + s1 + round(b + db*p) + s2 + round(c + dc*p) + s3 + colorAt(p) + s4;
    };
  }
  return (p) => {
    progress(p);
    let result = split[0];
    for (let i = 0; i < types.length; i++)
      result += (types[i] === "number" ? round(starts[i] + deltas[i] * p) : mixers[i](p)) + split[i + 1];
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

Object.defineProperty(module.exports, "readFunctionEnd", {
  value: endFunction,
});
