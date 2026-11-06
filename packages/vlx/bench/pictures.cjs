'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(__dirname,'../../../scripts/vlx-conformance'),upstream=path.join(fixture,'node_modules/.vlx-before-picture-fixes');
assert.equal(require(path.join(upstream,'baseline.json')).sourceCommit,'98b7ad6baf3a244a0b5b51c7b43c98e03764eedb');
const page={statement:String.raw`Evaluate.

$\frac{1}{2}+\frac{3}{4}$

First line. $\\$ Second line.`,options:{A:String.raw`10\sqrt[3]{10}`,B:String.raw`10^3\sqrt{10}`,C:String.raw`\frac{1}{2}`}};
const problem=file=>file===upstream?require(path.join(upstream,'problem.cjs')):require(path.join(fixture,'load.cjs'))('problem');
const cases=[
 ...[['uncached indexed root',String.raw`10\sqrt[3]{10}`],['unchanged square root control',String.raw`\sqrt{x+1}`]].map(([name,tex])=>({name:name+' / VLX 0.2.0',make:file=>{const r=require(file).createRenderer({cacheEntries:0});return()=>r.renderMath(tex).svg;},validate:value=>assert.match(value,/<svg/)})),
 {name:'standalone fraction SVG / VLX 0.2.0',make:file=>{const {renderProblemSvg}=problem(file);return()=>renderProblemSvg({statement:String.raw`Evaluate.

$\frac{1}{2}+\frac{3}{4}$`}).svg;},validate:value=>assert.match(value,/<svg/)},
 {name:'corrected full picture PNG / VLX 0.2.0',make:file=>{const {renderProblemSvg}=problem(file),{Resvg}=require(path.join(fixture,'node_modules/@resvg/resvg-js'));return()=>new Resvg(renderProblemSvg(page).svg,{font:{loadSystemFonts:false}}).render().asPng();},validate:value=>assert.equal(value[0],137)},
];
const fs=require('node:fs');
const baselineFiles=fs.readdirSync(upstream).filter(name=>name!=='node_modules').map(name=>'../../scripts/vlx-conformance/node_modules/.vlx-before-picture-fixes/'+name);
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:[...fs.readdirSync(root).filter(name=>name.endsWith('.cjs')),'font/glyphs.json','package.json','PROVENANCE.json','bench/pictures.cjs','../vpngjs/index.cjs','../../scripts/vlx-conformance/load.cjs','../../scripts/vlx-conformance/prepare-picture-baseline.cjs','../../scripts/vlx-conformance/package-lock.json','../../scripts/vlx-conformance/node_modules/@resvg/resvg-js',...baselineFiles]}).catch(error=>{console.error(error);process.exitCode=1;});
