"use strict";

// Split the suffix first. Query strings and fragments can contain literal URLs.
const suffixStart = /[?#]/;
const authority = /^(?:([\w.+-]+:)\/\/|\/\/)([^/]*)(.*)$/s;
function parse(input) {
  const at = input.search(suffixStart);
  let path = at < 0 ? input : input.slice(0, at);
  const suffix = at < 0 ? "" : input.slice(at);
  let scheme = "", host = null;
  if (path.startsWith("file:") && !/^file:\/\/(?![a-z]:)/i.test(path)) {
    path = "/" + path.slice(5).replace(/^\/+/, "");
    scheme = "file:";
    host = "";
  } else if (path.includes("//")) {
    const parts = authority.exec(path);
    if (parts) {
      scheme = parts[1] || "";
      host = parts[2];
      path = parts[3] || "/";
    }
  }
  return { scheme, host, path, suffix };
}

const dotSegment = /(?:^|\/)\.{1,2}(?:\/|$)/;
function normalize(path, rooted) {
  if (!path.includes("//") && !dotSegment.test(path)) return path;
  const out = [];
  let trailing = path.endsWith("/");
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part !== "..") out.push(part);
    else if (out.length && out[out.length - 1] !== "..") {
      out.pop();
    } else if (!rooted) out.push("..");
  }
  if (path.endsWith("/..")) trailing = true;
  return (rooted ? "/" : "") + out.join("/") +
    (trailing && out.length && out[out.length - 1] !== ".." ? "/" : "");
}

function resolve(input, base = "") {
  if (!input && !base) return "";
  const ref = parse(input || "");
  if (base && !ref.scheme) {
    const parent = parse(base);
    ref.scheme = parent.scheme;
    if (ref.host === null) {
      ref.host = parent.host;
      if (!ref.path) {
        ref.path = parent.path;
        if (!ref.suffix) ref.suffix = parent.suffix;
        else if (ref.suffix[0] === "#") ref.suffix = parent.suffix.split("#", 1)[0] + ref.suffix;
      } else if (ref.path[0] !== "/") {
        const directory = normalize(parent.path, parent.path.startsWith("/"));
        const prefix = /(?:^|\/)\.\.$/.test(directory)
          ? directory + "/"
          : directory.slice(0, directory.lastIndexOf("/") + 1);
        ref.path = prefix + ref.path;
      }
    }
  }
  const rooted = ref.path.startsWith("/");
  const path = normalize(ref.path, rooted);
  if (ref.host !== null) return ref.scheme + "//" + ref.host + (path || "/") + ref.suffix;
  if (!path) return ref.suffix || ".";
  const explicit = !rooted && path[0] !== "." && /^[.?#]/.test(base || input);
  return (explicit ? "./" : "") + path + ref.suffix;
}

module.exports = resolve;
