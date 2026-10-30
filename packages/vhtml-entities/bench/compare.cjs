'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),upstream=require('../../../scripts/entities-conformance/node_modules/html-entities'),vpm=require('..');
function item(name,method,inputs,options){const expected=new Set(inputs.map(x=>upstream[method](x,options)));return{name,make:lib=>{let i=0;return()=>lib[method](inputs[i++%inputs.length],options);},validate:value=>assert.ok(expected.has(value))};}
const varied=text=>Array.from({length:64},(_,i)=>text+' '+i);
const cases=[
 item('decode plain text','decode',varied('Object was not found in the requested bucket.')),
 item('decode Storage HTML error','decode',varied('<p>Access &amp; permission denied for &quot;object&quot; &#x1f600;</p>')),
 item('decode dense named 8KiB','decode',varied('&copy;&amp;&NotEqualTilde;&gt;&nbsp;'.repeat(240))),
 item('decode mixed numeric 4KiB','decode',varied('&#65; &#x1f600; &#128; &#xE9; '.repeat(150))),
 item('decode attribute','decode',varied('name=&quot;A&amp;B&quot; &copy= &notit; &#65;'),{scope:'attribute'}),
 item('decode strict XML','decode',varied('&lt;name&gt;A&amp;B&lt;/name&gt; &#xE9;'),{level:'xml'}),
 item('single named entity','decodeEntity',['&amp;','&copy;','&NotEqualTilde;','&unknown;']),
 item('single numeric entity','decodeEntity',['&#65;','&#x1f600;','&#128;','&#12345;']),
 item('encode plain text','encode',varied('Object was not found in the requested bucket.')),
 item('encode short special characters','encode',varied('<p title="雪">A&B</p>')),
 item('encode Unicode nonAscii','encode',varied('雪 © 😀 ∆ ℞ 𝔄 '.repeat(40)),{mode:'nonAscii'}),
];
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','lib/data.js','bench/compare.cjs','../../scripts/entities-conformance/upstream/SHA256.json']}).catch(e=>{console.error(e);process.exitCode=1;});
