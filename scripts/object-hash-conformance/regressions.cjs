'use strict';
const assert=require('node:assert/strict');
const probes={
 'DataView bytes and slices':hash=>{const a=new Uint8Array([9,1,2,9]),b=new Uint8Array([8,1,3,8]);assert.notEqual(hash(new DataView(a.buffer,1,2)),hash(new DataView(b.buffer,1,2)));assert.equal(hash(new DataView(a.buffer,1,2)),hash(new DataView(new Uint8Array([1,2]).buffer)));},
 'framed adjacent buffers':hash=>assert.notEqual(hash([Buffer.from('a'),Buffer.from('buffer:b')]),hash([Buffer.from('abuffer:'),Buffer.from('b')])),
 'unordered binary bytes':hash=>{const a=new Set([Buffer.from([254]),'same']),b=new Set([Buffer.from([255]),'same']);assert.notEqual(hash(a),hash(b));assert.equal(hash(a),hash(new Set([...a].reverse())));},
 'sparse hole positions':hash=>{const a=new Array(2),b=new Array(2);a[0]=1;b[1]=1;assert.notEqual(hash(a),hash(b));assert.notEqual(hash(a),hash([1,undefined]));},
 'map key/value roles':hash=>assert.notEqual(hash(new Map([['a','b']]),{unorderedArrays:true}),hash(new Map([['b','a']]),{unorderedArrays:true})),
 'file lastModified':hash=>{const make=n=>{const f=new File(['data'],'file',{lastModified:n});Object.defineProperty(f,Symbol.toStringTag,{value:'File'});return f;};assert.notEqual(hash(make(1)),hash(make(2)));},
 'passthrough returns exact Buffer':hash=>{const value=Buffer.from([0,254,255]);const data=hash(value,{algorithm:'passthrough',encoding:'buffer'});assert(Buffer.isBuffer(data));assert.deepEqual(data.subarray(-3),value);},
 'own option properties':hash=>assert.equal(hash('value',Object.create({algorithm:'md5'})),hash('value')),
 'boolean option validation':hash=>assert.throws(()=>hash({a:1},{unorderedArrays:'yes'}),TypeError),
};
function run(){const upstream=require('./node_modules/object-hash'),vpm=require('../../packages/vobject-hash');for(const[name,probe]of Object.entries(probes)){assert.throws(()=>probe(upstream),assert.AssertionError,name+' upstream control');probe(vpm);}console.log(Object.keys(probes).length+' paired object-hash corrections verified.');}
module.exports={probes,run};if(require.main===module)run();
