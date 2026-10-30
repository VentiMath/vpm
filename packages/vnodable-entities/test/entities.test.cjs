'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const lib=require('..'),{EntityDecoder:D,EntityEncoder:E}=lib;
test('all retained upstream cases with explicit contract adaptations',async()=>{await require('../../../scripts/nodable-entities-conformance/run.cjs')(false);});
test('strict numeric grammar and unbounded valid names/leading zeros',()=>{
 const d=new D(),bad=['&#65junk;','&#x41z;','&#+65;','&# 65;','&#-0;','&#0x41;','&#x+41;','&#x 41;','&#x;','&#;','&#1114112;','&#999999999999999999999;'];for(const text of bad)assert.equal(d.decode(text),text,text);
 assert.equal(d.decode('&#65&lt;'),'&#65<');assert.equal(d.decode('&&lt;'),'&<');assert.equal(d.decode('&#'+'0'.repeat(10000)+'65;'),'A');
 const name='x'.repeat(10000);d.addExternalEntity(name,'ok');assert.equal(d.decode('&'+name+';'),'ok');assert.equal(d.decode('&'.repeat(10000)+'lt;'),'&'.repeat(9999)+'<');
 assert.equal(d.decode('&'+'x'.repeat(100000)),'&'+'x'.repeat(100000));
});
test('every Unicode code point follows XML 1.0/1.1 Char ranges',()=>{
 const old=new D(),modern=new D({ncr:{xmlVersion:1.1}});
 for(let cp=0;cp<=0x10ffff;cp++){
  const token='&#x'+cp.toString(16)+';',scalar=String.fromCodePoint(cp);
  const common=cp>=1&&(cp<=0xd7ff||cp>=0xe000&&cp<=0xfffd||cp>=0x10000);
  const xml10=cp===9||cp===10||cp===13||cp>=32&&common;
  assert.equal(old.decode(token),xml10?scalar:'',token+' XML 1.0');assert.equal(modern.decode(token),common?scalar:'',token+' XML 1.1');
 }
});
test('NCR policy precedence, exact leave/remove tokens and reset version',()=>{
 const d=new D({numericAllowed:false});assert.equal(d.decode('&#65;&#0;&#xD800;&#65534;'),'&#65;');
 assert.equal(new D({leave:['#0'],remove:['#65']}).decode('&#0;&#65;&#x41;'),'&#0;A');
 assert.throws(()=>new D({ncr:{onNCR:'throw'}}).decode('&#65535;'),/U\+FFFF/);
 d.setXmlVersion(1.1);assert.equal(d.decode('&#1;'),'&#1;');d.reset();assert.equal(d.decode('&#1;'),'');
 const modern=new D({ncr:{xmlVersion:1.1}});modern.setXmlVersion(1);modern.reset();assert.equal(modern.decode('&#1;'),'\x01');
});
test('single pass for literal ampersands across all registration APIs',()=>{
 const d=new D({namedEntities:{base:'&lt;'}});d.setExternalEntities({bulk:'&amp;'});d.addExternalEntity('single','&base;');d.addInputEntities({input:'&single;'});
 assert.equal(d.decode('&base; &bulk; &single; &input;'),'&lt; &amp; &base; &single;');assert.equal(d.decode('&amp;lt;'),'&lt;');
});
test('own registrations and legacy values are copied and consistently validated',()=>{
 const map=Object.assign(Object.create({inherited:'bad'}),{ok:{val:'yes'},fn:{val:()=>{throw Error('must not call');}}});const d=new D({namedEntities:map});map.ok.val='changed';assert.equal(d.decode('&ok;&inherited;&fn;'),'yes&inherited;&fn;');
 d.setExternalEntities(JSON.parse('{"__proto__":"p","constructor":"c","toString":"t"}'));assert.equal(d.decode('&__proto__;&constructor;&toString;'),'pct');
 for(const name of ['', '#1','a;b','a b','a&b','x\n','<x'])for(const register of [m=>new D({namedEntities:m}),m=>d.setExternalEntities(m),m=>d.addInputEntities(m)])assert.throws(()=>register({[name]:'x'}),TypeError,name);
 const inheritedValue=Object.create({val:'bad'});d.setExternalEntities({x:inheritedValue});assert.equal(d.decode('&x;'),'&x;');
});
test('limits reject invalid configuration rather than silently disabling checks',()=>{
 for(const n of [-Infinity,-1,NaN,1.5,Number.MAX_SAFE_INTEGER+1,'2',null]){
  assert.throws(()=>new D({limit:{maxTotalExpansions:n}}),RangeError);assert.throws(()=>new D({limit:{maxExpandedLength:n}}),RangeError);assert.throws(()=>new E({encodeAllNamed:false,maxReplacements:n}),RangeError);
 }
 for(const tier of ['typo',['all'],['external','typo'],null,1])assert.throws(()=>new D({limit:{applyLimitsTo:tier}}),TypeError);
 for(const mode of ['typo','constructor',{},null])assert.throws(()=>new D({ncr:{onNCR:mode}}),TypeError);
});
test('failed registration cannot reset counters or partially replace maps',()=>{
 let reject=false;const d=new D({limit:{maxTotalExpansions:1},onInputEntity:()=>reject?'throw':'allow'});d.addInputEntities({old:'O'});assert.equal(d.decode('&old;'),'O');reject=true;assert.throws(()=>d.addInputEntities({next:'N'}),/rejected/);assert.throws(()=>d.decode('&old;'),/count limit/);assert.equal(d.decode('&next;'),'&next;');
 reject=false;d.addInputEntities({new:'N'});assert.equal(d.decode('&new;'),'N');
 const x=new D();x.setExternalEntities({old:'O'});assert.throws(()=>x.setExternalEntities({good:'G',get bad(){throw Error('getter');}}),/getter/);assert.equal(x.decode('&old;&good;'),'O&good;');
});
test('hook results and post-check contracts fail explicitly; state cannot reenter',()=>{
 for(const result of [undefined,null,true,'ALLOW','typo']){
  const d=new D({onInputEntity:()=>result});assert.throws(()=>d.addInputEntities({x:'X'}),/must return/);assert.equal(d.decode('&x;'),'&x;');
 }
 let d;d=new D({onInputEntity:()=>{d.reset();return 'allow';}});assert.throws(()=>d.addInputEntities({x:'X'}),/reentered/);
 d=new D({onExternalEntity:()=>{d.decode('&lt;');return 'allow';}});assert.throws(()=>d.addExternalEntity('x','X'),/reentered/);
 d=new D({postCheck:()=>{d.setXmlVersion(1.1);return 'x';}});assert.throws(()=>d.decode('text'),/reentered/);
 for(const value of [undefined,42,{}])assert.throws(()=>new D({postCheck:()=>value}).decode('text'),/must return a string/);
 const calls=[];const checked=new D({postCheck:(result,original)=>{calls.push([result,original]);return result+'!';}});assert.equal(checked.decode('plain'),'plain!');assert.equal(checked.decode(''),'!');assert.equal(checked.decode('&unknown;'),'&unknown;!');assert.equal(checked.decode(42),42);assert.equal(calls.length,3);
});
test('limit accounting remains cumulative through rejected output and private-state writes',()=>{
 const d=new D({limit:{maxTotalExpansions:1,applyLimitsTo:'all'},postCheck:(_r,o)=>o});assert.equal(d.decode('&lt;'),'&lt;');d._totalExpansions=0;d._maxTotalExpansions=0;assert.throws(()=>d.decode('&gt;'),/count limit/);
 const l=new D({limit:{maxExpandedLength:2}});l.addInputEntities({x:'12345'});assert.equal(l.decode('&x;'),'12345');assert.throws(()=>l.decode('&x;'),/length limit/);l.reset();assert.equal(l.decode('&x;'),'&x;');
 const remove=new D({remove:['lt'],limit:{maxTotalExpansions:1,applyLimitsTo:'external'}});assert.equal(remove.decode('&lt;'),'');assert.throws(()=>remove.decode('&lt;'),/count limit/);
});
test('all table values match retained data except four verified standard names',async()=>{
 const u=await import('../../../scripts/nodable-entities-conformance/node_modules/@nodable/entities/src/index.js');const fixes={ocirc:'ô',boxDl:'╖',boxdL:'╕',af:'\u2061'};let seen=0;
 for(const name of Object.keys(u).filter(k=>k!== 'ENTITY_ACTION'&&typeof u[k]==='object')){
  assert.deepEqual(Object.keys(lib[name]).sort(),Object.keys(u[name]).sort());assert.equal(Object.isFrozen(lib[name]),true);
  for(const [key,value]of Object.entries(u[name])){assert.equal(lib[name][key],fixes[key]??value,name+'/'+key);seen++;}
 }
 assert.equal(Object.keys(lib.ALL_ENTITIES).length,932);assert.ok(seen>1800);assert.throws(()=>{lib.XML.lt='changed';},TypeError);
 const decode=new D({namedEntities:lib.ALL_ENTITIES});for(const [key,value]of Object.entries(lib.ALL_ENTITIES))assert.equal(decode.decode('&'+key+';'),value,key);
});
test('encoder longest matches include ASCII, supplementary and arbitrary lengths',()=>{
 const map={short:'ab',long:'abcd',astral:'😀',mix:'😀xyz',same:'ab'},e=new E({namedEntities:map});assert.equal(e.encode('abcd ab 😀xyz 😀'),'&long; &same; &mix; &astral;');
 assert.equal(new E({namedEntities:{less:'<long',amp:'&'}}).encode('<long &'),'&lt;long &amp;');
 assert.equal(new E({encodeXmlSafe:false,namedEntities:{less:'<',letter:'a'}}).encode('<a>'),'<&letter;>');
});
test('frozen map cache and inspection cannot change encoder output',()=>{
 const map={x:'a'},a=new E({namedEntities:map});map.x='b';const b=new E({namedEntities:map});assert.equal(a.encode('ab'),'&x;b');assert.equal(b.encode('ab'),'a&x;');
 const frozen=Object.freeze({x:'x',many:'abc'}),one=new E({namedEntities:frozen}),two=new E({namedEntities:frozen});one.trie1.set(120,'changed');one.trie3.get(97).get(98).set(99,'changed');assert.equal(two.encode('xabc'),'&x;&many;');
 let value='a';const accessor=Object.freeze({get x(){return value;}});const first=new E({namedEntities:accessor});value='b';const second=new E({namedEntities:accessor});assert.equal(first.encode('ab'),'&x;b');assert.equal(second.encode('ab'),'a&x;');
});
test('encoder finite quota is cumulative, explicit and protected',()=>{
 const e=new E({encodeAllNamed:false,maxReplacements:2});assert.equal(e.encode('<>&'),'&lt;&gt;&');assert.equal(e.replacementsCount,2);assert.throws(()=>{e.replacementsCount=0;},TypeError);assert.equal(e.encode('<'),'<');e.reset();assert.equal(e.encode('<'),'&lt;');
 assert.throws(()=>new E(),/namedEntities/);assert.throws(()=>new E({namedEntities:{x:''}}),TypeError);assert.throws(()=>new E({namedEntities:{x:42}}),TypeError);
});
test('independent longest-prefix encoder reference: 10,000 seeded strings',()=>{
 const map={a:'a',ab:'ab',abc:'abc',unicode:'雪',astral:'😀',long:'a雪😀z',overlap:'雪😀'},e=new E({namedEntities:map});
 const refs=Object.entries(map).map(([name,text],i)=>({text,entity:'&'+name+';',i})).sort((a,b)=>b.text.length-a.text.length||b.i-a.i),xml={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'};
 let seed=12345;const alphabet=['a','b','c','z','雪','😀','<','&',' '];
 for(let n=0;n<10000;n++){
  let text='';for(let i=0;i<n%40;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;text+=alphabet[(seed>>>8)%alphabet.length];}
  let expected='';for(let i=0;i<text.length;){if(Object.hasOwn(xml,text[i])){expected+=xml[text[i++]];continue;}const match=refs.find(r=>text.startsWith(r.text,i));if(match){expected+=match.entity;i+=match.text.length;}else expected+=text[i++];}
  assert.equal(e.encode(text),expected,text);
 }
});
test('CJS/ESM constructors and immutable data agree',async()=>{
 const esm=await import('../index.mjs');assert.equal(esm.EntityDecoder,D);assert.equal(esm.EntityEncoder,E);assert.deepEqual({...esm.ALL_ENTITIES},{...lib.ALL_ENTITIES});assert.equal(Object.isFrozen(esm.ALL_ENTITIES),true);
});

test('option getters are read once and throwing post-checks keep limits charged',()=>{
 const reads={};const once=(name,value)=>({get(){reads[name]=(reads[name]||0)+1;return value;},enumerable:true});
 const options={};Object.defineProperties(options,{limit:once('limit',{}),ncr:once('ncr',{}),namedEntities:once('named',{x:'X'})});assert.equal(new D(options).decode('&x;'),'X');assert.deepEqual(reads,{limit:1,ncr:1,named:1});
 const flags={};Object.defineProperties(flags,{encodeXmlSafe:once('xml',true),encodeAllNamed:once('all',false)});assert.equal(new E(flags).encode('<'),'&lt;');assert.equal(reads.xml,1);assert.equal(reads.all,1);
 const d=new D({limit:{maxTotalExpansions:1,applyLimitsTo:'all'},postCheck:()=>{throw Error('rejected output');}});assert.throws(()=>d.decode('&lt;'),/rejected output/);assert.throws(()=>d.decode('&lt;'),/count limit/);d.reset();assert.throws(()=>d.decode('&lt;'),/rejected output/);
});
