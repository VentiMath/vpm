'use strict';
const assert=require('node:assert/strict'),own=require('../../packages/vjs-cookie'),current=require('js-cookie'),app=require('js-cookie-app');
const original=Object.getOwnPropertyDescriptor(globalThis,'document');let cookie='';Object.defineProperty(globalThis,'document',{configurable:true,value:{get cookie(){return cookie},set cookie(v){cookie=v}}});
try{
 let count=0;
 for(const control of [current,app])for(const name of ['token','name space','a=b','a;b','a%b','math/contest','é','😀'])for(const value of ['session','a=b+c','; &,[]"','日本語','50% complete',''])for(const attrs of [{},{path:'/app',secure:true,sameSite:'lax'},{expires:new Date('2030-01-01Z'),domain:'.example.test'},{path:'/x;extra',partitioned:true}]){
  const expected=control.set(name,value,attrs),actual=own.set(name,value,attrs);assert.equal(actual,expected);cookie=actual.split(';',1)[0];assert.equal(own.get(name),control.get(name));count++;
 }
 for(const raw of ['x=hello%20world; y=one=two','a=%ZZ; b=ok','a=%E0%A4%A; b=ok','a="hello%20world"','a=x; a=y','a=%41%ZZ','a=%E2%82%AC%20x']){cookie=raw;assert.deepEqual(own.get(),current.get());count++;}
 for(const control of [current,app])for(let code=0;code<256;code++){const c=String.fromCharCode(code);assert.equal(own.set(c,c),control.set(c,c),'byte '+code);count++;}
 console.log(count+' current/app cookie encoding and decoding comparisons pass');
}finally{if(original)Object.defineProperty(globalThis,'document',original);else delete globalThis.document;}
