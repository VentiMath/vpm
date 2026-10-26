'use strict';

// Derived from http-errors 2.0.1, Copyright (c) 2014 Jonathan Ong and
// Copyright (c) 2016 Douglas Christopher Wilson. Copyright (c) 2026 VentiMath.
// MIT licensed; see LICENSE.
const statuses = require('vstatuses');
const constructors = Object.create(null);

module.exports = createError;
createError.HttpError = HttpError;
createError.isHttpError = isHttpError;
inherit(HttpError, Error);

for (const code of statuses.codes) {
  if (!validStatus(code)) continue;
  const name = statuses.message[code].replace(/(^| )[a-z]/g, part => part.toUpperCase()).replace(/[^0-9A-Za-z_]/g, '');
  const className = name.endsWith('Error') ? name : name + 'Error';
  function StatusError(message) {
    return makeError(StatusError, message, StatusError, new.target?.prototype);
  }
  Object.defineProperty(StatusError, 'name', { value: className, configurable: true });
  inherit(StatusError, HttpError);
  Object.assign(StatusError.prototype, { status: code, statusCode: code, expose: code < 500 });
  constructors[code] = StatusError;
  createError[code] = createError[name] = StatusError;
}

function createError(...args) {
  let error;
  let message;
  let status = 500;
  let properties;
  for (let i = 0; i < args.length; i++) {
    const value = args[i];
    if (value instanceof Error) {
      error = value;
      const primary = error.status;
      const secondary = validStatus(primary) ? primary : error.statusCode;
      if (validStatus(secondary)) status = secondary;
    } else if (typeof value === 'number' && i === 0) status = value;
    else if (typeof value === 'string') message = value;
    else if (typeof value === 'object') properties = value;
    else throw new TypeError('argument #' + (i + 1) + ' unsupported type ' + typeof value);
  }
  if (!validStatus(status)) status = 500;
  const Constructor = constructors[status] || constructors[Math.floor(status / 100) * 100];
  if (!error) error = makeError(Constructor, message, createError);
  if (!(error instanceof Constructor) || error.status !== status || error.statusCode !== status) {
    error.expose = status < 500;
    error.status = error.statusCode = status;
  }
  if (properties) {
    for (const key of Object.keys(properties)) {
      if (key !== 'status' && key !== 'statusCode' && key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
        error[key] = properties[key];
      }
    }
  }
  return error;
}

function validStatus(status) {
  return Number.isInteger(status) && status >= 400 && status <= 599;
}

function HttpError() {
  throw new TypeError('cannot construct abstract class');
}

function inherit(Constructor, Parent) {
  Constructor.super_ = Parent;
  Constructor.prototype = Object.create(Parent.prototype, {
    constructor: { value: Constructor, writable: true, configurable: true },
  });
}

function makeError(Constructor, message, stackStart, prototype = Constructor.prototype) {
  const text = message == null ? statuses.message[Constructor.prototype.status] : message;
  const error = new Error(text);
  Object.setPrototypeOf(error, prototype);
  Error.captureStackTrace(error, stackStart);
  Object.defineProperties(error, {
    message: { value: text, enumerable: true, writable: true, configurable: true },
    name: { value: Constructor.name, writable: true, configurable: true },
  });
  return error;
}

function isHttpError(value) {
  return value instanceof Error && validStatus(value.status) && value.status === value.statusCode &&
    typeof value.expose === 'boolean';
}
