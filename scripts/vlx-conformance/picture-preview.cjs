'use strict';
const fs=require('node:fs'),path=require('node:path'),{Resvg}=require('@resvg/resvg-js');
const old=require('./node_modules/.vlx-before-picture-fixes'),current=require('../../packages/vlx'),references=require('./reference.cjs');
const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
const escape=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function save(name,width,height,parts){const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff"/>${parts.join('')}</svg>`;fs.writeFileSync(path.join(out,name+'.svg'),svg);fs.writeFileSync(path.join(out,name+'.png'),new Resvg(svg).render().asPng());}
const label=(x,y,value)=>`<text x="${x}" y="${y}" font-family="sans-serif" font-size="20">${escape(value)}</text>`;
(async()=>{
 const parts=[label(20,30,'VLX 0.2.0'),label(420,30,'VLX corrected'),label(820,30,'MathJax 4.1.3 control')];let y=65;
 for(const [name,tex]of require('./picture-corpus.cjs').roots){
  parts.push(label(20,y,name));const results=[old.renderMath(tex,{fontSize:32}),current.renderMath(tex,{fontSize:32})],control=await references.mathjax(tex,false);
  results.forEach((r,i)=>parts.push(`<g transform="translate(${20+i*400} ${y+15})">${r.svg}</g>`));
  const v=control.svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number),svg=control.svg.replace(/<svg\b([^>]*)>/,(_,attrs)=>'<svg'+attrs.replace(/\s(?:width|height)="[^"]*"/g,'')+` width="${v[2]*.032}" height="${v[3]*.032}">`);
  parts.push(`<g transform="translate(820 ${y+15})">${svg}</g>`);y+=Math.max(130,...results.map(r=>r.height+55),v[3]*.032+55);
 }
 save('roots',1220,y,parts);
 const before=require('./node_modules/.vlx-before-picture-fixes/problem.cjs'),after=require('./load.cjs')('problem');
 const page={statement:String.raw`Evaluate the expression.

$\frac{1}{2}+\frac{3}{4}$

First line. $\\$ Second line. $\\$ $\\$ Fourth line.`,options:{A:String.raw`10\sqrt[3]{10}`,B:String.raw`10^3\sqrt{10}`,C:String.raw`\frac{1}{2}`}};
 const a=before.renderProblemSvg(page),b=after.renderProblemSvg(page);
 save('problem',1960,Math.max(a.height,b.height)+65,[label(20,30,'VLX 0.2.0'),label(1000,30,'VLX corrected'),`<g transform="translate(0 55)">${a.svg}</g>`,`<g transform="translate(980 55)">${b.svg}</g>`]);
 console.log('Synthetic before/after pages and MathJax root controls: '+out);
})().catch(e=>{console.error(e);process.exitCode=1;});
