'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const folder=path.join(__dirname,'results'),root=path.resolve(__dirname,'..');
const reports=fs.readdirSync(folder).filter(f=>f.endsWith('.json')).map(f=>({file:f,...JSON.parse(fs.readFileSync(path.join(folder,f)))}));
assert.equal(reports.length,8,'three measurements and one control per runtime');
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return(a[(a.length-1)>>1]+a[a.length>>1])/2;};
for(const r of reports){assert.equal(r.rows.length,16);for(const row of r.rows){assert.equal(row.samples.upstream.length,12);assert.equal(row.samples.vpm.length,12);}if(process.argv.includes('--verify-current'))for(const [f,hash]of Object.entries(r.hashes))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),hash,r.file+': '+f);}
for(const runtime of ['node','bun']){
  const measured=reports.filter(r=>r.file.startsWith(runtime+'-')&&!r.calibration),control=reports.find(r=>r.file.startsWith(runtime+'-')&&r.calibration);
  assert.equal(measured.length,3);assert(control);
  for(const r of [...measured,control]) {
    assert.deepEqual(r.hashes,reports[0].hashes,'all reports use identical source');
    assert.deepEqual(r.rows.map(row=>row.case),reports[0].rows.map(row=>row.case));
    assert.equal(Boolean(r.runtime.bun),runtime==='bun');
  }
  console.log(runtime);
  console.table(measured[0].rows.map((row,i)=>{
    const ratios=measured.flatMap(r=>r.rows[i].samples.vpm.map((v,j)=>v/r.rows[i].samples.upstream[j]));
    const change=100*(median(ratios)-1);
    const processes=measured.map(r=>100*(median(r.rows[i].samples.vpm.map((v,j)=>v/r.rows[i].samples.upstream[j]))-1));
    const c=control?.rows[i];
    return{case:row.case,upstream_ns:Math.round(median(measured.flatMap(r=>r.rows[i].samples.upstream))),vpm_ns:Math.round(median(measured.flatMap(r=>r.rows[i].samples.vpm))),change:change.toFixed(1)+'%',process_range:Math.min(...processes).toFixed(1)+' to '+Math.max(...processes).toFixed(1),control:c?(100*(median(c.samples.vpm.map((v,j)=>v/c.samples.upstream[j]))-1)).toFixed(1)+'%':''};
  }));
}
