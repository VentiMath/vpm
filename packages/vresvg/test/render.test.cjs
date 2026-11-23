'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Resvg,RasterError}=require('..');
const {PNG}=require('../../vpngjs');
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20">${body}</svg>`;
const dot=(image,x,y)=>PNG.sync.read(image.asPng()).data[(y*image.width+x)*4+3];
test('viewBox-only paper, UTF-8 input, width/height/zoom and PNG roundtrip',()=>{
 for(const [fitTo,w,h]of [[{mode:'original'},40,20],[{mode:'width',value:1200},1200,600],[{mode:'height',value:4800},9600,4800],[{mode:'zoom',value:2},80,40]]){
  const input=svg('<rect width="100%" height="100%" fill="#fbfcfe"/>');
  if(w*h>16777216){assert.throws(()=>new Resvg(input,{fitTo}).render(),{code:'LIMIT'});continue;}
  const image=new Resvg(Buffer.from(input),{fitTo}).render(),png=PNG.sync.read(image.asPng());
  assert.deepEqual([image.width,image.height],[w,h]);assert.deepEqual([...png.data.subarray(0,4)],[251,252,254,255]);
  const a=image.asPng();a[0]=0;assert.equal(image.asPng()[0],137);
 }
});
test('open handwriting has round ends; zero-length line keeps its dot; moveto alone draws nothing',()=>{
 const image=new Resvg(svg('<g stroke="black" stroke-width="4" stroke-linecap="round" fill="none"><path d="M10 10L20 10"/><path d="M30 10L30 10"/></g>')).render();
 assert(dot(image,8,10)>100);assert(dot(image,21,10)>100);assert(dot(image,30,10)>200);assert.equal(dot(image,7,10),0);
 assert.equal(PNG.sync.read(new Resvg(svg('<path d="M10 10" stroke="black" stroke-width="4" stroke-linecap="round"/>')).render().asPng()).data.some(v=>v!==0),false);
});
test('group/root paint inheritance, nonzero viewBox and scaling retain pen width',()=>{
 const image=new Resvg('<svg viewBox="10 20 40 20" fill="none" stroke="red" stroke-width="2"><g stroke-linecap="round"><path d="M20 30Q30 20 40 30"/></g></svg>',{fitTo:{mode:'width',value:80}}).render();
 assert.deepEqual([image.width,image.height],[80,40]);assert(dot(image,20,20)>100);assert.equal(dot(image,0,0),0);
});
test('unsupported visual semantics, external resources and malformed XML cannot silently vanish',()=>{
 for(const body of ['<text>x</text>','<use href="#a"/>','<image href="file:///tmp/a"/>','<path d="M1 1L2 2" opacity=".2"/>','<g style="fill:red"></g>','<rect width="5" height="5" rx="2"/>','<path d="M1 1L2 2" stroke-linecap="square"/>','<path d="M1 1L2 2" stroke-dasharray="1 2"/>','<path d="M1 1A2 2 0 0 0 4 4"/>','<path d="M0 0" d="M1 1"/>','<g>'])assert.throws(()=>new Resvg(svg(body)).render(),{code:'RASTER'});
 for(const source of ['<!DOCTYPE svg><svg viewBox="0 0 10 10"/>','<svg viewBox="0 0 0 1"/>','<svg viewBox="0 0 2 2" opacity="0"/>'])assert.throws(()=>new Resvg(source).render());
 for(const options of [{font:{}},{fitTo:{mode:'wat',value:1}},{fitTo:{mode:'width',value:Infinity}},{crop:{}},{background:'red'}])assert.throws(()=>new Resvg(svg(''),options).render());
 assert.throws(()=>new Resvg(Buffer.from([255])),TypeError);
 assert.throws(()=>new Resvg(svg(''),{fitTo:{mode:'width',value:20000}}).render(),{code:'LIMIT'});
 assert.throws(()=>new Resvg(svg('<g>'.repeat(514)+'</g>'.repeat(514))).render(),{code:'LIMIT'});
 assert.equal(new Resvg('<svg viewBox="0 0 1 1"/>').render().width,1);
 assert(RasterError.prototype instanceof Error);
});

test('extreme round joins stop before subdivision can grow without a bound',()=>{
 assert.throws(()=>new Resvg('<svg viewBox="0 0 1e-20 1e-20"><path d="M0 0L10 0L10 10" stroke="black" stroke-width="1e9" fill="none" stroke-linejoin="round"/></svg>',{fitTo:{mode:'width',value:100}}).render(),{code:'LIMIT'});
 const reversal=new Resvg(svg('<path d="M10 10L20 10L10 10" stroke="black" stroke-width="4" fill="none" stroke-linejoin="round"/>')).render();assert(dot(reversal,21,10)>100);
});
