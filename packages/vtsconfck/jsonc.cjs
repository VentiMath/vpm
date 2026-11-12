"use strict";
function toJson(input) {
  if (typeof input !== "string")
    throw new TypeError("Configuration text must be a string");
  const source = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  if (!/\/[/*]|,\s*[}\]]/.test(source)) return source;
  const chars = source.split("");
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === "\\") i++;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') {
      quoted = true;
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      chars[i++] = chars[i] = " ";
      while (
        i + 1 < source.length &&
        source[i + 1] !== "\n" &&
        source[i + 1] !== "\r"
      ) {
        i++;
        if (!/\s/.test(source[i])) chars[i] = " ";
      }
    } else if (c === "/" && source[i + 1] === "*") {
      chars[i++] = chars[i] = " ";
      while (++i < source.length) {
        if (source[i] === "*" && source[i + 1] === "/") {
          chars[i++] = chars[i] = " ";
          break;
        }
        if (!/\s/.test(source[i])) chars[i] = " ";
      }
    }
  }
  quoted = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (quoted) {
      if (c === "\\") i++;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      let j = i + 1;
      while (j < chars.length && /\s/.test(chars[j])) j++;
      if (chars[j] === "}" || chars[j] === "]") chars[i] = " ";
    }
  }
  return chars.join("");
}
module.exports = { toJson };
