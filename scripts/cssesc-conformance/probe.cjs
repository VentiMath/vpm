'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module');
const entry=process.env.VCSSESC_ENTRY||path.resolve(__dirname,'../../packages/vcssesc/index.cjs'),v=require(entry),u=require('cssesc');
let comparisons=0;const options=[];for(const isIdentifier of [false,true])for(const escapeEverything of [false,true])for(const quotes of ['single','double'])for(const wrap of [false,true])options.push({isIdentifier,escapeEverything,quotes,wrap});
const inputs=['','-','--','0','1a','-1a','éa é g é 9','foo 𝌆 bar',...Array.from({length:128},(_,i)=>String.fromCharCode(i)),...Array.from({length:128},(_,i)=>String.fromCharCode(i)+'a 0\\')];
let seed=0xc0ffee;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(let i=0;i<3000;i++){let s='';for(let j=0,n=rnd()%40;j<n;j++)s+=String.fromCharCode(rnd()%65536);inputs.push(s);}
for(const text of inputs)for(const o of options){
 const ours=v(text,o),theirs=u(text,o);
 if(o.isIdentifier&&text==='-'&&!o.escapeEverything){assert.equal(ours,'\\-');assert.equal(theirs,'-');continue;}
 if(o.isIdentifier&&o.escapeEverything&&/^\d/.test(text)){assert.equal(ours,v(text,{...o,isIdentifier:false,wrap:false}));assert.notEqual(ours,theirs);continue;}
 assert.equal(ours,theirs,JSON.stringify({text,o}));comparisons++;
}
function parser(name,escape){const main=require.resolve(name),base=path.dirname(main);for(const k of Object.keys(require.cache))if(k.startsWith(base+path.sep)||k===main)delete require.cache[k];const original=Module._load;Module._load=function(id,...args){return id==='cssesc'?escape:original.call(this,id,...args)};try{return require(name)}finally{Module._load=original}}
let callers=0;for(const name of ['postcss-selector-parser','selector-parser-app']){const a=parser(name,u),b=parser(name,v);for(const value of ['contest-result','w-1/2','hover:bg-blue-500','2026 AMC','--theme','école','math 𝌆','quote"bracket[','a\\b']){const transform=p=>p(root=>root.walkClasses(node=>{node.value=value})).processSync('.old > .child:not(.third)');assert.equal(transform(a),transform(b));const node=b.className({value:''});node.value=value;const out=node.toString();assert.equal(b().astSync(out).first.first.value,value);for(const quoteMark of ["'",'"']){const make=p=>{const n=p.attribute({attribute:'data-name',operator:'='});n.setValue(value,{quoteMark});return n.toString()};assert.equal(make(a),make(b));assert.equal(b().astSync(make(b)).first.first.value,value);callers++;}const tag=p=>{const n=p.tag({value:'item'});n.namespace=value;return n.toString()};assert.equal(tag(a),tag(b));callers+=2;}}
console.log(comparisons+' CSS option/Unicode comparisons and '+callers+' unchanged current/app selector-parser mutation/round-trip checks pass; two explicit identifier corrections');
