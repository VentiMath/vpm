"use strict";
process.env.NODE_ENV="production";
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/mui-system-conformance'),base=fixture+'/node_modules/.vpm-material';
const cases=[];
for(const version of ['current','app'])for(const kind of ['closed','open','settled'])cases.push({
 name:(version==='current'?'Material9 ':'App7 ')+kind+' Slide SSR',
 make(file){return require(base+'/'+version+'-'+(file===root?'vpm':'upstream')+'/slide-bench.cjs').prepare(kind);},
 validate(html){assert.match(html,/<section/);assert.equal(html.includes('visibility:hidden'),kind==='closed');}
});
const files=[...fs.readdirSync(root).filter(f=>/\.(cjs|mjs)$/.test(f)),'package.json','PROVENANCE.json','bench/slide.cjs','../../scripts/mui-material-conformance/slide-bench-entry.jsx','../../scripts/mui-material-conformance/slide-scene.jsx','../../scripts/mui-material-conformance/slide-build.cjs','../../scripts/mui-system-conformance/package-lock.json'];
for(const name of ['vreact-transition-group','vmui-system','vmui-utils','vmui-private-theming','vmui-styled-engine',...fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-'))])for(const f of fs.readdirSync(path.resolve(root,'..',name)))if(/\.(cjs|js|mjs)$/.test(f))files.push('../'+name+'/'+f);
for(const name of fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-')))if(fs.existsSync(path.resolve(root,'..',name,'src')))files.push('../'+name+'/src');
for(const version of ['current','app'])for(const own of ['upstream','vpm'])for(const unit of ['slide'])files.push('../../scripts/mui-system-conformance/node_modules/.vpm-material/'+version+'-'+own+'/'+unit+'-bench.cjs');
require('../../../scripts/bench-process.cjs').run({root,upstream:'upstream',vpm:root,cases,files}).catch(e=>{console.error(e);process.exitCode=1;});
