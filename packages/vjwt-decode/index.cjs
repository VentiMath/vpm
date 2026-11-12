"use strict";
class InvalidTokenError extends Error {
  constructor(message) {
    super("Invalid token specified: " + message);
    this.name = "InvalidTokenError";
  }
}
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
function jwtDecode(token, options) {
  if (typeof token !== "string")
    throw new InvalidTokenError("must be a string");
  const header = options?.header === true,
    part = header ? 1 : 2,
    first = token.indexOf(".");
  if (!header && first < 0) throw new InvalidTokenError("missing part #2");
  const start = header ? 0 : first + 1,
    end = token.indexOf(".", start);
  const encoded = token.slice(start, end < 0 ? undefined : end);
  let text;
  try {
    const remainder = encoded.length % 4;
    if (remainder === 1) throw new Error("invalid base64 length");
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    text = atob(
      remainder === 2
        ? normalized + "=="
        : remainder === 3
          ? normalized + "="
          : normalized,
    );
  } catch (error) {
    throw new InvalidTokenError(
      "invalid base64 for part #" + part + " (" + error.message + ")",
    );
  }
  if (/[^\x00-\x7f]/.test(text)) {
    const bytes = new Uint8Array(text.length);
    for (let n = 0; n < text.length; n++) bytes[n] = text.charCodeAt(n);
    // Legacy upstream accepts Latin-1 JSON if the byte sequence is not UTF-8.
    // Preserve that decoding contract; this API never authenticates a token.
    try {
      text = utf8.decode(bytes);
    } catch {}
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new InvalidTokenError(
      "invalid json for part #" + part + " (" + error.message + ")",
    );
  }
}
module.exports = jwtDecode;
module.exports.jwtDecode = jwtDecode;
module.exports.InvalidTokenError = InvalidTokenError;
module.exports.default = jwtDecode;
