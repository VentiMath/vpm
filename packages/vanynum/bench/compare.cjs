'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const upstream=(await import('../../../scripts/numbers-conformance/node_modules/anynum/anynum.js')).default,vpm=require('..');
 const varied=text=>Array.from({length:32},(_,i)=>text+i);
 const inputs=[['short ASCII number',varied('12345.67')],['plain ASCII 4KiB',varied('ordinary text 123 '.repeat(240))],['short Devanagari',varied('−१२३४.५६')],['short fullwidth',varied('－１２３４.５６')],['mathematical digits',varied('𝟎𝟏𝟐𝟑𝟜𝟝𝟞𝟡')],['dense mixed digits 4KiB',varied('१२३४５６۷۸𝟡0'.repeat(350))],['sparse digits in text',varied('prefix '.repeat(50)+'१'+' text '.repeat(50)+'𝟡')],['unchanged Unicode',varied('雪😀 नमस्ते '.repeat(50))]];
 const cases=inputs.map(([name,values])=>{const expected=new Set(values.map(upstream));return{name,make:lib=>{let i=0;return()=>lib(values[i++%values.length]);},validate:value=>assert.ok(expected.has(value))};});
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','lib/data.js','bench/compare.cjs','../../scripts/numbers-conformance/upstream/SHA256.json']});
})().catch(e=>{console.error(e);process.exitCode=1;});
