'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),upstream=path.resolve(__dirname,'../../../scripts/vlx-conformance/node_modules/@resvg/resvg-js');
const {paper}=require('../../../scripts/resvg-conformance/fixtures.cjs');
const inputs=[['raw ruled page',paper({curves:false,lines:8,columns:24}),{mode:'width',value:1200}],['curved ruled page',paper({lines:8,columns:24}),{mode:'width',value:1200}],['tall page height cap',paper({lines:100,columns:4}),{mode:'height',value:4800}]];
const cases=inputs.flatMap(([name,svg,fitTo])=>[true].map(noFonts=>({
 name:name+(noFonts?' (upstream font discovery disabled)':' (unchanged caller defaults)'),
 make(file){const {Resvg}=require(file),options={fitTo,...(file===upstream&&noFonts?{font:{loadSystemFonts:false}}:{})};return()=>new Resvg(svg,options).render().asPng().length;},validate:n=>assert(n>100)
})));
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','raster.cjs','raster-paths.cjs','raster-png.cjs','bench/compare.cjs','../../scripts/resvg-conformance/fixtures.cjs','../../scripts/vlx-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
