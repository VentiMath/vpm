'use strict';
const nativeFS = require('node:fs');
const paths = require('node:path');
const { fileURLToPath } = require('node:url');
const { LRUCache } = require('vlru-cache');
const { Minipass } = require('vminipass');

class ChildrenCache extends LRUCache {
  constructor(maxSize = 16384) { super({ maxSize, sizeCalculation: row => row.length + 1 }); }
}
class ResolveCache extends LRUCache {
  constructor() { super({ max: 256 }); }
}
const kinds = ['Unknown', 'File', 'Directory', 'SymbolicLink', 'FIFO', 'CharacterDevice', 'BlockDevice', 'Socket'];
const modeKinds = { 32768: 'File', 16384: 'Directory', 40960: 'SymbolicLink', 4096: 'FIFO', 8192: 'CharacterDevice', 24576: 'BlockDevice', 49152: 'Socket' };
const kindOf = stat => kinds.slice(1).find(k => stat['is' + k]?.()) || 'Unknown';
const keyOf = (name, nocase) => { const s = name.normalize('NFKD'); return nocase ? s.toLowerCase() : s; };
function filesystem(overrides = {}) {
  const fs = {};
  for (const name of ['lstatSync', 'readdirSync', 'readdir', 'readlinkSync', 'realpathSync'])
    fs[name] = (overrides[name] || nativeFS[name]).bind(overrides[name] ? overrides : nativeFS);
  fs.promises = {};
  for (const name of ['lstat', 'readdir', 'readlink', 'realpath']) {
    const owner = overrides.promises?.[name] ? overrides.promises : nativeFS.promises;
    fs.promises[name] = owner[name].bind(owner);
  }
  return fs;
}
function asString(value) { return typeof value === 'string' && !value.startsWith('file://') ? value : fileURLToPath(value); }
function windows(path) { return path.replace(/^[\\/]{2}\?[\\/]UNC[\\/]/i, '\\\\').replace(/^[\\/]{2}\?[\\/](?=[a-z]:)/i, '').replace(/\//g, '\\'); }
function context(win, nocase, cache, fs) {
  return { win, impl: win ? paths.win32 : paths.posix, nocase, cache, fs: filesystem(fs), roots: Object.create(null), cwd: undefined, resolved: new ResolveCache() };
}
function rootFor(ctx, input, from) {
  let root = ctx.impl.parse(input).root;
  if (ctx.win) {
    if (!root || root === '\\') root = from?.root.name || 'C:\\';
    root = ctx.impl.normalize(root).toUpperCase();
    if (!root.endsWith('\\')) root += '\\';
  } else root = '/';
  let node = ctx.roots[root];
  if (!node) {
    node = new (ctx.win ? PathWin32 : PathPosix)(root, 16384, undefined, ctx.roots, ctx.nocase, ctx.cache, { _context: ctx });
    ctx.roots[root] = node;
  }
  return node;
}
class PathBase {
  #ctx; #kind; #missing; #noRead; #noLink; #stat; #real; #link; #pendingRead; #pendingReal; #pendingLink; #full; #depth; #readCallbacks;
  constructor(name, type = 0, root, roots, nocase = false, children = new ChildrenCache(), opts = {}) {
    const win = this instanceof PathWin32;
    this.#ctx = opts._context || opts.parent?.#ctx || root?.#ctx || context(win, nocase, children, opts.fs);
    this.name = name; this.parent = opts.parent; this.root = root || this;
    this.roots = roots || this.#ctx.roots; this.nocase = nocase;
    this.sep = win ? '\\' : '/'; this.splitSep = win ? /[\\/]/ : '/';
    this.isCWD = false; this.#kind = modeKinds[type & 61440] || 'Unknown';
    this.#missing = false; this.#noRead = false; this.#noLink = false;
    this.#stat = undefined; this.#real = undefined; this.#link = undefined;
    this.#pendingRead = undefined; this.#pendingReal = undefined; this.#pendingLink = undefined;
    this.#full = undefined; this.#depth = this.parent ? this.parent.depth() + 1 : 0;
    this.#readCallbacks = undefined;
  }
  _getStat(name) { return this.#stat?.[name]; }
  get fs() { return this.#ctx.fs; }
  get path() { return this.parentPath; }
  get parentPath() { return this.parent ? this.parent.fullpath() : this.fullpath(); }
  depth() { return this.#depth; }
  childrenCache() { return this.#ctx.cache; }
  children() {
    let row = this.#ctx.cache.get(this);
    if (!row) {
      row = []; row.provisional = 0;
      Object.defineProperties(row, { lookup: { value: new Map() }, complete: { value: false, writable: true } });
      this.#ctx.cache.set(this, row);
    }
    return row;
  }
  child(name, opts = {}) {
    if (!name || name === '.') return this;
    if (name === '..') return this.parent || this;
    const row = this.children(), key = keyOf(name, this.nocase);
    let child = row.lookup.get(key);
    if (!child) {
      child = this.newChild(name, 0, { ...opts, parent: this });
      if (this.#missing || this.#noRead || row.complete) child.#missing = true;
      row.push(child); row.lookup.set(key, child); this.#ctx.cache.set(this, row);
    }
    return child;
  }
  newChild(name, type = 0, opts = {}) {
    return new (this.#ctx.win ? PathWin32 : PathPosix)(name, type, this.root, this.roots, this.nocase, this.#ctx.cache, { ...opts, _context: this.#ctx });
  }
  getRootString(path) { return this.#ctx.impl.parse(this.#ctx.win ? windows(path) : path).root; }
  getRoot(root) { return rootFor(this.#ctx, this.#ctx.win ? windows(root) : root, this); }
  sameRoot(root) { return keyOf(root, true) === keyOf(this.root.name, true); }
  resolve(input = '') {
    if (!input) return this;
    let text = asString(input); if (this.#ctx.win) text = windows(text);
    const parsed = this.#ctx.impl.parse(text);
    let node = parsed.root ? rootFor(this.#ctx, text, this) : this;
    text = text.slice(parsed.root.length);
    for (const part of text.split(this.splitSep)) node = node.child(part);
    return node;
  }
  fullpath() {
    if (this.#full !== undefined) return this.#full;
    const names = []; let at = this;
    while (at.parent && at.#full === undefined) { names.push(at.name); at = at.parent; }
    let value = at.#full ?? at.name;
    while (names.length) { if (!value.endsWith(this.sep)) value += this.sep; value += names.pop(); }
    this.#full = value; return value;
  }
  fullpathPosix() {
    const value = this.fullpath(); if (!this.#ctx.win) return value;
    return (/^[a-z]:/i.test(value) ? '//?/' : '') + value.replace(/\\/g, '/');
  }
  relative() {
    const cwd = this.#ctx.cwd;
    if (!cwd) return this.fullpath();
    if (this === cwd) return '';
    if (this.root !== cwd.root) return this.fullpath();
    const ancestors = new Set(); for (let n = cwd; n; n = n.parent) ancestors.add(n);
    let common = this; while (!ancestors.has(common)) common = common.parent;
    if (common === this.root && cwd !== this.root) return this.fullpath();
    return this.#ctx.impl.relative(cwd.fullpath(), this.fullpath());
  }
  relativePosix() { const value = this.relative(); return this.#ctx.win ? (/^[a-z]:/i.test(value) ? '//?/' : '') + value.replace(/\\/g, '/') : value; }
  isUnknown() { return this.#kind === 'Unknown'; }
  isType(type) { return this.#kind === type; }
  getType() { return this.#kind; }
  isENOENT() { return this.#missing; }
  isNamed(name) { return keyOf(this.name, this.nocase) === keyOf(name, this.nocase); }
  lstatCached() { return this.#stat ? this : undefined; }
  readlinkCached() { return this.#link; }
  realpathCached() { return this.#real; }
  readdirCached() { const row = this.#ctx.cache.get(this); return row ? row.slice(0, row.provisional) : []; }
  calledReaddir() { return !!this.#ctx.cache.get(this)?.complete; }
  canReaddir() { return !this.#missing && !this.#noRead && (this.isUnknown() || this.isDirectory() || this.isSymbolicLink()); }
  canReadlink() { return !this.#missing && !this.#noLink && (this.isUnknown() || this.isSymbolicLink()); }
  shouldWalk(visited, walkFilter) { return this.isDirectory() && this.canReaddir() && !visited.has(this) && (!walkFilter || walkFilter(this)); }
  _invalidateMissing() {
    const pending = [this];
    while (pending.length) {
      const node = pending.pop(); node.#missing = true; node.#kind = 'Unknown'; node.#stat = undefined; node.#real = undefined; node.#link = undefined;
      const row = node.#ctx.cache.get(node);
      if (row) { for (const child of row) pending.push(child); row.provisional = 0; row.complete = true; }
    }
  }
  _fail(error, operation) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') this._invalidateMissing();
    if (operation === 'read') this.#noRead = true;
    if (operation === 'link') this.#noLink = true;
  }
  _setStat(stat) { this.#stat = stat; this.#kind = kindOf(stat); this.#missing = false; return this; }
  lstatSync() {
    try { return this._setStat(this.fs.lstatSync(this.fullpath())); }
    catch (error) { this._fail(error, 'stat'); }
  }
  async lstat() {
    try { return this._setStat(await this.fs.promises.lstat(this.fullpath())); }
    catch (error) { this._fail(error, 'stat'); }
  }
  _entries(entries) {
    const row = this.children(), actual = [], seen = new Set();
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i], key = keyOf(entry.name, this.nocase);
      if (seen.has(key)) continue;
      seen.add(key);
      let child = row.lookup.get(key);
      if (!child) { child = this.newChild(entry.name, 0, { parent: this }); row.lookup.set(key, child); }
      if (child.name !== entry.name) { child.name = entry.name; this._clearFull(child); }
      child.#kind = kindOf(entry); child.#missing = false; actual.push(child);
    }
    const provisional = [];
    for (const child of row) if (!seen.has(keyOf(child.name, this.nocase))) { child._invalidateMissing(); provisional.push(child); }
    row.length = 0; for (const child of actual) row.push(child); for (const child of provisional) row.push(child); row.provisional = actual.length; row.complete = true;
    this.#ctx.cache.set(this, row);
    if (!this.isSymbolicLink()) this.#kind = 'Directory';
    return actual;
  }
  _clearFull(node) {
    const pending = [node]; while (pending.length) { const n = pending.pop(); n.#full = undefined; const row = n.#ctx.cache.get(n); if (row) for (const child of row) pending.push(child); }
  }
  readdirSync() {
    const cached = this.#ctx.cache.get(this);
    if (cached?.complete) return cached.slice(0, cached.provisional);
    if (!this.canReaddir()) return [];
    try { return this._entries(this.fs.readdirSync(this.fullpath(), { withFileTypes: true })); }
    catch (error) { this._fail(error, 'read'); const row = this.children(); row.provisional = 0; row.complete = true; return []; }
  }
  _finishRead(error, entries) {
    let result = [];
    if (error) { this._fail(error, 'read'); const row = this.children(); row.provisional = 0; row.complete = true; }
    else result = this._entries(entries);
    const callbacks = this.#readCallbacks || []; this.#readCallbacks = undefined;
    for (const cb of callbacks) cb(null, result.slice());
    return result;
  }
  readdir() {
    if (this.#pendingRead) return this.#pendingRead;
    if (this.calledReaddir() || !this.canReaddir()) return Promise.resolve(this.readdirCached());
    if (this.#readCallbacks) return new Promise(resolve => this.#readCallbacks.push((_, rows) => resolve(rows)));
    this.#readCallbacks = [];
    const promise = Promise.resolve().then(() => this.fs.promises.readdir(this.fullpath(), { withFileTypes: true }))
      .then(entries => this._finishRead(null, entries), error => this._finishRead(error));
    this.#pendingRead = promise;
    promise.then(() => { if (this.#pendingRead === promise) this.#pendingRead = undefined; });
    return promise;
  }
  readdirCB(callback, allowZalgo = false) {
    if (this.calledReaddir() || !this.canReaddir()) {
      const entries = this.readdirCached();
      if (allowZalgo) callback(null, entries); else queueMicrotask(() => callback(null, entries));
      return;
    }
    if (this.#readCallbacks) { this.#readCallbacks.push(callback); return; }
    this.#readCallbacks = [callback];
    this.fs.readdir(this.fullpath(), { withFileTypes: true }, (error, entries) => this._finishRead(error, entries));
  }
  readlinkSync() {
    if (this.#link) return this.#link;
    if (!this.canReadlink() || !this.parent) return undefined;
    try {
      const target = this.fs.readlinkSync(this.fullpath());
      const parent = this.parent.realpathSync();
      if (parent) this.#link = parent.resolve(target);
      return this.#link;
    } catch (error) { this._fail(error, 'link'); }
  }
  readlink() {
    if (this.#link || !this.canReadlink() || !this.parent) return Promise.resolve(this.#link);
    if (this.#pendingLink) return this.#pendingLink;
    this.#pendingLink = (async () => {
      try { const target = await this.fs.promises.readlink(this.fullpath()); const parent = await this.parent.realpath(); if (parent) this.#link = parent.resolve(target); return this.#link; }
      catch (error) { this._fail(error, 'link'); }
      finally { this.#pendingLink = undefined; }
    })();
    return this.#pendingLink;
  }
  realpathSync() {
    if (this.#real || this.#missing) return this.#real;
    try { return this.#real = this.resolve(this.fs.realpathSync(this.fullpath())); }
    catch (error) { this._fail(error, 'real'); }
  }
  realpath() {
    if (this.#real || this.#missing) return Promise.resolve(this.#real);
    if (this.#pendingReal) return this.#pendingReal;
    this.#pendingReal = (async () => {
      try { return this.#real = this.resolve(await this.fs.promises.realpath(this.fullpath())); }
      catch (error) { this._fail(error, 'real'); }
      finally { this.#pendingReal = undefined; }
    })();
    return this.#pendingReal;
  }
}
for (const kind of kinds.slice(1)) PathBase.prototype['is' + kind] = function () { return this.isType(kind); };
for (const name of ['dev','mode','nlink','uid','gid','rdev','blksize','ino','size','blocks','atimeMs','mtimeMs','ctimeMs','birthtimeMs','atime','mtime','ctime','birthtime'])
  Object.defineProperty(PathBase.prototype, name, { get() { return this._getStat(name); }, configurable: true });
class PathPosix extends PathBase {}
class PathWin32 extends PathBase {}
class PathScurryBase {
  constructor(cwd = process.cwd(), opts = {}) {
    const win = this instanceof PathScurryWin32;
    this.nocase = opts.nocase ?? (win || this instanceof PathScurryDarwin);
    this.sep = win ? /[\\/]/ : '/';
    this._ctx = context(win, this.nocase, new ChildrenCache(opts.childrenCacheSize), opts.fs);
    let text = asString(cwd); if (win) text = windows(text);
    if (!this._ctx.impl.isAbsolute(text)) text = this._ctx.impl.resolve(text);
    const root = rootFor(this._ctx, text);
    this.roots = this._ctx.roots; this.root = root; this.rootPath = root.name;
    this.cwd = root.resolve(text); this._ctx.cwd = this.cwd; this.cwd.isCWD = true;
  }
  get fs() { return this._ctx.fs; }
  _entry(entry) { return entry instanceof PathBase ? entry : entry === undefined ? this.cwd : this.cwd.resolve(asString(entry)); }
  _args(entry, opts) {
    if (entry !== undefined && !(entry instanceof PathBase) && typeof entry !== 'string' && !(entry instanceof URL)) return [this.cwd, entry];
    return [this._entry(entry), opts || {}];
  }
  chdir(path = this.cwd) {
    const next = this._entry(path); this.cwd.isCWD = false; this.cwd = next; next.isCWD = true; this._ctx.cwd = next; this._ctx.resolved.clear();
  }
  isAbsolute(path) { return this._ctx.impl.isAbsolute(path); }
  parseRootPath(path) { return this._ctx.win ? this._ctx.impl.parse(windows(path)).root : '/'; }
  depth(path) { return this._entry(path).depth(); }
  resolve(...parts) {
    const key = parts.length === 1 ? 's:' + parts[0] : 'm:' + JSON.stringify(parts); const cached = this._ctx.resolved.get(key); if (cached !== undefined) return cached;
    let node = this.cwd; for (const part of parts) node = node.resolve(part);
    const result = node.fullpath(); this._ctx.resolved.set(key, result); return result;
  }
  resolvePosix(...parts) { let node = this.cwd; for (const part of parts) node = node.resolve(part); return node.fullpathPosix(); }
  relative(path) { return this._entry(path).relative(); }
  relativePosix(path) { return this._entry(path).relativePosix(); }
  basename(path) { return this._entry(path).name; }
  dirname(path) { return this._entry(path).parentPath; }
  lstat(path) { return this._entry(path).lstat(); }
  lstatSync(path) { return this._entry(path).lstatSync(); }
  readdirSync(path, opts) { const [node, options] = this._args(path, opts); const entries = node.readdirSync(); return options.withFileTypes === false ? entries.map(x => x.name) : entries; }
  async readdir(path, opts) { const [node, options] = this._args(path, opts); const entries = await node.readdir(); return options.withFileTypes === false ? entries.map(x => x.name) : entries; }
  readlinkSync(path, opts) { const [node, options] = this._args(path, opts); const result = node.readlinkSync(); return options.withFileTypes ? result : result?.fullpath(); }
  async readlink(path, opts) { const [node, options] = this._args(path, opts); const result = await node.readlink(); return options.withFileTypes ? result : result?.fullpath(); }
  realpathSync(path, opts) { const [node, options] = this._args(path, opts); const result = node.realpathSync(); return options.withFileTypes ? result : result?.fullpath(); }
  async realpath(path, opts) { const [node, options] = this._args(path, opts); const result = await node.realpath(); return options.withFileTypes ? result : result?.fullpath(); }
  *iterateSync(path, opts) {
    const [start, options] = this._args(path, opts), pending = [start], visited = new Set();
    for (let index = 0; index < pending.length; index++) {
      let node = pending[index]; pending[index] = undefined;
      if (!options.filter || options.filter(node)) yield options.withFileTypes === false ? node.fullpath() : node;
      if (options.follow && node.isSymbolicLink()) { node = node.realpathSync(); if (!node) continue; if (node.isUnknown()) node.lstatSync(); }
      if (!node.canReaddir() || (!options.follow && node.isSymbolicLink()) || visited.has(node) || (options.walkFilter && !options.walkFilter(node))) continue;
      visited.add(node); for (const child of node.readdirSync()) pending.push(child);
    }
  }
  async *iterate(path, opts) {
    const [start, options] = this._args(path, opts), pending = [start], visited = new Set();
    for (let index = 0; index < pending.length; index++) {
      let node = pending[index]; pending[index] = undefined;
      if (!options.filter || options.filter(node)) yield options.withFileTypes === false ? node.fullpath() : node;
      if (options.follow && node.isSymbolicLink()) { node = await node.realpath(); if (!node) continue; if (node.isUnknown()) await node.lstat(); }
      if (!node.canReaddir() || (!options.follow && node.isSymbolicLink()) || visited.has(node) || (options.walkFilter && !options.walkFilter(node))) continue;
      visited.add(node); for (const child of await node.readdir()) pending.push(child);
    }
  }
  walkSync(path, opts) {
    const [start, options] = this._args(path, opts), pending = [start], visited = new Set(), out = [];
    for (let index = 0; index < pending.length; index++) {
      let node = pending[index];
      if (!options.filter || options.filter(node)) out.push(options.withFileTypes === false ? node.fullpath() : node);
      if (options.follow && node.isSymbolicLink()) { node = node.realpathSync(); if (!node) continue; if (node.isUnknown()) node.lstatSync(); }
      if (!node.canReaddir() || (!options.follow && node.isSymbolicLink()) || visited.has(node) || (options.walkFilter && !options.walkFilter(node))) continue;
      visited.add(node); for (const child of node.readdirSync()) pending.push(child);
    }
    return out;
  }
  async walk(path, opts) { const out = []; for await (const row of this.iterate(path, opts)) out.push(row); return out; }
  streamSync(path, opts) {
    const stream = new Minipass({ objectMode: true }), iterator = this.iterateSync(path, opts);
    let busy = false, done = false;
    const pump = () => {
      if (busy || done || stream.destroyed) return; busy = true;
      try { while (!stream.destroyed) { const next = iterator.next(); if (next.done) { done = true; stream.end(); break; } if (!stream.write(next.value)) break; } }
      catch (error) { done = true; stream.destroy(error); }
      finally { busy = false; }
    };
    stream.on('drain', pump); stream.on('resume', pump); stream.on('close', () => iterator.return()); pump(); return stream;
  }
  stream(path, opts) {
    const [start, options] = this._args(path, opts), pending = [start], visited = new Set();
    const stream = new Minipass({ objectMode: true });
    let busy = false, done = false, index = 0, expand;
    const stop = () => { done = true; pending.length = 0; expand = undefined; stream.removeListener('drain', pump); stream.removeListener('resume', pump); };
    const pump = async () => {
      if (busy || done || stream.destroyed) return; busy = true;
      try {
        while (!done && !stream.destroyed) {
          // Expand the last delivered node only after the consumer accepts it.
          // Cached directories need no promise per entry; actual I/O still awaits.
          if (expand) {
            let node = expand; expand = undefined;
            if (options.follow && node.isSymbolicLink()) {
              node = node.realpathCached() || await node.realpath();
              if (node?.isUnknown()) await node.lstat();
            }
            if (done || stream.destroyed) break;
            if (node && node.canReaddir() && (options.follow || !node.isSymbolicLink()) && !visited.has(node) && (!options.walkFilter || options.walkFilter(node))) {
              visited.add(node);
              const rows = node.calledReaddir() ? node.readdirCached() : await node.readdir();
              if (done || stream.destroyed) break;
              for (const child of rows) pending.push(child);
            }
          }
          if (index === pending.length) { stop(); stream.end(); break; }
          const node = pending[index]; pending[index++] = undefined; expand = node;
          if ((!options.filter || options.filter(node)) && !stream.write(options.withFileTypes === false ? node.fullpath() : node)) break;
        }
      } catch (error) { stop(); stream.destroy(error); }
      finally { busy = false; }
    };
    stream.on('drain', pump); stream.on('resume', pump); stream.on('close', stop); pump(); return stream;
  }
  [Symbol.iterator]() { return this.iterateSync(); }
  [Symbol.asyncIterator]() { return this.iterate(); }
}
class PathScurryPosix extends PathScurryBase {}
class PathScurryDarwin extends PathScurryPosix {}
class PathScurryWin32 extends PathScurryBase {}
const Path = process.platform === 'win32' ? PathWin32 : PathPosix;
const PathScurry = process.platform === 'win32' ? PathScurryWin32 : process.platform === 'darwin' ? PathScurryDarwin : PathScurryPosix;
module.exports = { ChildrenCache, ResolveCache, PathBase, PathPosix, PathWin32, Path, PathScurryBase, PathScurryPosix, PathScurryDarwin, PathScurryWin32, PathScurry };
