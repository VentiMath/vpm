"use strict";
const {
  Root,
  Namespace,
  Type,
  Field,
  MapField,
  Enum,
  OneOf,
  Service,
  Method,
} = require("./reflection.cjs");
const util = require("./util.cjs");
function common(name, json) {
  if (!/[/.]/.test(name)) {
    name = "google/protobuf/" + name + ".proto";
    json = { nested: { google: { nested: { protobuf: { nested: json } } } } };
  }
  util.put(common, name, json);
}
Object.assign(common, require("./common.json"));
function bundledName(file) {
  const start = file.lastIndexOf("google/protobuf/");
  const canonical = start < 0 ? file : file.slice(start);
  if (Object.hasOwn(common, canonical)) return canonical;
  if (Object.hasOwn(common, file)) return file;
}
function loadPath(root, name, origin) {
  // Standard imports bypass custom resolvers; top-level requests still resolve
  // first. Canonical names also make aliases share one entry in Root.files.
  const file = (origin && bundledName(name)) || root.resolvePath(origin, name);
  return file && (bundledName(file) || file);
}
function resolvePath(origin, target) {
  if (/^(?:[a-z]+:|\/|[A-Za-z]:[\\/])/i.test(target)) return target;
  if (/^[a-z]+:/i.test(origin)) return new URL(target, origin).href;
  const parts = (origin.slice(0, origin.lastIndexOf("/") + 1) + target).split(
      "/",
    ),
    out = [];
  for (const p of parts) {
    if (p === ".") continue;
    if (p === ".." && out.length && out.at(-1) !== "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}
function tokenize(source) {
  let pos = 0,
    line = 1,
    pushed = [];
  function next() {
    if (pushed.length) return pushed.pop();
    while (pos < source.length) {
      const c = source[pos];
      if (/\s/.test(c)) {
        if (c === "\n") line++;
        pos++;
        continue;
      }
      if (source.startsWith("//", pos)) {
        while (pos < source.length && source[pos] !== "\n") pos++;
        continue;
      }
      if (source.startsWith("/*", pos)) {
        const end = source.indexOf("*/", pos + 2);
        if (end < 0) throw SyntaxError("unterminated comment");
        line += (source.slice(pos, end).match(/\n/g) || []).length;
        pos = end + 2;
        continue;
      }
      if (c === '"' || c === "'") {
        let text = c;
        pos++;
        while (pos < source.length) {
          const v = source[pos++];
          text += v;
          if (v === "\\" && pos < source.length) text += source[pos++];
          else if (v === c) return text;
        }
        throw SyntaxError("unterminated string");
      }
      const match =
        /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*|^\.?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*|^-?(?:0[xX][\da-fA-F]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/.exec(
          source.slice(pos),
        );
      if (match) {
        pos += match[0].length;
        return match[0];
      }
      pos++;
      return c;
    }
    return null;
  }
  return {
    next,
    peek() {
      const t = next();
      if (t !== null) pushed.push(t);
      return t;
    },
    push(t) {
      pushed.push(t);
    },
    skip(t, optional = false) {
      const v = next();
      if (v === t) return true;
      if (optional) {
        if (v !== null) pushed.push(v);
        return false;
      }
      throw SyntaxError("expected " + t + " at line " + line + ", got " + v);
    },
    get line() {
      return line;
    },
    cmnt() {
      return null;
    },
  };
}
function string(token) {
  if (!token || !['"', "'"].includes(token[0]))
    throw SyntaxError("string expected");
  const inner = token.slice(1, -1);
  return inner.replace(
    /\\(x[\da-fA-F]{2}|u[\da-fA-F]{4}|[0-7]{1,3}|.)/g,
    (_, e) =>
      e[0] === "x" || e[0] === "u"
        ? String.fromCharCode(parseInt(e.slice(1), 16))
        : /^[0-7]/.test(e)
          ? String.fromCharCode(parseInt(e, 8))
          : ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v" }[e] ?? e),
  );
}
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
function parse(source, root, options) {
  if (!(root instanceof Root)) {
    options = root;
    root = new Root();
  }
  options ||= {};
  const t = tokenize(source),
    imports = [],
    weakImports = [];
  let scope = root,
    syntax = "proto2",
    edition,
    packageName;
  function value() {
    const token = t.next();
    if (token === null) throw SyntaxError("value expected");
    if (token[0] === '"' || token[0] === "'") {
      let out = string(token);
      while (t.peek()?.[0] === '"' || t.peek()?.[0] === "'")
        out += string(t.next());
      return out;
    }
    if (token === "true" || token === "false") return token === "true";
    if (token === "inf") return Infinity;
    if (token === "nan") return NaN;
    if (/^-?\d/.test(token)) return Number(token);
    if (token === "{" || token === "<") {
      const out = {};
      const end = token === "{" ? "}" : ">";
      while (t.peek() !== end) {
        const key = t.next();
        t.skip(":", true);
        util.put(out, key, value());
        t.skip(",", true);
        t.skip(";", true);
      }
      t.skip(end);
      return out;
    }
    return token;
  }
  function option(obj, end = ";") {
    let key = "";
    while (t.peek() !== "=") {
      const token = t.next();
      if (token === null) throw SyntaxError("option without value");
      key += token;
    }
    t.skip("=");
    const v = value();
    obj.setOption(key, v);
    obj.parsedOptions ||= [];
    obj.parsedOptions.push({ [key]: v });
    if (end) t.skip(end);
  }
  function bracket(obj) {
    if (t.skip("[", true)) {
      while (!t.skip("]", true)) {
        option(obj, null);
        if (t.skip("]", true)) break;
        t.skip(",");
      }
    }
  }
  function field(owner, first, oneof, extend) {
    let rule;
    if (["optional", "required", "repeated"].includes(first)) {
      rule = first;
      first = t.next();
    }
    let keyType;
    if (first === "map") {
      t.skip("<");
      keyType = t.next();
      t.skip(",");
      first = t.next();
      t.skip(">");
    }
    if (first === "group") {
      const group = new Type(t.next());
      group.group = true;
      group.edition = edition || syntax;
      owner.add(group);
      t.skip("=");
      const id = Number(t.next()),
        f = new Field(
          group.name[0].toLowerCase() + group.name.slice(1),
          id,
          group.name,
          rule,
        );
      bracket(f);
      owner.add(f);
      t.skip("{");
      body(group, "message");
      t.skip(";", true);
      return;
    }
    const rawName = t.next(),
      name = options.keepCase ? rawName : camel(rawName);
    t.skip("=");
    const id = Number(t.next());
    const f = keyType
      ? new MapField(name, id, keyType, first)
      : new Field(name, id, first, rule);
    f.protoName = rawName;
    f.extend = extend;
    bracket(f);
    t.skip(";");
    owner.add(f);
    if (oneof) oneof.add(f);
    else if (rule === "optional" && syntax === "proto3" && !edition) {
      f.setOption("proto3_optional", true);
      owner.add(new OneOf("_" + name, [name]));
    }
  }
  function message(parent) {
    const name = t.next(),
      m = new Type(name);
    m._syntax = syntax;
    m.edition = edition || syntax;
    parent.add(m);
    t.skip("{");
    body(m, "message");
    return m;
  }
  function en(parent) {
    const e = new Enum(t.next());
    e.edition = edition || syntax;
    parent.add(e);
    t.skip("{");
    while (!t.skip("}", true)) {
      const token = t.next();
      if (token === "option") {
        option(e);
        continue;
      }
      if (token === "reserved") {
        while (!t.skip(";", true)) {
          if (t.next() === null) throw SyntaxError("unterminated enum");
        }
        continue;
      }
      if (token === ";") continue;
      t.skip("=");
      const id = Number(t.next());
      e.add(token, id);
      const temp = new Namespace("");
      bracket(temp);
      t.skip(";");
    }
  }
  function service(parent) {
    const s = new Service(t.next());
    parent.add(s);
    t.skip("{");
    while (!t.skip("}", true)) {
      const token = t.next();
      if (token === "option") {
        option(s);
        continue;
      }
      if (token === ";") continue;
      if (token !== "rpc") throw SyntaxError("rpc expected");
      const name = t.next();
      t.skip("(");
      const reqStream = t.skip("stream", true),
        req = t.next();
      t.skip(")");
      t.skip("returns");
      t.skip("(");
      const resStream = t.skip("stream", true),
        res = t.next();
      t.skip(")");
      const m = new Method(name, "rpc", req, res, reqStream, resStream);
      s.add(m);
      if (t.skip("{", true)) {
        while (!t.skip("}", true)) {
          t.skip("option");
          option(m);
        }
      } else t.skip(";");
    }
  }
  function body(owner, kind) {
    while (true) {
      const token = t.next();
      if (token === null) {
        if (kind !== "root") throw SyntaxError("unterminated " + kind);
        return;
      }
      if (token === "}") {
        if (kind === "root") throw SyntaxError("unexpected }");
        return;
      }
      if (token === ";") continue;
      if (token === "message") {
        message(owner);
        continue;
      }
      if (token === "enum") {
        en(owner);
        continue;
      }
      if (token === "service") {
        service(owner);
        continue;
      }
      if (token === "option") {
        option(owner);
        continue;
      }
      if (token === "oneof") {
        const o = new OneOf(t.next());
        owner.add(o);
        t.skip("{");
        while (!t.skip("}", true)) {
          const k = t.next();
          if (k === "option") option(o);
          else field(owner, k, o);
        }
        continue;
      }
      if (token === "reserved" || token === "extensions") {
        const ranges = [];
        while (true) {
          const start = t.next();
          if (start === null) throw SyntaxError("unterminated range");
          if (start[0] === '"' || start[0] === "'") ranges.push(string(start));
          else {
            const a = Number(start);
            let b = a;
            if (t.skip("to", true)) {
              const end = t.next();
              b = end === "max" ? 536870911 : Number(end);
            }
            ranges.push([a, b]);
          }
          if (t.skip(";", true)) break;
          t.skip(",");
        }
        owner[token] = ranges;
        continue;
      }
      if (kind === "root" && token === "syntax") {
        t.skip("=");
        syntax = string(t.next());
        if (!["proto2", "proto3"].includes(syntax))
          throw Error("unsupported syntax");
        t.skip(";");
        continue;
      }
      if (kind === "root" && token === "edition") {
        t.skip("=");
        edition = string(t.next());
        if (!["2023", "2024"].includes(edition))
          throw Error("unsupported edition");
        syntax = "proto3";
        t.skip(";");
        continue;
      }
      if (kind === "root" && token === "package") {
        packageName = t.next();
        scope = root.define(packageName);
        owner = scope;
        t.skip(";");
        continue;
      }
      if (kind === "root" && token === "import") {
        let k = t.next(),
          weak = false;
        if (k === "weak" || k === "public") {
          weak = k === "weak";
          k = t.next();
        }
        (weak ? weakImports : imports).push(string(k));
        t.skip(";");
        continue;
      }
      if (token === "extend") {
        const target = t.next();
        t.skip("{");
        while (!t.skip("}", true)) field(owner, t.next(), null, target);
        continue;
      }
      if (owner instanceof Type) field(owner, token);
      else throw SyntaxError("unexpected token " + token);
    }
  }
  body(scope, "root");
  return { root, package: packageName, imports, weakImports, syntax, edition };
}
function loadSync(root, files, options) {
  const fs = require("fs");
  function visit(name, origin, weak) {
    const file = loadPath(root, name, origin);
    if (!file) return;
    const builtin = Object.hasOwn(common, file) ? common[file] : undefined;
    if (root.files.includes(file)) return;
    root.files.push(file);
    let text;
    if (builtin) {
      root.addJSON(builtin.nested);
      return;
    }
    try {
      text = fs.readFileSync(file, "utf8");
    } catch (e) {
      if (weak) return;
      throw e;
    }
    if (/^\s*\{/.test(text)) {
      const j = JSON.parse(text);
      root.addJSON(j.nested);
      return;
    }
    const parsed = parse(text, root, options);
    for (const next of parsed.imports) visit(next, file, false);
    for (const next of parsed.weakImports) visit(next, file, true);
  }
  for (const f of Array.isArray(files) ? files : [files]) visit(f, "", false);
  return root;
}
async function load(root, files, options) {
  if (util.isNode) return loadSync(root, files, options);
  async function visit(name, origin, weak) {
    const file = loadPath(root, name, origin);
    if (!file) return;
    if (root.files.includes(file)) return;
    root.files.push(file);
    const builtin = Object.hasOwn(common, file) ? common[file] : undefined;
    if (builtin) {
      root.addJSON(builtin.nested);
      return;
    }
    let text;
    try {
      const response = await fetch(file);
      if (!response.ok) throw Error("schema fetch failed: " + response.status);
      text = await response.text();
    } catch (e) {
      if (weak) return;
      throw e;
    }
    if (/^\s*\{/.test(text)) {
      root.addJSON(JSON.parse(text).nested);
      return;
    }
    const parsed = parse(text, root, options);
    for (const next of parsed.imports) await visit(next, file, false);
    for (const next of parsed.weakImports) await visit(next, file, true);
  }
  for (const f of Array.isArray(files) ? files : [files])
    await visit(f, "", false);
  return root;
}
module.exports = { parse, tokenize, common, resolvePath, load, loadSync };
