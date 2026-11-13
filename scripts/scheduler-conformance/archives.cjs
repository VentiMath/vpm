'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-scheduler-archives-'));
const run=(bin,args,cwd=scratch,extra={})=>execFileSync(bin,args,{cwd,encoding:'utf8',timeout:180000,env:{...process.env,npm_config_cache:path.join(os.tmpdir(),'vpm-npm-cache'),BUN_INSTALL_CACHE_DIR:scratch+'/bun-cache',...extra},stdio:['ignore','pipe','pipe']});
try{
 const packed=JSON.parse(run('npm',['pack',root+'/packages/vscheduler','--ignore-scripts','--json']))[0];
 assert.ok(packed.files.every(f=>!/^test\/|^bench\/|node_modules/.test(f.path)));
 const archive='file:'+scratch+'/'+packed.filename;
 for(const manager of ['npm','bun']){
  const dir=scratch+'/'+manager;fs.mkdirSync(dir);
  fs.writeFileSync(dir+'/package.json',JSON.stringify({private:true,type:'module',dependencies:{vscheduler:archive,react:'19.3.1','react-dom':'19.3.1'},overrides:{scheduler:archive}}));
  run(manager,manager==='npm'?['install','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts'],dir);
  run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts','--frozen-lockfile'],dir);
  for(const file of ['index.cjs','index.mjs','index.d.ts'])assert.equal(fs.readFileSync(dir+'/node_modules/vscheduler/'+file,'utf8'),fs.readFileSync(root+'/packages/vscheduler/'+file,'utf8'));
  for(const file of ['archive-check.mjs','consumer.mts','consumer.cts'])fs.copyFileSync(__dirname+'/'+file,dir+'/'+file);
  for(const runtime of ['node','bun'])process.stdout.write(run(runtime,[dir+'/archive-check.mjs'],dir));
  process.stdout.write(run('node',[__dirname+'/types.cjs',dir],root));
  const entry=dir+'/node_modules/vscheduler/index.cjs';
  process.stdout.write(run('node',[__dirname+'/contract.cjs'],root,{VPM_SCHEDULER_ENTRY:entry}));
  if(manager==='npm')process.stdout.write(run('node',[__dirname+'/browser.cjs'],root,{VPM_SCHEDULER_ENTRY:entry}));
 }
 console.log(JSON.stringify({name:packed.name,version:packed.version,packed:packed.size,unpacked:packed.unpackedSize}));
}finally{fs.rmSync(scratch,{recursive:true,force:true})}
