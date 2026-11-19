'use strict';
const path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const upstream = path.resolve(root,'../../scripts/source-map-conformance/node_modules/source-map-js');
const points = Array.from({length:128},(_,i)=>({ generated:{line:1+(i>>3),column:i%8*6}, original:{line:i+1,column:0}, source:'theme.css' }));
function build(api) {
  const map = new api.SourceMapGenerator({file:'out.css'});
  for (const point of points) map.addMapping(point);
  return map;
}
const fixture = build(require(upstream)).toString();
const query = points[73].generated;
const cases = [
  {name:'generate and serialize 128 CSS positions',make:file=>{const api=require(file);return()=>build(api).toString()},validate:value=>assert.equal(value,fixture)},
  {name:'first original position lookup',make:file=>{const api=require(file);return()=>new api.SourceMapConsumer(fixture).originalPositionFor(query)},validate:value=>assert.equal(value.line,74)},
  {name:'warm original position lookup',make:file=>{const c=new (require(file).SourceMapConsumer)(fixture);c.originalPositionFor(query);return()=>c.originalPositionFor(query)},validate:value=>assert.equal(value.line,74)}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','generator.cjs','consumer.cjs','paths.cjs','codec.cjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/source-map-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
