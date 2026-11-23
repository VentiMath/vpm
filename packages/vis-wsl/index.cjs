'use strict';
const process = require('node:process');
const os = require('node:os');
const fs = require('node:fs');
const isInsideContainer = require('vis-inside-container');
const markers = ['/proc/sys/fs/binfmt_misc/WSLInterop', '/run/WSL'];
const microsoft = value => value.toLowerCase().includes('microsoft');

function detect() {
  if (process.platform !== 'linux') return false;
  if (microsoft(os.release())) return !isInsideContainer();
  try {
    if (microsoft(fs.readFileSync('/proc/version', 'utf8'))) return !isInsideContainer();
  } catch {}
  // Custom WSL kernels can omit Microsoft from both version strings.
  for (const file of markers) {
    if (fs.existsSync(file)) return !isInsideContainer();
  }
  return false;
}

// Preserve upstream's private test hook; ordinary consumers receive a boolean.
module.exports = process.env.__IS_WSL_TEST__ ? detect : detect();
