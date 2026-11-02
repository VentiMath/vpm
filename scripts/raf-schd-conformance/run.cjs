'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {expect}=require('expect'),{fn}=require('jest-mock'),esbuild=require('esbuild');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file))).digest('hex'),hash);
assert.equal(require('raf-schd/package.json').version,'4.0.3');
assert.equal(fs.readFileSync(path.join(__dirname,'node_modules/raf-schd/src/index.js'),'utf8'),fs.readFileSync(path.join(__dirname,'upstream/index.js.txt'),'utf8'));
const upstream=process.argv.includes('--upstream'),rafSchedule=upstream?require('raf-schd'):require('../../packages/vraf-schd');
const sandbox={rafSchedule,jest:{fn},expect,performance};sandbox.global=sandbox;
sandbox.replaceRaf=()=>require('raf-stub').replaceRaf([sandbox,global]);
let before=()=>{},count=0;
Object.assign(sandbox,{beforeEach:callback=>{before=callback},describe:(_name,callback)=>callback(),it:(_name,callback)=>{before();callback();count++}});
// The old suite uses Flow-compatible parameter annotations and a Jest alias
// removed in Jest 30. Only imports, type syntax and that assertion alias change.
const source=fs.readFileSync(path.join(__dirname,'upstream/index.spec.js.txt'),'utf8')
 .replace(/^import .*;\n/gm,'').replaceAll('.toBeCalledWith(','.toHaveBeenCalledWith(');
vm.runInNewContext("'use strict';\n"+esbuild.transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}).code,sandbox);
assert.equal(count,13);console.log(`${upstream?'Original':'VPM'}: all ${count} raf-schd tests pass.`);
