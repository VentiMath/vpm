'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const camelCase=require('..');
const cases=[
 ['ordinary RPC names',[['GetIamPolicy','getIamPolicy'],['ListDocuments','listDocuments'],['BatchGetDocuments','batchGetDocuments'],['alreadyCamelCase','alreadyCamelCase']]],
 ['acronyms',[['XMLHttpRequest','xmlHttpRequest'],['safeHTML','safeHtml'],['getURLValue','getUrlValue'],['FOO_BAR','fooBar'],['ABc','aBc']]],
 ['digit boundaries',[['enable 6h format','enable6HFormat'],['xhr2 request','xhr2Request'],['HTTP2XXResponse','http2XxResponse'],['24th value','24ThValue']]],
 ['separators',[['__foo--bar__','fooBar'],['hello\nWORLD','helloWorld'],['Foo\n','foo'],['Foo\r\n','foo'],['Foo\u2028','foo'],['Foo\u2029','foo'],['a.b/c\\d','aBCD'],[' \0\t!@#$%^&*()','']]],
 ['apostrophes',[["don't Stop",'dontStop'],['a b’re c','aBreC'],["foo'BAR",'fooBar']]],
 ['Latin accents and ligatures',[['déjà vu','dejaVu'],['Æther Straße Œuvre','aetherStrasseOeuvre'],['Łódź ſoup','lodzSsoup'],['İstanbul','istanbul']]],
 ['combining marks',[['de\u0301ja\u0300 vu','dejaVu'],['A\u20d0 B\ufe20','aB'],['\u0300\u0301','']]],
 ['other scripts',[['你好 世界','你好世界'],['foo ΣΊΓΜΑ','fooΣίγμα'],['foo 𝔘nicode','foo𝔘Nicode']]],
 ['emoji and joined graphemes',[['foo 👩‍a','foo👩‍A'],['hello 👩🏽‍💻 world','hello👩🏽‍💻World'],['🇺🇸 flag','🇺🇸Flag']]],
 ['unpaired surrogates', [['a\ud800b','aB'],['\udfff',''],['foo\ud800 BAR','fooBar']]],
];
for(const [name,values]of cases)test(name,()=>{for(const[input,expected]of values)assert.equal(camelCase(input),expected,JSON.stringify(input));});
test('nullish values, numbers, arrays and boxes follow the public conversion contract',()=>{
 for(const [input,expected]of [[null,''],[undefined,''],[0,'0'],[-0,'0'],[false,'false'],[NaN,'naN'],[Infinity,'infinity'],[[1,'FOO',null],'1Foo'],[Object('Foo BAR'),'fooBar']])assert.equal(camelCase(input),expected);
});
test('primitive and boxed symbols use their intrinsic description',()=>{assert.equal(camelCase(Symbol('Foo BAR')),'symbolFooBar');assert.equal(camelCase(Object(Symbol('Foo BAR'))),'symbolFooBar');});
test('zero BigInts and boxed zero BigInts work without mixed numeric division',()=>{for(const n of [0n,Object(0n),1n,-1n])assert.equal(camelCase(n),String(n).replace('-',''));});
test('object conversion uses the default hint once, including a zero result',()=>{
 let calls=0;const value={ [Symbol.toPrimitive](hint){assert.equal(hint,'default');assert.equal(++calls,1);return '0';}};
 assert.equal(camelCase(value),'0');assert.equal(calls,1);
 const order=[];assert.equal(camelCase({valueOf(){order.push('valueOf');return 'hello world';},toString(){throw Error('unexpected');}}),'helloWorld');assert.deepEqual(order,['valueOf']);
});
test('Symbol.toStringTag does not spoof a Symbol or interfere with ordinary coercion',()=>{
 const fake={ [Symbol.toStringTag]:'Symbol',toString(){return 'hello world';}};assert.equal(camelCase(fake),'helloWorld');
 const hostile={get [Symbol.toStringTag](){throw Error('unneeded tag access');},valueOf(){return 'GetDocument';}};assert.equal(camelCase(hostile),'getDocument');
 const boxed=Object(Symbol('Foo'));Object.defineProperty(boxed,Symbol.toStringTag,{value:'Other'});assert.equal(camelCase(boxed),'symbolFoo');
});
test('conversion exceptions are preserved and inputs are not mutated',()=>{
 const failure=Error('conversion');assert.throws(()=>camelCase({valueOf(){throw failure;}}),e=>e===failure);
 const object=Object.freeze({toString:()=> 'hello world'});assert.equal(camelCase(object),'helloWorld');
});
test('repeated calls, map callbacks and large inputs do not share mutable result state',()=>{
 assert.deepEqual(['FOO_BAR','XMLHttpRequest','Déjà vu','Foo'].map(camelCase),['fooBar','xmlHttpRequest','dejaVu','foo']);
 for(let i=0;i<50;i++)assert.equal(camelCase(i%2?'foo_BAR':'foo 👩‍a'),i%2?'fooBar':'foo👩‍A');
 assert.equal(camelCase('x'.repeat(100000)),'x'.repeat(100000));
 assert.equal(camelCase('FOO_'.repeat(10000)),'foo'+'Foo'.repeat(9999));
});
test('native ESM exposes the callable CommonJS default',async()=>{assert.equal((await import('../index.js')).default,camelCase);});
