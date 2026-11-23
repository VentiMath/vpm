"use strict";
const fs=require('node:fs'),vm=require('node:vm'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const own=require(process.env.VPM_SHEBANG_ENTRY||'../../packages/vshebang-regex');
function load(file,replacements){const module={exports:{}},req=createRequire(file);vm.runInThisContext('(function(require,module,exports){'+fs.readFileSync(file,'utf8')+'\n})',{filename:file})(name=>Object.hasOwn(replacements,name)?replacements[name]:req(name),module,module.exports);return module.exports}
(async()=>{const controls=[(await import('shebang-regex')).default,require('shebang-regex-app')];const inputs=['','#!','#!/bin/sh','#! /bin/bash -e','#!/usr/bin/env node','#!/usr/bin/env -S node --version','text\n#!/bin/sh','\ufeff#!/bin/sh','#!/bin/sh\r\ncode','#!/bin/sh\u2028ignored','#!'+('x'.repeat(200))];
 const command=file=>load(require.resolve('shebang-command'),{'shebang-regex':file});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-shebang-callers-'));let count=0;
 try{for(const regex of controls){const actual=command(own),expected=command(regex),readActual=load(require.resolve('cross-spawn/lib/util/readShebang'),{'shebang-command':actual}),readExpected=load(require.resolve('cross-spawn/lib/util/readShebang'),{'shebang-command':expected});
 for(const text of inputs){assert.equal(actual(text),expected(text));const file=dir+'/script';fs.writeFileSync(file,text);assert.equal(readActual(file),readExpected(file));count++}assert.equal(readActual(dir+'/missing'),readExpected(dir+'/missing'));}
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
 console.log(count+' unchanged shebang-command and cross-spawn file-reader comparisons pass; no commands executed.');
})().catch(e=>{console.error(e);process.exitCode=1});
