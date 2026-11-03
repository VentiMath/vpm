'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const cache=new Map();
function load(name){
  if(cache.has(name))return cache.get(name);
  const file=path.resolve(__dirname,'../../packages',name,'index.cjs'),local=createRequire(file),mod={exports:{}};
  new Function('require','module','exports',fs.readFileSync(file,'utf8'))(id=>id==='react'?require('react'):id==='vradix-react-compose-refs'?load(id):local(id),mod,mod.exports);
  cache.set(name,mod.exports);return mod.exports;
}
module.exports=variant=>variant==='vpm'?load('vradix-react-slot'):require(variant==='legacy'?'slot-legacy':'@radix-ui/react-slot');
