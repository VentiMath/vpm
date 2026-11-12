"use strict";
const fs = require("node:fs/promises"),
  path = require("node:path"),
  { createRequire } = require("node:module"),
  { toJson } = require("./jsonc.cjs");
const caches = new WeakMap(),
  own = (o, k) => Object.hasOwn(o, k),
  set = (o, k, v) =>
    Object.defineProperty(o, k, {
      value: v,
      enumerable: true,
      writable: true,
      configurable: true,
    }),
  clone = (value) =>
    value && typeof value === "object"
      ? JSON.parse(JSON.stringify(value))
      : value;
class TSConfckParseError extends Error {
  constructor(message, code, tsconfigFile, cause) {
    super(message, { cause });
    this.name = "TSConfckParseError";
    this.code = code;
    this.tsconfigFile = tsconfigFile;
  }
}
class TSConfckCache {
  constructor() {
    this.clear();
  }
  clear() {
    caches.set(this, {
      find: new Map(),
      findView: new Map(),
      parsed: new Map(),
      epoch: Symbol(),
    });
  }
  hasConfigPath(dir, configName = "tsconfig.json") {
    return caches
      .get(this)
      .findView.has(JSON.stringify([path.resolve(dir), configName]));
  }
  getConfigPath(dir, configName = "tsconfig.json") {
    return caches
      .get(this)
      .findView.get(JSON.stringify([path.resolve(dir), configName]));
  }
  hasParseResult(file) {
    return caches.get(this).parsed.has(path.resolve(file));
  }
  getParseResult(file) {
    return caches.get(this).parsed.get(path.resolve(file));
  }
}
const absent = (e) => e.code === "ENOENT" || e.code === "ENOTDIR";
async function isFile(file) {
  try {
    return (await fs.stat(file)).isFile();
  } catch (e) {
    if (absent(e)) return false;
    throw e;
  }
}
function cacheState(cache) {
  if (cache === undefined) return null;
  const state = caches.get(cache);
  if (!state) throw new TypeError("cache must be a TSConfckCache");
  return state;
}
async function find(filename, options = {}, state = cacheState(options.cache)) {
  const file = path.resolve(filename),
    root = options.root ? path.resolve(options.root) : null,
    name = options.configName || "tsconfig.json";
  if (
    options.ignoreNodeModules &&
    file.split(path.sep).includes("node_modules")
  )
    return null;
  let dir = path.dirname(file);
  const key = JSON.stringify([dir, name, root, !!options.ignoreNodeModules]);
  if (state?.find.has(key)) return state.find.get(key);
  const pending = (async () => {
    while (true) {
      if (root) {
        const relative = path.relative(root, dir);
        if (
          relative === ".." ||
          relative.startsWith(".." + path.sep) ||
          path.isAbsolute(relative)
        )
          return null;
      }
      const candidate = path.join(dir, name);
      if (await isFile(candidate)) return candidate;
      if (dir === root || path.dirname(dir) === dir) return null;
      dir = path.dirname(dir);
    }
  })();
  state?.find.set(key, pending);
  state?.findView.set(JSON.stringify([path.dirname(file), name]), pending);
  return pending;
}
async function findAll(directory, options = {}) {
  const names = new Set(options.configNames || ["tsconfig.json"]),
    result = [],
    queue = [path.resolve(directory)];
  while (queue.length) {
    const dir = queue.shift();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && names.has(entry.name))
        result.push(path.join(dir, entry.name));
      else if (entry.isDirectory() && !options.skip?.(entry.name))
        queue.push(path.join(dir, entry.name));
    }
  }
  return result.sort();
}
async function read(file) {
  try {
    const value = JSON.parse(toJson(await fs.readFile(file, "utf8")));
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new TypeError("Configuration must be an object");
    if (path.basename(file) === "jsconfig.json")
      value.compilerOptions = {
        allowJs: true,
        maxNodeModuleJsDepth: 2,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        noEmit: true,
        ...value.compilerOptions,
      };
    if (value.compilerOptions?.baseUrl !== undefined) {
      if (typeof value.compilerOptions.baseUrl !== "string")
        throw new TypeError("baseUrl must be a string");
      if (!value.compilerOptions.baseUrl.includes("${configDir}"))
        value.compilerOptions.baseUrl = path.resolve(
          path.dirname(file),
          value.compilerOptions.baseUrl,
        );
    }
    return value;
  } catch (error) {
    throw new TSConfckParseError(
      "Parsing " + file + " failed: " + error.message,
      "PARSE_FILE",
      file,
      error,
    );
  }
}
async function resolveExtends(spec, file) {
  try {
    if (typeof spec !== "string")
      throw new TypeError("extends must contain strings");
    const resolver = createRequire(file);
    for (const candidate of [spec, spec + ".json", spec + "/tsconfig.json"]) {
      try {
        return resolver.resolve(candidate, { paths: [path.dirname(file)] });
      } catch (error) {
        if (
          error.code !== "MODULE_NOT_FOUND" &&
          error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED"
        )
          throw error;
      }
    }
    // A package created after earlier resolution can be hidden by a runtime's
    // negative resolution cache. Read ordinary JSON-package entries directly;
    // exported packages remain governed by the runtime's exports resolver.
    const match =
      !spec.startsWith(".") &&
      !path.isAbsolute(spec) &&
      spec.match(/^(@[^/]+\/[^/]+|[^/]+)(?:\/(.*))?$/);
    if (match) {
      let dir = path.dirname(file);
      while (true) {
        const folder = path.join(dir, "node_modules", match[1]);
        let metadata;
        try {
          metadata = JSON.parse(
            await fs.readFile(path.join(folder, "package.json"), "utf8"),
          );
        } catch (error) {
          if (!absent(error)) throw error;
        }
        if (metadata && !own(metadata, "exports")) {
          const target = match[2] || metadata.main || "tsconfig.json";
          for (const candidate of [
            target,
            target + ".json",
            path.join(target, "tsconfig.json"),
          ]) {
            const entry = path.resolve(folder, candidate);
            if (await isFile(entry)) return await fs.realpath(entry);
          }
        }
        if (path.dirname(dir) === dir) break;
        dir = path.dirname(dir);
      }
    }
    throw new Error("Configuration not found: " + spec);
  } catch (error) {
    throw new TSConfckParseError(
      "Failed to resolve extends " + JSON.stringify(spec),
      "EXTENDS_RESOLVE",
      file,
      error,
    );
  }
}
const rootLists = new Set(["files", "include", "exclude"]),
  scalarPaths = new Set([
    "outDir",
    "outFile",
    "rootDir",
    "declarationDir",
    "tsBuildInfoFile",
  ]),
  listPaths = new Set(["typeRoots", "rootDirs"]);
