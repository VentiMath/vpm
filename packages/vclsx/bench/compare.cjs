'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const load = directory => ({full: require(directory), lite: require(path.join(directory, directory === root ? 'lite.cjs' : 'dist/lite.js'))});
const make = (args, lite = false) => directory => {const fn = load(directory)[lite ? 'lite' : 'full'];return () => fn(...args);};
let deep = ['leaf'];for (let i = 0; i < 64; i++) deep = [deep];
const cases = [
 ['two strings', ['FusePageSimple-header', 'caller-header'], 'FusePageSimple-header caller-header'],
 ['conditional strings', ['button', false, 'MuiButton-root', undefined, 'active'], 'button MuiButton-root active'],
 ['dictionary / four fields', [{active: true, disabled: false, wide: 1, selected: null}], 'active wide'],
 ['mixed nested values', ['root', ['one', [false, 'two']], {three: true, four: false}, 5], 'root one two three 5'],
 ['MUI button class arguments', [undefined, 'MuiButton-root MuiButton-contained MuiButton-sizeMedium', 'caller-button', false], 'MuiButton-root MuiButton-contained MuiButton-sizeMedium caller-button'],
 ['shared arrays', [['one', 'two'], ['one', 'two']], 'one two one two'],
 ['64-level array', [deep], 'leaf'],
 ['lite conditional strings', ['root', false, 'active', {}, ['ignored'], 'wide'], 'root active wide', true],
].map(([name,args,expected,lite]) => ({name,make: make(args,lite),validate: value => assert.equal(value,expected)}));
require('../../../scripts/bench-process.cjs').run({root,
 upstream: path.resolve(__dirname,'../../../scripts/clsx-conformance/node_modules/clsx'),vpm:root,cases,
 validationOnly:process.argv.includes('--validate'),
 files:['package.json','index.cjs','runtime.mjs','lite.cjs','lite.mjs','bench/compare.cjs','../../scripts/clsx-conformance/package-lock.json','../../scripts/clsx-conformance/node_modules/clsx'],
}).catch(error => {console.error(error);process.exitCode=1;});
