'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return(a[(a.length-1)>>1]+a[a.length>>1])/2;};
exports.run=async function({root,upstream,vpm,cases,files,cleanup=async()=>{}}){
 const calibration=process.env.CALIBRATION==='1',variants={upstream,vpm:calibration?upstream:vpm},retain=new Array(64);let checksum=0;
 async function measure(fn,n,async){const start=performance.now();if(async){for(let i=0;i<n;i++)retain[i&63]=await fn();}else{for(let i=0;i<n;i++)retain[i&63]=fn();}const ns=(performance.now()-start)*1e6/n;for(const v of retain)checksum=(checksum+(typeof v==='string'?v.length:v?1:0))>>>0;return ns;}
 const rows=[];
 try{for(const item of cases){
  const fns={};for(const [name,lib]of Object.entries(variants)){fns[name]=await item.make(lib);item.validate(await fns[name]());const pilot=await measure(fns[name],32,item.async);const block=Math.max(1,Math.min(100000,Math.ceil(10e6/pilot)));const end=performance.now()+150;do{await measure(fns[name],block,item.async);}while(performance.now()<end);}
  const pilot=await measure(fns.upstream,32,item.async),iterations=Math.max(1,Math.min(100000,Math.ceil(15e6/pilot)));
  for(let r=0;r<4;r++)for(const name of r%2?['vpm','upstream']:['upstream','vpm'])await measure(fns[name],iterations,item.async);
  const samples={upstream:[],vpm:[]};for(let r=0;r<12;r++)for(const name of r%2?['vpm','upstream']:['upstream','vpm'])samples[name].push(await measure(fns[name],iterations,item.async));
  for(const fn of Object.values(fns))item.validate(await fn());rows.push({case:item.name,iterations,samples});
 }}finally{await cleanup();}
 const report={recordedAt:new Date().toISOString(),runtime:process.versions,cpu:os.cpus()[0].model,platform:process.platform,arch:process.arch,calibration,rounds:12,checksum,methodology:'12 alternating paired rounds after 150ms per-variant warmup and four full blocks; 15ms upstream pilot target, capped at 100000 operations. Outputs retained and checked outside timing. Three fresh processes and one identical-upstream control per runtime. No trimming; nanoseconds per operation.',hashes:Object.fromEntries([...new Set([...files,'../../scripts/bench-paired.cjs'])].sort().map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),rows};
 if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');console.table(rows.map(r=>({case:r.case,upstream:Math.round(median(r.samples.upstream)),vpm:Math.round(median(r.samples.vpm)),change:(100*(median(r.samples.vpm.map((v,i)=>v/r.samples.upstream[i]))-1)).toFixed(1)+'%'})));
};
exports.summarize=function(root){
 const reports=fs.readdirSync(path.join(root,'bench/results')).filter(f=>f.endsWith('.json')).map(f=>({file:f,...JSON.parse(fs.readFileSync(path.join(root,'bench/results',f)))}));assert.equal(reports.length,8);
 for(const r of reports){for(const row of r.rows){assert.equal(row.samples.upstream.length,12);assert.equal(row.samples.vpm.length,12);}assert.deepEqual(r.hashes,reports[0].hashes);assert.deepEqual(r.rows.map(x=>x.case),reports[0].rows.map(x=>x.case));if(process.argv.includes('--verify-current'))for(const[f,h]of Object.entries(r.hashes))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),h,f);}
 for(const runtime of ['node','bun']){const rs=reports.filter(r=>r.file.startsWith(runtime+'-')&&!r.calibration),control=reports.find(r=>r.file.startsWith(runtime+'-')&&r.calibration);assert.equal(rs.length,3);assert(control);for(const r of [...rs,control])assert.equal(!!r.runtime.bun,runtime==='bun');console.log(runtime);console.table(rs[0].rows.map((row,i)=>{const p=rs.map(r=>100*(median(r.rows[i].samples.vpm.map((v,j)=>v/r.rows[i].samples.upstream[j]))-1));return{case:row.case,upstream_ns:Math.round(median(rs.flatMap(r=>r.rows[i].samples.upstream))),vpm_ns:Math.round(median(rs.flatMap(r=>r.rows[i].samples.vpm))),change_pct:Math.round(1000*(median(rs.flatMap(r=>r.rows[i].samples.vpm.map((v,j)=>v/r.rows[i].samples.upstream[j])))-1))/10,process_range:p.map(x=>x.toFixed(1)).join(', '),control_pct:(100*(median(control.rows[i].samples.vpm.map((v,j)=>v/control.rows[i].samples.upstream[j]))-1)).toFixed(1)};}));}
};
