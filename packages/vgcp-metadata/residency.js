'use strict';
// Based on gcp-metadata; API baseline 9.2.3. Copyright 2022 Google LLC.
// Licensed under Apache-2.0; see LICENSE. Modified for VPM validation,
// request lifecycle, diagnostics and residency handling.
const fs = require('node:fs'), os = require('node:os');
const GCE_LINUX_BIOS_PATHS = Object.freeze({BIOS_DATE: '/sys/class/dmi/id/bios_date', BIOS_VENDOR: '/sys/class/dmi/id/bios_vendor'});
function isGoogleCloudServerless() { return !!(process.env.CLOUD_RUN_JOB || process.env.FUNCTION_NAME || process.env.K_SERVICE || process.env.CLOUD_RUN_WORKER_POOL); }
function isGoogleComputeEngineLinux() {
  if (os.platform() !== 'linux') return false;
  try { fs.statSync(GCE_LINUX_BIOS_PATHS.BIOS_DATE); return /Google/.test(fs.readFileSync(GCE_LINUX_BIOS_PATHS.BIOS_VENDOR, 'utf8')); }
  catch { return false; }
}
function isGoogleComputeEngineMACAddress() {
  try {
    for (const items of Object.values(os.networkInterfaces())) for (const item of items || []) if (/^42:01(?::[0-9a-f]{2}){4}$/i.test(item.mac)) return true;
  } catch { /* A restricted interface query is not evidence of cloud residency. */ }
  return false;
}
function isGoogleComputeEngine() { return isGoogleComputeEngineLinux() || isGoogleComputeEngineMACAddress(); }
function detectGCPResidency() { return isGoogleCloudServerless() || isGoogleComputeEngine(); }
module.exports = {GCE_LINUX_BIOS_PATHS, isGoogleCloudServerless, isGoogleComputeEngineLinux, isGoogleComputeEngineMACAddress, isGoogleComputeEngine, detectGCPResidency};
