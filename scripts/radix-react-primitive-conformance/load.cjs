'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const cache=new Map();
function local(name){
  if(cache.has(name))return cache.get(name);
  const api=evaluate(path.resolve(__dirname,'../../packages',name,'index.cjs'))();cache.set(name,api);return api;
}
function evaluate(file,observe=()=>{},overrides={},warm=false) {
  const source=fs.readFileSync(file,'utf8'),compiled=new Function('require','module','exports',source),requireHere=createRequire(file);
  const resolve=name=>{
    if(Object.hasOwn(overrides,name))return overrides[name];
    if(name==='react'||name==='react/jsx-runtime'||name==='react-dom')return require(name);
    if(name==='vradix-react-slot'||name==='vradix-react-compose-refs')return local(name);
    return requireHere(name);
  };
  // The initialization benchmark excludes dependency loading/resolution for
  // both implementations, with the same Map lookup in each measured factory.
  const resolved=warm?new Map([...source.matchAll(/\brequire\(['"]([^'"]+)['"]\)/g)].map(m=>[m[1],resolve(m[1])])):null;
  const imports=name=>{observe(name);return resolved?resolved.get(name):resolve(name)};
  return ()=>{const mod={exports:{}};compiled(imports,mod,mod.exports);return mod.exports;};
}
function source(variant){return variant==='vpm'?path.resolve(__dirname,'../../packages/vradix-react-primitive/index.cjs'):require.resolve(variant==='legacy'?'react-primitive-legacy':'@radix-ui/react-primitive');}
module.exports=variant=>variant==='vpm'?local('vradix-react-primitive'):require(source(variant));
module.exports.factory=(variant,observe,overrides)=>evaluate(source(variant),observe,overrides);
module.exports.warmFactory=variant=>evaluate(source(variant),undefined,undefined,true);
module.exports.slot=variant=>variant==='vpm'?local('vradix-react-slot'):createRequire(source(variant))('@radix-ui/react-slot');
