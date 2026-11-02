'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {shallowEqual,shallowEqualArrays,shallowEqualObjects}=require('..');
test('strict values, sparse indices and reference semantics',()=>{assert(shallowEqualArrays([0],[-0]));assert(!shallowEqualArrays([NaN],[NaN]));assert(shallowEqualArrays([,],[undefined]));const value={};assert(shallowEqualArrays([value],[value]));assert(!shallowEqualArrays([{}],[{}]));assert(shallowEqual(null,null));assert(!shallowEqual({},[]));});
test('keys are own data, including constructor and prototype names',()=>{assert(shallowEqualObjects(Object.assign(Object.create(null),{constructor:1}),{constructor:1}));assert(shallowEqualObjects(JSON.parse('{"__proto__":1}'),JSON.parse('{"__proto__":1}')));assert(!shallowEqualObjects({a:undefined},{b:undefined}));});
test('mismatched keys do not execute inherited getters',()=>{let reads=0;const right=Object.create({get a(){reads++;throw Error('inherited')}});right.b=1;assert.equal(shallowEqualObjects({a:1},right),false);assert.equal(reads,0);});
test('out-of-domain scalar and fake-array values cannot silently compare equal',()=>{assert.equal(shallowEqual(1,2),false);assert.equal(shallowEqualArrays({length:0},{length:0}),false);assert.equal(shallowEqualArrays('ab',['a','b']),false);});
test('symbols and nonenumerable fields keep the upstream exclusion',()=>{const a={x:1},b={x:1};a[Symbol()]=2;Object.defineProperty(b,'hidden',{value:3});assert(shallowEqualObjects(a,b));});
