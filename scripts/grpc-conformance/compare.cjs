'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vgrpc-control-'));
try {
  const reports=[];
  for(const variant of ['upstream','vpm']) {
    const summary=path.join(temporary,variant+'.json');
    const result=spawnSync(process.execPath,[path.join(__dirname,'run.cjs'),'--report-only',...(variant==='upstream'?['--upstream']:[])],{encoding:'utf8',maxBuffer:2e6,timeout:260000,env:{...process.env,SUMMARY:summary}});
    process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
    assert.equal(result.status,0,variant+' harness failed');reports.push(JSON.parse(fs.readFileSync(summary,'utf8')));
  }
  const [control,vpm]=reports;
  assert.deepEqual(vpm.pending,control.pending);
  const known=new Map(process.versions.bun?[
    ['Transparent retries for queued HTTP/2 streams Should not retry processed requests when the connection drops','null == true'],
    ['Server drain Should cancel open calls after the grace period ends','Expected values to be strictly equal:\n\n14 !== 1\n']
  ]:[]);
  for(const f of control.failures)assert.equal(f.error,known.get(f.title),'Unrecognized upstream failure: '+f.title);
  assert.deepEqual(vpm.failures,control.failures,'VPM failures must match this run’s upstream control exactly');
  assert.equal(vpm.stats.passes,control.stats.passes);
  console.log(`gRPC comparison gate: ${vpm.stats.passes} passes; ${vpm.stats.pending} original skips; ${vpm.failures.length} matched upstream runtime limitations. No additional VPM failures.`);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
