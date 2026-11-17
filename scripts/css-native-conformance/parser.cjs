'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const own=require(process.env.VPARSER_ENTRY||'../../packages/vpostcss-value-parser'),control=require('postcss-value-parser');
let assertions=0;
const tape=(_name,fn)=>fn({test:tape,plan(){},end(){},equal(a,b,msg){assert.equal(a,b,msg);assertions++},deepEqual(a,b,msg){assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),msg);assertions++},ok(a,msg){assert(a,msg);assertions++}});
for(const file of ['parse','stringify','unit','index']) {
 const dir=path.join(__dirname,'upstream-parser/test'),code=fs.readFileSync(path.join(dir,file+'.js'),'utf8');
 vm.runInNewContext(code,{require(id){if(id==='tape')return tape;if(id==='..')return own;if(id==='../lib/parse')return s=>own(s).nodes;if(id==='../lib/stringify')return own.stringify;if(id==='../lib/unit')return own.unit;throw Error(id)}},{filename:file+'.js'});
}
console.log(assertions+' unchanged upstream parser assertions pass');
let seed=12345;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
const atoms=['a','2px',' ', '\n','/',',',':','calc(','rgb(','url(','(',')','"a b"',"'c'",'/*ok*/','\\(','U+20','*','+'];
let compared=0;for(let n=0;n<3000;n++){let s='';for(let j=random(12);j>=0;j--)s+=atoms[random(atoms.length)];const expected=control(s);assert.equal(own(s).toString(),s,s); if(!s.includes('/*/')) { const normalize=nodes=>{const out=[];for(const node of nodes){node.sourceEndIndex=Math.min(node.sourceEndIndex,s.length);if(node.nodes)node.nodes=normalize(node.nodes);const last=out[out.length-1];if(node.type==='div'&&last?.type==='space'){node.before=last.value+node.before;node.sourceIndex=last.sourceIndex;out.pop();}out.push(node);}return out;};assert.deepEqual(normalize(own(s).nodes),normalize(structuredClone(expected.nodes)),s);assert.equal(own(s).toString(),expected.toString(),s); } compared++;}
console.log(compared+' deterministic malformed/valid parser comparisons pass');
