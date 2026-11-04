'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const upstream=path.resolve(__dirname,'../../../scripts/vlx-conformance'),vpm=path.resolve(__dirname,'..');
const cases=[];
for(const [name,tex] of [['fraction',String.raw`\frac{3}{7}+\sqrt{19}`],['styled text',String.raw`\textbf{Find $x^2$}\quad f''(x)+\binom{n}{2}`],['array',String.raw`\begin{array}{|c|r|}\hline x&y\\\hline 1&2\\\hline\end{array}`],['contest relations',String.raw`\triangle ABC\cong\triangle DEF,\;a\not\leqslant b,\;p\nmid n`]])for(const format of ['HTML','SVG'])cases.push({name:format+' / '+name+' / uncached',async:true,make:async file=>{
 if(file===upstream){const controls=require(path.join(upstream,'reference.cjs'));if(format==='HTML')return()=>controls.katex(tex);const fn=await controls.svgFactory();return()=>fn(tex);}
 const {renderMath}=require(vpm);return()=>{const result=renderMath(tex,{display:true});return format==='HTML'?result.html:result.svg;};
},validate:output=>{assert.equal(typeof output,'string');assert.ok(output.length>100);assert.match(output,format==='SVG'?/<svg/:/<math/);}});
require('../../../scripts/bench-process.cjs').run({root:vpm,upstream,vpm,cases,files:['index.cjs','source.cjs','tex.cjs','macros.cjs','layout.cjs','typography.cjs','font/glyphs.json','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/vlx-conformance/reference.cjs','../../scripts/vlx-conformance/package-lock.json','../../scripts/vlx-conformance/node_modules/katex','../../scripts/vlx-conformance/node_modules/@mathjax/src/cjs','../../scripts/vlx-conformance/node_modules/@mathjax/mathjax-newcm-font/cjs']}).catch(error=>{console.error(error);process.exitCode=1});
