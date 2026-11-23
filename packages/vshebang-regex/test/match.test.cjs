"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const own=require(process.env.VPM_SHEBANG_ENTRY||'../index.cjs');
const fixture=path.resolve(__dirname,'../../../scripts/shebang-regex-conformance/node_modules');
test('current and application match arrays agree for 8192 generated scripts',async()=>{
 const controls=[(await import(fixture+'/shebang-regex/index.js')).default,require(fixture+'/shebang-regex-app')];
 const prefixes=['#!','#! ',' #!','\ufeff#!','x\n#!','','#','!#'];const chars=['a','/',' ','\t','\0','\r','\n','\u2028','\u2029','😀','\ud800','-','!','#'];let seed=42;
 for(let n=0;n<8192;n++){let text=prefixes[n%prefixes.length];for(let i=0;i<n%53;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;text+=chars[seed%chars.length]}for(const control of controls){assert.deepEqual(own.exec(text),control.exec(text));assert.equal(own.test(text),control.test(text));assert.deepEqual(text.match(own),text.match(control))}}
});
test('first line, empty body, every line terminator and no stateful flags',()=>{
 assert.equal(own.flags,'');for(const end of ['\r','\n','\u2028','\u2029'])assert.deepEqual([...own.exec('#!/bin/sh'+end+'bad')],['#!/bin/sh','/bin/sh']);
 assert.deepEqual([...own.exec('#!')],['#!','']);assert.equal(own.exec('first\n#!/bin/sh'),null);
 own.lastIndex=42;assert.equal(own.exec('#!/bin/sh').index,0);assert.equal(own.lastIndex,42);own.lastIndex=0;
 assert.equal(own.exec('#!/usr/bin/env node\ncode')[1],'/usr/bin/env node');
});
test('long lines remain untruncated and shared import identity is preserved',async()=>{
 const text='#!'+('x'.repeat(262144));assert.equal(own.exec(text)[1].length,262144);
 const entry=process.env.VPM_SHEBANG_ENTRY||require.resolve('../index.cjs');assert.equal((await import(require('node:url').pathToFileURL(path.join(path.dirname(entry),'index.mjs')))).default,own);
});
