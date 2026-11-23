'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{load,currentControl}=require('./load.cjs');
const own=path.resolve(__dirname,'../../packages/venv-paths/index.cjs'),current=currentControl(),legacy=path.join(__dirname,'node_modules/env-paths-app/index.js');
const valid=['capacitor','MyApp','app with spaces','école','数学',' app ','app..','CON','a:b','__proto__'];
const invalid=['','.','..',' \t..\n','a/b','a\\b','a\0b',null,1,{},['app']];
const variants=[undefined,{}, {suffix:''},{suffix:'nodejs'},{suffix:'custom'},{suffix:null},{suffix:false},{suffix:0},{suffix:undefined},{suffix:'x/y'},{suffix:'x\\y'},{suffix:'x\0y'},null];
const outcome=(fn,name,options)=>{try{return {value:JSON.parse(JSON.stringify(fn(name,options)))}}catch(e){return {error:e.name,message:e.message}}};
let compared=0,legacyCompared=0;
for(const platform of ['darwin','linux','win32','freebsd'])for(let seed=0;seed<12;seed++){
 const windows=platform==='win32',base=windows?'C:\\Users\\user '+seed:'/home/user '+seed;
 const env={};for(const [i,key]of ['APPDATA','LOCALAPPDATA','XDG_DATA_HOME','XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_STATE_HOME'].entries())if((seed+i)%3!==0)env[key]=(seed+i)%3===1?'':(windows?'R:\\directories\\':'/directories/')+key;
 const context={platform,home:base,temp:windows?'T:\\tmp':'/tmp',env};const a=load(current,context).fn,b=load(own,context).fn,c=load(legacy,context).fn;
 for(const name of [...valid,...invalid])for(const options of variants){assert.deepEqual(outcome(b,name,options),outcome(a,name,options),`${platform} ${seed} ${String(name)} ${JSON.stringify(options)}`);compared++;}
 for(const name of valid)for(const options of [undefined,{}, {suffix:''},{suffix:'custom'}]){assert.deepEqual(outcome(b,name,options),outcome(c,name,options));legacyCompared++;}
 // Environment entries change after import; returned objects must not cache them.
 env.XDG_CONFIG_HOME=windows?'S:\\new':'/new';env.APPDATA=windows?'S:\\new':'/new';assert.deepEqual(outcome(b,'capacitor',{suffix:''}),outcome(a,'capacitor',{suffix:''}));compared++;
}
console.log(`${compared} current 4.0.0 comparisons and ${legacyCompared} app 2.2.1 comparisons pass across simulated macOS, Windows, Linux and FreeBSD paths; no native Windows execution claimed.`);
