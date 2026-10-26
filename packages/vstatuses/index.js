'use strict';

// Derived from statuses 2.0.2, Copyright (c) 2014 Jonathan Ong and
// Copyright (c) 2016 Douglas Christopher Wilson.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.

const message = Object.freeze(Object.assign(Object.create(null), require('./codes.json')));
const codes = Object.freeze(Object.keys(message).map(Number));
const code = Object.create(null);
for (const number of codes) code[message[number].toLowerCase()] = number;
Object.freeze(code);

function flags(numbers) {
  const table = Object.create(null);
  for (const number of numbers) table[number] = true;
  return Object.freeze(table);
}

function status(value) {
  if (typeof value === 'number' || (typeof value === 'string' && /^[1-5][0-9]{2}$/.test(value))) {
    const result = message[value];
    if (result !== undefined) return result;
    throw new Error('invalid status code: ' + value);
  }
  if (typeof value !== 'string') throw new TypeError('code must be a number or string');
  const result = code[value.toLowerCase()];
  if (result !== undefined) return result;
  throw new Error('invalid status message: "' + value + '"');
}

module.exports = Object.freeze(Object.assign(status, {
  message, code, codes,
  redirect: flags([300, 301, 302, 303, 305, 307, 308]),
  empty: flags([204, 205, 304]),
  retry: flags([502, 503, 504]),
}));
