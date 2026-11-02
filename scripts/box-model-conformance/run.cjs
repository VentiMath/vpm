'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {expect}=require('expect'),esbuild=require('esbuild');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file))).digest('hex'),hash,file);
assert.equal(require('css-box-model/package.json').version,'1.2.1');
assert.equal(fs.readFileSync(path.join(__dirname,'node_modules/css-box-model/src/index.js'),'utf8'),fs.readFileSync(path.join(__dirname,'upstream/src/index.js.txt'),'utf8'));
const upstream=process.argv.includes('--upstream'),file=require.resolve(upstream?'css-box-model':'../../packages/vcss-box-model');
let count=0;const context=vm.createContext({window:{pageXOffset:0,pageYOffset:0},expect,process,Error,it:(_name,run)=>{run();count++}});
const selected={exports:{}};context.selected=selected;context.localRequire=require('node:module').createRequire(file);
vm.runInContext('(function(module,exports,require){'+fs.readFileSync(file,'utf8')+'\n})(selected,selected.exports,localRequire)',context);
const cache=new Map();
function load(name){
 if(name==='../src')return selected.exports;
 if(cache.has(name))return cache.get(name).exports;
 const module={exports:{}};cache.set(name,module);
 const source=fs.readFileSync(path.join(__dirname,'upstream/test',name.replace(/^\.\//,'')+'.js.txt'),'utf8');
 context.currentModule=module;context.fixtureRequire=load;
 const wrapper=vm.runInContext('(function(module,exports,require){'+esbuild.transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}).code+'\n})',context);
 wrapper(module,module.exports,load);return module.exports;
}
for(const name of fs.readdirSync(path.join(__dirname,'upstream/test')).filter(x=>x.endsWith('.spec.js.txt')))load('./'+name.slice(0,-7));
assert.equal(count,16);console.log(`${upstream?'Original':'VPM'}: all ${count} original css-box-model cases pass.`);
