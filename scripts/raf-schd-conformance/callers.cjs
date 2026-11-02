'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm'),esbuild=require('esbuild');
const upstream=process.argv.includes('--upstream');
const library=upstream?require.resolve('raf-schd'):path.resolve(__dirname,'../../packages/vraf-schd/index.cjs');
const stub=require('raf-stub').default();
const listeners=new Map(),window={document:{},pageXOffset:0,pageYOffset:0,
 addEventListener:(name,callback,options)=>{assert.deepEqual({...options},{passive:true,capture:false});listeners.set(name,callback)},
 removeEventListener:(name,callback)=>{assert.equal(listeners.get(name),callback);listeners.delete(name)}};
const entry=path.resolve(__dirname,'node_modules/@hello-pangea/dnd/src/view/scroll-listener.ts');
const result=esbuild.buildSync({entryPoints:[entry],bundle:true,write:false,platform:'browser',format:'cjs',alias:{'raf-schd':library},metafile:true});
assert(Object.keys(result.metafile.inputs).some(file=>path.resolve(file)===library));
const sandbox={module:{exports:{}},window,requestAnimationFrame:stub.add,cancelAnimationFrame:stub.remove,process:{env:{NODE_ENV:'test'}}};
vm.runInNewContext(result.outputFiles[0].text,sandbox);
const calls=[],listener=sandbox.module.exports.default({onWindowScroll:value=>calls.push({...value})});
assert.equal(listener.isActive(),false);listener.start();assert.equal(listener.isActive(),true);
listeners.get('scroll')({target:{}});stub.step();assert.deepEqual(calls,[]);
listeners.get('scroll')({target:window});window.pageXOffset=10;window.pageYOffset=20;
listeners.get('scroll')({target:window.document});window.pageYOffset=30;
stub.step();assert.deepEqual(calls,[{x:10,y:30}]);
listeners.get('scroll')({target:window});listener.stop();stub.step();assert.equal(calls.length,1);assert.equal(listener.isActive(),false);assert.equal(listeners.size,0);
listener.start();window.pageXOffset=50;listeners.get('scroll')({target:window});stub.step();listener.stop();assert.deepEqual(calls,[{x:10,y:30},{x:50,y:30}]);
console.log(`${upstream?'Original':'VPM'}: actual @hello-pangea/dnd 18.0.1 scroll listener coalesces, filters, reads latest offsets, cancels, unbinds and restarts.`);
