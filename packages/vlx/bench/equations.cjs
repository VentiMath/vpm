'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(__dirname,'../../../scripts/vlx-conformance'),upstream=path.join(fixture,'node_modules/.vlx-before-equations');
const baseline=require(path.join(upstream,'baseline.json'));assert.equal(baseline.sourceCommit,'235846009f114f0f34189dc8ea4d76e4aa87dc7c');
const article=count=>String.raw`See \eqref{last}. `+Array.from({length:count},(_,i)=>String.raw`\begin{equation}x_{${i}}=\frac{${i+1}}{2}+\sqrt{y}\label{${i===count-1?'last':'e'+i}}\end{equation}`).join(' ')+String.raw` Compare $z=\ref{e0}$.`;
const cases=[
 {name:'existing uncached formula / prior VLX',make:file=>{const r=require(file===upstream?upstream:root).createRenderer({cacheEntries:0});return()=>r.renderMath(String.raw`\frac{3}{7}+\sqrt{19}`).html;},validate:value=>assert.match(value,/<math/)},
 {name:'existing cached formula / prior VLX',make:file=>{const r=require(file===upstream?upstream:root).createRenderer();return()=>r.renderMath(String.raw`\frac{3}{7}+\sqrt{19}`).html;},validate:value=>assert.match(value,/<math/)},
 {name:'existing mixed text / prior VLX',make:file=>{const r=require(file===upstream?upstream:root).createRenderer();return()=>r.renderText(String.raw`Find $x^2+1$ and compare $\frac{3}{7}$.`).html;},validate:value=>assert.equal((value.match(/<math /g)||[]).length,2)},
 ...[2,12].map(count=>({name:`${count} numbered equations and forward refs / MathJax`,async:true,make:async file=>{
  const source=article(count);
  if(file===upstream){const render=await require(path.join(fixture,'equation-reference.cjs')).factory();return()=>render(source);}
  const {renderDocument}=require(root);return()=>{const result=renderDocument(source);return {html:result.html,labels:Object.fromEntries(result.equations.flatMap(e=>e.labels.map(l=>[l,e.tag])))};};
 },validate:value=>{assert.equal(Object.keys(value.labels).length,count);assert.equal(value.labels.last,String(count));assert.match(value.html,/<svg/);}})),
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','source.cjs','tex.cjs','macros.cjs','layout.cjs','equations.cjs','render-tree.cjs','math-cache.cjs','markup.cjs','nodes.cjs','typography.cjs','font/glyphs.json','package.json','PROVENANCE.json','bench/equations.cjs','../../scripts/vlx-conformance/equation-reference.cjs','../../scripts/vlx-conformance/prepare-equation-baseline.cjs','../../scripts/vlx-conformance/node_modules/.vlx-before-equations','../../scripts/vlx-conformance/package-lock.json','../../scripts/vlx-conformance/node_modules/@mathjax/src/cjs','../../scripts/vlx-conformance/node_modules/@mathjax/mathjax-newcm-font/cjs']}).catch(error=>{console.error(error);process.exitCode=1;});
