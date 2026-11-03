'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=variant=>{
 if(variant==='upstream')return require('@radix-ui/react-focus-guards');
 const file=path.resolve(__dirname,'../../packages/vradix-react-focus-guards/index.cjs'),module={exports:{}};
 new Function('require','module','exports',fs.readFileSync(file,'utf8'))(require,module,module.exports);
 return module.exports;
};
