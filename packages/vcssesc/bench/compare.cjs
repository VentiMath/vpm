'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/cssesc-conformance/node_modules/cssesc');
const cases=[
 ['ASCII CSS text','Practice overview',{}],['ASCII class name','contest-result',{isIdentifier:true}],['utility selector','hover:bg-blue-500/50',{isIdentifier:true}],['Unicode identifier','2026 Math 𝌆 école',{isIdentifier:true}],['quoted CSS string','A "quote" and \'another\' é',{quotes:'double',wrap:true}],['escaped ASCII','abcDEF09_-',{escapeEverything:true}],['dense Unicode','∑→é𝌆'.repeat(100),{}]
].map(([name,text,options])=>{const expected=require(root)(text,options);return {name,make:file=>{const escape=require(file);return()=>escape(text,options)},validate:x=>assert.equal(x,expected)}});
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/cssesc-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
