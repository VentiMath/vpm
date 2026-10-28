'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { isUtf8 } = require('node:buffer');
const readFlags = fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0);
const own = (object, key) => Object.hasOwn(object, key) ? object[key] : undefined;
const absent = error => error.code === 'ENOENT' || error.code === 'ENOTDIR';

class PackageJsonError extends SyntaxError {
  constructor(filePath, reason, position) {
    super(reason + ' in ' + filePath + (position === undefined ? '' : ' at position ' + position));
    this.name = 'PackageJsonError';
    this.code = 'ERR_INVALID_PACKAGE_JSON';
    this.path = filePath;
    if (position !== undefined) this.position = position;
  }
}
function asPath(value, name) {
  if (typeof value !== 'string') value = fileURLToPath(value);
  if (value.includes('\0')) throw new TypeError(name + ' must not contain null bytes');
  return value;
}
function configure(options) {
  if (options == null) options = {};
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  const cwd = own(options, 'cwd'), stopAt = own(options, 'stopAt');
  const normalize = own(options, 'normalize'), type = own(options, 'type');
  if (normalize !== undefined && normalize !== false) throw new TypeError('metadata normalization is unsupported; use normalize: false');
  if (type !== undefined && type !== 'file') throw new TypeError('type must be file');
  const base = process.cwd();
  const directory = cwd === undefined ? base : path.resolve(base, asPath(cwd, 'cwd'));
  const stop = stopAt === undefined ? path.parse(directory).root : path.resolve(directory, asPath(stopAt, 'stopAt'));
  const relative = path.relative(stop, directory);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    throw new TypeError('stopAt must be the starting directory or one of its ancestors');
  }
  // Count parents once: on Windows, an ancestor may use different casing from
  // cwd. Comparing the original strings could walk past that boundary forever.
  const parents = relative === '' ? 0 : relative.split(path.sep).length;
  return { directory, parents };
}
function decode(buffer, filePath) {
  if (!isUtf8(buffer)) throw new PackageJsonError(filePath, 'Invalid UTF-8');
  let source = buffer.toString('utf8');
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);
  let packageJson;
  try { packageJson = JSON.parse(source); }
  catch (error) {
    const position = /\bposition (\d+)/.exec(error.message);
    throw new PackageJsonError(filePath, 'Invalid JSON', position ? Number(position[1]) : undefined);
  }
  if (packageJson === null || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
    throw new PackageJsonError(filePath, 'Expected a JSON object');
  }
  return { packageJson, path: filePath };
}
// The sync precheck avoids exception allocation for every absent parent. Recheck
// the opened descriptor so a path replacement cannot turn a file into a device.
function readCandidateSync(filePath) {
  let stats;
  try { stats = fs.statSync(filePath, { throwIfNoEntry: false }); }
  catch (error) { if (absent(error)) return; throw error; }
  if (!stats?.isFile()) return;
  let fd;
  try { fd = fs.openSync(filePath, readFlags); }
  catch (error) { if (absent(error) || error.code === 'EISDIR') return; throw error; }
  let failed = false;
  try {
    if (!fs.fstatSync(fd).isFile()) return;
    return fs.readFileSync(fd);
  } catch (error) { failed = true; throw error; }
  finally {
    try { fs.closeSync(fd); }
    catch (error) { if (!failed) throw error; }
  }
}
function readPackageUpSync(options) {
  let { directory, parents } = configure(options);
  while (true) {
    const filePath = path.join(directory, 'package.json');
    const buffer = readCandidateSync(filePath);
    if (buffer !== undefined) return decode(buffer, filePath);
    if (parents-- === 0) return;
    directory = path.dirname(directory);
  }
}
async function readPackageUp(options) {
  const { directory: start, parents } = configure(options);
  return new Promise((resolve, reject) => {
    function visit(directory, remaining) {
      const filePath = path.join(directory, 'package.json');
      function advance() { if (remaining === 0) resolve(undefined); else visit(path.dirname(directory), remaining - 1); }
      fs.open(filePath, readFlags, (error, fd) => {
        if (error) { if (absent(error) || error.code === 'EISDIR') advance(); else reject(error); return; }
        function close(error, buffer) {
          fs.close(fd, closeError => {
            if (error || closeError) { reject(error || closeError); return; }
            if (buffer === undefined) { advance(); return; }
            try { resolve(decode(buffer, filePath)); } catch (error) { reject(error); }
          });
        }
        fs.fstat(fd, (error, stats) => {
          if (error) { close(error); return; }
          if (!stats.isFile()) { close(); return; }
          fs.readFile(fd, (error, buffer) => close(error, buffer));
        });
      });
    }
    visit(start, parents);
  });
}
exports.readPackageUp = readPackageUp;
exports.readPackageUpSync = readPackageUpSync;
exports.PackageJsonError = PackageJsonError;
Object.freeze(module.exports);
