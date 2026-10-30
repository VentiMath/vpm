'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const upstream=(await import(pathToFileURL(path.resolve(__dirname,'../../../scripts/xml-builder-conformance/node_modules/fast-xml-builder/src/fxb.js')).href)).default,vpm=require('..');
 const part=i=>({PartNumber:i,ETag:'"etag-'+i+'"'}),parts=Array.from({length:4},(_,i)=>part(i+1)),many=Array.from({length:128},(_,i)=>part(i+1));
 const xml=rows=>rows.map(r=>'<Part><PartNumber>'+r.PartNumber+'</PartNumber><ETag>&quot;etag-'+r.PartNumber+'&quot;</ETag></Part>').join('');
 const cases=[
  {name:'construct default builder',make:B=>()=>new B(),validate:b=>assert.equal(typeof b.build,'function')},
  {name:'construct Storage builder',make:B=>()=>new B({arrayNodeName:'Part'}),validate:b=>assert.equal(typeof b.build,'function')},
  {name:'Storage completion 4 parts',make:B=>{const b=new B({arrayNodeName:'Part'});return()=>b.build(parts);},validate:v=>assert.equal(v,xml(parts))},
  {name:'Storage completion 128 parts',make:B=>{const b=new B({arrayNodeName:'Part'});return()=>b.build(many);},validate:v=>assert.equal(v,xml(many))},
  {name:'short plain object',make:B=>{const b=new B();return()=>b.build({root:{name:'file',size:42}});},validate:v=>assert.equal(v,'<root><name>file</name><size>42</size></root>')},
  {name:'sparse 8 KiB text',make:B=>{const b=new B(),input={r:'a'.repeat(8192)+'&'};return()=>b.build(input);},validate:v=>assert.equal(v,'<r>'+'a'.repeat(8192)+'&amp;</r>')},
  {name:'dense escaped text',make:B=>{const b=new B(),input={r:'<>&"\''.repeat(64)};return()=>b.build(input);},validate:v=>assert.equal(v,'<r>'+'&lt;&gt;&amp;&quot;&apos;'.repeat(64)+'</r>')},
  {name:'ordered attributes and text',make:B=>{const b=new B({preserveOrder:true,ignoreAttributes:false}),input=[{r:[{x:[{'#text':'a&b'}]}],':@':{'@_id':'"value"'}}];return()=>b.build(input);},validate:v=>assert.equal(v,'<r id="&quot;value&quot;"><x>a&amp;b</x></r>')},
  {name:'compiled raw stop node',make:B=>{const b=new B({stopNodes:['root.raw']}),input={root:{raw:{'#text':'<b>raw</b>'}}};return()=>b.build(input);},validate:v=>assert.equal(v,'<root><raw><b>raw</b></raw></root>')},
  {name:'formatted nested object',make:B=>{const b=new B({format:true}),input={root:{a:'x',b:{c:'y'}}};return()=>b.build(input);},validate:v=>assert.equal(v,'<root>\n  <a>x</a>\n  <b>\n    <c>y</c>\n  </b>\n</root>\n')},
 ];
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','index.mjs','lib/fxb.js','lib/orderedJs2Xml.js','lib/options.js','lib/util.js','lib/ignoreAttributes.js','bench/compare.cjs','../../scripts/xml-builder-conformance/upstream/SHA256.json','../vpath-expression-matcher/index.js','../vpath-expression-matcher/lib/expression.js','../vpath-expression-matcher/lib/matcher.js','../vpath-expression-matcher/lib/set.js','../vxml-naming/index.js']});
})().catch(e=>{console.error(e);process.exitCode=1;});
