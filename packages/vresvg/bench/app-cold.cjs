'use strict';
// Cold, isolated end-to-end measurements. Private caller source is read-only,
// used in a temporary directory and never copied into the public results.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync,spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),hash=x=>createHash('sha256').update(x).digest('hex');
const median=xs=>{const x=xs.toSorted((a,b)=>a-b);return(x[(x.length-1)>>1]+x[x.length>>1])/2;};
const cases=['handwriting1200','handwriting4300','handwriting8500','handwriting8500-raw','problem150','problem400'];
function paper(count,tidy=true){
 const shapes=[[[0,48,16,0,32,48],[8,28,24,28]],[[30,6,24,0,8,0,0,12,0,36,8,48,24,48,32,40]],[[0,24,8,10,16,24,24,38,32,24]],[[16,24]],[[0,24,32,24],[16,0,16,48]],[[0,0,32,48],[32,0,0,48]],[[0,0,10,48,20,0,32,48]],[[0,0,0,0,0,0]]],items=[];
 for(let i=0;i<count;i++){
  const g={t:'g',s:structuredClone(shapes[i%8]),w:32,h:48,p:null,dy:0,gap:0,dx:0,k:1,lv:0,fl:0};
  if(i%29===8)g.lv=1;if(i%29===9)g.lv=-1;if(i%37===12){g.fl=2;g.dy=-.4;}if(i%43===10){g.p='hang';g.dy=.2;}
  if(i%7===6)items.push({t:'s'});items.push(g);
 }
 return{app:'trackpad-longhand',v:1,u:.009,frozen:true,page:{width:1100,line:'m',size:1,tidy},items};
}
async function worker(request){
 const {variant,name,temp}=request,current=root+'/packages',base=temp+'/baseline/packages';
 const location=variant==='previous'?base:current;
 const {longhandSvg}=await import('file://'+temp+'/caller.mjs');
 // Load modules before timing, with no renders/warmup. Each case gets a process.
 const native=variant==='native'&&require(root+'/scripts/vlx-conformance/node_modules/@resvg/resvg-js');
 const {rasterize}=native?{}:require(location+'/vresvg/raster.cjs');
 const {encodePng}=native?{}:require(location+'/vresvg/raster-png.cjs');
 const {renderProblemSvg}=require(location+'/vlx/problem.cjs');
 const input=name.startsWith('handwriting')?paper(Number(name.match(/\d+/)[0]),!name.endsWith('-raw')):{statement:'Eight distinct synthetic numbers are arranged in a circular row. '.repeat(Number(name.slice(7)))};
 const start=performance.now();let svg,fitTo;
 if(name.startsWith('handwriting')){const d=longhandSvg(input);svg=d.svg;fitTo=d.height/d.width*1200>4800?{mode:'height',value:4800}:{mode:'width',value:1200};}
 else svg=renderProblemSvg(input).svg;
 const laid=performance.now();
 const image=native?new native.Resvg(svg,{...(fitTo?{fitTo}:{}),font:{loadSystemFonts:false}}).render():rasterize(svg,fitTo?{strict:true,[fitTo.mode]:fitTo.value}:{});
 const rendered=performance.now(),png=native?image.asPng():encodePng(image),end=performance.now();
 const memory=process.memoryUsage(),peakRssKiB=process.resourceUsage().maxRSS;
 console.log(JSON.stringify({variant,name,layoutMs:laid-start,rasterMs:rendered-laid,pngMs:end-rendered,totalMs:end-start,peakRssKiB,memory,pngBytes:png.length,width:image.width,height:image.height,svgBytes:Buffer.byteLength(svg),svgSHA256:hash(svg)}));
}
async function main(){
 if(process.env.VRESVG_COLD_WORKER)return worker(JSON.parse(process.env.VRESVG_COLD_WORKER));
 const [app,ref='origin/main']=process.argv.slice(2);assert(app,'Pass app checkout and revision');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vresvg-cold-'));
 const command=(cmd,args,cwd=root)=>execFileSync(cmd,args,{cwd,encoding:'utf8',maxBuffer:40*1024*1024});
 try{
  const appCommit=command('git',['rev-parse',ref],app).trim(),baselineCommit=command('git',['rev-parse','vlx-0.3.4^{commit}']).trim(),appHashes={};
  for(const name of ['writeupPicture.ts','longhandLayout.ts']){const source=command('git',['show',appCommit+':functions/src/'+name],app);fs.writeFileSync(temp+'/'+name,source);appHashes[name]=hash(source);}
  command('bun',['build',temp+'/writeupPicture.ts','--target=node','--format=esm','--packages=external','--outfile='+temp+'/caller.mjs']);
  fs.mkdirSync(temp+'/baseline');fs.writeFileSync(temp+'/base.tar',execFileSync('git',['archive',baselineCommit,'packages/vlx','packages/vresvg','packages/vpngjs'],{cwd:root,maxBuffer:40*1024*1024}));command('tar',['-xf',temp+'/base.tar','-C',temp+'/baseline']);fs.mkdirSync(temp+'/baseline/node_modules');
  for(const n of ['vresvg','vpngjs'])fs.symlinkSync('../packages/'+n,temp+'/baseline/node_modules/'+n);
  const rows=[],orders=[['native','previous','current'],['current','previous','native'],['previous','current','native'],['native','current','previous'],['current','native','previous'],['previous','native','current']];
  const take=(variant,name)=>{
   const r=spawnSync(process.execPath,[__filename],{env:{...process.env,VRESVG_COLD_WORKER:JSON.stringify({variant,name,temp})},encoding:'utf8',timeout:120000,maxBuffer:2e6});assert.ifError(r.error);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);
  };
  for(const name of cases){
   for(let trial=0;trial<orders.length;trial++)for(const variant of orders[trial])rows.push({...take(variant,name),trial,control:false});
   // Identical implementation controls expose run-to-run desktop variation.
   for(let trial=0;trial<2;trial++)for(let slot=0;slot<2;slot++)rows.push({...take('current',name),trial,slot,control:true});
   process.stderr.write(name+' complete\n');
  }
  const summary=cases.map(name=>{
   const rowsFor=rows.filter(r=>r.name===name);assert.equal(new Set(rowsFor.map(r=>r.svgSHA256)).size,1,'All implementations must receive identical SVG');
   return{name,variants:Object.fromEntries(['native','previous','current'].map(variant=>{
    const selected=rowsFor.filter(r=>!r.control&&r.variant===variant);return[variant,{medianMs:median(selected.map(r=>r.totalMs)),rangeMs:[Math.min(...selected.map(r=>r.totalMs)),Math.max(...selected.map(r=>r.totalMs))],medianRasterMs:median(selected.map(r=>r.rasterMs)),peakRssMiB:Math.max(...selected.map(r=>r.peakRssKiB))/1024,pngBytes:selected[0].pngBytes}];
   })),controlMaxDifferencePct:Math.max(...[0,1].map(t=>{const pair=rowsFor.filter(r=>r.control&&r.trial===t);return Math.abs(pair[1].totalMs/pair[0].totalMs-1)*100;}))};
  });
  const sourceFiles=['index.cjs','raster.cjs','raster-paths.cjs','raster-png.cjs','raster-wasm.cjs','src/scan.c','scan.wasm','bench/app-cold.cjs'];
  const result={runtime:process.versions,platform:process.platform,arch:process.arch,appCommit,appHashes,baselineCommit,method:'Six cold processes per implementation/case in balanced three-way orders, plus two pairs of identical-current controls. No warmup or GC/heap flags; native font discovery disabled; layout + raster + PNG timed. Peak RSS covers the entire worker including imports/input. No private source or student data in this record.',sourceHashes:Object.fromEntries(sourceFiles.map(f=>[f,hash(fs.readFileSync(root+'/packages/vresvg/'+f))])),summary,rows};
  if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1});
