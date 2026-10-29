'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), J=require('..');
const plain=value=>JSON.parse(JSON.stringify(value));
test('exact integers, decimals, exponents, overflow and underflow round trip',()=>{
 for(const source of ['9007199254740993','-9007199254740993','1.00000000000000001','9.007199254740993e15','1e400','1e-400','1e9999999999999999999999']){
  const value=J.parse(source); assert.ok(J.isExactNumber(value)); assert.equal(value.valueOf(),source); assert.equal(J.stringify(value),source); assert.ok(Object.isFrozen(value));
 }
 for(const source of ['0','-0','1','9007199254740991','1000000000000000','0.1','1.50','1e3','1e-3']) assert.equal(J.parse(source),Number(source));
});
test('native integer mode retains fractional precision and bounds exponent expansion',()=>{
 const j=J({useNativeBigInt:true}); assert.equal(j.parse('9007199254740993'),9007199254740993n); assert.equal(j.parse('9.007199254740993e15'),9007199254740993n);
 assert.ok(J.isExactNumber(j.parse('1.00000000000000001'))); assert.ok(J.isExactNumber(j.parse('1e100000')));
 assert.equal(J({useNativeBigInt:true,alwaysParseAsBig:true}).parse('1.2e1'),12n);
 assert.equal(J({useNativeBigInt:true,alwaysParseAsBig:true}).parse('0e99999999999999999999999'),0n);
});
test('string mode and forced exact mode',()=>{assert.equal(J({storeAsString:true}).parse('9007199254740993'),'9007199254740993');assert.equal(J({alwaysParseAsBig:true}).parse('1').toString(),'1');});
test('strict JSON grammar rejects malformed tokens and non-JSON whitespace',()=>{
 for(const s of ['01','-01','1.','+1','.1','1e','1e+','NaN','Infinity','[1,]','{"a":1,}','[1 2]','truefalse','\u00a0true','"\n"','"\\x41"','"\\u00QQ"','"unterminated','"\\"','']) assert.throws(()=>J.parse(s),SyntaxError,s);
});
test('strings, escaped property names and surrogate code units match native JSON',()=>{
 for(const value of ['plain','a"b\\c\n\t','\ud800','\udfff','😀','\u0000']){const s=JSON.stringify({[value]:value});assert.equal(J.stringify(J.parse(s)),s);}
});
test('prototype policies apply to exact decoded names only',()=>{
 for(const s of ['{"__proto__":1}','{"\\u005f_proto__":1}','{"constructor":1}'])assert.throws(()=>J.parse(s),SyntaxError);
 assert.equal(J.parse('{"myconstructor":1,"x__proto__":2}').myconstructor,1);
 const value=J({protoAction:'preserve',constructorAction:'preserve'}).parse('{"__proto__":{"polluted":true},"constructor":2}');assert.equal(Object.getPrototypeOf(value),null);assert.equal(value.polluted,undefined);assert.equal(value.constructor,2);
 assert.deepEqual(plain(J({protoAction:'ignore'}).parse('{"__proto__":{},"a":1}')),{a:1});
});
test('duplicate detection includes decoded and ignored names',()=>{
 assert.equal(J.parse('{"x":1,"x":2}').x,2);
 for(const s of ['{"x":1,"\\u0078":2}','{"__proto__":1,"__proto__":2}']) assert.throws(()=>J({strict:true,protoAction:'ignore'}).parse(s),/Duplicate/);
});
test('errors omit source and property values',()=>{
 for(const s of ['{"TOP_SECRET":','{"TOP_SECRET":1,"TOP_SECRET":2}']){try{J({strict:true}).parse(s);assert.fail();}catch(e){assert.ok(e instanceof SyntaxError);assert.ok(!JSON.stringify(e).includes('TOP_SECRET'));assert.ok(!String(e).includes('TOP_SECRET'));assert.equal(e.cause,undefined);}}
});
test('input, nesting and numeric bounds are enforced',()=>{
 assert.throws(()=>J({maxLength:3}).parse('true'),/maxLength/);assert.throws(()=>J({maxNumberLength:3}).parse('1234'),/maxNumberLength/);
 assert.deepEqual(plain(J({maxDepth:2}).parse('[[1]]')),[[1]]);assert.throws(()=>J({maxDepth:2}).parse('[[[]]]'),/maxDepth/);assert.throws(()=>J({maxDepth:2}).stringify([[[]]]),/maxDepth/);
 for(const options of [{strict:1},{maxDepth:0},{maxDepth:1025},{maxLength:Infinity},{maxNumberLength:100001},{protoAction:'bad'},null]) assert.throws(()=>J(options),TypeError);
});
test('ExactNumber validates syntax and cannot be spoofed',()=>{
 for(const s of ['01','Infinity','1,"admin":true','1e',''])assert.throws(()=>new J.ExactNumber(s),TypeError);
 const fake=Object.create(J.ExactNumber.prototype);assert.equal(J.isExactNumber(fake),false);assert.throws(()=>fake.toString(),TypeError);
 assert.equal(J.stringify(new J.ExactNumber('1.2300e10')),'1.2300e10');
});
test('reviver deletion, root replacement, holder identity and exact numbers',()=>{
 const seen=[];const value=J.parse('{"n":9007199254740993,"drop":1,"a":[1,2]}',function(k,v){seen.push(k);if(k==='n')assert.ok(J.isExactNumber(v));if(k==='drop'||k==='0')return;return v;});
 assert.equal(value.drop,undefined);assert.equal(0 in value.a,false);assert.deepEqual(seen,['n','drop','0','1','a','']);assert.equal(J.parse('1',()=>3),3);
});
test('reentrant parsers and serializers keep independent state',()=>{
 const text=J.stringify({a:1,b:{c:2}},function(k,v){if(k==='a')assert.equal(J.stringify({nested:4},null,4),'{\n    "nested": 4\n}');return v;},2);assert.equal(text,JSON.stringify({a:1,b:{c:2}},null,2));
 assert.equal(J.parse('{"a":1}',(k,v)=>k==='a'?J.parse('2'):v).a,2);
});
test('replacer receives exact wrapper and returned strings remain quoted',()=>{
 const n=J.parse('9007199254740993');assert.equal(J.stringify({n},(k,v)=>k==='n'?'0,"admin":true':v),'{"n":"0,\\"admin\\":true"}');
 assert.equal(J.stringify({n},(k,v)=>J.isExactNumber(v)?new J.ExactNumber('9007199254740995'):v),'{"n":9007199254740995}');
});
test('replacer lists, boxed values, indentation and omission match native JSON',()=>{
 const object={a:new Number(2),b:new String('s'),c:new Boolean(false),1:'one',undef:undefined,inf:Infinity,arr:[undefined,NaN,()=>{},Symbol()]};
 for(const replacer of [undefined,['a','a',1,new String('b'),new Number(1)]])for(const space of [undefined,2,'--',Infinity,NaN,new Number(2)])assert.equal(J.stringify(object,replacer,space),JSON.stringify(object,replacer,space));
 assert.equal(J.stringify(Object(123n)),'123');
});
test('toJSON and getters run once; circular references have controlled failures',()=>{
 let reads=0,calls=0;const value={get toJSON(){reads++;return()=>{calls++;return {x:1};};}};assert.equal(J.stringify(value),'{"x":1}');assert.equal(reads,1);assert.equal(calls,1);
 const cycle={};cycle.c=cycle;assert.throws(()=>J.stringify(cycle),/circular/);const shared={x:1};assert.equal(J.stringify([shared,shared]),'[{"x":1},{"x":1}]');
});
test('captured JSON intrinsics survive consumers replacing global JSON',()=>{const native=global.JSON;try{global.JSON=J({useNativeBigInt:true});assert.equal(J.parse('"a\\nb"'),'a\nb');assert.equal(J.stringify({x:'a\nb'}),'{"x":"a\\nb"}');}finally{global.JSON=native;}});
test('deterministic generated JSON agrees with native grammar and ordinary values',()=>{
 let state=42;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
 function generate(depth){const choices=depth?6:4;switch(Math.floor(random()*choices)){case 0:return null;case 1:return random()<.5;case 2:return Math.floor(random()*100000)-50000;case 3:return ['simple','quote"','\\\n','\ud800','😀'][Math.floor(random()*5)];case 4:return Array.from({length:Math.floor(random()*5)},()=>generate(depth-1));default:return Object.fromEntries(Array.from({length:Math.floor(random()*5)},(_,i)=>['key'+i,generate(depth-1)]));}}
 for(let i=0;i<1000;i++){const v=generate(4),s=JSON.stringify(v);assert.deepEqual(plain(J.parse(s)),v);assert.equal(J.stringify(v),s);const bad=s+'x';assert.throws(()=>J.parse(bad),SyntaxError);}
});
