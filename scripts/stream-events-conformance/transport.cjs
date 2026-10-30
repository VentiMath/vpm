'use strict';
const {createRequire} = require('node:module');
const path = require('node:path');
const fixture = createRequire(path.resolve(__dirname, '../retry-request-conformance/package.json'));
module.exports = function loadTransport(decorator) {
  const streamEntry = fixture.resolve('stream-events'), teenyEntry = fixture.resolve('teeny-request');
  fixture('stream-events');
  const previous = require.cache[streamEntry].exports, previousTeeny = require.cache[teenyEntry];
  try {
    require.cache[streamEntry].exports = decorator;
    delete require.cache[teenyEntry];
    return fixture('teeny-request').teenyRequest;
  } finally {
    require.cache[streamEntry].exports = previous;
    if (previousTeeny) require.cache[teenyEntry] = previousTeeny; else delete require.cache[teenyEntry];
  }
};
