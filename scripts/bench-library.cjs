'use strict';
const fs = require('node:fs');
// The coordinator loads neither implementation. A timed worker loads only
// its assigned library, including identical-source control workers.
exports.load = async function load(loaders) {
  const file = process.env.VPM_BENCH_WORKER;
  if (!file) return {};
  const {library} = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Object.hasOwn(loaders, library)) throw new Error('Unknown benchmark library: ' + library);
  return {[library]: await loaders[library]()};
};
