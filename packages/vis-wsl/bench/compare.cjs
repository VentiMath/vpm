'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {control}=require('../../../scripts/container-conformance/load.cjs');
const root=path.resolve(__dirname,'..'),vpm=path.join(root,'index.cjs'),upstream=control('is-wsl');
const cases=[
  ['non-Linux import snapshot','darwin','24.0',false],
  ['WSL kernel import snapshot','linux','5.15-microsoft-standard',true],
  ['custom kernel import snapshot','linux','6.12-custom',true],
].map(([name,platform,release,expected])=>({
  name:name+' (simulated)',
  make(file){
    const factory=new Function('require','module','exports',fs.readFileSync(file,'utf8'));
    const modules={
      'node:process':{platform,env:{}},'node:os':{release:()=>release},
      'node:fs':{readFileSync:()=> 'Linux version 6.12-custom',existsSync:file=>file==='/run/WSL'},
      'is-inside-container':()=>false,'vis-inside-container':()=>false,
    };
    const require=name=>modules[name];
    return()=>{const module={exports:{}};factory(require,module,module.exports);return module.exports};
  },
  validate:value=>assert.equal(value,expected),
}));
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm,cases,files:['index.cjs','index.mjs','package.json','bench/compare.cjs','../../scripts/container-conformance/load.cjs','../../scripts/container-conformance/package-lock.json']}).catch(error=>{console.error(error);process.exitCode=1});
