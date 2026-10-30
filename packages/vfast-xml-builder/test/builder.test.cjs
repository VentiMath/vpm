'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const Builder=require('..');
test('retained upstream builder cases and disabled-case diagnostic',async()=>{await require('../../../scripts/xml-builder-conformance/run.cjs')();});
test('paired builder correctness discriminators',async()=>{await require('../../../scripts/xml-builder-conformance/regressions.cjs')();});
test('cycles reject in ordinary and raw traversal, and reuse succeeds after failure',()=>{
 for(const stopNodes of [[],['r']]){const b=new Builder({stopNodes,maxNestedTags:0});const child={};child.a=child;assert.throws(()=>b.build({r:child}),/Cyclic XML input/);assert.equal(b.build({r:'ok'}),'<r>ok</r>');}
 for(const stopNodes of [[],['r']]){const b=new Builder({preserveOrder:true,stopNodes,maxNestedTags:0});const arr=[];arr.push({a:arr});assert.throws(()=>b.build([{r:arr}]),/Cyclic XML input/);assert.equal(b.build([{r:[{'#text':'ok'}]}]),'<r>ok</r>');}
});
test('shared acyclic objects can occur repeatedly',()=>{const row={a:'x'};assert.equal(new Builder().build({r:[row,row]}),'<r><a>x</a></r><r><a>x</a></r>');const arr=[{'#text':'x'}];assert.equal(new Builder({preserveOrder:true}).build([{r:arr},{r:arr}]),'<r>x</r><r>x</r>');});
test('depth counts emitted elements for primitive, object, ordered and raw nodes',()=>{
 for(let max=1;max<=8;max++)for(let depth=1;depth<=10;depth++){
  let object='',ordered=[{'#text':''}];for(let i=0;i<depth;i++){object={a:object};ordered=[{a:ordered}];}
  for(const stopNodes of [[],['a']])for(const preserveOrder of [false,true]){const b=new Builder({maxNestedTags:max,stopNodes,preserveOrder});const go=()=>b.build(preserveOrder?ordered:object);if(depth>max)assert.throws(go,/Maximum nested tags/);else assert.doesNotThrow(go);}
 }
 assert.throws(()=>new Builder({maxNestedTags:1,attributeNamePrefix:'',ignoreAttributes:false}).build({r:{child:{}}}),/Maximum nested tags/);
});
test('primitive getters are read once and inherited elements are excluded',()=>{let reads=0;const input=Object.create({hidden:'never'});Object.defineProperty(input,'r',{enumerable:true,get(){reads++;return'<x>';}});assert.equal(new Builder().build(input),'<r>&lt;x&gt;</r>');assert.equal(reads,1);});
test('callback reentry rejects and cannot poison later builds',()=>{let reenter=true;const b=new Builder({tagValueProcessor:(_,v)=>{if(reenter)b.build({x:'nested'});return v;}});assert.throws(()=>b.build({r:'x'}),/cannot be reentered/);reenter=false;assert.equal(b.build({r:'x'}),'<r>x</r>');});
test('configuration validates limits, callbacks and replacement records',()=>{
 for(const max of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'2',null])assert.throws(()=>new Builder({maxNestedTags:max}),/nonnegative safe integer/);
 for(const options of [{stopNodes:[42]},{unpairedTags:[{}]},{sanitizeName:true},{tagValueProcessor:1},{ignoreAttributes:[42]},{entities:[{regex:'&',val:'x'}]}])assert.throws(()=>new Builder(options),TypeError);
 const b=Builder();assert.ok(b instanceof Builder);assert.equal(b.build({r:'x'}),'<r>x</r>');
 assert.throws(()=>{b.options={};},TypeError);assert.throws(()=>b.options.unpairedTags.push('r'),TypeError);
});
test('shared default configuration and array-only configuration stay isolated',()=>{
 const a=new Builder(),b=new Builder({});assert.ok(Object.isFrozen(a.options));assert.equal(a.options,b.options);
 let reads=0;const wrapped=new Builder({get arrayNodeName(){reads++;return 'x';}});assert.equal(reads,1);
 assert.equal(wrapped.build([1]),'<x>1</x>');assert.equal(a.build({r:'x'}),'<r>x</r>');
 assert.throws(()=>wrapped.options.unpairedTags.push('x'),TypeError);assert.equal(a.options.arrayNodeName,undefined);
});
test('selective filters work for grouped and ordered attributes without changing source regex state',()=>{
 const pattern=/^secret$/g;pattern.lastIndex=4;const opts={ignoreAttributes:[pattern]};const b=new Builder(opts);
 assert.equal(b.build({r:[{'@_secret':'x','@_keep':'y'},{'@_secret':'x','@_keep':'z'}]}),'<r keep="y"></r><r keep="z"></r>');assert.equal(pattern.lastIndex,4);
 assert.equal(new Builder({...opts,attributesGroupName:'@'}).build({r:{'@':{'@_secret':'x','@_keep':'y'}}}),'<r keep="y"></r>');
 assert.equal(new Builder({...opts,preserveOrder:true}).build([{r:[],':@':{keep:'y','@_secret':'x'}}]),'<r keep="y"></r>');
});
test('raw text is intentional, but nested filters, depth and quote escaping still apply',()=>{
 const seen=[];const filter=(name,path)=>{seen.push(path);return name==='secret';};
 const opts={ignoreAttributes:filter,stopNodes:['r']};
 const plain=new Builder(opts).build({r:{child:{'@_secret':'x','@_keep':'"','x':'<raw>'}}});
 const ordered=new Builder({...opts,preserveOrder:true}).build([{r:[{child:[{x:[{'#text':'<raw>'}]}],':@':{'@_secret':'x','@_keep':'"'}}]}]);
 assert.equal(plain,'<r><child keep="&quot;"><x><raw></x></child></r>');assert.equal(ordered,plain);assert.ok(seen.every(p=>p==='r.child'));
});
test('sanitizer sees readonly path and must return a valid name in both modes',()=>{
 for(const preserveOrder of [false,true]){const context=[];const b=new Builder({preserveOrder,ignoreAttributes:false,sanitizeName:(name,c)=>{context.push(c);return c.isAttribute?'attr':'tag';}});assert.equal(b.build(preserveOrder?[{'bad name':[],':@':{'@_bad attr':'x'}}]:{'bad name':{'@_bad attr':'x'}}),'<tag attr="x"></tag>');assert.equal(context.length,2);assert.ok(context.every(c=>typeof c.matcher.push==='undefined'));}
});
test('custom replacements copy regexes and restart state for repeated calls',()=>{
 const regex=/x/y;regex.lastIndex=2;const rules=[{regex,val:'<'}];const b=new Builder({entities:rules});rules[0].val='bad';assert.equal(b.build({r:'xx'}),'<r><x</r>');assert.equal(b.build({r:'xx'}),'<r><x</r>');assert.equal(regex.lastIndex,2);
});
test('comments and CDATA retain safe delimiters for long runs',()=>{
 for(let length=1;length<80;length++){const comment=new Builder({commentPropName:'c'}).build({c:'-'.repeat(length)}).slice(4,-3);assert.ok(!comment.includes('--'));assert.ok(!comment.endsWith('-'));}
 assert.equal(new Builder({cdataPropName:'c'}).build({r:{c:']]>'}}),'<r><![CDATA[]]]]><![CDATA[>]]></r>');
});
test('independent escaping oracle covers generated plain and ordered content',()=>{
 const chars=['a','&','<','>',"'",'"','😀','é','\t','\n'];const escape=s=>Array.from(s,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&apos;','"':'&quot;'}[c]||c)).join('');let seed=42;
 const plain=new Builder(),ordered=new Builder({preserveOrder:true});
 for(let i=0;i<4000;i++){let input='';for(let j=0;j<i%47;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;input+=chars[seed%chars.length];}const expected='<r>'+escape(input)+'</r>';assert.equal(plain.build({r:input}),expected);assert.equal(ordered.build([{r:[{'#text':input}]}]),expected);}
});
test('current parser round trips generated text and attributes',()=>{
 const {XMLParser}=require('../../../scripts/xml-builder-conformance/node_modules/fast-xml-parser');const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false,parseAttributeValue:false,trimValues:false});const b=new Builder({ignoreAttributes:false,suppressBooleanAttributes:false});
 for(const input of ['a&b','<x>','"quotes"',"'apostrophe'",'😀é','-0','true'])assert.deepEqual(parser.parse(b.build({r:{'@_key':input,'#text':input}})),{r:{'@_key':input,'#text':input}});
});
test('CJS and ESM expose the same callable builder without phantom runtime types',async()=>{const esm=await import(pathToFileURL(require.resolve('../index.mjs')).href);assert.equal(esm.default,Builder);assert.equal(esm.Builder,Builder);assert.equal(Builder.Builder,Builder);assert.equal(esm.MatcherView,undefined);});
