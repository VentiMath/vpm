"use strict";
const header = "sourceMappingURL=";
const mime = "data:application/json;charset=utf-8";
function inlinePattern() {
  // Public capture positions are part of the converter API.
  return /^\s*\/[/*][#@]\s+sourceMappingURL=data:(((?:text|application)\/json)(?:;charset=([^;,\r\n]+)?)?)?(?:;(base64))?,([^\r\n\u2028\u2029]*)$/gm;
}
function externalPattern() {
  return /\/\/[#@][ \t]+sourceMappingURL=([^\s'"\x60]+)[ \t]*$|\/\*[#@][ \t]+sourceMappingURL=([^*\r\n]+?)[ \t]*\*\/[ \t]*$/gm;
}
function annotate(url, options) {
  return options?.multiline
    ? "/*# " + header + url + " */"
    : "//# " + header + url;
}
function encode(text) {
  if (typeof Buffer !== "undefined")
    return Buffer.from(text).toString("base64");
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function decode(data) {
  if (typeof Buffer !== "undefined")
    return Buffer.from(data, "base64").toString("utf8");
  return new TextDecoder().decode(
    Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
  );
}
class Converter {
  constructor(map) {
    this.sourcemap = map;
  }
  toJSON(space) {
    return JSON.stringify(this.sourcemap, null, space);
  }
  toObject() {
    return JSON.parse(this.toJSON());
  }
  toBase64() {
    return encode(this.toJSON());
  }
  toURI() {
    return encodeURIComponent(this.toJSON());
  }
  toComment(options) {
    return annotate(
      mime +
        (options?.encoding === "uri"
          ? "," + this.toURI()
          : ";base64," + this.toBase64()),
      options,
    );
  }
  getProperty(key) {
    return this.sourcemap[key];
  }
  setProperty(key, value) {
    if (Object.hasOwn(this.sourcemap, key)) this.sourcemap[key] = value;
    else
      Object.defineProperty(this.sourcemap, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    return this;
  }
  addProperty(key, value) {
    if (Object.hasOwn(this.sourcemap, key))
      throw Error('property "' + key + '" already exists on the sourcemap, use set property instead');
    return this.setProperty(key, value);
  }
}
const fromObject = (map) => new Converter(map);
const fromJSON = (json) =>
  fromObject(
    JSON.parse(
      typeof json === "string" ? json : new TextDecoder().decode(json),
    ),
  );
const fromURI = (uri) => fromJSON(decodeURIComponent(uri));
const fromBase64 = (data) => fromJSON(decode(data));
function fromComment(comment) {
  const separator = comment.indexOf(",");
  if (separator < 0) return fromURI(comment);
  const prefix = comment.slice(0, separator);
  let payload = comment.slice(separator + 1);
  if (prefix.trimStart().startsWith("/*"))
    payload = payload.replace(/\s*\*\/\s*$/, "");
  return prefix.endsWith(";base64") ? fromBase64(payload) : fromURI(payload);
}
function lastMatch(source, pattern) {
  if (!source.includes(header)) return null;
  let last = null,
    match;
  while ((match = pattern.exec(source)) !== null) last = match;
  return last;
}
function fromSource(source) {
  const match = lastMatch(source, inlinePattern());
  return match ? fromComment(match[0]) : null;
}
function read(filename, reader) {
  if (typeof reader !== "function")
    throw new TypeError("Expected a source map reader function");
  const failed = (cause) => {
    throw new Error("Unable to read source map " + filename, { cause });
  };
  let result;
  try {
    result = reader(filename);
  } catch (cause) {
    return failed(cause);
  }
  return typeof result?.then === "function"
    ? Promise.resolve(result).then(fromJSON, failed)
    : fromJSON(result);
}
function fromMapFileComment(comment, reader) {
  const m = externalPattern().exec(comment);
  if (!m) throw new TypeError("Expected an external source map comment");
  return read(m[1] ?? m[2], reader);
}
function fromMapFileSource(source, reader) {
  if (typeof reader === "string")
    throw new TypeError("Expected a source map reader function");
  const m = lastMatch(source, externalPattern());
  return m ? read(m[1] ?? m[2], reader) : null;
}
const removeComments = (source) => source.replace(inlinePattern(), "");
const removeMapFileComments = (source) => source.replace(externalPattern(), "");
module.exports = {
  fromObject,
  fromJSON,
  fromURI,
  fromBase64,
  fromComment,
  fromSource,
  fromMapFileComment,
  fromMapFileSource,
  removeComments,
  removeMapFileComments,
  generateMapFileComment: annotate,
};
Object.defineProperties(module.exports, {
  commentRegex: { get: inlinePattern },
  mapFileCommentRegex: { get: externalPattern },
});
