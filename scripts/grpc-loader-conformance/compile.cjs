'use strict';
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const {compile} = require('../platform-types.cjs');
const source = path.join(process.argv[2], 'source');
fs.mkdirSync(path.join(source, 'test'), {recursive: true});
fs.mkdirSync(path.join(source, 'test_protos'));
const input = fs.readFileSync(path.join(__dirname, 'upstream/test/descriptor_type_test.ts.txt'), 'utf8');
const legacyImport = "import * as assert from 'assert';";
assert.equal(input.split(legacyImport).length, 2);
// TS7 removed callable namespace imports. Change only that import in a temporary
// compilation copy; every upstream test body and assertion remains unchanged.
fs.writeFileSync(path.join(source, 'test/descriptor_type_test.ts'), input.replace(legacyImport, "import assert = require('assert');"));
fs.copyFileSync(path.join(__dirname, 'upstream/test_protos/rpc.desc.ts'), path.join(source, 'test_protos/rpc.desc.ts'));
const result = compile({
  files: [path.join(source, 'test/descriptor_type_test.ts'), path.join(source, 'test_protos/rpc.desc.ts')],
  compilerOptions: {rootDir: source, outDir: path.join(process.argv[2], 'build'), target: 'ES2022', module: 'Node16', moduleResolution: 'Node16', noCheck: true},
});
assert.equal(result.status, 0, result.output);
