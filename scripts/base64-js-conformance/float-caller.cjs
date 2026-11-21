'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const modules = path.join(__dirname, 'node_modules');
const fixture = fs.mkdtempSync(path.join(modules, '.float-'));
try {
  const deps = path.join(fixture, 'node_modules');
  fs.mkdirSync(deps);
  fs.cpSync(path.join(modules,'buffer'), path.join(deps,'buffer'), {recursive:true});
  const codec = process.env.VIEEE754_PACKAGE || path.resolve(__dirname,'../../packages/vieee754');
  fs.symlinkSync(codec,path.join(deps,'ieee754'));
  const caller = createRequire(path.join(deps,'buffer','index.js'));
  assert.equal(fs.realpathSync(caller.resolve('ieee754')),require.resolve(codec));
  const BufferImpl = caller('./index.js').Buffer, Control = require('buffer/').Buffer;
  for (const kind of ['Float','Double']) for (const order of ['LE','BE']) {
    const write = 'write'+kind+order, read = 'read'+kind+order;
    for (const value of [NaN,0,-0,Infinity,-Infinity,1+2**-24,2**-150,Math.PI,Number.MIN_VALUE]) {
      const actual = BufferImpl.alloc(13,0xad), expected = Control.alloc(13,0xad);
      assert.equal(actual.writeUInt8(93,0),expected.writeUInt8(93,0));
      assert.equal(actual[write](value,2),expected[write](value,2));
      assert.deepEqual([...actual],[...expected]);
      assert.ok(Object.is(actual[read](2),expected[read](2)));
    }
  }
  console.log('All eight unchanged browser Buffer float/double methods match their control.');
} finally { fs.rmSync(fixture,{recursive:true,force:true}); }
