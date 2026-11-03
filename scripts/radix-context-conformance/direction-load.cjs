'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=function load(variant){
 if(variant==='upstream')return require('@radix-ui/react-direction');
 const file=path.resolve(__dirname,'../../packages/vradix-react-direction/index.cjs'),mod={exports:{}};
 // Keep one fixture React instance in both independent worker processes.
 new Function('require','module','exports',fs.readFileSync(file,'utf8'))(require,mod,mod.exports);
 return mod.exports;
};
