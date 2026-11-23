'use strict';
const fs = require('node:fs');
const isDocker = require('vis-docker');
let cached;

function isInsideContainer() {
  if (cached !== undefined) return cached;
  try {
    if (fs.statSync('/run/.containerenv', {throwIfNoEntry: false})) return (cached = true);
  } catch {}
  return (cached = isDocker());
}

module.exports = isInsideContainer;
module.exports.default = isInsideContainer;
