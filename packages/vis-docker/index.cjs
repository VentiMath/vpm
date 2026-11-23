'use strict';

const fs = require('node:fs');
const evidence = [
  ['/proc/self/cgroup', 'docker'],
  ['/proc/self/mountinfo', '/docker/containers/'],
];
let cached;

function isDocker() {
  if (cached !== undefined) return cached;

  // A missing marker is ordinary, so avoid constructing an ENOENT exception.
  // Other filesystem errors still fall through to the remaining probes.
  try {
    if (fs.statSync('/.dockerenv', {throwIfNoEntry: false})) return (cached = true);
  } catch {}

  for (const [file, marker] of evidence) {
    try {
      if (fs.readFileSync(file, 'utf8').includes(marker)) return (cached = true);
    } catch {}
  }
  return (cached = false);
}

module.exports = isDocker;
module.exports.default = isDocker;
