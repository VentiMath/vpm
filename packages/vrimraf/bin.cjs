#!/usr/bin/env node
'use strict';
const { rimraf } = require('./index.cjs');
const args = process.argv.slice(2),
  paths = [],
  options = {};
let literal = false,
  verbose = false,
  informational = false;
(async () => {
  for (const arg of args) {
    if (literal) {
      paths.push(arg);
      continue;
    }
    if (arg === '--') {
      literal = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: rimraf [--glob|--no-glob] [--verbose] [--max-retries=N] [--retry-delay=N] [--] path...\nRemoves paths recursively. Globbing is opt-in. Filesystem roots are always protected.',
      );
      informational = true;
      continue;
    }
    if (arg === '--version') {
      console.log(require('./package.json').version);
      informational = true;
      continue;
    }
    if (arg === '--glob' || arg === '-g') {
      options.glob = true;
      continue;
    }
    if (arg === '--no-glob' || arg === '-G') {
      options.glob = false;
      continue;
    }
    if (arg === '--verbose' || arg === '-v') {
      verbose = true;
      continue;
    }
    if (arg === '--no-verbose' || arg === '-V') {
      verbose = false;
      continue;
    }
    if (arg === '--preserve-root') {
      options.preserveRoot = true;
      continue;
    }
    const numeric = /^--(max-retries|retry-delay)=(\d+)$/.exec(arg);
    if (numeric) {
      options[numeric[1] === 'max-retries' ? 'maxRetries' : 'retryDelay'] = Number(numeric[2]);
      continue;
    }
    if (arg.startsWith('-')) throw Error('Unsupported option: ' + arg);
    paths.push(arg);
  }
  if (informational) return;
  if (!paths.length) throw Error('A removal path is required; use --help for usage');
  if (verbose)
    options.filter = (name) => {
      console.log(name);
      return true;
    };
  await rimraf(paths, options);
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
