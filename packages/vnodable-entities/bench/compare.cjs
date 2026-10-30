'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const upstream=await import('../../../scripts/nodable-entities-conformance/node_modules/@nodable/entities/src/index.js'),vpm=require('..');
 const numeric='&#65;&#x1F600;&#38;'.repeat(16),xml='&lt;&gt;&amp;&quot;&apos;'.repeat(16),named='&copy;&euro;&trade;'.repeat(16),escaped='<>&"\''.repeat(16),sparse='a'.repeat(8192)+'&amp;';
 const cases=[
  {name:'construct default decoder',make:lib=>()=>new lib.EntityDecoder().decode('&lt;'),validate:v=>assert.equal(v,'<')},
  {name:'construct parser decoder',make:lib=>()=>new lib.EntityDecoder({namedEntities:{...lib.XML},numericAllowed:false,limit:{maxTotalExpansions:Infinity,maxExpandedLength:100000,applyLimitsTo:'all'},onInputEntity:()=> 'allow'}).decode('&amp;'),validate:v=>assert.equal(v,'&')},
  {name:'decode plain XML text',make:lib=>{const d=new lib.EntityDecoder();return()=>d.decode('CompleteMultipartUpload');},validate:v=>assert.equal(v,'CompleteMultipartUpload')},
  {name:'decode XML references',make:lib=>{const d=new lib.EntityDecoder();return()=>d.decode(xml);},validate:v=>assert.equal(v,'<>&"\''.repeat(16))},
  {name:'decode sparse 8 KiB text',make:lib=>{const d=new lib.EntityDecoder();return()=>d.decode(sparse);},validate:v=>assert.equal(v,'a'.repeat(8192)+'&')},
  {name:'decode numeric references',make:lib=>{const d=new lib.EntityDecoder();return()=>d.decode(numeric);},validate:v=>assert.equal(v,'A😀&'.repeat(16))},
  {name:'decode named references',make:lib=>{const d=new lib.EntityDecoder({namedEntities:{...lib.COMMON_HTML,...lib.CURRENCY}});return()=>d.decode(named);},validate:v=>assert.equal(v,'©€™'.repeat(16))},
  {name:'register and enforce document limit',make:lib=>{const d=new lib.EntityDecoder({limit:{maxTotalExpansions:2,maxExpandedLength:32}});return()=>{d.addInputEntities({x:'replacement'});return d.decode('&x;&x;');};},validate:v=>assert.equal(v,'replacementreplacement')},
  {name:'construct named encoder',make:lib=>()=>new lib.EntityEncoder({namedEntities:lib.ALL_ENTITIES}).encode('©'),validate:v=>assert.equal(v,'&COPY;')},
  {name:'encode dense XML characters',make:lib=>{const e=new lib.EntityEncoder({encodeAllNamed:false});return()=>e.encode(escaped);},validate:v=>assert.equal(v,'&lt;&gt;&amp;&quot;&apos;'.repeat(16))},
  {name:'encode sparse 8 KiB text',make:lib=>{const e=new lib.EntityEncoder({encodeAllNamed:false});return()=>e.encode('a'.repeat(8192)+'<');},validate:v=>assert.equal(v,'a'.repeat(8192)+'&lt;')},
  {name:'encode named Unicode',make:lib=>{const e=new lib.EntityEncoder({namedEntities:lib.ALL_ENTITIES});return()=>e.encode('©€™'.repeat(16));},validate:v=>assert.equal(v,'&COPY;&euro;&TRADE;'.repeat(16))},
 ];
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','index.mjs','lib/decoder.js','lib/encoder.js','lib/options.js','lib/tables.js','lib/tables.mjs','lib/all-entities.mjs','bench/compare.cjs','../../scripts/nodable-entities-conformance/upstream/SHA256.json']});
})().catch(e=>{console.error(e);process.exitCode=1;});
