'use strict';
const {test}=require('node:test');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
for(const mode of ['async','sync'])test('upstream '+mode+' lookup assertions',()=>{
  execFileSync(process.execPath,[path.join(__dirname,'upstream-runner.cjs'),mode],{encoding:'utf8',timeout:15000});
});
