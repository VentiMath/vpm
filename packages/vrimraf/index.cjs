'use strict';
const fs = require('node:fs'),
  path = require('node:path');
const defaults = Object.freeze({});
const retryable = new Set(['EBUSY', 'EMFILE', 'ENFILE', 'ENOTEMPTY']);
function invalid(message, code = 'ERR_INVALID_ARG_VALUE') {
  return Object.assign(new TypeError(message), { code });
}
function isRimrafOptions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.preserveRoot !== undefined && typeof value.preserveRoot !== 'boolean') return false;
  for (const key of ['maxRetries', 'retryDelay'])
    if (
      value[key] !== undefined &&
      (!Number.isSafeInteger(value[key]) || value[key] < 0 || value[key] > 2147483647)
    )
      return false;
  if (value.filter !== undefined && typeof value.filter !== 'function') return false;
  if (
    value.glob !== undefined &&
    typeof value.glob !== 'boolean' &&
    (!value.glob || typeof value.glob !== 'object' || Array.isArray(value.glob))
  )
    return false;
  if (value.signal !== undefined && (!value.signal || typeof value.signal.aborted !== 'boolean'))
    return false;
  // Windows move/remove strategies are not part of the verified application API.
  for (const key of ['tmp', 'backoff', 'maxBackoff']) if (value[key] !== undefined) return false;
  return true;
}
function assertRimrafOptions(value) {
  if (!isRimrafOptions(value)) throw invalid('Invalid rimraf options');
}
function abort(options) {
  if (options.signal?.aborted) {
    const reason = options.signal.reason;
    throw reason === undefined
      ? Object.assign(new Error('The operation was aborted'), {
          name: 'AbortError',
          code: 'ABORT_ERR',
        })
      : reason;
  }
}
function input(value) {
  const paths = Array.isArray(value) ? value.slice() : [value];
  for (const p of paths) {
    if (typeof p !== 'string') throw invalid('Paths must be strings', 'ERR_INVALID_ARG_TYPE');
    if (!p.length || p.includes('\0'))
      throw invalid('Paths must be nonempty strings without null bytes');
  }
  return paths;
}
function absolute(p) {
  const full = path.resolve(p);
  if (full === path.parse(full).root)
    throw Object.assign(new Error('Refusing to remove a filesystem root'), {
      code: 'ERR_PRESERVE_ROOT',
      path: full,
    });
  return full;
}
function roots(paths) {
  if (paths.length === 1) return [absolute(paths[0])];
  // Validate the complete batch before deleting anything, including root paths
  // returned by glob expansion. Parents subsume descendants, not lexical peers.
  const sorted = [...new Set(paths.map(absolute))].sort((a, b) => a.length - b.length),
    selected = new Set();
  for (const p of sorted) {
    let parent = path.dirname(p),
      covered = false;
    while (parent !== path.dirname(parent)) {
      if (selected.has(parent)) {
        covered = true;
        break;
      }
      parent = path.dirname(parent);
    }
    if (!covered) selected.add(p);
  }
  return [...selected];
}
function options(value) {
  if (value === undefined) return defaults;
  assertRimrafOptions(value);
  const o = { ...value };
  abort(o);
  return o;
}
function globOptions(o) {
  return {
    ...(o.glob === true ? {} : o.glob),
    ...(o.signal ? { signal: o.signal } : {}),
    absolute: true,
    withFileTypes: false,
  };
}
function missing(e) {
  return e.code === 'ENOENT';
}
function changed(p) {
  return Object.assign(new Error('Removal target changed during traversal'), {
    code: 'ESTALE',
    path: p,
  });
}
function same(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.isDirectory() === b.isDirectory() &&
    a.isSymbolicLink() === b.isSymbolicLink()
  );
}
function metadataSync(p) {
  try {
    return fs.lstatSync(p);
  } catch (e) {
    if (missing(e)) return null;
    throw e;
  }
}
async function metadata(p) {
  try {
    return await fs.promises.lstat(p);
  } catch (e) {
    if (missing(e)) return null;
    throw e;
  }
}
function guardSync(frame) {
  if (frame.parent && !same(frame.parent.stat, metadataSync(frame.parent.p) || {}))
    throw changed(frame.parent.p);
}
async function guard(frame) {
  if (frame.parent && !same(frame.parent.stat, (await metadata(frame.parent.p)) || {}))
    throw changed(frame.parent.p);
}
function delaySync(ms) {
  if (ms) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function wait(ms, o) {
  return new Promise((resolve, reject) => {
    const signal = o.signal;
    let timer;
    const clean = () => {
      clearTimeout(timer);
      signal?.removeEventListener?.('abort', cancel);
    };
    const cancel = () => {
      clean();
      try {
        abort(o);
      } catch (e) {
        reject(e);
      }
    };
    timer = setTimeout(() => {
      clean();
      resolve();
    }, ms);
    signal?.addEventListener?.('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
}
function removeSync(p, kind, o) {
  for (let attempt = 0; ; attempt++) {
    abort(o);
    try {
      fs[kind + 'Sync'](p);
      return;
    } catch (e) {
      if (missing(e)) return;
      if (attempt >= (o.maxRetries ?? 0) || !retryable.has(e.code)) throw e;
      delaySync(Math.min(2147483647, (o.retryDelay ?? 100) * (attempt + 1)));
    }
  }
}
async function remove(p, kind, o) {
  for (let attempt = 0; ; attempt++) {
    abort(o);
    try {
      await fs.promises[kind](p);
      return;
    } catch (e) {
      if (missing(e)) return;
      if (attempt >= (o.maxRetries ?? 0) || !retryable.has(e.code)) throw e;
      await wait(Math.min(2147483647, (o.retryDelay ?? 100) * (attempt + 1)), o);
    }
  }
}
function walkSync(root, o) {
  const stack = [{ p: root }];
  let complete = true;
  while (stack.length) {
    abort(o);
    const frame = stack.pop();
    guardSync(frame);
    const stat = metadataSync(frame.p);
    if (!stat) continue;
    if (frame.exit) {
      if (!same(frame.stat, stat)) throw changed(frame.p);
    } else if (stat.isDirectory()) {
      frame.stat = stat;
      frame.exit = true;
      stack.push(frame);
      let children;
      try {
        children = fs.readdirSync(frame.p, { withFileTypes: true });
      } catch (e) {
        if (missing(e)) continue;
        throw e;
      }
      for (let i = children.length - 1; i >= 0; i--)
        stack.push({ p: path.join(frame.p, children[i].name), entry: children[i], parent: frame });
      continue;
    }
    const decision = o.filter ? o.filter(frame.p, frame.entry || stat) : true;
    if (decision && typeof decision.then === 'function')
      throw invalid('Synchronous filters cannot return promises');
    if (!decision) {
      complete = false;
      continue;
    }
    abort(o);
    guardSync(frame);
    const now = metadataSync(frame.p);
    if (!now) continue;
    if (!same(stat, now)) throw changed(frame.p);
    try {
      removeSync(frame.p, stat.isDirectory() ? 'rmdir' : 'unlink', o);
    } catch (e) {
      if (e.code === 'ENOTEMPTY' && o.filter) {
        complete = false;
        continue;
      }
      throw e;
    }
  }
  return complete;
}
async function walk(root, o) {
  const stack = [{ p: root }];
  let complete = true;
  while (stack.length) {
    abort(o);
    const frame = stack.pop();
    await guard(frame);
    const stat = await metadata(frame.p);
    if (!stat) continue;
    if (frame.exit) {
      if (!same(frame.stat, stat)) throw changed(frame.p);
    } else if (stat.isDirectory()) {
      frame.stat = stat;
      frame.exit = true;
      stack.push(frame);
      let children;
      try {
        children = await fs.promises.readdir(frame.p, { withFileTypes: true });
      } catch (e) {
        if (missing(e)) continue;
        throw e;
      }
      for (let i = children.length - 1; i >= 0; i--)
        stack.push({ p: path.join(frame.p, children[i].name), entry: children[i], parent: frame });
      continue;
    }
    if (o.filter && !(await o.filter(frame.p, frame.entry || stat))) {
      complete = false;
      continue;
    }
    abort(o);
    await guard(frame);
    const now = await metadata(frame.p);
    if (!now) continue;
    if (!same(stat, now)) throw changed(frame.p);
    try {
      await remove(frame.p, stat.isDirectory() ? 'rmdir' : 'unlink', o);
    } catch (e) {
      if (e.code === 'ENOTEMPTY' && o.filter) {
        complete = false;
        continue;
      }
      throw e;
    }
  }
  return complete;
}
function rimrafSync(value, opts) {
  const o = options(opts),
    paths = input(value);
  const targets = roots(o.glob ? require('vglob').globSync(paths, globOptions(o)) : paths);
  let result = true;
  for (const p of targets) {
    abort(o);
    if (o.filter || o.signal) {
      if (!walkSync(p, o)) result = false;
    } else
      fs.rmSync(p, {
        force: true,
        recursive: true,
        maxRetries: o.maxRetries ?? 0,
        retryDelay: o.retryDelay ?? 100,
      });
  }
  return result;
}
async function rimraf(value, opts) {
  const o = options(opts),
    paths = input(value);
  const targets = roots(o.glob ? await require('vglob').glob(paths, globOptions(o)) : paths);
  let result = true;
  // Sequential independent roots also avoid alias/case collisions on volumes
  // whose case-sensitivity cannot be inferred from the operating system name.
  for (const p of targets) {
    abort(o);
    if (o.filter || o.signal) {
      if (!(await walk(p, o))) result = false;
    } else
      await fs.promises.rm(p, {
        force: true,
        recursive: true,
        maxRetries: o.maxRetries ?? 0,
        retryDelay: o.retryDelay ?? 100,
      });
  }
  return result;
}
Object.assign(rimraf, { rimraf, rimrafSync, sync: rimrafSync });
module.exports = { rimraf, rimrafSync, sync: rimrafSync, isRimrafOptions, assertRimrafOptions };
