'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const envPaths=require('..'),{load}=require('../../../scripts/env-paths-conformance/load.cjs');
const file=require.resolve('..');
const plain=value=>JSON.parse(JSON.stringify(value));
test('CommonJS callable and default share identity; no directory writes are needed',async()=>{
 assert.equal(envPaths.default,envPaths);assert.equal((await import('../index.mjs')).default,envPaths);
 const result=envPaths('capacitor',{suffix:''});assert.deepEqual(Object.keys(result),['data','config','cache','log','temp']);
 assert.equal(result.temp,path.join(os.tmpdir(),...(process.platform==='darwin'||process.platform==='win32'?[]:[path.basename(os.homedir())]),'capacitor'));
});
test('macOS library locations ignore XDG and Windows overrides',()=>{
 const {fn}=load(file,{platform:'darwin',home:'/Users/test',temp:'/private/tmp/',env:{XDG_CACHE_HOME:'/wrong',APPDATA:'/wrong'}});
 assert.deepEqual(plain(fn('capacitor',{suffix:''})),{data:'/Users/test/Library/Application Support/capacitor',config:'/Users/test/Library/Preferences/capacitor',cache:'/Users/test/Library/Caches/capacitor',log:'/Users/test/Library/Logs/capacitor',temp:'/private/tmp/capacitor'});
});
test('Windows uses roaming configuration and local data, cache and logs',()=>{
 const env={APPDATA:'R:\\Profiles\\user',LOCALAPPDATA:'L:\\Local'}, {fn}=load(file,{platform:'win32',home:'C:\\Users\\test',temp:'T:\\tmp',env});
 assert.deepEqual(plain(fn('app')),{data:'L:\\Local\\app-nodejs\\Data',config:'R:\\Profiles\\user\\app-nodejs\\Config',cache:'L:\\Local\\app-nodejs\\Cache',log:'L:\\Local\\app-nodejs\\Log',temp:'T:\\tmp\\app-nodejs'});
 delete env.APPDATA;env.LOCALAPPDATA='';const fallback=fn('app',{suffix:''});assert.equal(fallback.config,'C:\\Users\\test\\AppData\\Roaming\\app\\Config');assert.equal(fallback.cache,'C:\\Users\\test\\AppData\\Local\\app\\Cache');
});
test('XDG overrides are live and independent; other Unix systems use the same policy',()=>{
 for(const platform of ['linux','freebsd']){const env={}, {fn}=load(file,{platform,home:'/home/test',temp:'/tmp/',env});
  assert.deepEqual(plain(fn('app',{suffix:''})),{data:'/home/test/.local/share/app',config:'/home/test/.config/app',cache:'/home/test/.cache/app',log:'/home/test/.local/state/app',temp:'/tmp/test/app'});
  env.XDG_CONFIG_HOME='/run/config';env.XDG_STATE_HOME='/run/state';assert.equal(fn('app').config,'/run/config/app-nodejs');assert.equal(fn('app').log,'/run/state/app-nodejs');env.XDG_CONFIG_HOME='';assert.equal(fn('app').config,'/home/test/.config/app-nodejs');
 }
});
test('names cannot escape their base; validation happens before suffixing',()=>{
 for(const name of ['', '.', '..',' \n.\t ','a/b','a\\b','a\0b'])assert.throws(()=>envPaths(name),/Unsafe filename/);
 for(const name of [undefined,null,1,{},['app']])assert.throws(()=>envPaths(name),TypeError);
 for(const suffix of ['../other','x/y','x\\y','x\0y'])assert.throws(()=>envPaths('app',{suffix}),/Unsafe filename/);
 assert.throws(()=>envPaths('app',{suffix:Symbol('x')}),TypeError);assert.throws(()=>envPaths('app',null),TypeError);
});
test('Unicode, whitespace and custom suffix coercion preserve the current API',()=>{
 for(const name of ['école','数学','app with spaces',' app ','app..'])assert(envPaths(name,{suffix:''}).config.endsWith(name));
 const hints=[];const suffix={[Symbol.toPrimitive](hint){hints.push(hint);return 'custom'}};
 assert(envPaths('app',{suffix}).cache.endsWith('app-custom'));assert.deepEqual(hints,['string']);
 for(const suffix of ['',false,0,null])assert(envPaths('app',{suffix}).cache.endsWith('app'));
 assert(envPaths('app',{suffix:undefined}).cache.endsWith('app-nodejs'));
});
test('results are independent, options unmodified, captured home/temp remain stable',()=>{
 const options=Object.freeze({suffix:''}),ctx=load(file,{platform:'linux',home:'/home/first',temp:'/scratch',env:{}}),a=ctx.fn('app',options);a.config='changed';
 ctx.os.homedir=()=>'/home/second';ctx.os.tmpdir=()=>'/other';assert.equal(ctx.fn('app',options).config,'/home/first/.config/app');assert.equal(ctx.fn('app',options).temp,'/scratch/first/app');
});
