'use strict';
const fs = require('node:fs');
const api = {...fs};

// Keep callbacks native, and resolve the same result when a callback is omitted.
// This preserves numeric descriptors from open(), unlike fs.promises.open().
const methods = 'access appendFile chmod chown close copyFile cp fchmod fchown fdatasync fstat fsync ftruncate futimes glob lchmod lchown lutimes link lstat mkdir mkdtemp open opendir readdir readFile readlink realpath rename rm rmdir stat statfs symlink truncate unlink utimes writeFile'.split(' ');
function bridge(method, names, padRead = false) {
  return function (...args) {
    if (typeof args.at(-1) === 'function') return method(...args);
    if (padRead && typeof args[2] === 'number') while (args.length < 5) args.push(undefined);
    return new Promise((resolve, reject) => method(...args, (error, ...values) => {
      if (error) reject(error);
      else resolve(names ? Object.fromEntries(names.map((name, i) => [name, values[i]])) : values[0]);
    }));
  };
}
for (const name of methods) if (typeof fs[name] === 'function') api[name] = bridge(fs[name].bind(fs));
for (const [name, fields] of Object.entries({read: ['bytesRead', 'buffer'], write: ['bytesWritten', 'buffer'], readv: ['bytesRead', 'buffers'], writev: ['bytesWritten', 'buffers']})) {
  api[name] = bridge(fs[name].bind(fs), fields, name === 'read');
}
api.exists = function (file, callback) {
  return typeof callback === 'function' ? fs.exists(file, callback) : new Promise(resolve => fs.exists(file, resolve));
};
if (fs.realpath.native) api.realpath.native = bridge(fs.realpath.native.bind(fs));
module.exports = api;
