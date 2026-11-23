'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {esbuild}=require('../mui-material-conformance/paths.cjs');
const vpm=require(process.env.VPM_LAZY_PACKAGE||'../../packages/vdefine-lazy-prop');
const controls=['open','open-app'].map(name=>{const file=require.resolve(name),source=fs.readFileSync(file,'utf8');return{name,file,source,code:name==='open'?esbuild.transformSync(source,{format:'cjs',platform:'node',logLevel:'silent'}).code:source}});
function load({name,file,code},define,platform,arch,wsl){
 let registered=0,initialized=0,blockedCalls=0;const processStub={platform,arch,env:{}};
 const blocked=()=>{blockedCalls++;throw Error('Unexpected process or filesystem operation')};
 const overrides={process:processStub,path:require('node:path'),url:require('node:url'),child_process:{spawn:blocked,exec:blocked},fs:{promises:{access:blocked,readFile:blocked},constants:fs.constants,statSync:blocked},'fs/promises':{access:blocked,readFile:blocked,constants:fs.constants},'is-wsl':wsl,'is-docker':()=>false,'is-inside-container':()=>false,'is-in-ssh':()=>false,'wsl-utils':{isWsl:wsl},'powershell-utils':{},'default-browser':blocked,'define-lazy-prop':(target,key,initialize)=>{registered++;return define(target,key,()=>{initialized++;return initialize()})}};
 const requireStub=id=>{id=id.replace(/^node:/,'');assert(Object.hasOwn(overrides,id),'Unexpected import '+id);return overrides[id]};
 const m={exports:{}};const params=name==='open'?['require','module','exports','process']:['require','module','exports','process','__dirname'];
 new Function(...params,code)(requireStub,m,m.exports,processStub,path.dirname(file));
 const apps=m.exports.apps;assert.equal(initialized,0);const keys=Object.keys(apps);const values=[];
 for(const key of keys){const before=initialized;try{const a=apps[key];assert.equal(apps[key],a);values.push([key,a]);assert.equal(initialized,before+(key==='browser'||key==='browserPrivate'?0:1));}catch(error){values.push([key,error.message]);}}
 const names=keys.filter(key=>Object.getOwnPropertyDescriptor(apps,key)?.get);if(names.length){const before=initialized;apps[names[0]]='override';assert.equal(apps[names[0]],'override');assert.equal(initialized,before);}
 assert.equal(blockedCalls,0);return {registered,initialized,values};
}
(async()=>{
 let count=0;for(const control of controls){const lazy=(await import(require('node:url').pathToFileURL(require.resolve(control.name==='open'?'define-lazy-prop':'define-lazy-prop-app')))).default;
  for(const platform of ['darwin','win32','linux','freebsd'])for(const arch of ['x64','arm64'])for(const wsl of [false,true]){assert.deepEqual(load(control,vpm,platform,arch,wsl),load(control,lazy,platform,arch,wsl));count++;}
 }
 console.log(JSON.stringify({scenarios:count,callers:Object.fromEntries(controls.map(c=>[c.name,{version:require(path.join(path.dirname(c.file),'package.json')).version,sha256:createHash('sha256').update(c.source).digest('hex')}]))}));
 console.log('Unchanged opener app-name getters match with initialization instrumented; all process launches and file reads blocked.');
})().catch(e=>{console.error(e);process.exitCode=1});
