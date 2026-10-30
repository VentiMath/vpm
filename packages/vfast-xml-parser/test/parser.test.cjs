'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {XMLParser,XMLValidator,XMLBuilder}=require('..');
const {cases}=require('../../../scripts/xml-parser-conformance/regressions.cjs');
for(const [name,fn,expected]of cases)test(name,()=>assert.deepEqual(fn(require('..')),expected));
test('retained upstream parser and validator cases with zero elapsed milliseconds',async()=>{await require('../../../scripts/xml-parser-conformance/run.cjs')(false,{now:()=>0});});
test('only strings and byte views are accepted',()=>{
 for(const value of [null,undefined,23,[],{},new ArrayBuffer(4),new Uint16Array(2)])assert.throws(()=>new XMLParser().parse(value),/string or Uint8Array/);
 const data=Buffer.from('junk<r>café 🧪</r>junk');assert.deepEqual(new XMLParser().parse(new Uint8Array(data.buffer,data.byteOffset+4,data.length-8)),{r:'café 🧪'});
});
test('correct depth on all parsed element forms and exact boundary',()=>{
 for(const xml of ['<r><x/></r>','<r><x>x</x></r>','<r><x>raw</x></r>']){
  assert.throws(()=>new XMLParser({maxNestedTags:1,stopNodes:['r.x']}).parse(xml),/Maximum nested/);
  assert.doesNotThrow(()=>new XMLParser({maxNestedTags:2}).parse(xml));
 }
 assert.doesNotThrow(()=>new XMLParser({maxNestedTags:0}).parse('<r><x>v</x></r>'));
 for(const value of [NaN,Infinity,-1,1.5,'2'])assert.throws(()=>new XMLParser({maxNestedTags:value}),RangeError);
});
test('parser reuse after throws and DTD changes cannot leak document state',()=>{
 const parser=new XMLParser({maxNestedTags:2});
 assert.deepEqual(parser.parse('<!DOCTYPE r [<!ENTITY custom "value">]><r>&custom;</r>'),{r:'value'});
 assert.deepEqual(parser.parse('<r>&custom;</r>'),{r:'&custom;'});
 assert.throws(()=>parser.parse('<r><a><b/></a></r>'));
 assert.deepEqual(parser.parse('<r>next</r>'),{r:'next'});
 assert.throws(()=>parser.parse('<r><!--unfinished'));
 assert.deepEqual(parser.parse('<r>last</r>'),{r:'last'});
 parser.addEntity('custom','registered');assert.deepEqual(parser.parse('<r>&custom;</r>'),{r:'registered'});
});
test('entity counts and XML version reset for each document',()=>{
 const parser=new XMLParser({htmlEntities:true,ignoreDeclaration:true,processEntities:{maxTotalExpansions:1}});
 for(let i=0;i<3;i++)assert.deepEqual(parser.parse('<r>&amp;</r>'),{r:'&'});
 assert.throws(()=>parser.parse('<r>&amp;&amp;</r>'),/limit exceeded/);
 assert.deepEqual(parser.parse('<?xml version="1.1"?><r>&#x1;</r>'),{r:'\x01'});
 assert.deepEqual(parser.parse('<r>&#x1;</r>'),{r:''});
});
test('callback reentry fails and the parser recovers',()=>{
 let recurse=true;const parser=new XMLParser({tagValueProcessor:(name,value)=>{if(recurse)parser.parse('<r>inner</r>');return value;}});
 assert.throws(()=>parser.parse('<r>outer</r>'),/reentered/);recurse=false;assert.deepEqual(parser.parse('<r>next</r>'),{r:'next'});
});
test('callback registration during parse fails without discarding valid state',()=>{
 let register=true;const parser=new XMLParser({tagValueProcessor:(name,value)=>{if(register)parser.addEntity('x','value');return value;}});
 assert.throws(()=>parser.parse('<r>x</r>'),/during parsing/);register=false;assert.deepEqual(parser.parse('<r>x</r>'),{r:'x'});
});
test('configuration and external-entity inspection cannot mutate live configuration',()=>{
 const opts={numberParseOptions:{leadingZeros:false},unpairedTags:['br'],processEntities:{maxEntityCount:1}},parser=new XMLParser(opts);
 opts.numberParseOptions.leadingZeros=true;opts.unpairedTags.length=0;opts.processEntities.maxEntityCount=10;
 assert.deepEqual(parser.parse('<r><br><x>01</x></r>'),{r:{br:'',x:'01'}});
 assert.throws(()=>{parser.options.maxNestedTags=0;},TypeError);
 parser.addEntity('__proto__','safe');assert.deepEqual(parser.parse('<r>&__proto__;</r>'),{r:'safe'});
 assert.throws(()=>{parser.externalEntities.x='bad';},TypeError);
});
test('grouped attribute predicates work during compression',()=>{
 const parser=new XMLParser({ignoreAttributes:false,attributesGroupName:'attrs',jPath:false,isArray:(n,m,leaf,attr)=>!attr&&m.getAttrValue('id')==='x'});
 assert.deepEqual(parser.parse('<r><a id="x">v</a><b id="y">w</b></r>'),{r:{a:[{'#text':'v',attrs:{'@_id':'x'}}],b:{'#text':'w',attrs:{'@_id':'y'}}}});
});
test('filters are deterministic and leave caller regexp untouched',()=>{
 for(const flags of ['g','y','gy']){const regex=new RegExp('id',flags);regex.lastIndex=1;const p=new XMLParser({ignoreAttributes:[regex]});for(let i=0;i<3;i++)assert.deepEqual(p.parse('<r id="v"/>'),{r:''});assert.equal(regex.lastIndex,1);}
});
test('metadata handles buffer views and parser reuse',()=>{
 const p=new XMLParser({preserveOrder:true,captureMetaData:true}),xml='\uFEFF<r><a/></r>',sym=XMLParser.getMetaDataSymbol();
 for(const data of [xml,Buffer.from(xml),new TextEncoder().encode(xml)]){const out=p.parse(data);assert.deepEqual(out[0][sym],{startIndex:1,endIndex:xml.length});assert.deepEqual(out[0].r[0][sym],{startIndex:4,endIndex:8});}
});
test('validation remains optional for fragments and malformed nesting',()=>{
 assert.deepEqual(new XMLParser().parse('<a/><b/>'),{a:'',b:''});assert.throws(()=>new XMLParser().parse('<a/><b/>',true));
 assert.deepEqual(new XMLParser().parse('<a/></a><b/>'),{a:'',b:''});
 for(const xml of ['<r>&missing</r>','<r></r/>'])assert.notEqual(XMLValidator.validate(xml),true);
});
test('raw stop nodes preserve nested text without applying the parsed-depth limit inside',()=>{
 assert.deepEqual(new XMLParser({stopNodes:['r.raw'],maxNestedTags:2}).parse('<r><raw><a><b>raw</b></a></raw></r>'),{r:{raw:'<a><b>raw</b></a>'}});
});
test('seeded builder/parser round trips with entities and attributes',()=>{
 let seed=12345;const chars=['a','<','&','>',"'",'"','é','🧪'];const p=new XMLParser({ignoreAttributes:false,parseTagValue:false,trimValues:false}),b=new XMLBuilder({ignoreAttributes:false});
 for(let n=0;n<1000;n++){let value='';for(let j=0;j<20;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;value+=chars[seed%chars.length];}const input={r:{'@_id':String(n),x:value}};const xml=b.build(input);assert.equal(XMLValidator.validate(xml),true);assert.deepEqual(p.parse(xml),input);}
});
test('generated large document and malformed whitespace stress',()=>{
 const text='x'.repeat(256),xml='<r>'+('<item>'+text+'</item>').repeat(4096)+'</r>';
 assert.equal(XMLValidator.validate(xml),true);const result=new XMLParser().parse(xml);assert.equal(result.r.item.length,4096);assert.equal(result.r.item[4095],text);
 assert.notEqual(XMLValidator.validate('<r'+' '.repeat(100000)+'= />'),true);
});
