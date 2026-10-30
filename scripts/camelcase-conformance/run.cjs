'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const upstream=require('./node_modules/lodash.camelcase'),vpm=require('../../packages/vlodash.camelcase');
const provenance=require('../../packages/vlodash.camelcase/PROVENANCE.json');
assert.equal(require('./node_modules/lodash.camelcase/package.json').version,'4.3.0');
assert.equal(createHash('sha256').update(fs.readFileSync(require.resolve('./node_modules/lodash.camelcase'))).digest('hex'),provenance.upstream.indexSha256);
const snapshot=fs.readFileSync(path.join(__dirname,'upstream/camelcase.tests.js.txt'),'utf8');
assert.equal(createHash('sha256').update(snapshot).digest('hex'),require('./upstream/SOURCE.json').sectionSha256);
for(const [label,camelCase]of [['upstream',upstream],['vpm',vpm]]) {
 let tests=0,assertions=0;
 const QUnit={module(){},test(name,fn){let actual=0,expected;fn({expect(n){expected=n;},strictEqual(a,b){assert.equal(a,b,name);actual++;}});assert.equal(actual,expected);tests++;assertions+=actual;}};
 new Function('QUnit','_','lodashStable',snapshot)(QUnit,{camelCase},{each:(values,fn)=>values.forEach(fn)});
 assert.equal(tests,2);assert.equal(assertions,12);console.log(`${label}: two unchanged canonical camelCase tests, twelve assertions.`);
}
let comparisons=0;
function check(text){assert.equal(vpm(text),upstream(text),JSON.stringify(text));comparisons++;}
// Exhaust every ASCII transition in short mixed words, including apostrophes.
const alphabet=['a','b','A','B','0','1','_', '-',"'",' '];
function all(prefix,remaining){check(prefix);if(remaining)for(const ch of alphabet)all(prefix+ch,remaining-1);}
all('',5);
for(let code=0;code<65536;code++){const ch=String.fromCharCode(code);check(ch);check('A'+ch+'b');check('foo '+ch+'bar');}
let seed=0x56cafe;function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;}
const tokens=['XML','http','Foo','BAR','24','th','_','-',' ',"'",'’','é','æ','ß','ſ','İ','Σ','Ж','漢','\u0301','\ufe0f','\u200d','👩','🦄','🇺🇸','𝔘','𐐀','\ud800','\udfff'];
for(let i=0;i<30000;i++){let text='';for(let n=random()%20;n;n--)text+=tokens[random()%tokens.length];check(text);}
for(let i=0;i<10000;i++){const ch=String.fromCodePoint(0x10000+random()%0x100000);check('foo '+ch+'BAR');}
for(const value of [undefined,null,0,-0,1,-1,NaN,Infinity,true,false,[],[1,'FOO',null],Object('Foo BAR'),Object(2),Symbol('Foo BAR'),Object(Symbol('Foo BAR'))])check(value);
console.log(`${comparisons} exact 4.3.0 differential comparisons passed; exhaustive BMP, ASCII boundaries, seeded Unicode/astral sequences and ordinary coercions.`);
for(const input of [0n,Object(0n)]){assert.throws(()=>upstream(input),TypeError);assert.equal(vpm(input),'0');}
for(const target of [upstream,vpm]){let calls=0;const value={valueOf(){calls++;return 0;}};assert.equal(target(value),'0');assert.equal(calls,target===upstream?2:1);}
const spoof={ [Symbol.toStringTag]:'Symbol',toString(){return 'Foo Bar';}};
assert.throws(()=>upstream(spoof),TypeError);assert.equal(vpm(spoof),'fooBar');
console.log('Upstream controls reproduce zero-BigInt rejection, duplicate zero coercion and spoofed Symbol brands; VPM fixes all three.');
