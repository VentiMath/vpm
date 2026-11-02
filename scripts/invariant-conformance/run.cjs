'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const {expect}=require('expect'),{fn}=require('jest-mock'),{transformSync}=require('esbuild');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file))).digest('hex'),hash);
assert.equal(require('./node_modules/tiny-invariant/package.json').version,'1.3.3');assert.equal(fs.readFileSync(path.join(__dirname,'upstream/src/tiny-invariant.ts.txt'),'utf8'),fs.readFileSync(path.join(__dirname,'node_modules/tiny-invariant/src/tiny-invariant.ts'),'utf8'));
const upstream=process.argv.includes('--upstream'),source=fs.readFileSync(require.resolve(upstream?'tiny-invariant':'../../packages/vtiny-invariant'),'utf8');
const context={module:{exports:{}},process:{env:{NODE_ENV:'development'}},Error};vm.runInNewContext(source,context);
let count=0;
for(const file of ['throw-behaviour','message-behaviour']){
 const code=fs.readFileSync(path.join(__dirname,'upstream/test',file+'.spec.ts.txt'),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInNewContext("'use strict';\n"+transformSync(code,{loader:'ts',target:'es2022'}).code,{invariant:context.module.exports,Error,expect,jest:{fn},it:(_name,run)=>{run();count++}});
}
assert.equal(count,6);console.log(`${upstream?'Original':'VPM'}: all six original runtime assertion cases pass.`);
