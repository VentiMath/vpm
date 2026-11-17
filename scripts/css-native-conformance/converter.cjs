'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const own=require(process.env.VCSS_NATIVE_ENTRY||'../../packages/vcss-to-react-native'),upstream=require('css-to-react-native');
let assertions=0,tests=0;
function expect(actual){return {
 toEqual(expected){assert.deepEqual(actual,expected);assertions++},toBe(expected){assert.equal(actual,expected);assertions++},
 toThrow(message){assert.throws(actual,message?e=>e.message.includes(message):undefined);assertions++},
 toHaveBeenCalledWith(...args){assert(actual.calls.some(c=>require('node:util').isDeepStrictEqual(c,args)));assertions++},
 not:{toHaveBeenCalled(){assert.equal(actual.calls.length,0);assertions++}}
};}
const sandbox={transformCss:own.default,getStylesForProperty:own.getStylesForProperty,getPropertyName:own.getPropertyName,expect,
 it(name,fn){try{fn();tests++}catch(e){throw new Error(name,{cause:e})}},console,
 jest:{spyOn(target,key){const original=target[key];function spy(...a){spy.calls.push(a);return spy.impl(...a)}spy.calls=[];spy.impl=original;spy.mockImplementation=fn=>(spy.impl=fn,spy);spy.mockRestore=()=>{target[key]=original};target[key]=spy;return spy;}}};sandbox.global=sandbox;
// Evaluate the unmodified assertion bodies in this realm, so object prototypes
// are comparable; only their import declarations are replaced by the subject.
for(const file of fs.readdirSync(path.join(__dirname,'upstream-converter/src/__tests__')).filter(f=>f.endsWith('.js'))){
 const code=fs.readFileSync(path.join(__dirname,'upstream-converter/src/__tests__',file),'utf8').replace(/^import .* from ['"]\.\.['"]\r?\n/gm,'');
 new Function(...Object.keys(sandbox),code)(...Object.values(sandbox));
}
console.log(`${tests} unchanged converter tests / ${assertions} assertions pass`);
