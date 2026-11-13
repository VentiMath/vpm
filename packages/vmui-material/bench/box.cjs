"use strict";
process.env.NODE_ENV="production";
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/mui-system-conformance'),base=fixture+'/node_modules/.vpm-material';
const cases=[];
for(const version of ['current','app'])for(const kind of ['box'])cases.push({
 name:(version==='current'?'Material9 ':'App7 ')+kind+' SSR',
 make(file){return require(base+'/'+version+'-'+(file===root?'vpm':'upstream')+'/text-bench.cjs').prepare(kind);},
 validate(html){if(kind==='box'){assert.equal((html.match(/<section /g)||[]).length,12);}else if(kind==='typography'){assert.equal((html.match(/<h6 /g)||[]).length,4);assert.equal((html.match(/<div /g)||[]).length,8);}else{assert.equal((html.match(kind==='links'?/<a /g:/<svg /g)||[]).length,12);if(kind==='icons')assert.equal((html.match(/<title>/g)||[]).length,12);}}
});
const files=['theme.cjs','text.cjs','buttons.cjs','index.cjs','package.json','PROVENANCE.json','bench/box.cjs','../../scripts/mui-material-conformance/text-bench-entry.jsx','../../scripts/mui-material-conformance/text-scene.jsx','../../scripts/mui-material-conformance/text-build.cjs','../../scripts/mui-system-conformance/package-lock.json'];
for(const name of ['vmui-system','vmui-utils','vmui-private-theming','vmui-styled-engine',...fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-'))])for(const f of fs.readdirSync(path.resolve(root,'..',name)))if(/\.(cjs|js|mjs)$/.test(f))files.push('../'+name+'/'+f);
for(const version of ['current','app'])for(const own of ['upstream','vpm'])files.push('../../scripts/mui-system-conformance/node_modules/.vpm-material/'+version+'-'+own+'/text-bench.cjs');
require('../../../scripts/bench-process.cjs').run({root,upstream:'upstream',vpm:root,cases,files}).catch(e=>{console.error(e);process.exitCode=1;});
