'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return(a[(a.length-1)>>1]+a[a.length>>1])/2;};
const isolated = require('./bench-process.cjs');
exports.run = isolated.run;
exports.summarize=function(root){
 let reports=fs.readdirSync(path.join(root,'bench/results')).filter(f=>f.endsWith('.json')).map(f=>({file:f,...JSON.parse(fs.readFileSync(path.join(root,'bench/results',f)))}));
 const current = reports.filter(r => r.schemaVersion === 2);
 if (current.length) {
  for (const report of current) { console.log(report.file); console.table(isolated.verify(report, process.argv.includes('--verify-current') ? root : undefined)); }
  if (current.length !== reports.length) console.warn('Older same-process reports are historical; they are not combined with the isolated measurements.');
  return;
 } else console.warn('Legacy same-process reports: small performance differences remain provisional until measured in isolated processes.');
 reports = reports.filter(r => r.schemaVersion !== 2);
 assert.equal(reports.length, 8);
 for(const r of reports){for(const row of r.rows){assert.equal(row.samples.upstream.length,12);assert.equal(row.samples.vpm.length,12);}assert.deepEqual(r.hashes,reports[0].hashes);assert.deepEqual(r.rows.map(x=>x.case),reports[0].rows.map(x=>x.case));if(process.argv.includes('--verify-current'))for(const[f,h]of Object.entries(r.hashes))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),h,f);}
 for(const runtime of ['node','bun']){const rs=reports.filter(r=>r.file.startsWith(runtime+'-')&&!r.calibration),control=reports.find(r=>r.file.startsWith(runtime+'-')&&r.calibration);assert.equal(rs.length,3);assert(control);if(rs.every(r=>r.first))assert.deepEqual(new Set(rs.map(r=>r.first)),new Set(['upstream','vpm']),runtime+': processes must set up both variants first');for(const r of [...rs,control])assert.equal(!!r.runtime.bun,runtime==='bun');console.log(runtime);console.table(rs[0].rows.map((row,i)=>{const p=rs.map(r=>100*(median(r.rows[i].samples.vpm.map((v,j)=>v/r.rows[i].samples.upstream[j]))-1));return{case:row.case,upstream_ns:Math.round(median(rs.flatMap(r=>r.rows[i].samples.upstream))),vpm_ns:Math.round(median(rs.flatMap(r=>r.rows[i].samples.vpm))),change_pct:Math.round(1000*(median(rs.flatMap(r=>r.rows[i].samples.vpm.map((v,j)=>v/r.rows[i].samples.upstream[j])))-1))/10,process_range:p.map(x=>x.toFixed(1)).join(', '),control_pct:(100*(median(control.rows[i].samples.vpm.map((v,j)=>v/control.rows[i].samples.upstream[j]))-1)).toFixed(1)};}));}
};
