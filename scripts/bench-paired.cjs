'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return(a[(a.length-1)>>1]+a[a.length>>1])/2;};
exports.run=async function({root,upstream,vpm,cases,files,cleanup=async()=>{}}){
 const calibration=process.env.CALIBRATION==='1';
 // The variant set up first sees its object shapes first in shared call sites,
 // which skews paired results by up to about 15% either way. Each variant gets
 // its own compiled measurement loop, and the second of three recorded processes
 // (or BENCH_FIRST=vpm) sets up VPM first, so order effects show as spread.
 const first=process.env.BENCH_FIRST||(/-2\.json$/.test(process.env.OUTPUT||'')?'vpm':'upstream');assert.ok(['upstream','vpm'].includes(first),'BENCH_FIRST must be upstream or vpm');
 const order=first==='vpm'?['vpm','upstream']:['upstream','vpm'],libraries={upstream,vpm:calibration?upstream:vpm};let checksum=0;
 const loop=()=>new Function('retain','performance','return async function measure(fn,n,async){const start=performance.now();if(async){for(let i=0;i<n;i++)retain[i&63]=await fn();}else{for(let i=0;i<n;i++)retain[i&63]=fn();}return (performance.now()-start)*1e6/n;}');
 const retained={upstream:new Array(64),vpm:new Array(64)},loops={upstream:loop()(retained.upstream,performance),vpm:loop()(retained.vpm,performance)};
 async function measure(name,fn,n,async){const ns=await loops[name](fn,n,async);for(const v of retained[name])checksum=(checksum+(typeof v==='string'?v.length:v?1:0))>>>0;return ns;}
 const rows=[];
 try{for(const item of cases){
  const fns={};for(const name of order){fns[name]=await item.make(libraries[name]);item.validate(await fns[name]());const pilot=await measure(name,fns[name],32,item.async);const block=Math.max(1,Math.min(100000,Math.ceil(10e6/pilot)));const end=performance.now()+150;do{await measure(name,fns[name],block,item.async);}while(performance.now()<end);}
  const pilot=await measure('upstream',fns.upstream,32,item.async),iterations=Math.max(1,Math.min(100000,Math.ceil(15e6/pilot)));
  for(let r=0;r<4;r++)for(const name of r%2?order.slice().reverse():order)await measure(name,fns[name],iterations,item.async);
  const samples={upstream:[],vpm:[]};for(let r=0;r<12;r++)for(const name of r%2?order.slice().reverse():order)samples[name].push(await measure(name,fns[name],iterations,item.async));
  for(const fn of Object.values(fns))item.validate(await fn());rows.push({case:item.name,iterations,samples});
 }}finally{await cleanup();}
 const report={recordedAt:new Date().toISOString(),runtime:process.versions,cpu:os.cpus()[0].model,platform:process.platform,arch:process.arch,calibration,first,rounds:12,checksum,methodology:'12 alternating paired rounds after 150ms per-variant warmup and four full blocks; 15ms upstream pilot target, capped at 100000 operations. Separately compiled measurement loops per variant; the second process sets up VPM first. Outputs retained and checked outside timing. Three fresh processes and one identical-upstream control per runtime. No trimming; nanoseconds per operation.',hashes:Object.fromEntries([...new Set([...files,'../../scripts/bench-paired.cjs'])].sort().map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),rows};
 if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');console.table(rows.map(r=>({case:r.case,upstream:Math.round(median(r.samples.upstream)),vpm:Math.round(median(r.samples.vpm)),change:(100*(median(r.samples.vpm.map((v,i)=>v/r.samples.upstream[i]))-1)).toFixed(1)+'%'})));
};
exports.summarize=function(root){
 const reports=fs.readdirSync(path.join(root,'bench/results')).filter(f=>f.endsWith('.json')).map(f=>({file:f,...JSON.parse(fs.readFileSync(path.join(root,'bench/results',f)))}));assert.equal(reports.length,8);
 for(const r of reports){for(const row of r.rows){assert.equal(row.samples.upstream.length,12);assert.equal(row.samples.vpm.length,12);}assert.deepEqual(r.hashes,reports[0].hashes);assert.deepEqual(r.rows.map(x=>x.case),reports[0].rows.map(x=>x.case));if(process.argv.includes('--verify-current'))for(const[f,h]of Object.entries(r.hashes))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),h,f);}
 for(const runtime of ['node','bun']){const rs=reports.filter(r=>r.file.startsWith(runtime+'-')&&!r.calibration),control=reports.find(r=>r.file.startsWith(runtime+'-')&&r.calibration);assert.equal(rs.length,3);assert(control);if(rs.every(r=>r.first))assert.deepEqual(new Set(rs.map(r=>r.first)),new Set(['upstream','vpm']),runtime+': processes must set up both variants first');for(const r of [...rs,control])assert.equal(!!r.runtime.bun,runtime==='bun');console.log(runtime);console.table(rs[0].rows.map((row,i)=>{const p=rs.map(r=>100*(median(r.rows[i].samples.vpm.map((v,j)=>v/r.rows[i].samples.upstream[j]))-1));return{case:row.case,upstream_ns:Math.round(median(rs.flatMap(r=>r.rows[i].samples.upstream))),vpm_ns:Math.round(median(rs.flatMap(r=>r.rows[i].samples.vpm))),change_pct:Math.round(1000*(median(rs.flatMap(r=>r.rows[i].samples.vpm.map((v,j)=>v/r.rows[i].samples.upstream[j])))-1))/10,process_range:p.map(x=>x.toFixed(1)).join(', '),control_pct:(100*(median(control.rows[i].samples.vpm.map((v,j)=>v/control.rows[i].samples.upstream[j]))-1)).toFixed(1)};}));}
};
