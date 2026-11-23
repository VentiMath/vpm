'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), {execFileSync} = require('node:child_process');
const directory = path.resolve(process.argv[2] || '.'), published = process.argv.includes('--published');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
(async () => {
 const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'release-manifest.json')));
 assert.match(manifest.tag, /^vpngjs-7\.0\.0(?:-[a-z0-9.-]+)?$/);
 assert.equal(manifest.packages.length, 1);
 const item = manifest.packages[0];
 assert.equal(item.name, 'vpngjs'); assert.equal(item.version, '7.0.0'); assert.deepEqual(item.dependencies, {});
 const base = 'https://github.com/VentiMath/vpm/releases/download/' + manifest.tag;
 assert.equal(item.url, base + '/' + item.asset);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'consumer-package.json'))), {dependencies:{vpngjs:item.url}});
 for (const line of fs.readFileSync(path.join(directory, 'SHA256SUMS'), 'utf8').trim().split('\n')) {
  const [sha, name] = line.split('  '); assert.equal(path.basename(name), name);
  assert.equal(digest(fs.readFileSync(path.join(directory, name))), sha);
 }
 assert.equal(digest(fs.readFileSync(path.join(directory, item.asset))), item.sha256);
 if (published) for (const name of [item.asset,'release-manifest.json','consumer-package.json','SHA256SUMS']) {
  const r = await fetch(base + '/' + name); assert(r.ok, name + ': ' + r.status);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), fs.readFileSync(path.join(directory, name)), name);
 }
 const env = {...process.env, VPM_PNG_ARCHIVE:path.join(directory,item.asset), VPM_PNG_INSTALL_NAME:'vpngjs', VPM_PNG_MANIFEST:path.join(directory,'release-manifest.json')};
 if (published) env.VPM_PNG_URL = item.url; else delete env.VPM_PNG_URL;
 process.stdout.write(execFileSync('node',[path.join(__dirname,'png-conformance/archives.cjs')],{env,encoding:'utf8',timeout:300000,maxBuffer:4e6}));
 console.log((published?'Published bytes and URLs verified. ':'')+'Exact PNG release passes vpngjs installs, frozen locks, installed-source hashes, Node/Bun read/write controls and TS7 declarations.');
})().catch(e=>{console.error(e);process.exitCode=1});
