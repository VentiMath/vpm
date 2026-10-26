'use strict';
// Consumer declarations for runtime packages must not acquire ambient Node or
// browser type requirements. The two explicit platform type packages are exempt.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'packages')).flatMap(name => {
  const directory = path.join(root, 'packages', name);
  const metadata = require(path.join(directory, 'package.json'));
  return metadata.vpm?.kind === 'types' ? [] : [path.join(directory, metadata.types)];
});
const program = ts.createProgram(files, {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts'], types: [],
  module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: false,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n',
}));
for (const source of program.getSourceFiles()) {
  assert.doesNotMatch(source.fileName, /(?:@types\/node|\/vnode-types\/|\/v?undici-types\/|lib\.dom)/);
}
console.log(`${files.length} runtime packages: public declarations compile without Node, Undici or DOM types.`);
