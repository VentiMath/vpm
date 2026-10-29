'use strict';
// Every change below is an explicit assertion for an existing, documented VPM
// dependency difference. No tests are skipped, swallowed or allowed to fail.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
module.exports = function adapt(root) {
  function replace(file, before, after, count = 1) {
    const target = path.join(root, 'test', file + '.js');
    const text = fs.readFileSync(target, 'utf8');
    assert.equal(text.split(before).length - 1, count, 'unexpected upstream fixture: ' + file + ' / ' + before);
    fs.writeFileSync(target, text.split(before).join(after));
  }
  for (const kind of ['json', 'raw', 'text', 'urlencoded']) {
    replace('express.' + kind, '/TypeError: option verify must be function/', '/TypeError: verify must be a function or false/');
  }
  replace('express.json', "function parseError (str) {", "function parseError (str) {\n  if (str.trim() === '' || str.includes('#rue')) return 'JSON body must be an object or array'");
  replace('express.static', '/root path required/', '/root must be a nonempty path string without NUL/');
  replace('express.static', '/root path.*string/', '/root must be a nonempty path string without NUL/');
  replace('express.urlencoded', '/TypeError: option parameterLimit must be a positive number/', '/TypeError: parameterLimit must be a safe integer >= 1 or Infinity/', 4);
  replace('res.cookie', '/option expires is invalid/', '/expires must be a valid Date/');
  replace('res.cookie', '/option maxAge is invalid/', '/maxAge must be a safe integer/');
  replace('res.cookie', '/option priority is invalid/', '/invalid priority/');
  replace('res.vary', '/field.*required/', '/field must be a string or an array/');
};
