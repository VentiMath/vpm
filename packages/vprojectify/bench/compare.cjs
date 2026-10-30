'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const upstream=require('../../../scripts/cloud-utils-conformance/node_modules/@google-cloud/projectify'),vpm=require('..');
const token='{{projectId}}',ids=Array.from({length:8},(_,i)=>'project-'+i);
const cases=[
 {name:'unchanged URL',async:false,make:lib=>{const urls=ids.map(id=>'https://example.test/projects/'+id+'/items');let i=0;return()=>lib.replaceProjectIdToken(urls[i++&7],ids[i&7]);},validate:x=>assert.match(x,/^https:\/\/example\.test\/projects\/project-[0-7]\/items$/)},
 {name:'single-token URL',async:false,make:lib=>{const urls=ids.map((id,i)=>'https://example.test/projects/'+token+'/items-'+i);let i=0;return()=>{const n=i++&7;return lib.replaceProjectIdToken(urls[n],ids[n]);};},validate:x=>{const m=x.match(/^https:\/\/example\.test\/projects\/project-([0-7])\/items-([0-7])$/);assert(m);assert.equal(m[1],m[2]);}},
 {name:'three-token string',async:false,make:lib=>{const inputs=ids.map((id,i)=>i+':'+token+'/'+token+'/'+token);let i=0;return()=>{const n=i++&7;return lib.replaceProjectIdToken(inputs[n],ids[n]);};},validate:x=>{const n=Number(x[0]);assert.equal(x,n+':'+[ids[n],ids[n],ids[n]].join('/'));}},
 {name:'flat query record',async:false,make:lib=>{let i=0;return()=>lib.replaceProjectIdToken({project:token,prefix:'reports/',maxResults:100},ids[i++&7]);},validate:x=>{assert(ids.includes(x.project));assert.equal(x.prefix,'reports/');assert.equal(x.maxResults,100);}},
 {name:'nested request body',async:false,make:lib=>{let i=0;return()=>lib.replaceProjectIdToken({name:'projects/'+token+'/items',labels:{project:token,kind:'report'},items:[{project:token},{project:token}]},ids[i++&7]);},validate:x=>{assert(ids.includes(x.labels.project));assert.equal(x.items[1].project,x.labels.project);assert.equal(x.name,'projects/'+x.labels.project+'/items');}},
 {name:'100-item page',async:false,make:lib=>{let i=0;return()=>lib.replaceProjectIdToken(Array.from({length:100},(_,n)=>({name:n,project:token})),ids[i++&7]);},validate:x=>{assert.equal(x.length,100);assert(ids.includes(x[99].project));assert.equal(x[0].project,x[99].project);}},
 {name:'opaque buffer',async:false,make:lib=>{const bodies=ids.map(id=>Buffer.from(id+token));let i=0;return()=>lib.replaceProjectIdToken(bodies[i++&7],ids[i&7]);},validate:x=>assert.match(x.toString(),/^project-[0-7]\{\{projectId\}\}$/)}
];
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','bench/compare.cjs','../../scripts/cloud-utils-conformance/upstream/projectify/SHA256.json']}).catch(e=>{console.error(e);process.exitCode=1;});
