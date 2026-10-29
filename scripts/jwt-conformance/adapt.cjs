'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
module.exports = function adapt(directory) {
  function edit(file, from, to, count = 1) {
    const target = path.join(directory, 'test', file);
    const text = fs.readFileSync(target, 'utf8');
    assert.equal(text.split(from).length - 1, count, file + ': exact adaptation count');
    fs.writeFileSync(target, text.split(from).join(to));
  }
  // Nine upstream TODOs explicitly note that non-finite NumericDates should
  // fail. Preserve each input and require the corrected error outcome.
  for (const claim of ['exp', 'nbf']) edit('claim-' + claim + '.test.js',
    `expect(err).to.be.null;\n          expect(decoded).to.have.property('${claim}', null);`,
    `expect(err).to.be.instanceOf(Error);\n          expect(err.message).to.equal('"${claim}" should be a number of seconds');\n          expect(token).to.equal(undefined);`, 3);
  edit('claim-iat.test.js', 'expect(err).to.be.null;\n            expect(jwt.decode(token).iat).to.equal(testCase.expectedIssueAt);',
    `if (testCase.iat !== undefined && !Number.isFinite(testCase.iat)) {
              expect(err).to.be.instanceOf(Error);
              expect(err.message).to.equal('"iat" should be a number of seconds');
              expect(token).to.equal(undefined);
            } else {
              expect(err).to.be.null;
              expect(jwt.decode(token).iat).to.equal(testCase.expectedIssueAt);
            }`);
  edit('encoding.tests.js', "var decoded_name = JSON.parse(atob(token.split('.')[1])).name;", "var decoded_name = JSON.parse(b64_to_utf8(token.split('.')[1])).name;");
  edit('async_sign.tests.js',
    `jwt.sign({ foo: 'bar' }, 'secret', { algorithm: 'none' }, function(err, token) {
        expect(token).to.be.a('string');
        expect(token.split('.')).to.have.length(3);`,
    `jwt.sign({ foo: 'bar' }, 'secret', { algorithm: 'none' }, function(err, token) {
        expect(err.message).to.equal('none algorithm requires a null key');
        expect(token).to.equal(undefined);`);
  // The stream-based upstream implementation left this public API case skipped.
  edit('async_sign.tests.js', "it.skip('should work with none algorithm where secret is falsy'", "it('should work with none algorithm where secret is falsy'");
};
