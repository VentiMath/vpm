"use strict";
process.env.NODE_ENV="production";
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/mui-system-conformance'),base=fixture+'/node_modules/.vpm-material';
const cases=[];
for(const version of ['current','app'])for(const kind of ['navigation','copy'])cases.push({
 name:(version==='current'?'Material9 ':'App7 ')+kind+' Tooltip SSR',
 make(file){return require(base+'/'+version+'-'+(file===root?'vpm':'upstream')+'/tooltip-bench.cjs').prepare(kind);},
 validate(html){assert.match(html,/aria-label=/);}
});
const files=[...fs.readdirSync(root).filter(f=>/\.(cjs|mjs)$/.test(f)),'package.json','PROVENANCE.json','bench/tooltip.cjs','../../scripts/mui-material-conformance/tooltip-bench-entry.jsx','../../scripts/mui-material-conformance/tooltip-scene.jsx','../../scripts/mui-material-conformance/tooltip-build.cjs','../../scripts/mui-system-conformance/package-lock.json'];
for(const name of ['vfloating-ui-core','vfloating-ui-utils','vfloating-ui-dom','vmui-system','vmui-utils','vmui-private-theming','vmui-styled-engine',...fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-'))])for(const f of fs.readdirSync(path.resolve(root,'..',name)))if(/\.(cjs|js|mjs)$/.test(f))files.push('../'+name+'/'+f);
for(const name of fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-')))if(fs.existsSync(path.resolve(root,'..',name,'src')))files.push('../'+name+'/src');
for(const version of ['current','app'])for(const own of ['upstream','vpm'])for(const unit of ['tooltip'])files.push('../../scripts/mui-system-conformance/node_modules/.vpm-material/'+version+'-'+own+'/'+unit+'-bench.cjs');
require('../../../scripts/bench-process.cjs').run({root,upstream:'upstream',vpm:root,cases,files}).catch(e=>{console.error(e);process.exitCode=1;});
