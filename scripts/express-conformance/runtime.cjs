'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// Bun 1.4.0 fails these same six cases against unchanged Express 5.3.0.
// Keep them visible as pending, rather than rewriting the expected HTTP result.
module.exports = function runtime(root) {
  function replace(file, before, after) {
    const target = path.join(root, 'test', file + '.js'), text = fs.readFileSync(target, 'utf8');
    assert.equal(text.split(before).length - 1, 1, file + ': runtime fixture drift');
    fs.writeFileSync(target, text.replace(before, after));
  }
  for (const title of ['should fall-through when URL too long', 'should 404 when URL too long']) {
    replace('express.static', "it('" + title + "'", "it.skip('" + title + "'");
  }
  replace('req.fresh', `it('should ignore "If-Modified-Since" when "If-None-Match" is present'`, `it.skip('should ignore "If-Modified-Since" when "If-None-Match" is present'`);
  replace('res.send', "it('should not add Content-Length header if Transfer-Encoding header is equal to ' + encoding", "(encoding === 'chunked' ? it : it.skip)('should not add Content-Length header if Transfer-Encoding header is equal to ' + encoding");
};
