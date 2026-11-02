'use strict';
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
if(process.argv.includes('--child')){
 const cleanup=require('jsdom-global')();globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{createRequire}=require('node:module');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-compare-react19-')),modules=path.join(directory,'node_modules');fs.mkdirSync(modules);
 for(const [from,to] of [['react19','react'],['react19-dom','react-dom'],['react-popper','react-popper'],['@popperjs/core','@popperjs/core'],['scheduler','scheduler'],['warning','warning'],['loose-envify','loose-envify'],['js-tokens','js-tokens']]){const source=path.join(__dirname,'node_modules',from);if(fs.existsSync(source))fs.cpSync(source,path.join(modules,to),{recursive:true});}
 const target=process.argv.includes('--upstream')?require.resolve('react-fast-compare'):require.resolve('../../packages/vreact-fast-compare');
 const wrapper=path.join(modules,'react-fast-compare');fs.mkdirSync(wrapper);fs.writeFileSync(path.join(wrapper,'index.js'),`const compare=require(${JSON.stringify(target)});module.exports=(...args)=>{globalThis.vpmCompareCount++;return compare(...args);};`);
 globalThis.vpmCompareCount=0;let created=0,updated=0,destroyed=0;
 const load=createRequire(path.join(directory,'app.cjs')),React=load('react'),{createRoot}=load('react-dom/client'),{usePopper}=load('react-popper');
 const reference=document.createElement('button'),floating=document.createElement('div'),host=document.createElement('div');document.body.append(host);
 const createPopper=()=>{created++;return{state:{},setOptions(){updated++;},destroy(){destroyed++;}};};
 function App({offset}){usePopper(reference,floating,{createPopper,modifiers:[{name:'offset',options:{offset:[0,offset]}}]});return null;}
 (async()=>{const root=createRoot(host);try{for(const offset of [4,4,8,8])await React.act(()=>root.render(React.createElement(App,{offset})));await React.act(()=>root.unmount());assert.equal(created,1);assert.equal(updated,1);assert.equal(destroyed,1);assert.equal(globalThis.vpmCompareCount,4);console.log(JSON.stringify({created,updated,destroyed,comparisons:globalThis.vpmCompareCount}));}finally{cleanup();fs.rmSync(directory,{recursive:true,force:true});delete globalThis.vpmCompareCount;}})().catch(error=>{console.error(error);process.exitCode=1;});
}else{
 const results=[true,false].map(upstream=>{const p=spawnSync(process.execPath,[__filename,'--child',...(upstream?['--upstream']:[])],{encoding:'utf8',timeout:15000});assert.equal(p.status,0,p.stdout+p.stderr);return JSON.parse(p.stdout);});assert.deepEqual(results[0],results[1]);console.log('Actual react-popper 2.3.0 with React 19.1: equal options retain the instance; changed nested modifiers update once; unmount disposes once.');
}
