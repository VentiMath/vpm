'use strict';
const {globalManifest} = require('../runtime/manifest.js');
function getGlobalRequiredAPIs() {return Array.isArray(globalManifest.requiredAPIs) ? globalManifest.requiredAPIs : [];}
function clearGlobalRequiredAPIs() {delete globalManifest.requiredAPIs;}
function requiresAPI(api, reason = '') {
  if (typeof api !== 'string' || !api.endsWith('.googleapis.com')) throw new Error("requiresAPI: 'api' must be a non-empty string ending with '.googleapis.com'.");
  const list = getGlobalRequiredAPIs();
  globalManifest.requiredAPIs = list;
  const existing = list.find(item => item.api === api);
  if (!existing) list.push({api, reason});
  else if (reason && !existing.reason.includes(reason)) existing.reason = [existing.reason, reason].filter(Boolean).join(' ');
}
module.exports = {requiresAPI, getGlobalRequiredAPIs, clearGlobalRequiredAPIs};
