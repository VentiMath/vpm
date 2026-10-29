'use strict';
// Downstream applications still compile with TypeScript 5 (ventimath pins 5.8
// at its root and resolves ^5 to 5.9 for Cloud Functions). Public runtime
// declarations must keep compiling there under each module resolution mode
// those projects use, even though VPM itself builds only with TypeScript 7.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { root, compile, clean } = require('./platform-types.cjs');
const modules = path.join(__dirname, 'legacy-typescript/node_modules');
const files = fs.readdirSync(path.join(root, 'packages')).flatMap(name => {
  const directory = path.join(root, 'packages', name);
  const metadata = require(path.join(directory, 'package.json'));
  return metadata.vpm?.kind === 'types' ? [] : [path.join(directory, metadata.types)];
});
const resolutions = {
  NodeNext: { module: 'NodeNext', moduleResolution: 'NodeNext' },
  bundler: { module: 'ESNext', moduleResolution: 'bundler' },
  CommonJS: { module: 'CommonJS', moduleResolution: 'node10' },
};
for (const name of ['typescript-5.8', 'typescript-5.9']) {
  const metadata = require(path.join(modules, name, 'package.json'));
  assert.match(metadata.version, /^5\./);
  const tsc = path.join(modules, name, metadata.bin.tsc);
  for (const [mode, options] of Object.entries(resolutions)) {
    // skipLibCheck stays off so the declarations themselves are checked.
    clean(compile({ files, compilerOptions: {
      strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022'], types: [], skipLibCheck: false, ...options,
    } }, tsc));
  }
  console.log(`TypeScript ${metadata.version}: ${files.length} public runtime declarations compile with ${Object.keys(resolutions).join(', ')} resolution.`);
}
