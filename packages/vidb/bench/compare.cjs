'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/idb-conformance'),peer=createRequire(fixture+'/package.json');peer('fake-indexeddb/auto');
let sequence=0;
async function database(file){const api=require(file),db=await api.openDB('bench-'+sequence++,1,{upgrade(db){db.createObjectStore('records')}});for(let n=1;n<=5;n++)await db.put('records',{count:n},n);return {api,db};}
const cases=[
 {name:'cached database wrap',async make(file){const {api,db}=await database(file),raw=api.unwrap(db);return()=>api.wrap(raw);},validate(x){assert.equal(typeof x.get,'function')}},
 {name:'stable store method lookup',async make(file){const {db}=await database(file),store=db.transaction('records').store;return()=>store.get;},validate(x){assert.equal(typeof x,'function')}},
 {name:'record read via database shortcut',async:true,async make(file){const {db}=await database(file);return()=>db.get('records',3);},validate(x){assert.equal(x.count,3)}},
 {name:'record write and transaction commit',async:true,async make(file){const {db}=await database(file),value={count:8};return()=>db.put('records',value,3);},validate(x){assert.equal(x,3)}},
 {name:'five-record cursor walk',async:true,async make(file){const {db}=await database(file);return async()=>{let total=0,c=await db.transaction('records').store.openCursor();while(c){total+=c.value.count;c=await c.continue();}return total;};},validate(x){assert.equal(x,15)}},
];
require('../../../scripts/bench-process.cjs').run({root,upstream:peer.resolve('idb'),vpm:root,cases,files:['index.cjs','index.mjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/idb-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
