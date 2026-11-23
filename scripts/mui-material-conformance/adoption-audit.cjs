'use strict';
// Export a committed adoption branch; never change the consumer's worktree.
const fs=require('node:fs'),path=require('node:path'),{execFileSync,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),app=process.env.VPM_APP_REPO,dir=process.env.VPM_ADOPTION_AUDIT_DIR;
if(!app||!dir)throw Error('VPM_APP_REPO and fresh VPM_ADOPTION_AUDIT_DIR required');
fs.mkdirSync(dir);process.env.npm_config_cache=dir+'/npm-cache';const ref=execFileSync('git',['rev-parse',process.env.VPM_APP_REF||'HEAD'],{cwd:app,encoding:'utf8'}).trim();
fs.writeFileSync(dir+'/app.tar',execFileSync('git',['archive',ref],{cwd:app,maxBuffer:200e6}));
for(const v of ['baseline','candidate']){fs.mkdirSync(dir+'/'+v);execFileSync('tar',['-xf',dir+'/app.tar','-C',dir+'/'+v])}fs.unlinkSync(dir+'/app.tar');
const report={appCommit:ref,checks:[],adopted:false};
function run(bin,args,cwd,label){const fd=fs.openSync(dir+'/'+label+'.log','w'),r=spawnSync(bin,args,{cwd,env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore',fd,fd],timeout:600000});fs.closeSync(fd);report.checks.push({label,status:r.status,signal:r.signal});fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));console.log(label+': '+r.status);return r.status}
const urls={},meta={},packs=dir+'/packs';fs.mkdirSync(packs);
function pack(name){if(urls[name])return;const source=root+'/packages/'+name,p=JSON.parse(fs.readFileSync(source+'/package.json'));meta[name]=p;
 for(const dep of Object.keys(p.dependencies||{}))pack(dep);
 const stage=packs+'/'+name;fs.cpSync(source,stage,{recursive:true,filter:f=>!/(?:^|\/)(?:node_modules|test|bench)(?:\/|$)/.test(f)});
 const out=structuredClone(p);for(const dep of Object.keys(out.dependencies||{}))out.dependencies[dep]=urls[dep];fs.writeFileSync(stage+'/package.json',JSON.stringify(out));
 const [result]=JSON.parse(execFileSync('npm',['pack',stage,'--ignore-scripts','--json'],{cwd:packs,encoding:'utf8'}));urls[name]='file:'+packs+'/'+result.filename;
}
pack('vmui-material');pack('vmaterial-react-table');
const candidate=dir+'/candidate',p=JSON.parse(fs.readFileSync(candidate+'/package.json'));p.dependencies={...p.dependencies,...urls};p.overrides={...p.overrides,...urls};fs.writeFileSync(candidate+'/package.json',JSON.stringify(p,null,2));
const config=JSON.parse(fs.readFileSync(candidate+'/tsconfig.json'));config.compilerOptions.paths??={};
for(const [name,m] of Object.entries(meta)){
 const provenance=JSON.parse(fs.readFileSync(root+'/packages/'+name+'/PROVENANCE.json')),original=provenance.upstream?.name||provenance.upstream?.package;
 for(const [key,target] of Object.entries(m.exports||{}))if(target?.import?.types)config.compilerOptions.paths[original+(key==='.'?'':key.slice(1))]=[...new Set([target.import.types,target.import.default||target.import.types])].map(file=>'./node_modules/'+name+'/'+file.replace(/^\.\//,''));
}
fs.writeFileSync(candidate+'/tsconfig.json',JSON.stringify(config,null,2));
const test=execFileSync('git',['ls-tree','-r','--name-only',ref],{cwd:app,encoding:'utf8'}).split('\n').find(f=>f.endsWith('/WAMOView.test.tsx'));if(!test)throw Error('WAMO test missing');
for(const variant of ['baseline','candidate']){const cwd=dir+'/'+variant;
 if(run('bun',['install','--ignore-scripts',...(variant==='baseline'?['--frozen-lockfile']:[])],cwd,variant+'-install'))throw Error('Install failed');
 run('bun',['run','typecheck'],cwd,variant+'-types');run('bun',['test',test],cwd,variant+'-wamo');
 if(variant==='candidate')run('bun',['x','--no-install','vite','build'],cwd,variant+'-build');
}
if(report.checks.filter(c=>c.label.startsWith('candidate')).some(c=>c.status!==0))process.exitCode=1;
