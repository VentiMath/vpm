'use strict';
const assert=require('node:assert/strict'),upstream=require('html-entities'),vpm=require('../../packages/vhtml-entities');
for(const [input,oldValue,newValue]of [['&#x10ffff;','�',String.fromCodePoint(0x10ffff)],['&#xd800;','\ud800','�'],['&#x;','\0','&#x;'],['&#65junk;','A','&#65junk;'],['&#65;\n','A','&#65;\n']]){assert.equal(upstream.decodeEntity(input),oldValue);assert.equal(vpm.decodeEntity(input),newValue);}
assert.equal(typeof upstream.decodeEntity('constructor'),'function');assert.equal(vpm.decodeEntity('constructor'),'constructor');
assert.equal(upstream.decode('&#65=',{scope:'attribute'}),'&#65=');assert.equal(vpm.decode('&#65=',{scope:'attribute'}),'A=');
assert.equal(upstream.encode(0),'');assert.equal(vpm.encode(0),'0');
console.log('Upstream controls reproduce scalar-boundary, surrogate, malformed-numeric, inherited-lookup, attribute-equals and numeric-zero bugs; VPM fixes pass.');
