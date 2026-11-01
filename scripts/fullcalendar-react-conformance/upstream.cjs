'use strict';
// Retained upstream sources are verified against SHA256.json before use.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
exports.verify = () => {
  for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
  }
  assert.equal(require('./node_modules/@fullcalendar/react/package.json').version, '7.1.3');
};
exports.write = () => {
  const out = {}, walk = dir => {
    for (const entry of fs.readdirSync(path.join(__dirname, 'upstream', dir), {withFileTypes: true})) {
      const file = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file !== 'SHA256.json') out[file] = createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex');
    }
  };
  walk('');
  fs.writeFileSync(path.join(__dirname, 'upstream/SHA256.json'), JSON.stringify(Object.fromEntries(Object.entries(out).sort()), null, 2) + '\n');
};
if (require.main === module && process.argv[2] === '--write') exports.write();
