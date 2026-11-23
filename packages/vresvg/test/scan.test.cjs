'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createRequire}=require('node:module');
const requirePackage=process.env.VPM_VLX_CONSUMER?createRequire(path.join(process.env.VPM_VLX_CONSUMER,'package.json')):require;
const root=process.env.VPM_VLX_CONSUMER?path.dirname(requirePackage.resolve('vresvg')):path.resolve(__dirname,'..');
const {rasterize}=require(root+'/raster.cjs'),{encodePng}=require(root+'/raster-png.cjs');
const {PNG}=process.env.VPM_VLX_CONSUMER?requirePackage('vpngjs'):require('../../vpngjs');
function render(svg,reference){
 const before=process.env.VPM_RASTER_JS;
 try{if(reference)process.env.VPM_RASTER_JS='1';else delete process.env.VPM_RASTER_JS;return rasterize(svg);}
 finally{if(before===undefined)delete process.env.VPM_RASTER_JS;else process.env.VPM_RASTER_JS=before;}
}
function same(svg){
 const a=render(svg,false),b=render(svg,true);
 assert.deepEqual([a.width,a.height],[b.width,b.height]);assert.deepEqual(a.data,b.data);
 const expected=Buffer.from(a.data),png=encodePng(a);assert.deepEqual(PNG.sync.read(png).data,expected);
 assert.deepEqual(PNG.sync.read(encodePng(b)).data,expected);
 return a;
}
const wrap=body=>`<svg width="48" height="35">${body}</svg>`;
test('portable scanner has only bounded host memory, no native/WASI imports',()=>{
 const module=new WebAssembly.Module(fs.readFileSync(root+'/scan.wasm'));
 assert.deepEqual(WebAssembly.Module.imports(module),[{module:'env',name:'memory',kind:'memory'}]);
 assert.throws(()=>new WebAssembly.Instance(module,{env:{memory:new WebAssembly.Memory({initial:2,maximum:4097})}}),WebAssembly.LinkError);
 assert.deepEqual(WebAssembly.Module.exports(module).map(e=>e.name).sort(),['__heap_base','adler','filter','paint']);
});
test('coincident vertices, winding, clipped curves and overlap retain exact reference pixels',{timeout:60000},()=>{
 const paths=[
  'M1 .1L30 .3L1 .7Z M1 .1L30 .3L1 .7Z',
  'M1 1H40V30H1Z M5 5V25H35V5Z',
  'M1 1L40 30L1 30L40 1Z',
  'M-10 -10Q100 20 -5 40C20 -15 0 50 48 2Z',
  'M2 2L20 2L20 2L20 20L2 20Z M2 2L20 20L20 2Z',
  'M1 1H40V30H1Z M1 1V30H40V1Z',
  'M5 -1000000000L10 33.00000000001L5 33.00000000001Z',
  'M25 -1000000000L5 34.00000000001L25 34.00000000001Z',
 ];
 for(const d of paths)for(const background of ['', '<rect width="48" height="35" fill="#f9f7fa"/>'])same(wrap(`${background}<path d="${d}" fill="#b24"/><path d="${d}" transform="translate(.33 .27)" stroke="#236" stroke-width="1.37" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`));
 let state=0x923fab;const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32),coord=()=>((rand()*75-15)*8|0)/8;
 for(let i=0;i<250;i++){
  const d=Array.from({length:1+i%5},()=>`M${coord()} ${coord()}Q${coord()} ${coord()} ${coord()} ${coord()}C${coord()} ${coord()} ${coord()} ${coord()} ${coord()} ${coord()}Z`).join('');
  same(wrap(`<path d="${d}" fill="#ac8"/><path d="${d}" transform="translate(.125 -.25)" stroke="#47f" stroke-width="${1+rand()*3}" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`));
 }
});
test('image transparency, encoded output and retained surfaces survive scratch growth',()=>{
 const pixels=Buffer.from([255,0,0,32,0,255,0,127,0,0,255,192,180,140,120,0]);
 const url='data:image/png;base64,'+encodePng({width:2,height:2,data:pixels}).toString('base64');
 same(wrap(`<image href="${url}" width="48" height="35"/><path d="M0 0Q48 30 0 35L48 0Z" fill="#1a7"/>`));
 const saved=same(wrap('<path d="M0 0Q20 10 40 20Z"/>')),before=Buffer.from(saved.data);
 // A large second result grows its own scratch/PNG memory, not this result's.
 const bigger=render('<svg width="512" height="512"><path d="M0 0Q512 0 512 512L0 512Z"/></svg>');
 const expected=Buffer.from(bigger.data);assert.deepEqual(PNG.sync.read(encodePng(bigger)).data,expected);assert.deepEqual(saved.data,before);assert.deepEqual(PNG.sync.read(encodePng(saved)).data,before);
});
test('streaming token parser preserves compact syntax and rejects incomplete coordinates',()=>{
 same(wrap('<path d="M.5.5 10-2 20 5H30V20Q20 30 5 20C0 15 0 5 .5.5Z"/>'));
 for(const d of ['M','M0','M0 0L','M0 0LZ','M0 0L1Z','M0 0Q1 2 3','M0 0C1 2 3 4 5','M0 0 Z 1','M0 0 NaN','M0 0L1e999 2','M0 0L1000000001 0'])assert.throws(()=>render(wrap(`<path d="${d}"/>`)),{code:'RASTER'});
});
