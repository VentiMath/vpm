"use strict";
process.env.NODE_ENV="production";
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/mui-system-conformance'),base=fixture+'/node_modules/.vpm-material';
const cases=[];
for(const version of ['current','app'])for(const kind of ['items','dense','icons','text','closed-menu'])cases.push({
 name:(version==='current'?'Material9 ':'App7 ')+kind+' SSR',
 make(file){return require(base+'/'+version+'-'+(file===root?'vpm':'upstream')+'/'+(kind==='closed-menu'?'menus':'lists')+'-bench.cjs').prepare(kind==='closed-menu'?'menu':kind);},
 validate(html){if(kind==='closed-menu')assert.equal(html,'');else assert.equal((html.match(/Contest /g)||[]).length,12);}

});
const files=['lists.cjs','menus.cjs','input-base.cjs','text-field.cjs','input-decorations.cjs','input-variants.cjs','forms.cjs','surfaces.cjs','theme.cjs','text.cjs','buttons.cjs','index.cjs','package.json','PROVENANCE.json','bench/menu-foundation.cjs','../../scripts/mui-material-conformance/lists-bench-entry.jsx','../../scripts/mui-material-conformance/lists-scene.jsx','../../scripts/mui-material-conformance/lists-build.cjs','../../scripts/mui-material-conformance/menus-bench-entry.jsx','../../scripts/mui-material-conformance/menus-scene.jsx','../../scripts/mui-material-conformance/menus-build.cjs','../../scripts/mui-system-conformance/package-lock.json'];
for(const name of ['vmui-system','vmui-utils','vmui-private-theming','vmui-styled-engine',...fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-'))])for(const f of fs.readdirSync(path.resolve(root,'..',name)))if(/\.(cjs|js|mjs)$/.test(f))files.push('../'+name+'/'+f);
for(const name of fs.readdirSync(path.resolve(root,'..')).filter(n=>n.startsWith('vemotion-')))if(fs.existsSync(path.resolve(root,'..',name,'src')))files.push('../'+name+'/src');
for(const version of ['current','app'])for(const own of ['upstream','vpm'])for(const unit of ['lists','menus'])files.push('../../scripts/mui-system-conformance/node_modules/.vpm-material/'+version+'-'+own+'/'+unit+'-bench.cjs');
require('../../../scripts/bench-process.cjs').run({root,upstream:'upstream',vpm:root,cases,files}).catch(e=>{console.error(e);process.exitCode=1;});
