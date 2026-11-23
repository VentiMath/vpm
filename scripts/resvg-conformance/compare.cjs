'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {Resvg:Control}=require('../vlx-conformance/node_modules/@resvg/resvg-js');
const {Resvg}=require('../../packages/vresvg');
const {paper}=require('./fixtures.cjs');
const {PNG}=require('../../packages/vpngjs');
const results=[];
function compare(name,svg,fitTo){
 const a=new Control(svg,{font:{loadSystemFonts:false},...(fitTo?{fitTo}:{})}).render(),b=new Resvg(svg,{fitTo}).render();
 assert.deepEqual([b.width,b.height],[a.width,a.height],name);
 const pa=PNG.sync.read(a.asPng()).data,pb=PNG.sync.read(b.asPng()).data;let difference=0,ink=0,inkB=0,max=0;
 for(let i=0;i<pa.length;i+=4)for(let c=0;c<3;c++){
  const va=(255-pa[i+c])*pa[i+3]/255,vb=(255-pb[i+c])*pb[i+3]/255;
  difference+=Math.abs(va-vb);ink+=va;inkB+=vb;max=Math.max(max,Math.abs(va-vb));
 }
 // No solid pen mark may disappear or move beyond the antialiasing fringe.
 for(const [own,other]of [[pa,pb],[pb,pa]])for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
  const at=(y*a.width+x)*4;if(own[at+3]<128||Math.min(own[at],own[at+1],own[at+2])>100)continue;
  let found=false;
  for(let dy=-1;dy<=1&&!found;dy++)for(let dx=-1;dx<=1;dx++){
   const xx=x+dx,yy=y+dy;if(xx<0||xx>=a.width||yy<0||yy>=a.height)continue;
   const j=(yy*a.width+xx)*4;if(other[j+3]>32&&Math.min(other[j],other[j+1],other[j+2])<180){found=true;break;}
  }
  assert(found,`${name}: missing or displaced pen mark at ${x},${y}`);
 }
 const relative=difference/Math.max(ink,1),inkChange=Math.abs(ink-inkB)/Math.max(ink,1);
 assert(relative<.12,`${name}: different ink ${relative}`);assert(inkChange<.03,`${name}: missing ink ${inkChange}`);
 results.push({name,width:b.width,height:b.height,relative,inkChange,max});
 if(process.env.VRESVG_OUTPUT&&name==='curved paper'){
  fs.mkdirSync(process.env.VRESVG_OUTPUT,{recursive:true});fs.writeFileSync(process.env.VRESVG_OUTPUT+'/writeup-upstream.png',a.asPng());fs.writeFileSync(process.env.VRESVG_OUTPUT+'/writeup-vpm.png',b.asPng());
 }
}
for(const curves of [false,true])for(const [lines,mode,value]of [[2,'width',1200],[8,'width',1200],[100,'height',4800]])compare(curves?'curved paper':'raw paper',paper({curves,lines}),{mode,value});
for(let i=0;i<60;i++){
 const x=8+i%7*.13,y=9+i%5*.17;
 compare('round stroke '+i,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 ${60+(i%4)*.13}"><g fill="none" stroke="#1b2757" stroke-linecap="round" stroke-linejoin="round" stroke-width="${1.3+i%6}"><path d="M${x} ${y}Q15 36 30 15L48 37"/><path d="M15 48L15 48"/></g></svg>`,{mode:'zoom',value:1+i%3});
}
if(process.env.VRESVG_APP_FIXTURES)for(const c of JSON.parse(fs.readFileSync(process.env.VRESVG_APP_FIXTURES)))compare(c.name,c.svg,c.fitTo);
console.log(JSON.stringify({cases:results.length,maxInkDifference:Math.max(...results.map(r=>r.relative)),maxInkChange:Math.max(...results.map(r=>r.inkChange)),results},null,2));
