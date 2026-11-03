'use strict';
// Optional local comparison against the application's actual renderer. Private
// source stays in a temporary directory; fixtures below are synthetic. Save the
// report outside the public repository because it records local source paths.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../packages/vlx');let temp;
if(!process.env.VPM_BENCH_WORKER){
 const app=process.argv[2];if(!app)throw Error('Pass the local app repository');
 const ref=process.argv[3]||'origin/main';temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-page-bench-'));
 fs.writeFileSync(path.join(temp,'problemImage.ts'),execFileSync('git',['show',ref+':functions/src/problemImage.ts'],{cwd:app}));
 fs.symlinkSync(path.resolve(__dirname,'../png-conformance/node_modules'),path.join(temp,'node_modules'),'dir');
 process.env.VLX_APP_BENCH_SOURCE=path.join(temp,'problemImage.ts');
 console.log('Application source commit: '+execFileSync('git',['rev-parse',ref],{cwd:app,encoding:'utf8'}).trim());
}
const upstream=process.env.VLX_APP_BENCH_SOURCE,vpm=root;
const cases=['prose and choices','array and figure'].map(name=>({name:'Problem PNG / '+name,make:file=>{
 const api=file===upstream?require(upstream):require('./load.cjs')('problem');
 const statement=name==='prose and choices'?String.raw`Find $x$ when $3x+2=17$. Explain your reasoning.`:String.raw`Inspect the diagram and the table.\n\n$\begin{array}{|c|c|}\hline x&y\\\hline 1&3\\2&5\\\hline\end{array}$`.replace(/\\n/g,'\n');
 const problem={statement,options:{A:'3',B:'4',C:'5',D:'6'}};
 if(name==='array and figure'){const {Resvg}=require('@resvg/resvg-js');problem.figure={png:new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><path d="M10 70 L60 10 L110 70Z" fill="#daf" stroke="#333"/></svg>').render().asPng(),width:120};}
 return()=>api.renderProblemPng(problem);
},validate:result=>{assert.ok(result instanceof Uint8Array);assert.equal(result[0],137);const d=require('./load.cjs')('problem').pngSize(result);assert.equal(d.width,960);assert.ok(d.height>72);}}));
require('../bench-process.cjs').run({root,upstream,vpm,cases,files:['problem.cjs','layout.cjs','tex.cjs','macros.cjs','source.cjs','typography.cjs','font/glyphs.json','../vpngjs/index.cjs','../../scripts/vlx-conformance/bench-app.cjs','../../scripts/vlx-conformance/load.cjs','../../scripts/png-conformance/package-lock.json',upstream,'../../scripts/png-conformance/node_modules/mathjax-full','../../scripts/png-conformance/node_modules/pngjs','../../scripts/png-conformance/node_modules/@resvg/resvg-js'],cleanup:async()=>{if(temp)fs.rmSync(temp,{recursive:true,force:true});}}).catch(error=>{console.error(error);process.exitCode=1});
