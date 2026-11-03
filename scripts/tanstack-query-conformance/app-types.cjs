'use strict';
// Read-only app audit: compile the same committed snapshot and installed graph
// twice, changing only the query declarations. Never edit the application checkout.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process');
const app=path.resolve(process.argv[2]),ref=process.argv[3]||'origin/main',root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-query-app-types-'));
try{
 const commit=execFileSync('git',['rev-parse',ref],{cwd:app,encoding:'utf8'}).trim();
 fs.writeFileSync(path.join(temp,'source.tar'),execFileSync('git',['archive',ref,'--','src','shared','package.json','tsconfig.json','vite.config.mts','vite-env.d.ts'],{cwd:app,maxBuffer:96e6}));
 execFileSync('tar',['-xf',path.join(temp,'source.tar'),'-C',temp]);fs.symlinkSync(path.join(app,'node_modules'),path.join(temp,'node_modules'),'dir');
 const json5=require(path.join(app,'node_modules/json5')),config=json5.parse(fs.readFileSync(path.join(temp,'tsconfig.json'),'utf8'));
 config.compilerOptions.incremental=false;
 const baseline={...config,compilerOptions:{...config.compilerOptions}},replacement=structuredClone(baseline);
 replacement.compilerOptions.paths['@tanstack/react-query']=[path.join(root,'packages/vtanstack-react-query/application.d.ts')];
 replacement.compilerOptions.paths['vtanstack-query-core']=[path.join(root,'packages/vtanstack-query-core/query-client.d.ts')];
 replacement.compilerOptions.paths.react=[path.join(app,'node_modules/@types/react/index.d.ts')];
 const reports={};
 for(const [name,c] of Object.entries({baseline,replacement})){
  const file=path.join(temp,name+'.json');fs.writeFileSync(file,JSON.stringify(c));const r=spawnSync('node',[require('../platform-types.cjs').compiler().path,'-p',file,'--pretty','false'],{cwd:temp,encoding:'utf8',maxBuffer:24e6,timeout:180000});assert.ifError(r.error);assert([0,1,2].includes(r.status),r.stderr);
  reports[name]=(r.stdout+r.stderr).replaceAll(temp,'APP').replaceAll(root,'VPM').split('\n').filter(l=>/error TS\d+/.test(l));
  fs.writeFileSync(path.join(os.tmpdir(),'vpm-query-app-'+name+'.log'),r.stdout+r.stderr);
 }
 const added=reports.replacement.filter(l=>!reports.baseline.includes(l));console.log(JSON.stringify({appCommit:commit,baselineErrors:reports.baseline.length,replacementErrors:reports.replacement.length,added},null,2));assert.deepEqual(added,[],'VPM adds application declaration errors');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
