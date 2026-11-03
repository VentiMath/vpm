'use strict';
const fs=require('node:fs'),path=require('node:path');
let vpm;
module.exports=variant=>{
  if(variant!=='vpm')return require(variant==='legacy'?'react-context-legacy':'@radix-ui/react-context');
  if(!vpm){const mod={exports:{}};new Function('require','module','exports',fs.readFileSync(path.resolve(__dirname,'../../packages/vradix-react-context/index.cjs'),'utf8'))(require,mod,mod.exports);vpm=mod.exports;}
  return vpm;
};
