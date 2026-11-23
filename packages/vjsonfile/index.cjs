'use strict';
const native = require('node:fs');
const {stringify, stripBom} = require('./utils.cjs');

function options(value) {
  if (value === undefined) return {};
  if (typeof value === 'string') return {encoding: value};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('JSON file options must be an object or an encoding string');
  }
  return value;
}

function shouldThrow(o) { return !('throws' in o) || Boolean(o.throws); }
function contextual(error, file) {
  // Preserve the thrown value and error identity, including frozen reviver errors.
  if (error && typeof error.message === 'string') {
    try { error.message = `${file}: ${error.message}`; } catch {}
  }
  return error;
}

function operation(io, name, args) {
  return new Promise((resolve, reject) => {
    // Call as a method: injectable filesystems may depend on their receiver.
    io[name](...args, (error, result) => error ? reject(error) : resolve(result));
  });
}
function complete(promise, callback) {
  if (typeof callback !== 'function') return promise;
  promise.then(value => callback(null, value), error => callback(error));
}
async function read(file, value) {
  const o = options(value), io = o.fs || native;
  // Upstream's async throws:false suppresses JSON/reviver failures, not I/O.
  const data = stripBom(await operation(io, 'readFile', [file, o]));
  try { return JSON.parse(data, o.reviver); }
  catch (error) { if (shouldThrow(o)) throw contextual(error, file); return null; }
}
function readFile(file, value, callback) {
  if (typeof value === 'function') { callback = value; value = undefined; }
  return complete(read(file, value), callback);
}
function readFileSync(file, value) {
  const o = options(value), io = o.fs || native;
  // Keep the established sync API: throws:false suppresses I/O failures too.
  try { return JSON.parse(stripBom(io.readFileSync(file, o)), o.reviver); }
  catch (error) { if (shouldThrow(o)) throw contextual(error, file); return null; }
}
async function write(file, data, value) {
  const o = options(value), io = o.fs || native;
  // Finish serialization before opening/truncating the destination.
  const text = stringify(data, o);
  await operation(io, 'writeFile', [file, text, o]);
}
function writeFile(file, data, value, callback) {
  if (typeof value === 'function') { callback = value; value = undefined; }
  return complete(write(file, data, value), callback);
}
function writeFileSync(file, data, value) {
  const o = options(value), io = o.fs || native, text = stringify(data, o);
  return io.writeFileSync(file, text, o);
}

module.exports = {readFile, readFileSync, writeFile, writeFileSync};
