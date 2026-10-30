'use strict';
const assert = require('node:assert/strict'), {PassThrough, Writable} = require('node:stream');
async function probe(lib) {
  const options = {highWaterMark:3}; const object = lib.obj(null,null,options);
  const result = {mutated:options.objectMode === true, watermark:object.writableHighWaterMark}; object.destroy();
  const child = new PassThrough({objectMode:true}), stream = lib.obj(child,child), values = [];
  stream.on('data',value=>values.push(value)); const ended = new Promise(resolve=>stream.on('end',resolve));
  stream.end(false); await ended; result.values = values; stream.destroy();
  const sink = new Writable({highWaterMark:1,write() {}}), pending = lib(sink);
  let settled = false; pending.write('blocked',()=>{settled=true;});
  const closed = new Promise(resolve=>pending.on('close',resolve)); pending.destroy(); await closed;
  await new Promise(resolve=>setImmediate(resolve)); result.settled = settled;
  return result;
}
(async()=>{
  assert.deepEqual(await probe(require('duplexify')),{mutated:true,watermark:16,values:[],settled:false});
  assert.deepEqual(await probe(require('../../packages/vduplexify')),{mutated:false,watermark:3,values:[false],settled:true});
  console.log('Published controls reproduced option mutation, ignored object watermark, dropped false end value and unsettled pending write; VPM checks pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});
