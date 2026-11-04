'use strict';
// Keep string-output timings out of the jsdom process and its DOM/GC history.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../../packages/vlx'),baseline=path.resolve(process.argv[2]);
const matrix=String.raw`\begin{array}{|c|r|}\hline x&y\\\hline 1&2\\\hline\end{array}`;
const cases=[['uncached fraction',String.raw`\frac{3}{7}+\sqrt{19}`,false],['uncached ruled array',matrix,false],['cached fraction',String.raw`\frac{3}{7}+\sqrt{19}`,true]].map(([name,tex,cached])=>({name,make:file=>{const api=require(file),render=cached?api.createRenderer().renderMath:api.renderMath;return()=>render(tex,{display:true});},validate:r=>{assert.match(r.html,/<math/);assert(r.width>0);}}));
require('../bench-process.cjs').run({root,upstream:baseline,vpm:root,cases,files:[...fs.readdirSync(root).filter(n=>/\.cjs$/.test(n)),'font/glyphs.json','../../scripts/vlx-conformance/bench-output.cjs']}).then(report=>{
 if(process.env.VPM_BENCH_WORKER)return;
 report.baseline={release:'vlx-0.1.0-r6',files:Object.fromEntries([...fs.readdirSync(baseline).filter(n=>/\.cjs$/.test(n)),'font/glyphs.json'].map(n=>[n,createHash('sha256').update(fs.readFileSync(path.join(baseline,n))).digest('hex')]))};
 if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');
}).catch(error=>{console.error(error);process.exitCode=1;});
