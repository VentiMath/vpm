'use strict';

const { PathScurryPosix, PathScurryDarwin, PathScurryWin32 } = require('vpath-scurry');
const { Minimatch, GLOBSTAR, escape, unescape } = require('vminimatch');
const { Minipass } = require('vminipass');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

const strings = value => {
  const result = Array.isArray(value) ? value.slice() : [value];
  if (result.some(p => typeof p !== 'string')) throw new TypeError('glob patterns must be strings');
  return result;
};
const mmOptions = options => ({ ...options, nonegate: true, nocomment: true, braceExpandMax: options.braceExpandMax ?? 1000 });
const hasMagic = (patterns, options = {}) => strings(patterns).some(p => new Minimatch(p, mmOptions(options)).hasMagic());
const optionNames = 'absolute cwd dot dotRelative follow ignore magicalBraces mark matchBase maxDepth nobrace nocase nodir noext normalize noglobstar platform realpath root scurry stat signal windowsPathsNoEscape allowWindowsEscape withFileTypes fs posix includeChildMatches braceExpandMax'.split(' ');

class Ignore {
  constructor(patterns, options = {}, cwd) {
    this.options = { ...mmOptions(options), dot: true };
    this.root = options.root === undefined ? undefined : (cwd ? cwd.resolve(options.root).fullpathPosix() : path.resolve(options.cwd || process.cwd(), options.root).replace(/\\/g, '/'));
    this.rules = [];
    for (const pattern of strings(patterns)) this.add(pattern);
  }
  add(pattern) {
    const matcher = new Minimatch(pattern, this.options);
    for (const expanded of matcher.globSet) {
      const absolute = /^(?:\/|[a-z]:[\\/])/i.test(expanded);
      const prune = /\/\*\*$/.test(expanded);
      const rooted = absolute && this.root !== undefined && expanded.startsWith('/')
        ? escape(this.root, { magicalBraces: true }) + expanded : expanded;
      this.rules.push({ absolute, matcher: new Minimatch(rooted, { ...this.options, nobrace: true }),
        parent: prune ? new Minimatch(rooted.replace(/(?:\/\*\*)+$/, '') || '/', { ...this.options, nobrace: true }) : null });
    }
  }
  ignored(entry, relative) {
    return this.rules.some(rule => {
      const name = rule.absolute ? entry.fullpathPosix() : relative ?? (entry.relativePosix() || '.');
      return rule.matcher.match(name) || rule.matcher.match(name + '/') || !!rule.parent?.match(name);
    });
  }
  childrenIgnored(entry, relative) {
    return this.rules.some(rule => rule.parent?.match(rule.absolute ? entry.fullpathPosix() : relative ?? (entry.relativePosix() || '.')));
  }
}

