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
  if (metadata.vpm?.kind !== 'types') {
    assert.equal(metadata.engines?.node, '>=24', `${name}: runtime support must match the Node 24 baseline`);
  }
  assert.equal(rows.filter(row => row[1] === name && row[2] === name).length, 1, `${name}: missing or duplicate comparison row`);
  assert.ok(fs.existsSync(path.join(root, 'packages', name, 'README.md')), `${name}: missing README`);
}
const runtimeCount = packages.filter(({ metadata }) => metadata.vpm?.kind !== 'types').length;
assert.equal(Number(comparison.match(/All (\d+) runtime packages'\s+public declarations/)?.[1]), runtimeCount, 'current declaration coverage count is stale');
const files = ['scripts/gax-conformance/README.md', 'scripts/otel-conformance/README.md', 'scripts/grpc-conformance/README.md', 'scripts/ordered-map-conformance/README.md', 'scripts/grpc-loader-conformance/README.md', 'scripts/camelcase-conformance/README.md', 'scripts/protojson-conformance/README.md', 'scripts/protobuf-conformance/README.md', 'scripts/long-conformance/README.md', 'scripts/object-hash-conformance/README.md', 'scripts/storage-conformance/README.md', 'scripts/mime-conformance/README.md', 'scripts/xml-parser-conformance/README.md', 'scripts/xml-builder-conformance/README.md', 'scripts/nodable-entities-conformance/README.md', 'scripts/path-matcher-conformance/README.md', 'scripts/xml-helpers-conformance/README.md', 'scripts/numbers-conformance/README.md', 'scripts/entities-conformance/README.md', 'docs/DEVELOPMENT.md', 'scripts/retry-conformance/README.md', 'scripts/queue-limit-conformance/README.md', 'scripts/cloud-utils-conformance/README.md', 'scripts/paginator-conformance/README.md', 'scripts/duplexify-conformance/README.md', 'scripts/teeny-conformance/README.md', 'scripts/http-proxy-conformance/README.md', 'scripts/stream-events-conformance/README.md', 'scripts/retry-request-conformance/README.md', 'scripts/google-auth-conformance/README.md', 'scripts/google-http-conformance/README.md', 'README.md', 'IMPROVEMENTS.md', 'scripts/type-consumers/README.md', 'scripts/express-conformance/README.md', 'scripts/framework-conformance/README.md', 'scripts/router-conformance/README.md', 'scripts/legacy-typescript/README.md', 'scripts/jwt-conformance/README.md', 'scripts/jwks-conformance/README.md', 'scripts/agent-conformance/README.md', 'scripts/https-proxy-conformance/README.md', ...packages.map(({ name }) => `packages/${name}/README.md`)];
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
