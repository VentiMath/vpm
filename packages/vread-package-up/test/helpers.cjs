'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vread-package-up-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const nested=path.join(root,'a','b');fs.mkdirSync(nested,{recursive:true});
  return {root,nested,write(directory,value){fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'package.json'),typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value));}};
}
function loadWith(overrides, pathImplementation = path) {
  const source=fs.readFileSync(path.join(__dirname,'../index.js'),'utf8'),module={exports:{}};
  const fake=Object.assign({},fs,overrides);
  new Function('require','module','exports',source)(name=>name==='node:fs'?fake:name==='node:path'?pathImplementation:require(name),module,module.exports);
  return module.exports;
}
module.exports={fixture,loadWith};
