'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=variant=>{if(variant==='upstream')return require('@radix-ui/react-use-layout-effect');const mod={exports:{}};new Function('require','module','exports',fs.readFileSync(path.resolve(__dirname,'../../packages/vradix-react-use-layout-effect/index.cjs'),'utf8'))(require,mod,mod.exports);return mod.exports};
