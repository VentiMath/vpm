'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
module.exports=(variant,version='19.1')=>{
 const selected=createRequire(path.join(__dirname,version==='19.2'?'current/package.json':'package.json')),React=selected('react');
 const file=variant==='upstream'?require.resolve('@radix-ui/react-use-controllable-state'):path.resolve(__dirname,'../../packages/vradix-react-use-controllable-state/index.cjs');
 const cache=new Map();
 function evaluate(file){if(cache.has(file))return cache.get(file).exports;const module={exports:{}},local=createRequire(file);cache.set(file,module);
  new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>{
   if(name==='react')return React;
   if(name.endsWith('primitive/is-development'))return {IS_DEVELOPMENT:process.env.NODE_ENV!=='production'};
   if(name==='vradix-react-use-effect-event')return evaluate(path.resolve(__dirname,'../../packages/vradix-react-use-effect-event/index.cjs'));
   return name.startsWith('@radix-ui/')?evaluate(local.resolve(name)):local(name);
  },module,module.exports);return module.exports;}
 return {api:evaluate(file),React,selected};
};
