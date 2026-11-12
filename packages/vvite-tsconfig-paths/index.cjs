"use strict";
const path = require("node:path");
const reader = require("vtsconfck");
const native = (p) => p.split(path.sep).join("/");
const inside = (dir, file) => {
  const r = path.relative(dir, file);
  return r !== ".." && !r.startsWith(".." + path.sep) && !path.isAbsolute(r);
};
const stripQuery = (id) => id.split(/[?#]/, 1)[0];
function compile(result) {
  const config = result.tsconfig,
    dir = path.dirname(result.tsconfigFile),
    options = config.compilerOptions || {};
  const owner = result.extended?.find((x) =>
    Object.hasOwn(x.tsconfig.compilerOptions || {}, "paths"),
  );
  const base =
    options.baseUrl || (owner ? path.dirname(owner.tsconfigFile) : dir);
  const paths = Object.entries(options.paths || {})
    .map(([key, values]) => {
      if (!Array.isArray(values) || values.some((v) => typeof v !== "string"))
        throw new TypeError("Path targets must be string arrays");
      const star = key.indexOf("*");
      if (star !== key.lastIndexOf("*"))
        throw new TypeError("Path aliases may contain one wildcard");
      return {
        key,
        prefix: star < 0 ? key : key.slice(0, star),
        suffix: star < 0 ? "" : key.slice(star + 1),
        star,
        values,
      };
    })
    .sort(
      (a, b) =>
        (a.star < 0 ? 0 : 1) - (b.star < 0 ? 0 : 1) ||
        b.prefix.length - a.prefix.length,
    );
  const glob = (file, pattern) => {
    const absolute = native(path.resolve(dir, pattern)),
      name = native(file);
    return (
      path.matchesGlob(name, absolute) ||
      (!/[?*]/.test(pattern) && inside(path.resolve(dir, pattern), file))
    );
  };
  const eligibility = new Map();
  const checkEligible = (file) => {
    if (config.files?.some((f) => path.resolve(dir, f) === file)) return true;
    if (config.include && !config.include.some((p) => glob(file, p)))
      return false;
    if (!config.include && config.files) return false;
    return !(
      config.exclude || [
        "node_modules",
        "bower_components",
        "jspm_packages",
        ...(options.outDir ? [options.outDir] : []),
      ]
    ).some((p) => glob(file, p));
  };
  const eligible = (file) => {
    if (eligibility.has(file)) return eligibility.get(file);
    const result = checkEligible(file);
    if (eligibility.size >= 4096)
      eligibility.delete(eligibility.keys().next().value);
    eligibility.set(file, result);
    return result;
  };
  return { dir, config, options, paths, base, eligible };
}
function tsconfigPaths(options = {}) {
  if (options.parseNative)
    throw new TypeError(
      "Compiler parsing is outside the VentiMath path-alias contract",
    );
  if (options.logFile)
    throw new TypeError(
      "File logging is outside the VentiMath path-alias contract",
    );
  const discovery = options.projectDiscovery || "eager";
  if (!["eager", "lazy"].includes(discovery))
    throw new TypeError("Invalid projectDiscovery");
  let root,
    config,
    cache = new reader.TSConfckCache(),
    ready,
    entries = [],
    generation = 0,
    dirty = true,
    watcher,
    changed,
    closed = false;
  const names = options.configNames || ["tsconfig.json", "jsconfig.json"];
  const skip = (dir) =>
    dir === "node_modules" || dir === ".git" || !!options.skip?.(dir);
  const parseOne = async (file) => {
    try {
      return await reader.parse(file, { cache });
    } catch (error) {
      if (!options.ignoreConfigErrors) config?.logger?.warn(error.message);
      return null;
    }
  };
  async function refresh() {
    if (!dirty) return ready;
    dirty = false;
    const turn = ++generation;
    cache = new reader.TSConfckCache();
    ready = (async () => {
      const files = options.projects
        ? options.projects
            .map((p) => path.resolve(root, p))
            .map((p) =>
              path.extname(p) === ".json" ? p : path.join(p, names[0]),
            )
        : discovery === "eager"
          ? await reader.findAll(root, { configNames: names, skip })
          : [];
      const next = [],
        seen = new Set();
      const add = (result) => {
        if (!result || !result.tsconfigFile || seen.has(result.tsconfigFile))
          return;
        seen.add(result.tsconfigFile);
        next.push(compile(result));
        for (const r of result.referenced || []) add(r);
      };
      for (const file of files) add(await parseOne(file));
      next.sort((a, b) => b.dir.length - a.dir.length);
      if (turn === generation) entries = next;
    })();
    return ready;
  }
  const invalidate = () => {
    dirty = true;
    generation++;
  };
  const detach = () => {
    if (watcher) {
      for (const event of ["add", "change", "unlink"])
        watcher.off(event, changed);
      watcher = undefined;
    }
    closed = true;
  };
  return {
    name: "vvite-tsconfig-paths",
    enforce: "pre",
    async configResolved(value) {
      config = value;
      root = path.resolve(value.root, options.root || ".");
      closed = false;
      await refresh();
    },
    configureServer(server) {
      detach();
      closed = false;
      watcher = server.watcher;
      changed = (file) => {
        if (path.extname(file) === ".json") invalidate();
      };
      for (const event of ["add", "change", "unlink"])
        watcher.on(event, changed);
      server.httpServer?.once("close", detach);
    },
    async buildStart() {
      if (!closed) await refresh();
    },
    watchChange(id) {
      if (path.extname(id) === ".json") invalidate();
    },
    closeBundle: detach,
    async resolveId(id, importer, resolveOptions = {}) {
      if (
        !importer ||
        !id ||
        id[0] === "\0" ||
        id[0] === "." ||
        path.isAbsolute(id) ||
        /^[a-zA-Z][\w+.-]*:/.test(id)
      )
        return;
      const file = stripQuery(importer);
      if (file.includes("\0") || !path.isAbsolute(file)) return;
      await refresh();
      while (dirty) await refresh();
      let candidates = entries;
      if (discovery === "lazy") {
        const found = [];
        let dir = path.dirname(file);
        while (inside(root, dir)) {
          if (skip(path.basename(dir))) break;
          for (const name of names) {
            const r = await reader.parse(path.join(dir, name), {
              cache,
              root: dir,
            });
            if (r.tsconfigFile) {
              found.push(compile(r));
              break;
            }
          }
          if (dir === root) break;
          dir = path.dirname(dir);
        }
        candidates = [...found, ...entries];
      }
      for (const entry of candidates) {
        if (!inside(entry.dir, file) || !entry.eligible(file)) continue;
        const supported =
          options.loose ||
          (options.importerFilter
            ? options.importerFilter(file)
            : /\.[cm]?tsx?$/.test(file) ||
              (entry.options.allowJs &&
                /\.(?:[cm]?jsx?|vue|svelte|astro|mdx)$/.test(file)));
        if (!supported) continue;
        const split = id.search(/[?#]/),
          bare = split < 0 ? id : id.slice(0, split),
          tail = split < 0 ? "" : id.slice(split);
        let matched = false;
        for (const alias of entry.paths) {
          const hit =
            alias.star < 0
              ? bare === alias.key
              : bare.startsWith(alias.prefix) &&
                bare.endsWith(alias.suffix) &&
                bare.length >= alias.prefix.length + alias.suffix.length;
          if (!hit) continue;
          matched = true;
          const middle =
            alias.star < 0
              ? ""
              : bare.slice(
                  alias.prefix.length,
                  bare.length - alias.suffix.length,
                );
          for (const target of alias.values) {
            const candidate =
              path.resolve(entry.base, target.replace("*", middle)) + tail;
            const resolved = await this.resolve(candidate, importer, {
              ...resolveOptions,
              skipSelf: true,
            });
            if (resolved)
              return typeof resolved === "string" ? resolved : resolved.id;
          }
          break;
        }
        if (entry.options.baseUrl) {
          const resolved = await this.resolve(
            path.resolve(entry.options.baseUrl, bare) + tail,
            importer,
            { ...resolveOptions, skipSelf: true },
          );
          if (resolved)
            return typeof resolved === "string" ? resolved : resolved.id;
        }
        if (matched) return;
      }
    },
  };
}
module.exports = tsconfigPaths;
module.exports.default = tsconfigPaths;
