'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const probes={
 'reject malformed decimal suffix':L=>assert.throws(()=>L.fromString('123junk')),
 'reject malformed interior chunk':L=>assert.throws(()=>L.fromString('12345678x2345678')),
 'reject fractional radix':L=>assert.throws(()=>L.fromString('12',false,10.5)),
 'reject truncated byte representation':L=>assert.throws(()=>L.fromBytes([1])),
 'reject out-of-range byte':L=>assert.throws(()=>L.fromBytes([256,0,0,0,0,0,0,0])),
 'isolate small integer results':L=>{L.fromInt(7).low=99;assert.equal(L.fromInt(7).low,7);},
 'protect shared constants':L=>{assert.throws(()=>{L.ZERO.low=1;});assert.equal(L.ZERO.low,0);},
};
function fresh(file){const context={module:{exports:{}},exports:{}};context.exports=context.module.exports;vm.runInNewContext(fs.readFileSync(file,'utf8'),context);return context.module.exports;}
function run(){for(const[name,probe]of Object.entries(probes)){assert.throws(()=>probe(fresh(require.resolve('./node_modules/long'))),assert.AssertionError,name+' upstream control');probe(fresh(require.resolve('../../packages/vlong')));}console.log(Object.keys(probes).length+' paired long corrections verified.');}
module.exports={probes,run};if(require.main===module)run();
