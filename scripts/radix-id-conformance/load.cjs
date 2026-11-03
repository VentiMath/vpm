'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
module.exports=(variant,version='19.1')=>{
 const selected=createRequire(path.join(__dirname,version==='19.2'?'current/package.json':'package.json'));
 const React=selected('react');
 const file=variant==='upstream'?require.resolve('@radix-ui/react-id'):path.resolve(__dirname,'../../packages/vradix-react-id/index.cjs');
 function evaluate(file){const module={exports:{}},local=createRequire(file);
  new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>name==='react'?React:name.startsWith('@radix-ui/')?evaluate(local.resolve(name)):local(name),module,module.exports);return module.exports;}
 return {api:evaluate(file),React,selected};
};
