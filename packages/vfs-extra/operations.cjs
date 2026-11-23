'use strict';
const path = require('node:path');
const {fileURLToPath} = require('node:url');
const fs = require('./native.cjs');
const json = require('vjsonfile');
const {stringify} = require('vjsonfile/utils');

// One operation description drives both APIs. Filesystem errors are thrown back
// into the generator so the recovery rules cannot drift between sync and async.
async function run(iterator) {
  let step = iterator.next();
  while (!step.done) {
    try {
      const [name, ...args] = step.value;
      const value = name === 'filter' ? await args[0](...args.slice(1)) : await fs[name](...args);
      step = iterator.next(value);
    } catch (error) { step = iterator.throw(error); }
  }
  return step.value;
}
function runSync(iterator) {
  let step = iterator.next();
  while (!step.done) {
    try {
      const [name, ...args] = step.value;
      const value = name === 'filter' ? args[0](...args.slice(1)) : fs[name + 'Sync'](...args);
      if (value && typeof value.then === 'function') {
        // Observe a rejected async filter before rejecting the synchronous API.
        Promise.resolve(value).catch(() => {});
        throw new TypeError('A synchronous filesystem operation cannot use an async filter');
      }
      step = iterator.next(value);
    } catch (error) { step = iterator.throw(error); }
  }
  return step.value;
}
function dual(factory) {
  return function (...args) {
    const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
    const promise = run(factory(...args));
    if (!callback) return promise;
    promise.then(value => callback(null, value), error => callback(error));
  };
}
function filename(value) {
  if (Buffer.isBuffer(value)) return value.toString();
  if (ArrayBuffer.isView(value) && value.BYTES_PER_ELEMENT === 1) return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString();
  if (value instanceof URL) return fileURLToPath(value);
  if (typeof value !== 'string' || !value || value.includes('\0')) throw new TypeError('Expected a nonempty filesystem path');
  return value;
}
function options(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Expected filesystem options');
  return value;
}
function failure(message, code = 'EINVAL') { return Object.assign(new Error(message), {code}); }
function protectRoot(file) {
  const absolute = path.resolve(file);
  if (absolute === path.parse(absolute).root) throw failure('Refusing to remove or empty a filesystem root');
}
function same(a, b) { return !!b && a.dev === b.dev && a.ino === b.ino; }
function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function* maybeStat(file, dereference = false) {
  try { return yield [dereference ? 'stat' : 'lstat', file, {bigint:true}]; }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function* canonical(file) {
  let current = path.resolve(file);
  const missing = [];
  for (;;) {
    try { return path.join(yield ['realpath', current], ...missing.reverse()); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current)); current = parent;
    }
  }
}
function* checkPair(src, dest, source, target, moving = false) {
  if (same(source, target)) {
    if (moving && path.basename(src) !== path.basename(dest)
      && path.basename(src).normalize('NFC').toLowerCase() === path.basename(dest).normalize('NFC').toLowerCase()
      && (yield* canonical(path.dirname(src))) === (yield* canonical(path.dirname(dest)))
      && !(yield ['readdir', path.dirname(src)]).includes(path.basename(dest))) return true;
    throw failure('Source and destination must not be the same.');
  }
  if (source.isDirectory()) {
    const a = yield* canonical(src), b = yield* canonical(dest);
    if (within(a, b)) throw failure(`Cannot ${moving ? 'move' : 'copy'} '${src}' to a subdirectory of itself, '${dest}'.`);
    if (within(b, a)) throw failure('Source and destination directory trees must not overlap');
  }
  if (target && source.isDirectory() !== target.isDirectory()) throw failure(source.isDirectory() ? `Cannot overwrite non-directory '${dest}' with directory '${src}'.` : `Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
  return false;
}
function* ensureDir(file, value) {
  file = filename(file);
  const o = typeof value === 'number' ? {mode:value} : options(value);
  return yield ['mkdir', file, {...o, recursive:true}];
}
function* remove(file) {
  file = filename(file); protectRoot(file);
  yield ['rm', file, {recursive:true, force:true}];
}
function* emptyDir(file) {
  file = filename(file); protectRoot(file);
  let entries;
  try {
    protectRoot(yield ['realpath', file]);
    entries = yield ['readdir', file];
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    yield* ensureDir(file); return;
  }
  for (const entry of entries) yield* remove(path.join(file, entry));
}
function* outputFile(file, data, value) {
  // Native descriptors have no parent directory to create.
  if (typeof file !== 'number') { file = filename(file); yield* ensureDir(path.dirname(file)); }
  yield ['writeFile', file, data, value];
}
function* outputJson(file, data, value) {
  // Serialize before creating directories or touching the destination.
  const o = typeof value === 'string' ? {encoding:value} : value;
  const text = stringify(data, o);
  yield* outputFile(file, text, o);
}
function* ensureFile(file) {
  file = filename(file);
  const info = yield* maybeStat(file, true);
  if (info?.isFile()) return;
  yield* ensureDir(path.dirname(file));
  // Append an empty string rather than truncate a file created after the stat.
  yield ['appendFile', file, ''];
}
function* ensureLink(src, dest) {
  src = filename(src); dest = filename(dest);
  const source = yield ['lstat', src, {bigint:true}], target = yield* maybeStat(dest);
  if (same(source, target)) return;
  yield* ensureDir(path.dirname(dest));
  yield ['link', src, dest];
}
function* ensureSymlink(src, dest, type) {
  src = filename(src); dest = filename(dest);
  let targetPath = src, linkText = src;
  if (!path.isAbsolute(src)) {
    const relative = path.resolve(path.dirname(dest), src);
    if (yield* maybeStat(relative, true)) targetPath = relative;
    else linkText = path.relative(path.resolve(path.dirname(dest)), path.resolve(src));
  }
  const source = yield ['stat', targetPath, {bigint:true}], existing = yield* maybeStat(dest);
  if (existing?.isSymbolicLink() && same(source, yield* maybeStat(dest, true))) return;
  yield* ensureDir(path.dirname(dest));
  yield ['symlink', linkText, dest, type || (source.isDirectory() ? 'dir' : 'file')];
}
function* copy(src, dest, value) {
  src = filename(src); dest = filename(dest);
  const o = typeof value === 'function' ? {filter:value} : options(value);
  const overwrite = 'overwrite' in o ? !!o.overwrite : 'clobber' in o ? !!o.clobber : true;
  const first = yield [o.dereference ? 'stat' : 'lstat', src, {bigint:true}];
  yield* checkPair(src, dest, first, yield* maybeStat(dest, !!o.dereference));
  const stack = [{src, dest, ancestors:new Set(), info:first}];
  while (stack.length) {
    const item = stack.pop();
    if (item.mode !== undefined) { yield ['chmod', item.dest, item.mode]; continue; }
    if (o.filter && !(yield ['filter', o.filter, item.src, item.dest])) continue;
    const source = (!o.filter && item.info) || (yield [o.dereference ? 'stat' : 'lstat', item.src, {bigint:true}]);
    const target = yield* maybeStat(item.dest);
    if (same(source, target)) throw failure('Source and destination must not be the same.');
    if (target && source.isDirectory() !== target.isDirectory()) throw failure(source.isDirectory() ? `Cannot overwrite non-directory '${item.dest}' with directory '${item.src}'.` : `Cannot overwrite directory '${item.dest}' with non-directory '${item.src}'.`);
    if (source.isDirectory()) {
      const id = source.dev + ':' + source.ino;
      if (item.ancestors.has(id)) throw failure('Cannot dereference a cyclic directory link', 'ELOOP');
      // An existing destination link could lead back into the source or one of
      // its ancestors. Check each directory before creating descendants.
      yield* checkPair(item.src, item.dest, source, target);
      const next = new Set(item.ancestors); next.add(id);
      if (!target) {
        yield* ensureDir(path.dirname(item.dest));
        yield ['mkdir', item.dest];
        stack.push({dest:item.dest, mode:Number(source.mode)});
      }
      const names = yield ['readdir', item.src];
      for (let i = names.length - 1; i >= 0; i--) stack.push({src:path.join(item.src,names[i]),dest:path.join(item.dest,names[i]),ancestors:next});
      continue;
    }
    if (!source.isFile() && !source.isSymbolicLink()) throw failure('Only regular files, directories and symbolic links can be copied', 'ENOTSUP');
    if (target && !overwrite) {
      if (o.errorOnExist) throw failure(`'${item.dest}' already exists`, 'EEXIST');
      continue;
    }
    let linkText;
    if (source.isSymbolicLink()) {
      linkText = yield ['readlink', item.src];
      if ((target && !target.isSymbolicLink()) || path.resolve(path.dirname(item.src), linkText) === path.resolve(item.dest)) {
        throw failure(`Cannot replace '${item.dest}' with a symbolic link to itself or replace a regular entry with a symbolic link`, 'EEXIST');
      }
    }
    yield* ensureDir(path.dirname(item.dest));
    if (target) yield ['unlink', item.dest];
    if (source.isSymbolicLink()) yield ['symlink', linkText, item.dest];
    else {
      yield ['copyFile', item.src, item.dest];
      if (o.preserveTimestamps) {
        const current = yield ['stat', item.src];
        yield ['utimes', item.dest, current.atime, current.mtime];
      }
      yield ['chmod', item.dest, Number(source.mode)];
    }
  }
}
function* move(src, dest, value) {
  src = filename(src); dest = filename(dest); protectRoot(src); protectRoot(dest);
  const o = options(value), overwrite = !!(o.overwrite || o.clobber);
  const source = yield ['lstat', src, {bigint:true}], target = yield* maybeStat(dest);
  if (source.isSymbolicLink() && target) {
    const resolved = yield* maybeStat(src, true);
    const link = yield ['readlink', src];
    if (same(resolved, target) || path.resolve(path.dirname(src), link) === path.resolve(dest)) throw failure('Cannot move a symbolic link over its own target');
  }
  const cosmetic = yield* checkPair(src, dest, source, target, true);
  if (target && !cosmetic && !overwrite) throw failure('Destination already exists', 'EEXIST');
  yield* ensureDir(path.dirname(dest));
  if (target && !cosmetic) yield* remove(dest);
  try { yield ['rename', src, dest]; }
  catch (error) {
    if (error.code !== 'EXDEV') throw error;
    yield* copy(src, dest, {overwrite, errorOnExist:true, preserveTimestamps:true});
    yield* remove(src);
  }
}
const api = {};
for (const [name, operation] of Object.entries({ensureDir,remove,emptyDir,outputFile,outputJson,ensureFile,ensureLink,ensureSymlink,copy,move})) {
  api[name] = dual(operation);
  api[name + 'Sync'] = (...args) => runSync(operation(...args));
}
api.pathExists = function (file, callback) {
  const promise = fs.access(file).then(() => true, () => false);
  if (typeof callback !== 'function') return promise;
  promise.then(value => callback(null, value));
};
api.pathExistsSync = fs.existsSync;
Object.assign(api, {readJson:json.readFile,readJsonSync:json.readFileSync,writeJson:json.writeFile,writeJsonSync:json.writeFileSync});
for (const [alias, original] of Object.entries({mkdirs:'ensureDir',mkdirp:'ensureDir',emptydir:'emptyDir',createFile:'ensureFile',createLink:'ensureLink',createSymlink:'ensureSymlink',readJSON:'readJson',writeJSON:'writeJson',outputJSON:'outputJson'})) {
  api[alias] = api[original]; api[alias + 'Sync'] = api[original + 'Sync'];
}
module.exports = api;
