#!/usr/bin/env node
'use strict';

// Installs the pinned upstream packages of one conformance suite:
//
//   node scripts/install-conformance.cjs <dir under scripts/> [npm ci flags...]
//
// On macOS every distinct install (lockfile, package.json, .npmrc, flags, Node
// major, CPU) runs `npm ci` once into a shared cache, and each suite receives an
// APFS copy-on-write clone of it. Every worktree then holds the same files at
// the same paths as a plain `npm ci`, while the disk stores them once.
// Elsewhere, or with VPM_CONFORMANCE_SHARED=0, it runs `npm ci` in the suite.

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const [suite, ...flags] = process.argv.slice(2);
if (suite === undefined) {
  console.error('usage: node scripts/install-conformance.cjs <dir under scripts/> [npm ci flags...]');
  process.exit(2);
}

const suiteDir = path.resolve(__dirname, suite);
if (!fs.existsSync(path.join(suiteDir, 'package-lock.json'))) {
  console.error(`scripts/${suite} has no package-lock.json`);
  process.exit(2);
}

const npmCi = ['ci', ...flags];
const shared = process.platform === 'darwin' && process.env.VPM_CONFORMANCE_SHARED !== '0';
if (!shared) {
  execFileSync('npm', npmCi, { cwd: suiteDir, stdio: 'inherit' });
  process.exit(0);
}

const inputs = ['package.json', 'package-lock.json', '.npmrc']
  .filter((name) => fs.existsSync(path.join(suiteDir, name)));
const hash = crypto.createHash('sha256');
for (const name of inputs) {
  hash.update(`${name}\0`).update(fs.readFileSync(path.join(suiteDir, name))).update('\0');
}
hash.update(JSON.stringify(flags)).update(process.versions.node.split('.')[0]).update(process.arch);
const key = hash.digest('hex').slice(0, 24);

const cacheRoot = process.env.VPM_CONFORMANCE_CACHE === undefined
  ? path.join(os.homedir(), 'Library', 'Caches', 'vpm-conformance')
  : path.resolve(process.env.VPM_CONFORMANCE_CACHE);
const entry = path.join(cacheRoot, key);
const cachedModules = path.join(entry, 'node_modules');

if (fs.existsSync(cachedModules)) {
  console.log(`scripts/${suite}: reusing shared install ${key}`);
} else {
  console.log(`scripts/${suite}: installing shared copy ${key}`);
  fs.mkdirSync(cacheRoot, { recursive: true });
  const staging = fs.mkdtempSync(path.join(cacheRoot, `.staging-${key}-`));
  try {
    for (const name of inputs) fs.copyFileSync(path.join(suiteDir, name), path.join(staging, name));
    execFileSync('npm', npmCi, { cwd: staging, stdio: 'inherit' });
    try {
      fs.renameSync(staging, entry);
    } catch (error) {
      // A concurrent install of the same key finished first; its copy is identical.
      if (!['ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error;
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

// Replace the suite's node_modules with a copy-on-write clone (cp -c uses clonefile(2)).
const target = path.join(suiteDir, 'node_modules');
fs.rmSync(target, { recursive: true, force: true });
execFileSync('cp', ['-c', '-R', '-p', cachedModules, target], { stdio: 'inherit' });
