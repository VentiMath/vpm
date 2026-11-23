'use strict';
const assert=require('node:assert/strict'),upstream=require('jsonfile'),vpm=require('../../packages/vjsonfile'),upUtils=require('jsonfile/utils'),utils=require('../../packages/vjsonfile/utils.cjs');
let count=0;
(async()=>{
  const values=[null,true,false,0,-1,1.5,'','é🦋\n\t',[1,null,{a:'b'}],{a:1,b:{c:[2,3]}},JSON.parse('{"__proto__":{"safe":true}}')];
  for(const value of values)for(const spaces of [undefined,0,2,'\t',12])for(const EOL of ['\n','\r\n',''])for(const finalEOL of [false,true]){
    const o={spaces,EOL,finalEOL};assert.equal(utils.stringify(value,o),upUtils.stringify(value,o));count++;
  }
  for(const value of values)for(const reviver of [undefined,(k,v)=>typeof v==='number'?v*2:v])for(const bom of ['', '\ufeff']){
    const text=bom+JSON.stringify(value),io={readFile(_f,_o,cb){cb(null,Buffer.from(text))},readFileSync(){return text}};
    const o={fs:io,reviver};assert.deepEqual(vpm.readFileSync('sample',o),upstream.readFileSync('sample',o));
    assert.deepEqual(await vpm.readFile('sample',o),await upstream.readFile('sample',o));count+=2;
  }
  for(const input of ['','{','[1,]','null true','\ufeff\ufeff1'])for(const throws of [undefined,true,false,0]){
    const io={readFile(_f,_o,cb){cb(null,input)},readFileSync(){return input}},o={fs:io,throws};
    const outcome=async(lib)=>{try{return {value:await lib.readFile('bad.json',o)}}catch(e){return {name:e.name,message:e.message}}};
    assert.deepEqual(await outcome(vpm),await outcome(upstream));count++;
  }
  // Prove the deliberate EOL correction instead of silently excluding it.
  assert.notEqual(utils.stringify({a:1},{spaces:2,EOL:'$&'}),upUtils.stringify({a:1},{spaces:2,EOL:'$&'}));
  assert.equal(utils.stringify({a:1},{spaces:2,EOL:'$&'}),'{$&  "a": 1$&}$&');
  console.log(`${count} jsonfile 6.2.1 differential cases pass; literal EOL difference checked separately.`);
})().catch(e=>{console.error(e);process.exitCode=1});