class Glob {
  constructor(pattern, options = {}) {
    this.pattern = strings(pattern);
    this.opts = { ...options };
    for (const key of optionNames) if (key in options) this[key] = options[key];
    if (options.withFileTypes && options.absolute !== undefined) throw new Error('cannot set absolute and withFileTypes:true');
    if (options.matchBase && options.noglobstar) throw new Error('base matching requires globstar');
    this.platform = options.platform || process.platform;
    this.cwd = options.cwd ?? options.scurry?.cwd.fullpath() ?? process.cwd();
    if (typeof this.cwd !== 'string' || this.cwd.startsWith('file:')) this.cwd = fileURLToPath(this.cwd);
    this.nocase = options.nocase ?? (this.platform === 'win32' || this.platform === 'darwin');
    this.withFileTypes = !!options.withFileTypes;
    this.includeChildMatches = options.includeChildMatches !== false;
    this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options.allowWindowsEscape === false;
    const Scurry = this.platform === 'win32' ? PathScurryWin32 : this.platform === 'darwin' ? PathScurryDarwin : PathScurryPosix;
    this.scurry = options.scurry || new Scurry(this.cwd, { nocase: this.nocase, fs: options.fs });
    if (options.nocase !== undefined && this.nocase !== this.scurry.nocase) throw new Error('nocase conflicts with scurry');
    this.nocase = this.scurry.nocase;
    this._path = this.platform === 'win32' ? path.win32 : path.posix;
    this._base = this.scurry.cwd.resolve(this._path.resolve(this.cwd));
    this._basePath = this._base.fullpath();
    this._basePrefix = this._basePath.endsWith(this._path.sep) ? this._basePath : this._basePath + this._path.sep;
    this._names = new WeakMap();
    this._depth = this._base.depth() + (options.maxDepth ?? Infinity);
    this._ignore = typeof options.ignore === 'object' && !Array.isArray(options.ignore) && options.ignore !== null
      ? options.ignore : new Ignore(options.ignore || [], { ...options, nocase: this.nocase }, this._base);
    if (!this.includeChildMatches && typeof this._ignore.add !== 'function') throw new Error('includeChildMatches:false requires an ignore.add method');
    this._plans = [];
    const matchOptions = { ...mmOptions(options), nocase: this.nocase, windowsPathsNoEscape: this.windowsPathsNoEscape,
      nocaseMagicOnly: this.platform === 'darwin' || this.platform === 'win32' };
    for (let p of this.pattern) {
      if (this.windowsPathsNoEscape) p = p.replace(/\\/g, '/');
      if (options.matchBase && !p.includes('/')) p = './**/' + p;
      if (!p) continue;
      const matcher = new Minimatch(p, matchOptions);
      for (const raw of matcher.set) {
        const parts = raw.slice();
        let start = this._base, absolute = false;
        if (this.platform === 'win32' && typeof parts[0] === 'string' && /^[a-z]:$/i.test(parts[0])) {
          start = start.resolve(parts.shift() + '/'); absolute = true;
        } else if (this.platform === 'win32' && parts[0] === '' && parts[1] === '' && parts[2] && parts[3]) {
          start = start.resolve('//'+parts[2]+'/'+parts[3]+'/'); parts.splice(0, 4); absolute = true;
        } else if (parts[0] === '') {
          start = options.root === undefined ? start.resolve('/') : start.resolve(options.root);
          parts.shift(); absolute = true;
        }
        this._plans.push({ start, parts, absolute });
      }
    }
  }
  _check() { if (this.signal?.aborted) throw this.signal.reason; }
  _relative(node) {
    const full = node.fullpath(), cached = this._names.get(node);
    if (cached?.full === full) return cached.relative;
    const relative = full.startsWith(this._basePrefix) ? full.slice(this._basePrefix.length) : this._path.relative(this._basePath, full) || '.';
    this._names.set(node, { full, relative });
    return relative;
  }

