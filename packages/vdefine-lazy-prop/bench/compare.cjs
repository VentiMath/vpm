'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),vpm=root+'/index.cjs',upstream=require.resolve('define-lazy-prop',{paths:[path.resolve(__dirname,'../../../scripts/lazy-prop-conformance')]});
const cases=['Register unread','Register and first read','Assign before first read','Cached read','Five opener app names'].map((name,index)=>({name,async make(file){const define=(await import(pathToFileURL(file))).default,initialize=()=>42;
 if(index===0)return()=>define({},'x',initialize);
 if(index===1)return()=>define({},'x',initialize).x;
 if(index===2)return()=>{const o=define({},'x',initialize);o.x=7;return o.x};
 if(index===3){const o=define({},'x',initialize);o.x;return()=>o.x;}
 return()=>{const o={};for(const key of ['chrome','brave','firefox','edge','safari'])define(o,key,initialize);return o.chrome+o.firefox;};
},validate(value){if(index===0)assert.equal(typeof Object.getOwnPropertyDescriptor(value,'x').get,'function');else assert.equal(value,index===2?7:index===4?84:42)}}));
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm,cases,files:['index.cjs','index.mjs','package.json','bench/compare.cjs','../../scripts/lazy-prop-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
