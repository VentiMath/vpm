'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const peers=path.resolve(__dirname,'../mui-system-conformance/node_modules'),peer=createRequire(peers+'/../package.json'),{JSDOM,VirtualConsole}=peer('jsdom');
const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM('<!doctype html><html><body></body></html>',{pretendToBeVisual:true,url:'http://localhost',virtualConsole:console});
const win=dom.window,keys=['window','document','HTMLElement','SVGElement','Element','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'];
const old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-motion-jsdom-'));
(async()=>{try{
 for(const key of keys){const value=key==='window'?win:key==='document'?win.document:typeof win[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?win[key].bind(win):win[key];Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});}
 const installed=process.env.VPM_MOTION_RELEASE_INSTALL,root=path.resolve(__dirname,'../../packages');
 const alias={'@motion':installed?installed+'/node_modules/motion/react.cjs':root+'/vmotion/react.cjs','vmotion-dom':installed?installed+'/node_modules/vmotion-dom':root+'/vmotion-dom','vmotion-utils':installed?installed+'/node_modules/vmotion-utils':root+'/vmotion-utils',react:installed?installed+'/node_modules/react':peers+'/react','react-dom':installed?installed+'/node_modules/react-dom':peers+'/react-dom'};
 peer('esbuild').buildSync({entryPoints:[__dirname+'/jsdom-scene.jsx'],outfile:tmp+'/scene.cjs',bundle:true,platform:'node',format:'cjs',alias,define:{'process.env.NODE_ENV':'"development"'},logLevel:'silent'});
 await require(tmp+'/scene.cjs').check(win.document,assert);assert.deepEqual(errors,[]);
 process.stdout.write('jsdom '+peer('jsdom/package.json').version+': four authored-transform animation/control scenarios retain DOM identity and focus without frame errors.\n');
}finally{await new Promise(resolve=>setTimeout(resolve,30));dom.window.close();for(const key of keys){const value=old.get(key);if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{process.stderr.write(String(e.stack)+'\n'+JSON.stringify(errors)+'\n');process.exitCode=1;});
