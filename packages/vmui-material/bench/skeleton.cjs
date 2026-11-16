"use strict";
process.env.NODE_ENV="production";
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/mui-system-conformance'),base=fixture+'/node_modules/.vpm-material';
const cases=[];
for(const version of ['current','app'])for(const kind of ['archive','signup','fuse'])cases.push({
 name:(version==='current'?'Material9 ':'App7 ')+kind+' Skeleton SSR',
 make(file){return require(base+'/'+version+'-'+(file===root?'vpm':'upstream')+'/skeleton-bench.cjs').prepare(kind);},
 validate(html){assert.equal((html.match(/class="[^"]*MuiSkeleton-root[^"]*"/g)||[]).length,kind==='fuse'?5:8);}
});
const files=['avatar-control.cjs','progress-control.cjs','skeleton-control.cjs','chip-control.cjs','radio-controls.cjs','check-controls.cjs','select-input.cjs','lists.cjs','menus.cjs','input-base.cjs','text-field.cjs','input-decorations.cjs','input-variants.cjs','forms.cjs','surfaces.cjs','theme.cjs','text.cjs','buttons.cjs','index.cjs','package.json','PROVENANCE.json','bench/skeleton.cjs','../../scripts/mui-material-conformance/skeleton-bench-entry.jsx','../../scripts/mui-material-conformance/skeleton-scene.jsx','../../scripts/mui-material-conformance/skeleton-build.cjs','../../scripts/mui-material-conformance/text-field-scene.jsx','../../scripts/mui-material-conformance/input-decorations-scene.jsx','../../scripts/mui-system-conformance/package-lock.json'];
for(const name of ['vmui-system','vmui-utils','vmui-private-theming','vmui-styled-engine',...fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-'))])for(const f of fs.readdirSync(path.resolve(root,'..',name)))if(/\.(cjs|js|mjs)$/.test(f))files.push('../'+name+'/'+f);
for(const name of fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-')))if(fs.existsSync(path.resolve(root,'..',name,'src')))files.push('../'+name+'/src');
for(const version of ['current','app'])for(const own of ['upstream','vpm'])for(const unit of ['skeleton'])files.push('../../scripts/mui-system-conformance/node_modules/.vpm-material/'+version+'-'+own+'/'+unit+'-bench.cjs');
require('../../../scripts/bench-process.cjs').run({root,upstream:'upstream',vpm:root,cases,files}).catch(e=>{console.error(e);process.exitCode=1;});