function move(value, from, to) {
  if (
    typeof value !== "string" ||
    path.isAbsolute(value) ||
    value.includes("${configDir}")
  )
    return value;
  return (
    path.relative(to, path.resolve(from, value)).split(path.sep).join("/") ||
    "."
  );
}
function inherit(target, parent, from, to) {
  for (const [key, value] of Object.entries(parent)) {
    if (["extends", "references"].includes(key)) continue;
    if (key === "compilerOptions") {
      const compiler = target.compilerOptions || (target.compilerOptions = {});
      for (const [k, v] of Object.entries(value || {})) {
        if (own(compiler, k)) continue;
        set(
          compiler,
          k,
          scalarPaths.has(k)
            ? move(v, from, to)
            : listPaths.has(k) && Array.isArray(v)
              ? v.map((x) => move(x, from, to))
              : clone(v),
        );
      }
    } else if (!own(target, key))
      set(
        target,
        key,
        rootLists.has(key) && Array.isArray(value)
          ? value.map((x) => move(x, from, to))
          : clone(value),
      );
  }
}
function templates(value, dir) {
  if (typeof value === "string") return value.replaceAll("${configDir}", dir);
  if (Array.isArray(value)) return value.map((v) => templates(v, dir));
  if (value && typeof value === "object") {
    for (const key of Object.keys(value))
      set(value, key, templates(value[key], dir));
  }
  return value;
}
async function expand(file, stack = []) {
  const canonical = file;
  if (stack.includes(canonical))
    throw new TSConfckParseError(
      "Circular extends: " + stack.concat(canonical).join(" -> "),
      "EXTENDS_CIRCULAR",
      file,
    );
  if (stack.length >= 128)
    throw new TSConfckParseError(
      "Configuration inheritance exceeds 128 levels",
      "EXTENDS_DEPTH",
      file,
    );
  const raw = await read(file),
    merged = clone(raw),
    entries = [{ tsconfigFile: file, tsconfig: raw }];
  if (raw.extends) {
    const parents = Array.isArray(raw.extends) ? raw.extends : [raw.extends];
    for (const spec of parents.toReversed()) {
      const base = await resolveExtends(spec, file),
        parent = await expand(base, stack.concat(canonical));
      inherit(merged, parent.tsconfig, path.dirname(base), path.dirname(file));
      entries.push(
        ...(parent.extended || [
          { tsconfigFile: base, tsconfig: parent.tsconfig },
        ]),
      );
    }
  }
  return {
    tsconfigFile: file,
    tsconfig: merged,
    ...(raw.extends ? { extended: entries } : {}),
  };
}
async function graph(file, stack = []) {
  if (stack.length >= 128)
    throw new TSConfckParseError(
      "Project references exceed 128 levels",
      "REFERENCES_DEPTH",
      file,
    );
  if (stack.includes(file))
    throw new TSConfckParseError(
      "Circular project references",
      "REFERENCES_CIRCULAR",
      file,
    );
  const result = await expand(file);
  templates(result.tsconfig, path.dirname(file));
  const references = result.tsconfig.references;
  if (Array.isArray(references) && references.length) {
    result.referenced = [];
    for (const ref of references) {
      const name = path.resolve(path.dirname(file), ref.path);
      let target = name;
      if (!(await isFile(target))) target = path.join(name, "tsconfig.json");
      const child = await graph(target, stack.concat(file));
      child.solution = result;
      result.referenced.push(child);
    }
  }
  return result;
}
function included(filename, result) {
  const dir = path.dirname(result.tsconfigFile),
    config = result.tsconfig,
    rel = path.relative(dir, filename).split(path.sep).join("/");
  if (
    Array.isArray(config.files) &&
    config.files.some((f) => path.resolve(dir, f) === filename)
  )
    return true;
  const match = (glob) => {
    const p = glob.replaceAll("\\", "/");
    return (
      path.matchesGlob(rel, p) ||
      (!/[?*]/.test(p) && rel.startsWith(p.replace(/\/$/, "") + "/"))
    );
  };
  return (
    (config.include || ["**/*"]).some(match) &&
    !(
      config.exclude || ["node_modules", "bower_components", "jspm_packages"]
    ).some(match)
  );
}
function parse(filename, options = {}) {
  let state;
  try {
    state = cacheState(options.cache);
  } catch (error) {
    return Promise.reject(error);
  }
  const cached = state?.parsed.get(filename);
  return cached || parseUncached(filename, options, state);
}
async function parseUncached(filename, options, state) {
  const name = path.resolve(filename),
    direct = path.extname(name) === ".json";
  if (direct && state?.parsed.has(name)) return await state.parsed.get(name);
  const file =
    direct && (await isFile(name)) ? name : await find(name, options, state);
  if (!file) return { tsconfigFile: null, tsconfig: {} };
  let result = state?.parsed.get(file);
  if (!result) {
    result = graph(file);
    state?.parsed.set(file, result);
  }
  result = await result;
  if (!direct && result.referenced) {
    const selected = result.referenced.find((r) => included(name, r));
    if (selected) return selected;
  }
  return result;
}
function parseNative(filename) {
  return Promise.reject(
    new TSConfckParseError(
      "Compiler-backed parsing is outside the application contract",
      "UNSUPPORTED_NATIVE",
      path.resolve(filename),
    ),
  );
}
const findNative = parseNative;
module.exports = {
  parseNative,
  findNative,
  TSConfckCache,
  TSConfckParseError,
  find,
  findAll,
  toJson,
  parse,
};
