'use strict';
// Separate named recursors let runtimes optimize React and ordinary callers
// independently, while keeping one source for the comparison contract.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../packages/vfast-deep-equal');
const template = fs.readFileSync(path.join(root, 'src/equal.js.txt'), 'utf8');
for (const [file, react] of [['index.js', false], ['react.js', true]]) {
  assert.equal(template.split('      /* REACT_OWNER */\n').length, 2);
  const source = template.replace('      /* REACT_OWNER */\n', () => react ? "      if (key === '_owner' && a.$$typeof) continue;\n" : '');
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), source, file);
  else fs.writeFileSync(path.join(root, file), source);
}
