'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const codec = require('..');
const upstream = require('../../../scripts/base64-js-conformance/node_modules/ieee754');
const formats = [[23,4],[52,8],[10,2],[7,2],[3,1]];
function encoded(api, value, little, fraction, size) {
  const backing = new Uint8Array(size + 5).fill(197);
  api.write(backing.subarray(2), value, 1, little, fraction, size);
  return backing;
}
test('wire bytes match on signed zero, NaNs, limits, subnormals and halfway values', () => {
  const values = [0,-0,NaN,-NaN,Infinity,-Infinity,1/3,Math.PI,Number.MAX_VALUE,Number.MIN_VALUE,2**-1022,65519,65520];
  for (let p = -149; p <= 127; p++) {
    const step = 2 ** Math.max(-149,p-23);
    for (const n of [0,0.25,0.5,0.75,1,1.5]) values.push(2**p+step*n, -(2**p+step*n));
  }
  values.push(2**-150,-(2**-150),2**128-2**103);
  for (const [fraction,size] of formats) for (const little of [true,false]) for (const value of values)
    assert.deepEqual(encoded(codec,value,little,fraction,size),encoded(upstream,value,little,fraction,size),
      [value,little,fraction,size].join('/'));
});
test('decode raw float and double words and every binary16 and bfloat16 pattern', () => {
  const bytes = new Uint8Array(8);
  let seed = 3769;
  for (let i=0; i<65536; i++) {
    bytes[0] = i >>> 8; bytes[1] = i & 255;
    for (let p=2; p<8; p++) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; bytes[p]=seed>>>24; }
    for (const [fraction,size] of formats) for (const le of [true,false]) {
      const actual = codec.read(bytes,0,le,fraction,size);
      assert.ok(Object.is(actual,upstream.read(bytes,0,le,fraction,size)));
    }
    const value = upstream.read(bytes,0,true,52,8);
    assert.deepEqual(encoded(codec,value,false,23,4),encoded(upstream,value,false,23,4));
  }
});
test('bounds, reversed endian and array views', () => {
  const bytes = [1,2,3,4];
  codec.write(bytes,-0,0,false,23,4);
  assert.deepEqual(bytes,[128,0,0,0]);
  assert.ok(Object.is(codec.read(bytes,0,false,23,4),-0));
  for (const args of [[1,23,4],[-1,23,4],[0,30,4],[0,23,3],[0.5,23,4]]) {
    const [offset,fraction,size]=args;
    assert.throws(()=>codec.write(bytes,4,offset,false,fraction,size),RangeError);
    assert.deepEqual(bytes,[128,0,0,0]);
  }
});
