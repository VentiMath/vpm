'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),entry=process.env.VPICOCOLORS_ENTRY||path.resolve(__dirname,'../../packages/vpicocolors/index.cjs');
// Separate unchanged PostCSS copies select a different dependency on both
// runtimes; Bun does not implement Node's Module._load interception contract.
const dir=fs.mkdtempSync(__dirname+'/node_modules/.vpm-picocolors-');
function run(file,name){const base=dir+'/'+name;fs.mkdirSync(base+'/node_modules/picocolors',{recursive:true});fs.cpSync(path.dirname(require.resolve('postcss/package.json')),base+'/postcss',{recursive:true});fs.writeFileSync(base+'/node_modules/picocolors/index.js','globalThis.__pcCallerLoads++;module.exports=require('+JSON.stringify(file)+');');globalThis.__pcCallerLoads=0;
 const postcss=require(base+'/postcss'),out=[];for(const css of ['.contest { color: red;\n invalid }','@media screen {\n .warml {\n color: blue;\n','a { color: red; }\nb { width: 1px; }']){try{const root=postcss.parse(css,{from:'contest.css'});out.push(root.first.warn(root.toResult(),'Review color').toString());const e=root.first.error('Example diagnostic');for(const flag of [false,true])out.push(e.showSourceCode(flag))}catch(e){for(const flag of [false,true])out.push(e.showSourceCode(flag))}}assert(globalThis.__pcCallerLoads>0,'unchanged caller must load the selected dependency');return out;
}
try{assert.deepEqual(run(entry,'vpm'),run(require.resolve('picocolors'),'upstream'));console.log('Unchanged PostCSS diagnostics match: colored/plain source frames, syntax errors and warnings')}finally{delete globalThis.__pcCallerLoads;fs.rmSync(dir,{recursive:true,force:true})}
