'use strict';
const fs = require('node:fs'),path = require('node:path'),assert = require('node:assert/strict');
const {control} = require('../../../scripts/container-conformance/load.cjs');
const root = path.resolve(__dirname,'..'),vpm = path.join(root,'index.cjs'),upstream = control('is-inside-container');
function fresh(file,fsStub) {
  const factory = new Function('require','module','exports',fs.readFileSync(file,'utf8'));
  const resolve = name => name==='node:fs'?fsStub:() => false;
  return () => {const module={exports:{}};factory(resolve,module,module.exports);return module.exports()};
}
const nativeExpected = (()=>{try{return Boolean(fs.statSync('/run/.containerenv'))}catch{return false}})();
const cases = [
  {name:'cached result',make(file){const factory=new Function('require','module','exports',fs.readFileSync(file,'utf8'));const module={exports:{}};factory(name=>name==='node:fs'?{statSync:()=>({})}:()=>false,module,module.exports);module.exports();return module.exports},validate:value=>assert.equal(value,true)},
  {name:'fresh module and Podman marker (simulated)',make:file=>fresh(file,{statSync:()=>({})}),validate:value=>assert.equal(value,true)},
  {name:'fresh module and native marker; Docker stubbed',make:file=>fresh(file,fs),validate:value=>assert.equal(value,nativeExpected)},
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm,cases,files:['index.cjs','index.mjs','package.json','bench/compare.cjs','../../scripts/container-conformance/load.cjs','../../scripts/container-conformance/package-lock.json']}).catch(error=>{console.error(error);process.exitCode=1});