  // Matching is a stack of (path, segment) states. The same generator requests
  // filesystem work from either the synchronous or asynchronous driver.
  *_scan() {
    const emitted = new Set(), parents = new Set();
    const ignore = this._ignore instanceof Ignore
      ? Object.assign(Object.create(Ignore.prototype), this._ignore, { rules: this._ignore.rules.slice() }) : this._ignore;
    const ownIgnore = ignore instanceof Ignore;
    const ignoreName = node => {
      if (node !== this._base && !node.fullpath().startsWith(this._basePrefix)) return node.relativePosix() || '.';
      return this.platform === 'win32' ? this._relative(node).replace(/\\/g, '/') : this._relative(node);
    };
    const ignored = node => ownIgnore ? ignore.rules.length > 0 && ignore.ignored(node, ignoreName(node)) : ignore.ignored?.(node);
    const childrenIgnored = node => ownIgnore ? ignore.rules.length > 0 && ignore.childrenIgnored(node, ignoreName(node)) : ignore.childrenIgnored?.(node);
    const underMatch = node => { for (let p = node.parent; p; p = p.parent) if (parents.has(p)) return true; return false; };
    for (const plan of this._plans) {
      const visited = new Map();
      const stack = [{ node: plan.start, i: 0, links: 1, recursive: false, ancestors: null }];
      while (stack.length) {
        this._check();
        const state = stack.pop(), { node, i } = state, part = plan.parts[i];
        if ((this._depth !== Infinity && node.depth() > this._depth) || (!this.includeChildMatches && underMatch(node))) continue;
        if (i < plan.parts.length) {
          let seen = visited.get(node);
          if (!seen) visited.set(node, seen = new Set());
          const key = i * 8 + (state.noChildren ? 4 : 0) + (state.links ? 2 : 0) + Number(state.recursive);
          if (seen.has(key)) continue;
          seen.add(key);
        }
        if (node.isUnknown() && !(yield { op: 'lstat', node })) continue;
        if (node.isENOENT()) continue;
        if (i === plan.parts.length) {
          if (this.stat && !(yield { op: 'lstat', node })) continue;
          if (this.nodir && node.isDirectory()) continue;
          if (this.nodir && this.follow && node.isSymbolicLink()) {
            const target = yield { op: 'realpath', node };
            if (target && (target.isDirectory() || (target.isUnknown() && (yield { op: 'lstat', node: target })?.isDirectory()))) continue;
          }
          if (ignored(node)) continue;
          let result = node;
          if (this.realpath) { result = yield { op: 'realpath', node }; if (!result) continue; }
          let value;
          if (this.withFileTypes) value = result;
          else {
            const absolute = this.absolute === undefined ? plan.absolute : this.absolute;
            value = absolute ? (this.posix ? result.fullpathPosix() : result.fullpath()) : this._relative(result);
            if (this.posix && this.platform === 'win32') value = value.replace(/\\/g, '/');
            if (!absolute && this.dotRelative && value !== '.' && value !== '..' && !value.startsWith('../') && !value.startsWith('..\\')) value = '.' + (this.posix ? '/' : this._path.sep) + value;
            if (this.mark && result.isDirectory() && !/[\\/]$/.test(value)) value += '/';
          }
          if (emitted.has(value)) continue;
          emitted.add(value);
          if (!this.includeChildMatches) {
            parents.add(node);
            ignore.add(escape(node.fullpathPosix(), { magicalBraces: true }) + '/**');
          }
          yield { value };
          continue;
        }
        if (part === '') {
          if (i !== plan.parts.length - 1) continue;
          if (this.nodir) continue;
          const directory = node.isDirectory() || (node.isSymbolicLink() && !state.noChildren);
          if (directory) stack.push({ ...state, i: i + 1 });
          continue;
        }
        if (part === '.' && (node.isDirectory() || node.isSymbolicLink())) {
          stack.push({ ...state, i: i + 1 });
          continue;
        }
        const noChildren = state.noChildren || (node.isSymbolicLink() && state.recursive && !this.follow && (i === 0 || !state.links));
        if (part === GLOBSTAR) stack.push({ ...state, i: i + 1, recursive: false, noChildren });
        if (noChildren || childrenIgnored(node) || (!node.isDirectory() && !node.isSymbolicLink())) continue;
        if (part === GLOBSTAR && node.isSymbolicLink() && state.recursive && !this.follow) continue;
        let ancestors = state.ancestors;
        let links = state.links;
        if (node.isSymbolicLink() && state.recursive && !this.follow) {
          if (i === 0 || !links) continue;
          links--;
        }
        if (this.follow && part === GLOBSTAR) {
          const real = yield { op: 'realpath', node };
          if (!real) continue;
          const name = real.fullpath();
          let cycle = false;
          for (let a = ancestors; a; a = a.parent) if (a.name === name) { cycle = true; break; }
          if (cycle) continue;
          ancestors = { name, parent: ancestors };
        }
        if (typeof part === 'string') {
          stack.push({ node: node.resolve(part), i: i + 1, links: 1, recursive: false, ancestors: null });
        } else {
          const entries = yield { op: 'readdir', node };
          // Children go beneath the epsilon state so ** yields parents first.
          const next = [];
          for (const child of entries) {
            if (part === GLOBSTAR && i + 1 < plan.parts.length && !child.isUnknown() && !child.isDirectory() && !child.isSymbolicLink()) continue;
            if (part === GLOBSTAR ? this.dot || child.name[0] !== '.' : part.test(this.normalize ? child.name.normalize(this.normalize === true ? 'NFC' : this.normalize) : child.name)) {
              next.push({ node: child, i: part === GLOBSTAR ? i : i + 1, links,
                recursive: part === GLOBSTAR, ancestors: part === GLOBSTAR ? ancestors : null });
            }
          }
          if (part === GLOBSTAR) {
            const epsilon = stack.pop();
            for (let j = next.length - 1; j >= 0; j--) stack.push(next[j]);
            stack.push(epsilon);
          } else for (let j = next.length - 1; j >= 0; j--) stack.push(next[j]);
        }
      }
    }
  }
  *iterateSync() {
    const scan = this._scan(); let input;
    try {
      for (;;) {
        const step = scan.next(input); if (step.done) return;
        const request = step.value;
        if (request.op) input = request.node[request.op + 'Sync']();
        else { yield request.value; input = undefined; }
      }
    } finally { scan.return(); }
  }
  async *iterate() {
    const scan = this._scan(); let input, abort, onAbort;
    if (this.signal) {
      abort = new Promise((_, reject) => { onAbort = () => reject(this.signal.reason); this.signal.addEventListener('abort', onAbort, { once: true }); });
      // A paused iterator can be aborted between next() calls.
      abort.catch(() => {});
    }
    try {
      for (;;) {
        this._check();
        const step = scan.next(input); if (step.done) return;
        const request = step.value;
        if (request.op) {
          if (request.op === 'readdir' && request.node.calledReaddir()) { input = request.node.readdirCached(); continue; }
          const work = request.node[request.op]();
          input = await (abort ? Promise.race([work, abort]) : work);
        } else { yield request.value; input = undefined; }
      }
    } finally { scan.return(); if (onAbort) this.signal.removeEventListener('abort', onAbort); }
  }
  walkSync() { return [...this.iterateSync()]; }
  async walk() { const matches = []; for await (const match of this.iterate()) matches.push(match); return matches; }
  streamSync() { return makeStream(this.iterateSync(), false, this.signal); }
  stream() { return makeStream(this.iterate(), true, this.signal); }
  [Symbol.iterator]() { return this.iterateSync(); }
  [Symbol.asyncIterator]() { return this.iterate(); }
}

