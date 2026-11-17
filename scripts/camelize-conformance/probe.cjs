"use strict";
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const upstream=require('./node_modules/camelize'),own=require(process.env.VCAMELIZE_ENTRY||'../../packages/vcamelize/index.cjs');
let count=0,seed=241;const alphabet='abcXYZ09_.- /é\n$';const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
const compare=input=>{assert.deepEqual(own(input),upstream(input));count++};
for(let i=0;i<4000;i++){let s='';for(let j=random(48);j>0;j--)s+=alphabet[random(alphabet.length)];compare(s);compare({[s]:[{nested_key:s},s]})}
for(const x of [null,undefined,NaN,Infinity,0,false,Symbol.for('probe'),new Date(0),/a/,new Number(2),new String('a_b'),new Uint8Array([1,2]),new Map([['a_b',2]]),new Set([1])])compare(x);
const caller=require.resolve('css-to-react-native'),baseline=require(caller).default;
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'vcamelize-caller-'));
const location=path.dirname(caller),ownPath=path.resolve(process.env.VCAMELIZE_ENTRY||path.join(__dirname,'../../packages/vcamelize/index.cjs'));
let replacement;
try {
 fs.cpSync(location,scratch+'/caller',{recursive:true});fs.mkdirSync(scratch+'/caller/node_modules/camelize',{recursive:true});
 for(const dep of ['css-color-keywords','postcss-value-parser'])fs.symlinkSync(path.dirname(require.resolve(dep+'/package.json')),scratch+'/caller/node_modules/'+dep,'dir');
 fs.writeFileSync(scratch+'/caller/node_modules/camelize/index.js','const own=require('+JSON.stringify(ownPath)+');module.exports=value=>{globalThis.__vpmCamelizeCalls=(globalThis.__vpmCamelizeCalls||0)+1;return own(value)};');
 replacement=require(scratch+'/caller').default;
const styles=[['background-color','red'],['font-size','16px'],['line-height','20px'],['padding','4px 8px'],['border-width','1px'],['border-color','#123456'],['margin-left','3px'],['flex-direction','column'],['align-items','center'],['opacity','0.5'],['font-weight','700'],['text-decoration-line','underline'],['transform','translateX(10px) scale(2)'],['border-radius','6px'],['box-shadow','0px 1px 2px black']];
for(const pair of styles){assert.deepEqual(replacement([pair]),baseline([pair]),pair.join(':'));count++}
assert.deepEqual(replacement(styles),baseline(styles));assert.ok(globalThis.__vpmCamelizeCalls>=styles.length,'real caller must invoke replacement');
console.log(count+' camelize differential cases and unchanged CSS converter checks pass ('+globalThis.__vpmCamelizeCalls+' caller invocations)');

}finally{delete globalThis.__vpmCamelizeCalls;fs.rmSync(scratch,{recursive:true,force:true})}
