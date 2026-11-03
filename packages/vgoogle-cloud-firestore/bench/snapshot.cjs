"use strict";
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const docs=Array.from({length:1000},(_,id)=>({id,score:id}));
function prepare(file,body){
 const api=require(file),own=!!api.SnapshotIndex;
 const setup=own?'const create=()=>new api.SnapshotIndex(compare);':'const create=()=>api(compare);';
 // Compile only the selected operation sequence. No wrapper objects are added
 // around upstream trees; each side does exactly its actual Watch operations.
 const insert=own?'const added=current.insert(key);current=added.tree;total+=added.index;':'current=current.insert(key,null);total+=current.find(key).index;';
 const remove=own?'const removed=current.remove(key);total+=removed.index;current=removed.tree;':'const found=current.find(key);total+=found.index;current=found.remove();';
 const build=own?'tree=tree.insert(value).tree;':'tree=tree.insert(value,null);';
 return new Function('api','docs',`const compare=(a,b)=>a.score-b.score||a.id-b.id;${setup}const build=values=>{let tree=create();for(const value of values){${build}}return tree};`+body.replaceAll('INSERT',insert).replaceAll('REMOVE',remove))(api,docs);
}
const cases=[
 {name:'Watch index initial 1000 documents',make:file=>prepare(file,'return()=>{let current=create(),total=0;for(const key of docs){INSERT}return [current.length,total]}'),validate:x=>assert.deepEqual(x,[1000,499500])},
 {name:'Watch index 100 document moves in 1000',make:file=>prepare(file,'const tree=build(docs);return()=>{let current=tree,total=0;for(let i=0;i<100;i++){{const key=docs[i*7];REMOVE}{const key={id:i*7,score:2000+i};INSERT}}return [current.length,total,tree.length]}'),validate:x=>assert.deepEqual(x,[1000,129600,1000])},
 {name:'materialize retained 1000-document snapshot',make:file=>prepare(file,'const tree=build(docs);return()=>tree.keys'),validate:x=>assert.equal(x.length,1000)},
 {name:'remove and restore middle of 10000 documents',make:file=>prepare(file,'const values=Array.from({length:10000},(_,id)=>({id,score:id})),tree=build(values),key=values[5000];return()=>{let current=tree,total=0;{REMOVE}{INSERT}return [total,current.length]}'),validate:x=>assert.deepEqual(x,[10000,10000])},
];
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(root,'../../scripts/firestore-conformance/node_modules/functional-red-black-tree'),vpm:path.join(root,'build/src/snapshot-index.js'),cases,files:['package.json','app/watch.js','build/src/snapshot-index.js','bench/snapshot.cjs','../../scripts/firestore-conformance/package-lock.json','../../scripts/firestore-conformance/node_modules/functional-red-black-tree']}).catch(error=>{console.error(error);process.exitCode=1});
