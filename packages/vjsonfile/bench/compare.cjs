'use strict';
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),upstream=path.resolve(__dirname,'../../../scripts/jsonfile-conformance/node_modules/jsonfile');
const value={appId:'org.ventimath.example',webDir:'dist',plugins:{Keyboard:{resize:'body'}},packageClassList:['FilesystemPlugin','KeyboardPlugin']},compact=JSON.stringify(value)+'\n';
const cases=[];
for(const [name,options] of [['compact formatting',{}],['tab-indented config formatting',{spaces:'\t'}],['CRLF config formatting',{spaces:2,EOL:'\r\n'}]]){
  const expected=JSON.stringify(value,null,options.spaces).split('\n').join(options.EOL||'\n')+(options.EOL||'\n');
  cases.push({name,make(file){const {stringify}=require(path.join(file,file===root?'utils.cjs':'utils.js'));return()=>stringify(value,options)},validate:result=>assert.equal(result,expected)});
}
const memory={readFile(_file,_options,cb){cb(null,compact)},readFileSync(){return compact}};
cases.push({name:'sync parse through memory filesystem',make(file){const lib=require(file);return()=>lib.readFileSync('config',{fs:memory})},validate:v=>assert.deepEqual(v,value)});
cases.push({name:'Promise parse through memory filesystem',async:true,make(file){const lib=require(file);return()=>lib.readFile('config',{fs:memory})},validate:v=>assert.deepEqual(v,value)});
cases.push({name:'Promise write through memory filesystem',async:true,make(file){const lib=require(file);let written;const io={writeFile(_f,text,_o,cb){written=text;cb(null)}};return async()=>{await lib.writeFile('config',value,{fs:io,spaces:'\t'});return written}},validate:v=>assert.equal(v,JSON.stringify(value,null,'\t')+'\n')});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vjsonfile-bench-')),filename=path.join(tmp,'config.json');fs.writeFileSync(filename,compact);
cases.push({name:'sync native config read',make(file){const lib=require(file);return()=>lib.readFileSync(filename)},validate:v=>assert.deepEqual(v,value)});
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','utils.cjs','bench/compare.cjs','../../scripts/jsonfile-conformance/package-lock.json'],cleanup(){fs.rmSync(tmp,{recursive:true,force:true})}}).catch(e=>{console.error(e);process.exitCode=1});
