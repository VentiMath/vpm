'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file))).digest('hex'),hash);
const original=process.argv.includes('--upstream'),library=original?require('./node_modules/shallow-equal'):require('../../packages/vshallow-equal');
const source=fs.readFileSync(path.join(__dirname,'upstream/index.test.ts.txt'),'utf8').replace(/^import .*;\n/gm,'');
const code=require('esbuild').transformSync(source,{loader:'ts',target:'es2022',format:'cjs'}).code;
let cases=0;vm.runInNewContext(code,{...library,describe:(_name,fn)=>fn(),it:(_name,fn)=>{fn();cases++;},expect:actual=>({toBe:expected=>assert.equal(actual,expected),toEqual:expected=>assert.deepEqual(actual,expected)})});
assert.equal(cases,31);console.log((original?'Original':'VPM')+': '+cases+' unchanged shallow-equal tests pass.');
// Reproduce the safety differences with the original, not just new-only tests.
let reads=0;
const inherited=Object.create({get value(){reads++;throw Error('inherited accessor');}});inherited.other=1;
if(original){assert.throws(()=>library.shallowEqualObjects({value:1},inherited),/inherited accessor/);assert.equal(reads,1);}
else{assert.equal(library.shallowEqualObjects({value:1},inherited),false);assert.equal(reads,0);}
assert.equal(library.shallowEqual(1,2),original);
assert.equal(library.shallowEqualArrays({length:0},{length:0}),original);
console.log('Original inherited-accessor and false-equality controls verified.');
