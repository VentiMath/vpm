'use strict';
// Consumer declarations for runtime packages must not acquire ambient Node or
// browser type requirements. The two explicit platform type packages are exempt.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { root, compile, clean } = require('./platform-types.cjs');
const files = fs.readdirSync(path.join(root, 'packages')).flatMap(name => {
  const directory = path.join(root, 'packages', name);
  const metadata = require(path.join(directory, 'package.json'));
  return metadata.vpm?.kind === 'types' ? [] : [path.join(directory, metadata.types)];
});
const result = compile({ files, compilerOptions: {
  strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022'], types: [],
  module: 'NodeNext', moduleResolution: 'NodeNext', skipLibCheck: false,
} });
clean(result);
for (const file of result.files) {
  assert.doesNotMatch(file, /(?:@types\/node|\/vnode-types\/|\/v?undici-types\/|lib\.dom)/);
}
console.log(`${files.length} runtime packages: public declarations compile without Node, Undici or DOM types.`);
