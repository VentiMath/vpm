// Read-only comparison against a detached app snapshot; no application files are changed.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process');
const app=process.env.VPM_APP_REPO,vpm=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-functions-app-'));
try{
 assert.ok(app,'Set VPM_APP_REPO to a local VentiMath checkout');
 const sha=execFileSync('git',['rev-parse','origin/main'],{cwd:app,encoding:'utf8'}).trim();
 const archive=execFileSync('git',['archive','origin/main','functions'],{cwd:app,maxBuffer:64*1024*1024});execFileSync('tar',['-xf','-','-C',tmp],{input:archive});
 for(const sub of ['', 'functions'])fs.symlinkSync(path.join(app,sub,'node_modules'),path.join(tmp,sub,'node_modules'),'dir');
 const meta=require(path.join(vpm,'packages/vfirebase-functions/package.json'));
 const paths={};for(const [name,entry] of Object.entries(meta.exports)){if(typeof entry==='object')paths[name==='.'?'firebase-functions':'firebase-functions/'+name.slice(2)]=[path.join(vpm,'packages/vfirebase-functions',entry.types)];}
 const tsc=require(path.join(vpm,'scripts/platform-types.cjs')).compiler().path;
 const reports=[];
 for(const variant of ['upstream','vpm']){
  fs.writeFileSync(path.join(tmp,'functions/tsconfig.compare.json'),JSON.stringify({extends:'./tsconfig.json',compilerOptions:{noEmit:true,...(variant==='vpm'?{paths}: {})}}));
  const result=spawnSync('node',[tsc,'-p',path.join(tmp,'functions/tsconfig.compare.json'),'--pretty','false'],{encoding:'utf8',maxBuffer:16*1024*1024});
  fs.writeFileSync('/private/tmp/vpm-functions-app-'+variant+'.log',result.stdout+result.stderr);
  reports.push({variant,status:result.status,diagnostics:(result.stdout+result.stderr).replaceAll(tmp,'APP').trim()});
 }
 assert.equal(reports[1].status,reports[0].status,JSON.stringify(reports));const entries=text=>new Map(text.split(/\n(?=.*?\(\d+,\d+\): error TS)/).filter(Boolean).map(block=>[block.match(/(functions\/src\/[^\n]+?\(\d+,\d+\))/)?.[1],block]));
 const baseline=entries(reports[0].diagnostics),candidate=entries(reports[1].diagnostics);
 assert.deepEqual([...candidate.keys()],[...baseline.keys()],'New app diagnostic locations');
 let changedMockErrors=0;
 for(const [location,error] of candidate){if(error===baseline.get(location))continue;
   assert.match(location,/^functions\/src\/(campusApi\.(floor|signals)|campusCaller\.auth)\.test\.ts/);
   assert.match(baseline.get(location),/Property 'param' is missing/);assert.match(error,/Types of property 'app' are incompatible/);changedMockErrors++;
 }
 assert.ok(changedMockErrors===0||changedMockErrors===4);
 console.log(JSON.stringify({appCommit:sha,upstreamExit:reports[0].status,vpmExit:reports[1].status,newDiagnosticLocations:0,changedExistingMockErrors:changedMockErrors,diagnostics:baseline.size,lines:reports[0].diagnostics?reports[0].diagnostics.split('\n').length:0}));
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
