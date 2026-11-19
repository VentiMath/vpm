'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/picocolors-conformance/node_modules/picocolors');
const cases=[
 {name:'plain red diagnostic',make:file=>{const c=require(file).createColors(true);return()=>c.red('Unexpected token in stylesheet')},validate:s=>assert.equal(s,'\x1b[31mUnexpected token in stylesheet\x1b[39m')},
 {name:'disabled diagnostic',make:file=>{const c=require(file).createColors(false);return()=>c.red('Unexpected token in stylesheet')},validate:s=>assert.equal(s,'Unexpected token in stylesheet')},
 {name:'nested source frame',make:file=>{const c=require(file).createColors(true);return()=>c.red('> '+c.bold('12')+' | '+c.yellow('color: red;'))},validate:s=>assert.equal(s,'\x1b[31m> \x1b[1m12\x1b[22m | \x1b[33mcolor: red;\x1b[31m\x1b[39m')},
 {name:'escape-rich diagnostic',make:file=>{const c=require(file).createColors(true),value='prefix '+('one \x1b[39m two ').repeat(32);return()=>c.red(value)},validate:s=>assert.equal(s,'\x1b[31mprefix '+('one \x1b[31m two ').repeat(32)+'\x1b[39m')}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['core.cjs','index.cjs','index.mjs','browser.cjs','browser.mjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/picocolors-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
