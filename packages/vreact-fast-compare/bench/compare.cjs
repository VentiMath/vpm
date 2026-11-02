'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/fast-compare-conformance');
const cases=[
 {name:'small equal component props',values:()=>[{id:1,active:true,label:'Open'},{id:1,active:true,label:'Open'}],expected:true},
 {name:'changed nested form value',values:()=>[{values:{name:'John',rows:[1,2,3]}},{values:{name:'John',rows:[1,2,4]}}],expected:false},
 {name:'React children with owner cycles',values:()=>{const element=()=>{const x={$$typeof:Symbol.for('react.transitional.element'),type:'span',key:null,props:{children:'hello'},_owner:{}};x._owner.current=x;return x;};return [{children:[element(),element()]},{children:[element(),element()]}];},expected:true},
 {name:'Map values and typed bytes',values:()=>[new Map([['a',{data:new Uint8Array(64)}]]),new Map([['a',{data:new Uint8Array(64)}]])],expected:true},
].map(({name,values,expected})=>({name,make:directory=>{const equal=require(directory),[a,b]=values();return()=>equal(a,b);},validate:value=>assert.equal(value,expected)}));
require('../../../scripts/bench-process.cjs').run({root,upstream:path.join(fixture,'node_modules/react-fast-compare'),vpm:root,cases,files:['package.json','index.cjs','runtime.mjs','bench/compare.cjs','../../scripts/fast-compare-conformance/package-lock.json','../../scripts/fast-compare-conformance/node_modules/react-fast-compare'],validationOnly:process.argv.includes('--validate')}).catch(error=>{console.error(error);process.exitCode=1;});
