'use strict';
// Reproduce the declaration forks from pinned, independently installed sources.
// Usage: node scripts/sync-types.cjs [--check] [path/to/baseline/node_modules]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const modules = path.resolve(process.argv.slice(2).find(arg => arg !== '--check') || path.join(__dirname, 'type-consumers/node_modules'));
const lock = JSON.parse(fs.readFileSync(path.join(modules, '../package-lock.json'), 'utf8'));
const web = `// Node's web globals need these APIs, not the full client/mock barrel.\nexport * from './fetch';\nexport * from './formdata';\nexport * from './websocket';\nexport * from './eventsource';\n`;
const nodeCompatibility = `// Resolve third-party reference types="node" to a single VPM declaration tree.\n/// <reference types="vnode-types" />\n`;
function declarations(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.isDirectory() && entry.name !== 'node_modules') return declarations(path.join(directory, entry.name), relative + '/');
    return entry.isFile() && entry.name.endsWith('.d.ts') ? [relative] : [];
  }).sort();
}
function once(text, from, to) {
  assert.equal(text.split(from).length - 1, 1, 'upstream patch context changed: ' + from);
  return text.replace(from, to);
}
function save(file, text) {
  if (check) assert.equal(fs.readFileSync(file, 'utf8'), text, 'generated file differs: ' + file);
  else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
}
for (const [original, name, version] of [['undici-types', 'vundici-types', '6.21.0'], ['@types/node', 'vnode-types', '22.20.5']]) {
  const source = path.join(modules, original);
  const destination = path.join(root, 'packages', name);
  const upstream = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  assert.equal(upstream.version, version);
  const hashes = {};
  const changed = [];
  const omitted = [];
  for (const file of declarations(source)) {
    const originalText = fs.readFileSync(path.join(source, file), 'utf8');
    hashes[file] = createHash('sha256').update(originalText).digest('hex');
    if (name === 'vnode-types' && file.startsWith('ts5.6/')) {
      omitted.push(file);
      const target = path.join(destination, file);
      if (check) assert.ok(!fs.existsSync(target), 'legacy compatibility file must be absent: ' + file);
      else fs.rmSync(target, { force: true });
      continue;
    }
    let text = originalText;
    if (name === 'vundici-types') {
      text = text.replaceAll('/// <reference types="node" />', '/// <reference types="vnode-types" />');
      if (file === 'fetch.d.ts') {
        text = once(text, '  readonly blob: () => Promise<Blob>', '  readonly blob: () => Promise<Blob>\n  readonly bytes: () => Promise<Uint8Array>');
        text = once(text, 'export interface RequestInit {', 'export interface RequestInit {\n  cache?: RequestCache');
        text = once(text, 'status: ResponseRedirectStatus): Response', 'status?: ResponseRedirectStatus): Response');
      }
      if (file === 'formdata.d.ts') {
        text = once(text, "import { File } from './file'", "import { File } from './file'\nimport { Blob } from 'buffer'");
        for (const method of ['append', 'set']) text = once(text,
          `  ${method}(name: string, value: unknown, fileName?: string): void`,
          `  ${method}(name: string, value: unknown): void\n  ${method}(name: string, value: Blob, fileName?: string): void`);
      }
    } else text = text.replaceAll('"undici-types"', '"vundici-types/web"');
    if (text !== originalText) changed.push(file);
    const target = path.join(destination, file);
    save(target, text);
  }
  if (name === 'vundici-types') save(path.join(destination, 'web.d.ts'), web);
  else save(path.join(destination, 'compat/node/index.d.ts'), nodeCompatibility);
  save(path.join(destination, 'LICENSE'), fs.readFileSync(path.join(source, 'LICENSE'), 'utf8'));
  const metadata = lock.packages['node_modules/' + original];
  assert.equal(metadata.version, version);
  save(path.join(destination, 'UPSTREAM.json'), JSON.stringify({
    name: original, version, resolved: metadata.resolved, integrity: metadata.integrity,
    contributors: upstream.contributors, changed, omitted,
    ...(omitted.length ? { omissionReason: 'Legacy compiler compatibility declarations are excluded; VPM targets TypeScript 7.' } : {}),
    added: name === 'vundici-types' ? ['web.d.ts'] : ['compat/node/index.d.ts'], sha256: hashes,
  }, null, 2) + '\n');
  assert.deepEqual(declarations(destination), [...Object.keys(hashes).filter(file => !omitted.includes(file)),
    ...(name === 'vundici-types' ? ['web.d.ts'] : ['compat/node/index.d.ts'])].sort());
  console.log(`${name}: ${Object.keys(hashes).length - omitted.length} upstream declaration files retained; ${changed.length} modified; ${omitted.length} omitted.`);
}
