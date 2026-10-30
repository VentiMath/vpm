'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),v=require('..');
const productions=['name','ncName','qName','nmToken','nmTokens'];
test('XML editions agree with every Unicode scalar at start and continuation',()=>{
 const ranges=[[0x41,0x5a],[0x61,0x7a],[0xc0,0xd6],[0xd8,0xf6],[0xf8,0x2ff],[0x370,0x37d],[0x37f,0x1fff],[0x200c,0x200d],[0x2070,0x218f],[0x2c00,0x2fef],[0x3001,0xd7ff],[0xf900,0xfdcf],[0xfdf0,0xfffd],[0x10000,0xeffff]];
 for(let cp=0;cp<=0x10ffff;cp++){
  const ch=String.fromCodePoint(cp),start=cp===95||ranges.some(([a,b])=>cp>=a&&cp<=b);
  const continuation=start||cp===45||cp===46||(cp>=48&&cp<=57)||cp===0xb7||(cp>=0x300&&cp<=0x36f)||(cp>=0x203f&&cp<=0x2040);
  assert.equal(v.ncName(ch),start,`start U+${cp.toString(16)}`);
  assert.equal(v.ncName('a'+ch),continuation,`continuation U+${cp.toString(16)}`);
 }
});
test('strict ends, normalized tokens, namespace components and diagnostics',()=>{
 for(const production of productions)for(const suffix of ['\n','\r','\u2028','\u2029','\0','\ud800']){
  const value='a'+suffix;assert.equal(v[production](value),false);assert.equal(v.validate(value,production).position,1);
 }
 for(const value of ['a  b','a\tb','a\nb','a\u00a0b',' a','a '])assert.equal(v.nmTokens(value),false);
 assert.equal(v.nmTokens('1 -x :y'),true);
 assert.equal(v.qName('a:1'),false);assert.equal(v.validate('𐀀:1','qName').position,3);
 assert.equal(v.validate('𐀀!','name').position,2);
 for(const xmlVersion of ['1.0','1.1'])for(const ch of ['×','÷','\u037e','\ud800','\ufdd0','\u{f0000}'])assert.equal(v.name(ch,{xmlVersion}),false);
 for(const ch of ['\u0487','😀','\u{effff}'])for(const xmlVersion of ['1.0','1.1',1,{xmlVersion:1}])assert.equal(v.name(ch,{xmlVersion}),true);
});
test('bounded cached validators agree and reset including zero capacity',()=>{
 for(const production of productions)for(const maxCacheSize of [0,1,2,2048]){
  const check=v.createValidator(production,{maxCacheSize});
  for(let repeat=0;repeat<3;repeat++)for(const value of ['a','1','a:b','a:b:c','', '😀', 'x\n'])assert.equal(check(value),v[production](value));
  check.reset();assert.equal(check('a'),true);assert.throws(()=>check({}),TypeError);
 }
 for(const maxCacheSize of [-1,0.5,Infinity,NaN,'2',2**53])assert.throws(()=>v.createValidator('name',{maxCacheSize}),RangeError);
});
test('sanitize repairs every production and respects ASCII mode',()=>{
 assert.equal(v.sanitize('a:b:c','qName'),'a:b_c');assert.equal(v.sanitize(':1','qName'),'_:_1');
 assert.equal(v.sanitize('1foo','name',{replacement:'-'}),'_1foo');
 assert.equal(v.sanitize('foo:bar','ncName'),'foobar');assert.equal(v.sanitize('a\t b','nmTokens'),'a b');
 for(const replacement of ['',':','!','a b','\ud800'])assert.throws(()=>v.sanitize('a','name',{replacement}),TypeError);
 let seed=91234;const alphabet=['a','1',':',' ','\t','!','\u0300','\u0487','×','😀','\ud800','\udc00','\u{f0000}','-','.'];
 for(let n=0;n<2000;n++){
  let value='';for(let j=0;j<n%12;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;value+=alphabet[seed%alphabet.length];}
  for(const asciiOnly of [false,true])for(const production of productions){
   const options={asciiOnly,replacement:n%2?'_':'-'},fixed=v.sanitize(value,production,options);
   assert.equal(v[production](fixed,options),true,JSON.stringify({value,fixed,production,asciiOnly}));
   assert.equal(v.sanitize(fixed,production,options),fixed);
   assert.equal(v.validate(value,production,options).valid,v[production](value,options));
  }
 }
});
test('rejects coercion and invalid API options',()=>{
 for(const value of [null,undefined,1,{},new String('a')])for(const production of productions)assert.throws(()=>v[production](value),TypeError);
 for(const production of ['bad','toString',null])assert.throws(()=>v.validate('a',production),TypeError);
 for(const options of [null,1,{asciiOnly:'yes'}])assert.throws(()=>v.name('a',options),TypeError);
 assert.throws(()=>v.validateAll('abc','name'),TypeError);assert.throws(()=>v.validateAll(['a',2],'name'),TypeError);
 assert.deepEqual(v.validateAll(['a','1'],'name').map(x=>x.valid),[true,false]);
});
