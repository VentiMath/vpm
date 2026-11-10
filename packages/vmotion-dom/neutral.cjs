"use strict";
const { complex, analyseComplexValue, readFunctionEnd } = require("./mix.cjs");
const { color } = require("./color.cjs");
const oneFilters = new Set(["brightness", "contrast", "saturate", "opacity"]);
const zeroFilters = new Set([
  "blur",
  "hue-rotate",
  "grayscale",
  "invert",
  "sepia",
]);
const lengths = new Set(
  "px em rem ex rex ch rch cap rcap ic ric lh rlh vw vh vi vb vmin vmax svw svh svi svb svmin svmax lvw lvh lvi lvb lvmin lvmax dvw dvh dvi dvb dvmin dvmax cm mm q in pt pc".split(
    " ",
  ),
);
const neutral = (v) =>
  v === 0 || (typeof v === "string" && /^(?:none|0)$/i.test(v.trim()));
const numeric = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i;
function functions(value, visit) {
  let i = 0,
    out = [];
  while (i < value.length) {
    while (/\s/.test(value[i] || "") && i < value.length) i++;
    if (i === value.length) break;
    const match = /^([a-z][\w-]*)\(/i.exec(value.slice(i));
    if (!match) throw new TypeError("expected CSS function list");
    const open = i + match[0].length - 1,
      end = readFunctionEnd(value, open);
    out.push(
      visit(match[1], value.slice(open + 1, end - 1), value.slice(i, end)),
    );
    i = end;
  }
  return out.join(" ");
}
function filterValue(value, empty, getColor) {
  if (typeof value !== "string")
    throw new TypeError("filter requires a string");
  if (neutral(value)) return "none";
  // URL filters cannot be given a synthetic neutral. Keep references opaque.
  let opaque = false;
  const result = functions(value, (raw, body, whole) => {
    const name = raw.toLowerCase(),
      arg = body.trim();
    if (name === "url") {
      opaque = true;
      return whole;
    }
    if (name === "drop-shadow") {
      let info = analyseComplexValue(arg);
      if (
        info.indexes.number.length < 2 ||
        info.indexes.number.length > 3 ||
        info.indexes.color.length > 1 ||
        info.indexes.var.length
      )
        throw new TypeError(
          "drop-shadow requires two or three lengths and an explicit supported color",
        );
      // Every non-value span must contain only a length unit or whitespace.
      if (info.split.some((s) => !/^\s*(?:[a-z]+\s*)?$/i.test(s)))
        throw new TypeError("unsupported drop-shadow syntax");
      if (
        info.indexes.number.length === 3 &&
        info.values[info.indexes.number[2]] < 0
      )
        throw new TypeError("drop-shadow blur cannot be negative");
      for (const index of info.indexes.number) {
        const unit = /^([a-z]*)/i.exec(info.split[index + 1])[1].toLowerCase();
        if (!lengths.has(unit) && !(unit === "" && info.values[index] === 0))
          throw new TypeError("invalid drop-shadow length unit");
      }
      let source = arg;
      if (!info.indexes.color.length) {
        if (empty) source += " rgba(0, 0, 0, 0)";
        else {
          const fallback = getColor?.();
          if (!color.test(fallback))
            throw new TypeError(
              "drop-shadow without a color requires a DOM color",
            );
          source += " " + color.transform(color.parse(fallback));
        }
      }
      return `${raw}(${empty ? complex.getAnimatableNone(source) : source})`;
    }
    if (!oneFilters.has(name) && !zeroFilters.has(name))
      throw new TypeError("unsupported filter function: " + name);
    const defaults =
      name === "blur" ? "0px" : name === "hue-rotate" ? "0deg" : "1";
    const match = numeric.exec(arg || defaults);
    if (!match || !Number.isFinite(Number(match[1])))
      throw new TypeError("filter amount must be finite");
    const n = Number(match[1]),
      unit = match[2].toLowerCase();
    if (
      name === "hue-rotate"
        ? !["deg", "grad", "rad", "turn"].includes(unit) &&
          !(unit === "" && n === 0)
        : name === "blur"
          ? (!lengths.has(unit) && !(unit === "" && n === 0)) || n < 0
          : !["", "%"].includes(unit) || n < 0
    )
      throw new TypeError("invalid filter amount or unit");
    const identity = oneFilters.has(name) ? (unit === "%" ? 100 : 1) : 0;
    return `${raw}(${empty ? identity + match[2] : arg || defaults})`;
  });
  return empty && opaque ? "none" : result;
}
function transformNone(value) {
  return functions(value, (raw, body) => {
    const name = raw.toLowerCase(),
      info = analyseComplexValue(body);
    if (info.types.some((t) => t !== "number"))
      throw new TypeError(
        "neutral transforms require resolved numeric components",
      );
    let values = info.values.map(() => 0);
    if (/^scale(?:[xyz]|3d)?$/.test(name)) values.fill(1);
    else if (name === "matrix" || name === "matrix3d") {
      const size = name === "matrix" ? 6 : 16;
      if (values.length !== size)
        throw new TypeError("invalid transform matrix");
      for (const i of name === "matrix" ? [0, 3] : [0, 5, 10, 15])
        values[i] = 1;
    } else if (name === "rotate3d") {
      if (values.length !== 4) throw new TypeError("invalid rotate3d");
      values = info.values.slice();
      values[3] = 0;
    } else if (
      !/^(?:translate(?:[xyz]|3d)?|rotate[xyz]?|skew[xy]?)$/.test(name)
    )
      throw new TypeError("unsupported neutral transform: " + name);
    return `${raw}(${complex.createTransformer(body)(values)})`;
  });
}
function buildNone(key, value) {
  if (key === "filter" || key === "backdropFilter")
    return filterValue(value, true);
  if (key === "transform") return transformNone(value);
  return complex.getAnimatableNone(value);
}
const noneKeys = [],
  noneValues = [],
  noneResults = [];
let noneSlot = 0;
function getAnimatableNone(key, value) {
  if (typeof key !== "string" || typeof value !== "string")
    throw new TypeError("neutral values require property and value strings");
  for (let i = 0; i < noneValues.length; i++)
    if (noneKeys[i] === key && noneValues[i] === value) return noneResults[i];
  const result = buildNone(key, value);
  if (value.length <= 4096) {
    noneKeys[noneSlot] = key;
    noneValues[noneSlot] = value;
    noneResults[noneSlot] = result;
    noneSlot = (noneSlot + 1) & 7;
  }
  return result;
}
function resolveNeutralFrames(key, frames, getColor) {
  const filters = key === "filter" || key === "backdropFilter";
  if (filters)
    for (let i = 0; i < frames.length; i++)
      if (typeof frames[i] === "string" && !neutral(frames[i]))
        frames[i] = filterValue(frames[i], false, getColor);
  if (!frames.some(neutral)) return false;
  if (
    frames.every(neutral) &&
    frames.some(
      (v) => typeof v === "string" && v.trim().toLowerCase() === "none",
    )
  ) {
    frames.fill("none");
    return false;
  }
  const source = frames.find(
    (v) => typeof v === "string" && !neutral(v) && complex.test(v),
  );
  if (source === undefined) return false;
  const empty = getAnimatableNone(key, source);
  if (empty === "none") return false;
  for (let i = 0; i < frames.length; i++)
    if (neutral(frames[i])) frames[i] = empty;
  return true;
}
module.exports = { getAnimatableNone };
Object.defineProperties(module.exports, {
  resolveNeutralFrames: { value: resolveNeutralFrames },
  filterValue: { value: filterValue },
});
