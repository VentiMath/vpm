'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),esbuild=require('esbuild');
function load(file,mode,requireFn){const module={exports:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,process:{env:{NODE_ENV:mode}},Error,require:requireFn});return module.exports}
for(const mode of ['development','production']){
 const observations=[];
 for(const original of [true,false]){
  const selected=require.resolve(original?'tiny-invariant':'../../packages/vtiny-invariant'),invariant=load(selected,mode);let calls=0;
  const box=load(require.resolve('css-box-model'),mode,name=>{assert.equal(name,'tiny-invariant');return(...args)=>{calls++;return invariant(...args)}});
  const rect=box.getRect({top:10,left:20,bottom:60,right:100});const styles={};
  for(const side of ['Top','Right','Bottom','Left']){styles['margin'+side]='3px';styles['padding'+side]='4px';styles['border'+side+'Width']='1px'}
  const valid=box.calculateBox(rect,styles);assert.equal(calls,0);assert.equal(valid.contentBox.width,70);
  const errors=[];for(const property of ['marginTop','paddingRight','borderLeftWidth']){
   try{box.calculateBox(rect,{...styles,[property]:'invalidpx'});assert.fail('must throw')}catch(error){assert.equal(error.message.startsWith('Invariant failed'),true);errors.push(error.message)}
  }
  assert.equal(calls,3);observations.push(JSON.stringify({valid,errors}));
  const output=esbuild.buildSync({stdin:{contents:`import invariant from ${JSON.stringify(selected)};globalThis.assertValue=invariant;`,resolveDir:__dirname},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':JSON.stringify(mode)},minify:true}).outputFiles[0].text;
  const sandbox={};vm.runInNewContext(output,sandbox);let evaluated=0;sandbox.assertValue(true,()=>{evaluated++;return 'hidden'});
  assert.throws(()=>sandbox.assertValue(false,()=>{evaluated++;return 'detail'}),{message:mode==='production'?'Invariant failed':'Invariant failed: detail'});
  assert.equal(evaluated,mode==='production'?0:1);
  if(mode==='production'&&!original){assert.doesNotMatch(sandbox.assertValue.toString(),/typeof|Invariant failed: /);assert.doesNotMatch(output,/Invariant failed: /)}
 }
 assert.equal(observations[0],observations[1]);
}
console.log('Original/VPM: css-box-model layout and three malformed-style paths match in both modes; both browser modes preserve laziness; the VPM production bundle strips diagnostic handling.');
