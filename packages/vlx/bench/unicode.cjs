'use strict';
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(__dirname,'../../../scripts/vlx-conformance'),upstream=path.join(fixture,'node_modules/.vlx-before-unicode');
assert.equal(require(path.join(upstream,'baseline.json')).sourceCommit,'d3c932a8a313ba339d41db2673755d898e900ea4');
const cases=[
 {name:'unchanged uncached math / VLX 0.2.1',make:file=>{const r=require(file).createRenderer({cacheEntries:0});return()=>r.renderMath(String.raw`\frac{1}{2}+10\sqrt[3]{10}`).svg;},validate:value=>assert.match(value,/<svg/)},
 {name:'unchanged prose and choices SVG / VLX 0.2.1',make:file=>{const api=file===upstream?require(path.join(file,'problem.cjs')):require(path.join(fixture,'load.cjs'))('problem');const input={statement:String.raw`Evaluate $\frac{1}{2}+x^2$. Choose the correct expression.`,options:{A:'x+1',B:'x-1',C:'2x'}};return()=>api.renderProblemSvg(input).svg;},validate:value=>assert.match(value,/<svg/)},
];
const baselineFiles=fs.readdirSync(upstream).filter(n=>n!=='node_modules').map(n=>'../../scripts/vlx-conformance/node_modules/.vlx-before-unicode/'+n);
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:[...fs.readdirSync(root).filter(n=>n.endsWith('.cjs')),'font/glyphs.json','package.json','PROVENANCE.json','bench/unicode.cjs','../vpngjs/index.cjs','../../scripts/vlx-conformance/load.cjs','../../scripts/vlx-conformance/prepare-unicode-baseline.cjs',...baselineFiles]}).catch(e=>{console.error(e);process.exitCode=1;});
