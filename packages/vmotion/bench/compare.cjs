'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=path.resolve(root,'../../scripts/mui-system-conformance/node_modules/.vpm-motion-react');
const cases=[];
for(const version of ['current','app'])for(const kind of ['fade','variants','initial-false'])cases.push({
 name:(version==='current'?'Motion14 ':'App12 ')+kind+' SSR',
 make(file){return require(base+'/'+(file===root?'vpm':version)+'.cjs').prepare(kind);},
 validate(html){assert.equal((html.match(/Contest /g)||[]).length,12);assert.ok(!html.includes('initial='));}
});
const files=['react.cjs','react.mjs','react.d.cts','react.d.mts','package.json','PROVENANCE.json','bench/compare.cjs',
 '../../scripts/motion-react-conformance/build.cjs','../../scripts/motion-react-conformance/scene.jsx',
 '../../scripts/mui-system-conformance/package-lock.json','../../scripts/motion-utils-conformance/package-lock.json'];
for(const name of ['vmotion-dom','vmotion-utils'])for(const file of fs.readdirSync(path.resolve(root,'..',name)))if(/\.(cjs|mjs|js)$/.test(file))files.push('../'+name+'/'+file);
for(const name of ['current','app','vpm'])files.push('../../scripts/mui-system-conformance/node_modules/.vpm-motion-react/'+name+'.cjs');
require('../../../scripts/bench-process.cjs').run({root,upstream:'upstream',vpm:root,cases,files}).catch(e=>{console.error(e);process.exitCode=1;});
