'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
module.exports=function selected(variant){
  if(variant!=='vpm')return require(variant==='legacy'?'compose-refs-legacy':'@radix-ui/react-compose-refs');
  const file=path.resolve(__dirname,'../../packages/vradix-react-compose-refs/index.cjs'),local=createRequire(file),mod={exports:{}};
  new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>name==='react'?require('react'):local(name),mod,mod.exports);
  return mod.exports;
};
