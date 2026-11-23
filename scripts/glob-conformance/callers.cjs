'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vglob-rimraf-'))),own=process.env.VPM_GLOB_PACKAGE||path.resolve(__dirname,'../../packages/vglob');
let checks=0;
function inventory(cwd){return fs.readdirSync(cwd,{recursive:true}).sort();}
function fixture(name){const cwd=tmp+'/'+name;for(const p of ['dist/app.js','dist/cache/a.tmp','dist/keep.txt','src/app.ts','src/keep.js','.cache/a.tmp']){fs.mkdirSync(path.dirname(cwd+'/'+p),{recursive:true});fs.writeFileSync(cwd+'/'+p,'keep');}fs.symlinkSync('src',cwd+'/linked');return cwd;}
(async()=>{try{
 for(const name of ['rimraf','rimraf-five']){
  const entry=require.resolve(name),dir=tmp+'/caller-'+name;fs.mkdirSync(dir,{recursive:true});
  const original=path.resolve(path.dirname(entry),'../..');fs.cpSync(original,dir,{recursive:true});
  // Runtime caller source is untouched. Only its dependency resolution changes.
  fs.rmSync(dir+'/node_modules/glob',{recursive:true,force:true});
  fs.mkdirSync(dir+'/node_modules/glob',{recursive:true});
  fs.writeFileSync(dir+'/node_modules/glob/index.js',`const g=require(${JSON.stringify(own)});let count=0;module.exports={...g,glob(...a){count++;return g.glob(...a)},globSync(...a){count++;return g.globSync(...a)},calls:()=>count};`);
  const replacement=createRequire(dir+'/package.json')('./dist/commonjs/index.js'),control=require(name),bridge=createRequire(dir+'/package.json')('glob');
  for(const sync of [true,false]) for(const [pattern,glob] of [['dist/**/*.js',true],['**/*.tmp',{dot:true}],['dist/*',{ignore:'**/keep.txt'}],[['dist/**','linked'],true],[['dist','linked'],true],['no-match-*',true]]){
   const c=fixture('control-'+checks),v=fixture('vpm-'+checks);const qualify=(p,cwd)=>Array.isArray(p)?p.map(x=>cwd+'/'+x):cwd+'/'+p;
   const overlapping=Array.isArray(pattern)&&pattern[0]==='dist/**';
   // Bun's native rm can return with a directory remaining when a parent and
   // children are removed concurrently. Check expansion independently, then
   // use upstream's filter-capable traversal for this overlapping case. The
   // adjacent disjoint-array case still exercises its default native strategy.
   if(overlapping){const g=createRequire(entry)('glob'),opts={absolute:true,withFileTypes:false};assert.deepEqual((await require(own).glob(qualify(pattern,v),opts)).map(p=>p.slice(v.length)).sort(),(await g.glob(qualify(pattern,c),opts)).map(p=>p.slice(c.length)).sort());}
   const opts={glob,...(overlapping?{filter:()=>true}:{})};
   const fn=sync?'rimrafSync':'rimraf';const a=await control[fn](qualify(pattern,c),opts),b=await replacement[fn](qualify(pattern,v),opts);
   assert.equal(b,a);assert.deepEqual(inventory(v),inventory(c),JSON.stringify([name,sync,pattern,glob]));checks++;
  }
  assert.equal(bridge.calls(),12,'all cleanup calls must reach VPM glob');
 }
 console.log(`${checks} unchanged rimraf 6.1.3 and 5.0.10 cleanup checks pass; all deletions confined to scratch fixtures.`);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
