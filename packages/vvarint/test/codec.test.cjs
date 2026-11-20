'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const api = require('..');
const upstream = require('../../../scripts/varint-conformance/node_modules/varint');

test('safe integers, offsets, output identity and byte counts agree with varint', () => {
  const values = [0, Number.MAX_SAFE_INTEGER];
  for (let k = 0; k <= 52; k++) values.push(2 ** k - 1, 2 ** k, 2 ** k + 1);
  let seed = 721;
  const random = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  for (let i=0; i<4096; i++) values.push((random() & 0x1fffff) * 2**32 + random());
  for (const value of values) {
    const reference = upstream.encode(value);
    assert.deepEqual(api.encode(value), reference);
    assert.equal(api.encodingLength(value), reference.length);
    const target = new Uint8Array(12).fill(0x5a);
    assert.equal(api.encode(value, target, 2), target);
    assert.equal(api.encode.bytes, reference.length);
    assert.deepEqual([...target.slice(2, 2+reference.length)], reference);
    assert.equal(target[1], 0x5a); assert.equal(target[2+reference.length], 0x5a);
    assert.equal(api.decode(target, 2), upstream.decode(target, 2));
    assert.equal(api.decode.bytes, reference.length);
  }
});
test('invalid, incomplete and overflowing data never report a successful byte count', () => {
  for (const input of [[], [128], [256], [-1], [1.5], [NaN], [undefined], [...Array(7).fill(255),16], Array(9).fill(128)]) {
    api.decode([0]); assert.throws(()=>api.decode(input), RangeError); assert.equal(api.decode.bytes,0);
  }
  assert.equal(api.decode([128,0]),0);
  for (const value of [-1,NaN,1.5,Infinity,2**53]) {
    assert.throws(()=>api.encode(value), RangeError); assert.throws(()=>api.encodingLength(value), RangeError);
  }
  for (const offset of [-1,1.5,Number.MAX_SAFE_INTEGER]) {
    assert.throws(()=>api.encode(5,[],offset), RangeError); assert.throws(()=>api.decode([0],offset), RangeError);
  }
  const short=Buffer.from([99]); assert.throws(()=>api.encode(128,short)); assert.deepEqual([...short],[99]);
  assert.equal(api.encode.bytes,0); assert.equal(api.decode(Buffer.from([0xac,2])),300);
});

test('accepts another realm’s Uint8Array and rejects mislabeled views', () => {
  const input=require('node:vm').runInNewContext('new Uint8Array([172,2])');
  assert.equal(api.decode(input),300);
  const wrong=new Int16Array([300]);
  Object.defineProperty(wrong,Symbol.toStringTag,{value:'Uint8Array'});
  assert.throws(()=>api.decode(wrong), TypeError);
});
