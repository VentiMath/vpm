import {createRenderer} from '../../packages/vlx/index.mjs';

// Synthetic public examples only. The same records drive the texture and the
// selectable reader; no club material, DOM screenshots, or external fonts.
export const pages=[
 {title:'Patterns & powers',subtitle:'A field notebook · 01',lines:[
  {before:'A small change in an exponent changes everything: ',tex:'n^6-1',after:'.',inline:true},
  {tex:'a^2+b^2=c^2'},
  {tex:'\\frac{1}{2}+\\frac{1}{3}=\\frac{5}{6}'},
  {tex:'\\sum_{k=1}^{n}k=\\frac{n(n+1)}{2}'}]},
 {title:'Curves & structure',subtitle:'A field notebook · 02',lines:[
  {before:'Keep the radical index beside its root: ',tex:'10\\sqrt[3]{10}',after:'.',inline:true},
  {tex:'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'},
  {tex:'\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}'},
  {tex:'\\int_0^1 x^2\\,dx=\\frac{1}{3}'}]},
 {title:'An idea worth keeping',subtitle:'VentiLaTeX · on parchment',lines:[
  {before:'A curved page carries the same math: ',tex:'e^{i\\pi}+1=0',after:'.',inline:true},
  {tex:'\\left(\\frac{x+y}{2}\\right)^2\\leq\\frac{x^2+y^2}{2}'},
  {tex:'\\alpha+\\beta+\\gamma=\\pi'},
  {tex:'\\binom{n}{2}=\\frac{n(n-1)}{2}'}]}
];
const renderer=createRenderer(),images=new Map();
export function rendered(line){return renderer.renderMath(line.tex,{display:!line.inline,fontSize:line.inline?28:44});}
async function imageFor(result){
 let pending=images.get(result.svg);
 if(!pending){
  pending=new Promise((resolve,reject)=>{
   const url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'})),image=new Image();
   image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
   image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not decode VLX outlines'));};
   image.src=url;
  });
  images.set(result.svg,pending);pending.catch(()=>images.delete(result.svg));
 }
 return pending;
}
export async function paintPage(page,width=1024){
 if(!Number.isInteger(width)||width<256||width>2048)throw new RangeError('Page texture width must be 256–2048 pixels');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.ceil(width*4/3);
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D is unavailable');
 const scale=width/768;ctx.scale(scale,scale);const parchment=page===pages[2];
 ctx.fillStyle=parchment?'#ead7ab':'#fff7e8';ctx.fillRect(0,0,768,1024);
 // Deterministic fiber texture; no image asset or network request.
 ctx.fillStyle=parchment?'#5c391408':'#5c391404';
 let seed=9235;for(let i=0;i<15000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%768;seed=(Math.imul(seed,1664525)+1013904223)>>>0;ctx.fillRect(x,seed%1024,1,1);}
 const edge=ctx.createLinearGradient(0,0,768,0);edge.addColorStop(0,parchment?'#77501c55':'#664d2b28');edge.addColorStop(.09,'#00000000');edge.addColorStop(.91,'#00000000');edge.addColorStop(1,parchment?'#77501c55':'#664d2b28');ctx.fillStyle=edge;ctx.fillRect(0,0,768,1024);
 ctx.fillStyle='#746144';ctx.font='18px system-ui';ctx.fillText(page.subtitle.toUpperCase(),64,82);
 ctx.fillStyle='#352a1c';ctx.font='38px Georgia';ctx.fillText(page.title,64,145);
 ctx.strokeStyle='#bfa57a';ctx.beginPath();ctx.moveTo(64,175);ctx.lineTo(704,175);ctx.stroke();
 const hits=[];let y=236;
 for(const [index,line]of page.lines.entries()){
  const result=rendered(line),image=await imageFor(result);let x=64,drawWidth=result.width,drawHeight=result.height;
  if(line.inline){
   ctx.font='25px Georgia';ctx.fillStyle='#493b28';ctx.fillText(line.before,64,y);y+=45;
   ctx.drawImage(image,x,y-result.baseline,drawWidth,drawHeight);
   ctx.fillText(line.after,x+drawWidth+4,y);y+=52;
  }else{
   const fit=Math.min(1,620/drawWidth);drawWidth*=fit;drawHeight*=fit;x=(768-drawWidth)/2;
   ctx.drawImage(image,x,y,drawWidth,drawHeight);y+=drawHeight+62;
  }
  const top=line.inline?y-52-result.baseline:y-drawHeight-62;
  hits.push({index,tex:line.tex,x:x/768,y:top/1024,width:drawWidth/768,height:drawHeight/1024});
 }
 ctx.fillStyle='#8d7855';ctx.font='16px system-ui';ctx.fillText('SELECT A FORMULA TO OPEN ITS READABLE VIEW',64,958);
 return {canvas,hits,pixels:canvas.width*canvas.height};
}
