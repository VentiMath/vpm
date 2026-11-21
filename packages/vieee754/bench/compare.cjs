'use strict';
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const upstream = require.resolve('../../../scripts/base64-js-conformance/node_modules/ieee754');
const values = [Math.PI,-1/3,8,1+2**-24,2**-149,-0,0.1,123.25];
const cases = [];
for (const [fraction,size] of [[23,4],[52,8]]) {
  const reference = new Uint8Array(8*size);
  values.forEach((v,i) => require(upstream).write(reference,v,i*size,Boolean(i%2),fraction,size));
  cases.push({
    name:'read eight binary'+(size*8)+' values',
    make(file) {
      const {read}=require(file);
      return () => {
        let total=0;
        for(let i=0;i<8;i++) total+=read(reference,i*size,Boolean(i%2),fraction,size);
        return total;
      };
    },
    validate(value) {
      const view=new DataView(reference.buffer);
      const method=size===4?'getFloat32':'getFloat64';
      assert.equal(value,values.reduce((sum,_,i)=>sum+view[method](i*size,Boolean(i%2)),0));
    }
  },{
    name:'write eight binary'+(size*8)+' values',
    make(file) {
      const {write}=require(file), bytes=new Uint8Array(reference.length);
      return () => {
        for(let i=0;i<8;i++) write(bytes,values[i],i*size,Boolean(i%2),fraction,size);
        return bytes;
      };
    },
    validate(value) { assert.deepEqual(value,reference); }
  });
}
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,
  files:['index.cjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/base64-js-conformance/package-lock.json']
}).catch(e=>{console.error(e);process.exitCode=1;});