function makeStream(iterator, asynchronous, signal) {
  const stream = new Minipass({ objectMode: true });
  let busy = false, closed = false;
  const abort = () => { if (!stream.destroyed) stream.destroy(signal.reason); };
  const close = () => { const result = iterator.return(); result?.catch?.(() => {}); signal?.removeEventListener('abort', abort); };
  stream.close = () => { if (!closed) { closed = true; stream.emit('close'); } };
  stream.once('close', close); stream.once('end', close);
  const pumpSync = () => {
    if (busy || stream.destroyed || signal?.aborted) return;
    busy = true;
    try { while (!stream.destroyed) { const next = iterator.next(); if (next.done) { stream.end(); break; } if (!stream.write(next.value)) break; } }
    catch (error) { stream.destroy(error); }
    finally { busy = false; }
  };
  const pumpAsync = async () => {
    if (busy || stream.destroyed || signal?.aborted) return;
    busy = true;
    try { while (!stream.destroyed) { const next = await iterator.next(); if (stream.destroyed) break; if (next.done) { stream.end(); break; } if (!stream.write(next.value)) break; } }
    catch (error) { if (!stream.destroyed) stream.destroy(error); }
    finally { busy = false; }
  };
  const pump = asynchronous ? pumpAsync : pumpSync;
  stream.on('drain', pump); stream.on('resume', pump);
  if (signal?.aborted) queueMicrotask(abort);
  else { signal?.addEventListener('abort', abort, { once: true }); if (asynchronous) queueMicrotask(pump); else pump(); }
  return stream;
}

const glob = async (pattern, options) => new Glob(pattern, options).walk();
const globSync = (pattern, options) => new Glob(pattern, options).walkSync();
const globIterate = (pattern, options) => new Glob(pattern, options).iterate();
const globIterateSync = (pattern, options) => new Glob(pattern, options).iterateSync();
const globStream = (pattern, options) => new Glob(pattern, options).stream();
const globStreamSync = (pattern, options) => new Glob(pattern, options).streamSync();
Object.assign(globSync, { stream: globStreamSync, iterate: globIterateSync });
globStream.sync = globStreamSync; globIterate.sync = globIterateSync;
const api = { Glob, Ignore, hasMagic, escape, unescape, glob, globSync, globIterate, globIterateSync, globStream, globStreamSync,
  sync: globSync, iterate: globIterate, iterateSync: globIterateSync, stream: globStream, streamSync: globStreamSync };
Object.assign(glob, api);
module.exports = api;
