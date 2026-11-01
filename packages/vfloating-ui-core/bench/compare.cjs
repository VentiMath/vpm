'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{fixture}=require('../../../scripts/floating-core-conformance/scenarios.cjs');
const root=path.resolve(__dirname,'..'),expected=require('./expected.cjs');
const cases=['plain','popover','tooltip','dropdown','arrow','auto','inline','size'].map(key=>({name:'position / '+key,async:true,make:directory=>{
 const api=require(directory),f=fixture(api,17,null),options={placement:'right-end',platform:f.platform,middleware:f.sets[key]};
 return()=>api.computePosition(f.reference,f.floating,options);
},validate:result=>assert.deepEqual(result,expected[key])}));
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(root,'../../scripts/floating-core-conformance/node_modules/@floating-ui/core'),vpm:root,cases,validationOnly:process.argv.includes('--validate'),files:['package.json','index.cjs','runtime.mjs','engine.mjs','geometry.mjs','motion.mjs','selection.mjs','visibility.mjs','../vfloating-ui-utils/package.json','../vfloating-ui-utils/runtime.mjs','bench/compare.cjs','bench/expected.cjs','../../scripts/floating-core-conformance/scenarios.cjs','../../scripts/floating-core-conformance/package-lock.json','../../scripts/floating-core-conformance/node_modules/@floating-ui/core','../../scripts/floating-core-conformance/node_modules/@floating-ui/utils']}).catch(error=>{console.error(error);process.exitCode=1;});
