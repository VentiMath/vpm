"use strict";
// Source spans, rather than placeholders, keep quoted and commented CSS opaque.
function opaqueEnd(s, i) {
  const c = s[i];
  if (c === '"' || c === "'") {
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === "\\") j++;
      else if (s[j] === c) return j + 1;
    }
    return s.length;
  }
  if (c === "/" && s[i + 1] === "*") {
    const end = s.indexOf("*/", i + 2);
    return end < 0 ? s.length : end + 2;
  }
  return i;
}
function balancedEnd(s, i) {
  let depth = 1;
  for (let j = i + 1; j < s.length; j++) {
    const end = opaqueEnd(s, j);
    if (end !== j) {
      j = end - 1;
      continue;
    }
    if (s[j] === "\\") j++;
    else if (s[j] === "(") depth++;
    else if (s[j] === ")" && --depth === 0) return j + 1;
  }
  return s.length;
}
function replaceSpans(s, edits) {
  if (!edits.length) return s;
  edits.sort((a, b) => a[0] - b[0]);
  let out = "",
    start = 0;
  for (const [a, b, value] of edits) {
    out += s.slice(start, a) + value;
    start = b;
  }
  return out + s.slice(start);
}
const directions = {
  left: "right",
  right: "left",
  ltr: "rtl",
  rtl: "ltr",
  "w-resize": "e-resize",
  "e-resize": "w-resize",
  "nw-resize": "ne-resize",
  "ne-resize": "nw-resize",
  "sw-resize": "se-resize",
  "se-resize": "sw-resize",
  "nwse-resize": "nesw-resize",
  "nesw-resize": "nwse-resize",
};
function caseLike(word, replacement) {
  return word === word.toUpperCase() ? replacement.toUpperCase() : replacement;
}
function urlWords(s, options) {
  return s.replace(
    /(^|[^a-z0-9])(left|right|ltr|rtl)(?=$|[^a-z0-9])/gi,
    (all, prefix, word) => {
      const low = word.toLowerCase();
      return (
        prefix +
        ((low === "left" || low === "right" ? options.edge : options.dir)
          ? caseLike(word, directions[low])
          : word)
      );
    },
  );
}
// Keywords are changed only as complete CSS identifiers. Strings, escaped
// identifiers and URL payloads cannot accidentally become CSS instructions.
function keywords(s, options) {
  if (!/(?:left|right|ltr|rtl|resize)/i.test(s)) return s;
  const edits = [],
    scan = /["']|\/\*|[-\w\\\u0080-\uffff]+/g;
  let match;
  while ((match = scan.exec(s))) {
    const start = match.index,
      end = opaqueEnd(s, start);
    if (end !== start) {
      scan.lastIndex = end;
      continue;
    }
    const word = match[0],
      low = word.toLowerCase();
    if (word.includes("\\")) continue;
    if (low === "url" && s[scan.lastIndex] === "(") {
      const open = scan.lastIndex,
        stop = balancedEnd(s, open);
      if (options.dir || options.edge)
        edits.push([
          open + 1,
          stop - 1,
          urlWords(s.slice(open + 1, stop - 1), options),
        ]);
      scan.lastIndex = stop;
    } else if (Object.hasOwn(directions, low))
      edits.push([start, scan.lastIndex, caseLike(word, directions[low])]);
  }
  return replaceSpans(s, edits);
}
function tokens(s) {
  const result = [];
  if (!/[('"\\]|\/\*/.test(s)) {
    const scan = /[^\s,/]+|[,/]/g;
    let m;
    while ((m = scan.exec(s)))
      result.push({ a: m.index, b: scan.lastIndex, text: m[0] });
    return result;
  }
  for (let i = 0; i < s.length; ) {
    if (/\s/.test(s[i])) {
      i++;
      continue;
    }
    if (s[i] === "/" && s[i + 1] === "*") {
      i = opaqueEnd(s, i);
      continue;
    }
    const start = i;
    if (s[i] === "," || s[i] === "/") i++;
    else {
      while (i < s.length && !/[\s,\/]/.test(s[i])) {
        const end = opaqueEnd(s, i);
        if (end !== i) i = end;
        else if (s[i] === "(") i = balancedEnd(s, i);
        else if (s[i] === "\\") i += 2;
        else i++;
      }
    }
    result.push({ a: start, b: i, text: s.slice(start, i) });
  }
  return result;
}
const numeric = /^[+-]?(?:\d*\.\d+|\d+)(?:[a-z]+|%)?$/i;
function negate(s) {
  return parseFloat(s) === 0
    ? s
    : s[0] === "-"
      ? s.slice(1)
      : "-" + (s[0] === "+" ? s.slice(1) : s);
}
function value(s, prop, options) {
  s = keywords(s, options);
  const base = prop.replace(/^-(?:webkit|moz|ms|o)-/, "");
  if (
    !/^(?:margin|padding|inset|border-(?:color|width|style|radius)|(?:box|text)-shadow|transform|background(?:-position(?:-x)?)?)$/.test(
      base,
    )
  )
    return s;
  const all = tokens(s),
    edits = [];
  const important = all.findIndex((t) => t.text[0] === "!");
  const ts = important < 0 ? all : all.slice(0, important);
  const set = (t, text) => {
    if (t.text !== text) edits.push([t.a, t.b, text]);
  };
  if (/^(?:margin|padding|inset|border-(?:color|width|style))$/.test(base)) {
    if (ts.length === 4 && !ts.some((t) => t.text === "," || t.text === "/")) {
      set(ts[1], ts[3].text);
      set(ts[3], ts[1].text);
    }
  } else if (base === "border-radius") {
    let start = 0;
    for (let i = 0; i <= ts.length; i++)
      if (i === ts.length || ts[i].text === "/") {
        const group = ts.slice(start, i),
          n = group.length;
        if (n === 2 || n === 4) {
          set(group[0], group[1].text);
          set(group[1], group[0].text);
          if (n === 4) {
            set(group[2], group[3].text);
            set(group[3], group[2].text);
          }
        } else if (n === 3) {
          set(group[0], group[1].text);
          set(group[1], group[0].text);
          set(group[2], group[1].text + " " + group[2].text);
        }
        start = i + 1;
      }
  } else if (base.endsWith("shadow")) {
    let found = false;
    for (const t of ts) {
      if (t.text === ",") found = false;
      else if (!found && numeric.test(t.text)) {
        set(t, negate(t.text));
        found = true;
      }
    }
  } else if (base === "transform") {
    for (const t of ts) {
      const m = /^(translate(?:X|3d)?)\((.*)\)$/is.exec(t.text);
      if (!m) continue;
      const args = tokens(m[2]);
      if (
        args.length &&
        numeric.test(args[0].text) &&
        args.filter((x) => x.text === ",").length < 3
      ) {
        const n = args[0];
        set(
          t,
          t.text.slice(0, m[1].length + 1 + n.a) +
            negate(n.text) +
            t.text.slice(m[1].length + 1 + n.b),
        );
      }
    }
  } else {
    let positionSeen = false,
      size = false;
    for (const t of ts) {
      if (t.text === ",") {
        positionSeen = false;
        size = false;
        continue;
      }
      if (t.text === "/") {
        size = true;
        continue;
      }
      if (size || positionSeen) continue;
      if (/^[+-]?(?:\d*\.\d+|\d+)%$/.test(t.text)) {
        const dot = t.text.indexOf("."),
          digits = dot < 0 ? 0 : t.text.length - dot - 2;
        // Decimal precision is bounded by the input length, without toFixed's
        // 100-place limit or binary floating-point rounding of CSS decimals.
        const match = /^([+-]?)(\d*)(?:\.(\d+))?%$/.exec(t.text);
        const scale = 10n ** BigInt(digits),
          magnitude = BigInt((match[2] || "0") + (match[3] || ""));
        const out = 100n * scale - (match[1] === "-" ? -magnitude : magnitude);
        let text = (out < 0 ? -out : out).toString().padStart(digits + 1, "0");
        if (digits) text = text.slice(0, -digits) + "." + text.slice(-digits);
        set(t, (out < 0 ? "-" : "") + text + "%");
        positionSeen = true;
      } else if (
        numeric.test(t.text) ||
        /^(?:left|right|top|bottom|center|calc\(|var\()/i.test(t.text)
      )
        positionSeen = true;
    }
  }
  return replaceSpans(s, edits);
}
function declaration(s, options) {
  // Leading comments are retained, but ignored when locating a property name.
  let start = 0;
  while (start < s.length) {
    if (/\s/.test(s[start])) {
      start++;
      continue;
    }
    if (s[start] === "/" && s[start + 1] === "*") {
      start = opaqueEnd(s, start);
      continue;
    }
    break;
  }
  const m = /^([-a-zA-Z][\w-]*)(\s*):/.exec(s.slice(start));
  if (!m) return options.edge || options.dir ? keywordsUrls(s, options) : s;
  const prop = m[1],
    low = prop.toLowerCase();
  if (low.startsWith("--")) return s;
  const name = prop.replace(
    /(^|-)(left|right)(?=-|$)/gi,
    (_, prefix, w) => prefix + caseLike(w, directions[w.toLowerCase()]),
  );
  const offset = start + m[0].length;
  return (
    s.slice(0, start) + name + m[2] + ":" + value(s.slice(offset), low, options)
  );
}
function keywordsUrls(s, options) {
  const edits = [];
  for (let i = 0; i < s.length; ) {
    const end = opaqueEnd(s, i);
    if (end !== i) {
      i = end;
      continue;
    }
    if (
      (i === 0 || !/[-\w]/.test(s[i - 1])) &&
      s.slice(i, i + 4).toLowerCase() === "url("
    ) {
      const stop = balancedEnd(s, i + 3);
      edits.push([
        i + 4,
        stop - 1,
        urlWords(s.slice(i + 4, stop - 1), options),
      ]);
      i = stop;
    } else i++;
  }
  return replaceSpans(s, edits);
}
function transform(css, options = {}, legacyEdge) {
  if (typeof css !== "string") throw new TypeError("CSS must be a string");
  const flags =
    typeof options === "boolean"
      ? { dir: options, edge: !!legacyEdge }
      : {
          dir: !!options?.transformDirInUrl,
          edge: !!options?.transformEdgeInUrl,
        };
  let out = "",
    start = 0,
    skip = false,
    noflip = false;
  const stack = [];
  const scan = /["'\/\\({};]/g;
  let match;
  while ((match = scan.exec(css))) {
    let i = match.index;
    const end = opaqueEnd(css, i);
    if (end !== i) {
      if (css[i] === "/" && /@noflip\b/.test(css.slice(i, end))) noflip = true;
      scan.lastIndex = end;
      continue;
    }
    if (css[i] === "\\") {
      scan.lastIndex = i + 2;
      continue;
    }
    if (css[i] === "(") {
      scan.lastIndex = balancedEnd(css, i);
      continue;
    }
    const c = css[i];
    if (c === "{") {
      out += css.slice(start, i + 1);
      start = i + 1;
      stack.push(skip);
      skip ||= noflip;
      noflip = false;
    } else if (c === ";" || c === "}") {
      const text = css.slice(start, i);
      out += (skip || noflip ? text : declaration(text, flags)) + c;
      start = i + 1;
      noflip = false;
      if (c === "}") skip = stack.pop() || false;
    }
  }
  const tail = css.slice(start);
  return out + (skip || noflip ? tail : declaration(tail, flags));
}
module.exports = { transform };
