'use strict';
// Mechanical coverage and local-path checks complement manual documentation
// review. They cannot verify API explanations or performance claims.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const packages = fs.readdirSync(path.join(root, 'packages')).map(name => ({
  name, metadata: require(path.join(root, 'packages', name, 'package.json')),
}));
const comparison = fs.readFileSync(path.join(root, 'IMPROVEMENTS.md'), 'utf8');
const rows = [...comparison.matchAll(/^\| \[([^\]]+)\]\(packages\/([^\)]+)\) \|/gm)];
assert.equal(rows.length, packages.length, 'comparison table must cover each package once');
for (const { name, metadata } of packages) {
  assert.equal(metadata.name, name);
  assert.equal(rows.filter(row => row[1] === name && row[2] === name).length, 1, `${name}: missing or duplicate comparison row`);
  assert.ok(fs.existsSync(path.join(root, 'packages', name, 'README.md')), `${name}: missing README`);
}
const runtimeCount = packages.filter(({ metadata }) => metadata.vpm?.kind !== 'types').length;
assert.equal(Number(comparison.match(/All (\d+) runtime packages'\s+public declarations/)?.[1]), runtimeCount, 'current declaration coverage count is stale');
const files = ['README.md', 'IMPROVEMENTS.md', 'scripts/type-consumers/README.md', 'scripts/express-conformance/README.md', 'scripts/framework-conformance/README.md', ...packages.map(({ name }) => `packages/${name}/README.md`)];
let links = 0;
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/\[[^\]\n]*\]\(([^\)\n]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split(/[?#]/, 1)[0];
    if (!target || /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//')) continue;
    const destination = path.resolve(root, path.dirname(file), decodeURIComponent(target));
    assert.ok(fs.existsSync(destination), `${file}: missing link target ${target}`);
    links++;
  }
}
console.log(`${packages.length} package READMEs, central inventory and ${links} inline local link paths checked. API and evidence review remains manual.`);
