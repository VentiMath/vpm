"use strict";
const unit = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(%|deg|rad|grad|turn)?$/i;
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
function finite(value) {
  if (!Number.isFinite(value))
    throw new TypeError("color components must be finite");
  return value;
}
const tidy = (value) => Math.round(value * 1e5) / 1e5;
function component(text, scale = 1) {
  const found = unit.exec(text);
  if (!found || (found[1] && found[1] !== "%"))
    throw new TypeError("invalid color component");
  const value = finite(parseFloat(text));
  return found[1] === "%" ? (value / 100) * scale : value;
}
function hue(text) {
  const found = unit.exec(text);
  if (!found || found[1] === "%") throw new TypeError("invalid hue");
  const n = finite(parseFloat(text));
  return finite(
    n *
      ({ rad: 180 / Math.PI, grad: 0.9, turn: 360 }[found[1]?.toLowerCase()] ??
        1),
  );
}
function parseHex(value) {
  if (
    typeof value !== "string" ||
    !/^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value)
  )
    throw new TypeError("invalid hexadecimal color");
  const raw = value.slice(1),
    text = raw.length < 5 ? [...raw].map((c) => c + c).join("") : raw;
  return {
    red: parseInt(text.slice(0, 2), 16),
    green: parseInt(text.slice(2, 4), 16),
    blue: parseInt(text.slice(4, 6), 16),
    alpha: text.length === 8 ? parseInt(text.slice(6), 16) / 255 : 1,
  };
}
function parse(value) {
  if (value && typeof value === "object") {
    if (Object.hasOwn(value, "red"))
      return {
        red: finite(value.red),
        green: finite(value.green),
        blue: finite(value.blue),
        alpha: finite(value.alpha ?? 1),
      };
    if (Object.hasOwn(value, "hue"))
      return {
        hue: finite(value.hue),
        saturation: finite(value.saturation),
        lightness: finite(value.lightness),
        alpha: finite(value.alpha ?? 1),
      };
  }
  if (typeof value !== "string")
    throw new TypeError("expected a supported color");
  value = value.trim();
  if (value.toLowerCase() === "transparent")
    return { red: 0, green: 0, blue: 0, alpha: 0 };
  if (value[0] === "#") return parseHex(value);
  const match = /^(rgba?|hsla?)\(([^()]*)\)$/i.exec(value);
  if (!match) throw new TypeError("expected hexadecimal, RGB or HSL color");
  const hsl = match[1].toLowerCase().startsWith("hsl"),
    body = match[2].trim(),
    legacy = body.includes(",");
  let parts;
  if (legacy) {
    if (body.includes("/")) throw new TypeError("mixed color separators");
    parts = body.split(/\s*,\s*/);
  } else {
    const separated = body.split(/\s*\/\s*/);
    if (separated.length > 2) throw new TypeError("invalid color alpha");
    parts = separated[0].trim().split(/\s+/);
    if (parts.length !== 3)
      throw new TypeError("expected three color channels");
    if (separated.length === 2) parts.push(separated[1]);
  }
  if (parts.length !== 3 && parts.length !== 4)
    throw new TypeError("expected three color channels and optional alpha");
  const alpha = parts.length === 4 ? component(parts[3]) : 1;
  if (hsl) {
    if (!parts[1].endsWith("%") || !parts[2].endsWith("%"))
      throw new TypeError("HSL saturation and lightness require percentages");
    return {
      hue: hue(parts[0]),
      saturation: component(parts[1], 100),
      lightness: component(parts[2], 100),
      alpha,
    };
  }
  if (
    legacy &&
    parts.slice(0, 3).some((p) => p.endsWith("%")) &&
    !parts.slice(0, 3).every((p) => p.endsWith("%"))
  )
    throw new TypeError("legacy RGB channels require consistent units");
  return {
    red: component(parts[0], 255),
    green: component(parts[1], 255),
    blue: component(parts[2], 255),
    alpha,
  };
}
function hslaToRgba(value) {
  const h = (((finite(value.hue) % 360) + 360) % 360) / 60,
    s = clamp(finite(value.saturation), 0, 100) / 100,
    l = clamp(finite(value.lightness), 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs((h % 2) - 1)),
    m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 1) {
    r = c;
    g = x;
  } else if (h < 2) {
    r = x;
    g = c;
  } else if (h < 3) {
    g = c;
    b = x;
  } else if (h < 4) {
    g = x;
    b = c;
  } else if (h < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    red: Math.round((r + m) * 255),
    green: Math.round((g + m) * 255),
    blue: Math.round((b + m) * 255),
    alpha: finite(value.alpha ?? 1),
  };
}
function rgbTransform({ red, green, blue, alpha = 1 }) {
  return `rgba(${Math.round(clamp(finite(red), 0, 255))}, ${Math.round(clamp(finite(green), 0, 255))}, ${Math.round(clamp(finite(blue), 0, 255))}, ${tidy(clamp(finite(alpha), 0, 1))})`;
}
function hslTransform({ hue, saturation, lightness, alpha = 1 }) {
  return `hsla(${tidy(finite(hue))}, ${tidy(clamp(finite(saturation), 0, 100))}%, ${tidy(clamp(finite(lightness), 0, 100))}%, ${tidy(clamp(finite(alpha), 0, 1))})`;
}
function test(value) {
  try {
    parse(value);
    return true;
  } catch {
    return false;
  }
}
const color = {
  test,
  parse,
  transform(value) {
    if (typeof value === "string") return value;
    return Object.hasOwn(value, "hue")
      ? hslTransform(value)
      : rgbTransform(value);
  },
  getAnimatableNone(value) {
    return color.transform({ ...parse(value), alpha: 0 });
  },
};
const rgba = {
  test(value) {
    try {
      return (
        Object.hasOwn(parse(value), "red") &&
        !(typeof value === "string" && value.trim().startsWith("#"))
      );
    } catch {
      return false;
    }
  },
  parse(value) {
    const c = parse(value);
    if (!Object.hasOwn(c, "red")) throw new TypeError("expected RGB color");
    return c;
  },
  transform: rgbTransform,
};
const hsla = {
  test(value) {
    try {
      return Object.hasOwn(parse(value), "hue");
    } catch {
      return false;
    }
  },
  parse(value) {
    const c = parse(value);
    if (!Object.hasOwn(c, "hue")) throw new TypeError("expected HSL color");
    return c;
  },
  transform: hslTransform,
};
const hex = {
  test: (value) =>
    typeof value === "string" &&
    /^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value),
  parse: parseHex,
  transform: rgbTransform,
};
function mixLinearColor(from, to, p) {
  finite(from);
  finite(to);
  finite(p);
  return Math.sqrt(Math.max(0, from * from + (to * to - from * from) * p));
}
function mixColor(from, to) {
  const start = parse(from),
    end = parse(to),
    a = Object.hasOwn(start, "hue") ? hslaToRgba(start) : start,
    b = Object.hasOwn(end, "hue") ? hslaToRgba(end) : end;
  for (const c of [a, b]) {
    c.red = clamp(c.red, 0, 255);
    c.green = clamp(c.green, 0, 255);
    c.blue = clamp(c.blue, 0, 255);
    c.alpha = clamp(c.alpha, 0, 1);
  }
  const r = a.red * a.red,
    g = a.green * a.green,
    bl = a.blue * a.blue,
    dr = b.red * b.red - r,
    dg = b.green * b.green - g,
    db = b.blue * b.blue - bl,
    da = b.alpha - a.alpha;
  return (p) => {
    finite(p);
    return rgbTransform({
      red: Math.sqrt(Math.max(0, r + dr * p)),
      green: Math.sqrt(Math.max(0, g + dg * p)),
      blue: Math.sqrt(Math.max(0, bl + db * p)),
      alpha: a.alpha + da * p,
    });
  };
}
const rgbUnit = {
  test: (v) => typeof v === "number",
  parse: parseFloat,
  transform: (v) => Math.round(clamp(finite(v), 0, 255)),
};
module.exports = {
  color,
  rgba,
  hsla,
  hex,
  rgbUnit,
  parseHex,
  hslaToRgba,
  mixLinearColor,
  mixColor,
};
