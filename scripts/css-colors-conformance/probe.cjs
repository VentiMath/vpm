'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const colors=require(process.env.VCOLORS_ENTRY||'../../packages/vcss-color-keywords/index.cjs'),upstream=require('css-color-keywords');
for(const [name,value] of Object.entries(upstream))assert.equal(colors[name],value,name);
assert.deepEqual(Object.keys(colors).filter(k=>!Object.hasOwn(upstream,k)).sort(),['cyan','magenta']);
const caller=require.resolve('css-to-react-native'),baseline=require(caller).default,scratch=fs.mkdtempSync(path.join(os.tmpdir(),'vcss-colors-caller-'));
try{
 fs.cpSync(path.dirname(caller),scratch+'/caller',{recursive:true});fs.mkdirSync(scratch+'/caller/node_modules/css-color-keywords',{recursive:true});
 for(const dep of ['camelize','postcss-value-parser'])fs.symlinkSync(path.dirname(require.resolve(dep+'/package.json')),scratch+'/caller/node_modules/'+dep,'dir');
 const entry=path.resolve(process.env.VCOLORS_ENTRY||path.join(__dirname,'../../packages/vcss-color-keywords/index.cjs'));
 fs.writeFileSync(scratch+'/caller/node_modules/css-color-keywords/index.js',`const colors=require(${JSON.stringify(entry)});module.exports=new Proxy(colors,{has(target,key){globalThis.__colorReads=(globalThis.__colorReads||0)+1;return Reflect.has(target,key)},get(target,key){globalThis.__colorReads=(globalThis.__colorReads||0)+1;return Reflect.get(target,key)},getOwnPropertyDescriptor(target,key){globalThis.__colorReads=(globalThis.__colorReads||0)+1;return Reflect.getOwnPropertyDescriptor(target,key)}});`);
 const own=require(scratch+'/caller').default;let compared=0;
 for(const name of Object.keys(upstream))for(const pair of [['border','2px solid '+name],['text-shadow','1px 2px '+name],['box-shadow','1px 2px 3px '+name]]){assert.deepEqual(own([pair]),baseline([pair]));compared++}
 for(const [name,alias] of [['cyan','aqua'],['magenta','fuchsia']]){
  const actual=own([['border','2px solid '+name]]);assert.equal(actual.borderColor,name);
  assert.equal(own([['box-shadow','1px 2px 3px '+name]]).shadowColor,name);
  assert.equal(colors[name],upstream[alias]);assert.throws(()=>baseline([['border','2px solid '+name]]),/Failed to parse/);
 }
 assert(globalThis.__colorReads>100,'unchanged converter must consult the replacement');
 console.log('146 existing colors and '+compared+' unchanged CSS converter cases pass; cyan/magenta shorthands accepted; '+globalThis.__colorReads+' replacement reads verified');
}finally{delete globalThis.__colorReads;fs.rmSync(scratch,{recursive:true,force:true})}
