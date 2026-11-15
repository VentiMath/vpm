"use strict";
process.env.NODE_ENV="production";
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/mui-system-conformance'),base=fixture+'/node_modules/.vpm-material';
const cases=[];
for(const version of ['current','app'])for(const kind of ['single','multiline','form'])cases.push({
 name:(version==='current'?'Material9 ':'App7 ')+kind+' SSR',
 make(file){return require(base+'/'+version+'-'+(file===root?'vpm':'upstream')+'/input-bench.cjs').prepare(kind);},
 validate(html){assert.equal((html.match(/class="MuiInputBase-root /g)||[]).length,12);}

});
const files=['input-base.cjs','forms.cjs','surfaces.cjs','theme.cjs','text.cjs','buttons.cjs','index.cjs','package.json','PROVENANCE.json','bench/input.cjs','../../scripts/mui-material-conformance/input-bench-entry.jsx','../../scripts/mui-material-conformance/input-scene.jsx','../../scripts/mui-material-conformance/input-build.cjs','../../scripts/mui-system-conformance/package-lock.json','../../scripts/hook-form-conformance/package-lock.json'];
for(const name of ['vmui-system','vmui-utils','vmui-private-theming','vmui-styled-engine',...fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-'))])for(const f of fs.readdirSync(path.resolve(root,'..',name)))if(/\.(cjs|js|mjs)$/.test(f))files.push('../'+name+'/'+f);
for(const version of ['current','app'])for(const own of ['upstream','vpm'])files.push('../../scripts/mui-system-conformance/node_modules/.vpm-material/'+version+'-'+own+'/input-bench.cjs');
require('../../../scripts/bench-process.cjs').run({root,upstream:'upstream',vpm:root,cases,files}).catch(e=>{console.error(e);process.exitCode=1;});
