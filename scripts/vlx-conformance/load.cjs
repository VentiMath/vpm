'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const selected=createRequire(path.join(__dirname,'package.json'));
module.exports=function load(name='index'){
 if(name!=='png'&&name!=='problem')return require('../../packages/vlx/'+name+'.cjs');
 const file=path.resolve(__dirname,'../../packages/vlx/'+name+'.cjs'),module={exports:{}};
 new Function('require','module','exports',fs.readFileSync(file,'utf8'))(id=>id==='vpngjs'?require('../../packages/vpngjs'):id.startsWith('./')?require(path.resolve(path.dirname(file),id)):selected(id),module,module.exports);
 return module.exports;
};
