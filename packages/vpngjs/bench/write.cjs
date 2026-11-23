'use strict';
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), upstream = path.resolve(root, '../../scripts/png-conformance/node_modules/pngjs');
const control = require(upstream).PNG;
function pixels(width, height, random) {
 const data = Buffer.alloc(width * height * 4); let seed = 1234;
 for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const p = (y * width + x) * 4;
  for (let c = 0; c < 4; c++) {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; data[p+c] = random ? seed >>> 24 : c === 3 ? 255 : (x >> 3) * 17 + (y >> 3) * 7 + c * 31;}
 }
 return {width, height, data};
}
const tiny = {width: 4, height: 3, data: Buffer.alloc(48, 255)};
const images = [['fixture 4x3', tiny], ['patterned RGBA 256x128', pixels(256,128,false)], ['noise RGBA 64x64', pixels(64,64,true)]];
const api = file => require(file === root ? path.join(root, 'index.cjs') : file).PNG;
const same = (a,b) => {assert.equal(a.width,b.width);assert.equal(a.height,b.height);assert.deepEqual(a.data,b.data)};
const cases = [
 ...images.map(([name,input])=>({name:'write '+name, make:file=>{const PNG=api(file);return()=>PNG.sync.write(input)},validate:bytes=>same(control.sync.read(bytes),input)})),
 {name:'construct/fill/write fixture 4x3',make:file=>{const PNG=api(file);return()=>{const p=new PNG({width:4,height:3});p.data.fill(255);return PNG.sync.write(p)}},validate:bytes=>same(control.sync.read(bytes),tiny)},
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','write.cjs','bench/write.cjs','../../scripts/png-conformance/package-lock.json']}).then(report=>{
 if(process.env.VPM_BENCH_WORKER)return;
 report.encodedBytes=Object.fromEntries(images.map(([name,input])=>[name,{upstream:control.sync.write(input).length,vpm:api(root).sync.write(input).length}]));
 if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report.encodedBytes));
}).catch(e=>{console.error(e);process.exitCode=1});
