'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),v=require('..');
const upstream=require('../../../scripts/entities-conformance/node_modules/html-entities');
const data=require('../lib/data'),original=require('../../../scripts/entities-conformance/node_modules/html-entities/dist/commonjs/named-references.js').namedReferences;

test('nullish and empty values remain empty across APIs',()=>{for(const fn of Object.values(v))for(const value of [null,undefined,''])assert.equal(fn(value),'');});
test('encoding preserves explicit numeric compatibility including zero',()=>{for(const value of [0,1,-1,1.5,NaN,Infinity])assert.equal(v.encode(value),String(value));});
test('non-string decoding and coercible objects are rejected without conversion',()=>{let called=false;const object={toString(){called=true;return '&amp;';}};for(const value of [object,true,false,0,1,Symbol('x'),[]])for(const fn of [v.decode,v.decodeEntity])assert.throws(()=>fn(value),TypeError);assert.throws(()=>v.encode(object),TypeError);assert.equal(called,false);});
test('invalid configuration fails even on empty input',()=>{
 for(const fn of Object.values(v))for(const options of [null,1,[],{level:'constructor'},{level:'HTML5'},{level:{}}])assert.throws(()=>fn('',options),TypeError);
 for(const mode of ['constructor','__proto__','unknown',{},null])assert.throws(()=>v.encode('',{mode}),TypeError);
 for(const numeric of ['hex','constructor',false])assert.throws(()=>v.encode('',{numeric}),TypeError);
 for(const scope of ['constructor','unknown',null,{}])assert.throws(()=>v.decode('',{scope}),TypeError);
});
test('options are own snapshots read once with frozen input supported',()=>{
 let reads=0;const options=Object.create({level:'xml',scope:'strict'});Object.defineProperty(options,'level',{get(){reads++;return 'html5';}});
 assert.equal(v.decode('&copy',options),'©');assert.equal(reads,1);assert.equal(v.decode('&copy',Object.freeze({scope:'strict'})),'&copy');
 assert.equal(v.encode('©',Object.freeze({mode:'nonAscii'})),'&copy;');
});
test('all named tables match the pinned source with prototype-free immutable maps',()=>{
 for(const level of ['xml','html4','html5']){
  for(const kind of ['entities','characters']){const map=data.namedReferences[level][kind];assert.equal(Object.getPrototypeOf(map),null);assert.equal(Object.isFrozen(map),true);assert.deepEqual({...map},original[level][kind]);}
  for(const [entity,value]of Object.entries(original[level].entities)){assert.equal(v.decodeEntity(entity,{level}),value);assert.equal(v.decode(entity,{level,scope:'body'}),value);}
 }
});
test('single-entity decoding never resolves inherited object properties',()=>{for(const text of ['constructor','__proto__','toString','valueOf','hasOwnProperty','&constructor;'])assert.equal(v.decodeEntity(text),text);});
test('longest named matches preserve ambiguous body and attribute behavior',()=>{
 for(const input of ['&notin;','&notit;','&notinva;','&notin','&not;in','&ampersand','&copy=','&copy9','&NotEqualTilde;'])for(const scope of ['body','attribute','strict'])assert.equal(v.decode(input,{scope}),upstream.decode(input,{scope}),input+scope);
 assert.equal(v.decode('&amp= &amp9 &amp;=',{scope:'attribute'}),'&amp= &amp9 &=');
});
test('numeric attribute references decode before equals or alphanumeric suffixes',()=>{
 assert.equal(v.decode('&#65= &#x41= &#65z &#x41z',{scope:'attribute'}),'A= A= Az Az');
 assert.equal(upstream.decode('&#65=',{scope:'attribute'}),'&#65=');
});
test('numeric boundaries preserve the highest scalar and replace surrogate values',()=>{
 for(const code of [0,1,127,160,0xd7ff,0xd800,0xdbff,0xdc00,0xdfff,0xe000,0xffff,0x10000,0x10fffe,0x10ffff,0x110000]){
  const expected=code===0||code>0x10ffff||(code>=0xd800&&code<=0xdfff)?'�':String.fromCodePoint(code);
  for(const token of ['&#'+code+';','&#x'+code.toString(16)+';'])for(const fn of [v.decode,v.decodeEntity])assert.equal(fn(token),expected,token);
 }
});
test('legacy C1 remapping remains unchanged for every table level',()=>{for(let n=128;n<160;n++)for(const level of ['xml','html4','html5'])assert.equal(v.decodeEntity('&#'+n+';',{level}),upstream.decodeEntity('&#'+n+';',{level}));});
test('single numeric entities reject empty digits, signs, whitespace and suffix junk',()=>{
 for(const text of ['&#;','&#x;','&#-1;','&#+65;','&# 65;','&#65junk;','&#x41q;','&#65;;','&#65;\n','&#65;\r\n','&#65\n','&#0x41;'])assert.equal(v.decodeEntity(text),text,JSON.stringify(text));
 assert.equal(v.decode('&#65junk;'),'Ajunk;');
});
test('overflow and long leading-zero numeric references remain bounded and correct',()=>{assert.equal(v.decodeEntity('&#'+'9'.repeat(50000)+';'),'�');assert.equal(v.decodeEntity('&#'+'0'.repeat(50000)+'65;'),'A');assert.equal(v.decode('&#x'+'f'.repeat(50000)+';'),'�');});
test('strict decoding requires semicolons and XML defaults to strict',()=>{assert.equal(v.decode('&amp &#65 &amp; &#65;',{scope:'strict'}),'&amp &#65 & A');assert.equal(v.decode('&amp &#65 &amp; &#65;',{level:'xml'}),'&amp &#65 & A');assert.equal(v.decodeEntity('&#65',{level:'xml'}),'A');});
test('decoding is one pass and preserves plain text exactly',()=>{assert.equal(v.decode('&amp;lt; &#38;copy;'),'&lt; &copy;');for(const value of ['hello','雪 😀','a\0b','\ud800','plain\n'])assert.equal(v.decode(value),value);});
test('default encoding escapes five special characters and preserves other text',()=>{assert.equal(v.encode('<tag a="x" b=\'y\'>&雪</tag>'),'&lt;tag a=&quot;x&quot; b=&apos;y&apos;&gt;&amp;雪&lt;/tag&gt;');assert.equal(v.encode('&amp;'),'&amp;amp;');});
test('all encoding modes and numeric formats preserve upstream character sets',()=>{
 const input=Array.from({length:256},(_,i)=>String.fromCharCode(i)).join('')+'雪😀\ud800x\udc00𝔄≂̸';
 for(const level of ['xml','html4','html5','all'])for(const mode of ['specialChars','nonAscii','nonAsciiPrintable','nonAsciiPrintableOnly','extensive'])for(const numeric of ['decimal','hexadecimal'])assert.equal(v.encode(input,{level,mode,numeric}),upstream.encode(input,{level,mode,numeric}));
});
test('reentrant option getters cannot corrupt a later scan',()=>{const options={get mode(){assert.equal(v.encode('<&>'),'&lt;&amp;&gt;');return 'specialChars';}};assert.equal(v.encode('"x&y"',options),'&quot;x&amp;y&quot;');});
test('seeded mixed entity inputs agree except documented numeric corrections',()=>{
 let state=0x12345678;const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
 const pieces=['&amp;','&copy','&notin;','&notit;','&rx;','&unknown;','&','&#65;','&#x1f600;','&#128;','xyz','雪','< >'];
 for(let i=0;i<3000;i++){let value='';for(let j=0;j<8;j++)value+=pieces[next()%pieces.length];const scope=['body','strict','attribute'][next()%3],level=['xml','html4','html5'][next()%3];assert.equal(v.decode(value,{scope,level}),upstream.decode(value,{scope,level}));}
});
test('thousands of independently generated Unicode references produce scalar values',()=>{
 let state=19;for(let i=0;i<4096;i++){state=(Math.imul(state,1103515245)+12345)>>>0;const cp=state%0x120000;const expected=cp===0||cp>0x10ffff||cp>=0xd800&&cp<=0xdfff?'�':String.fromCodePoint(data.numericUnicodeMap[cp]||cp);assert.equal(v.decodeEntity('&#x'+cp.toString(16)),expected);}
});
test('long sparse, dense and unmatched inputs retain exact text',()=>{
 assert.equal(v.decode('a'.repeat(100000)+'&copy;'),'a'.repeat(100000)+'©');
 assert.equal(v.decode('&amp;'.repeat(20000)),'&'.repeat(20000));
 const unknown='&'+'z'.repeat(100000)+';';assert.equal(v.decode(unknown),unknown);
 assert.equal(v.encode('a'.repeat(100000)+'<'),'a'.repeat(100000)+'&lt;');
});
