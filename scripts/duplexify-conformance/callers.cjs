'use strict';
const assert = require('node:assert/strict'), {createRequire} = require('node:module');
const {PassThrough, Writable} = require('node:stream'), {once} = require('node:events');
const fixture = createRequire(require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'));
module.exports = async function checkCallers(library = require('../../packages/vduplexify')) {
  const entry = fixture.resolve('duplexify'), previous = require(entry), gax = require.resolve('../retry-request-conformance/node_modules/google-gax/build/src/streamingCalls/streaming.js');
  const previousGax = require.cache[gax]; delete require.cache[gax];
  const retryEntry = fixture.resolve('retry-request'), previousRetry = require(retryEntry), retry = require('../../packages/vretry-request');
  let uses = 0;
  function counted(...args) {uses++; return library.apply(this,args);}
  counted.prototype = library.prototype; Object.setPrototypeOf(counted,library);
  require.cache[entry].exports = counted; require.cache[retryEntry].exports = retry;
  const previousDelay = retry.defaults.maxRetryDelay; retry.defaults.maxRetryDelay = 0.001;
  try {
    await require('../teeny-conformance/callers.cjs')(); // Actual Storage callback/download/multipart implementation.
    const {StreamProxy,StreamType} = require(gax);
    let attempts = 0, resends = 0;
    const server = new StreamProxy(StreamType.SERVER_STREAMING,()=>{},false,false); server.recordResend = () => resends++;
    server.setStream(() => {
      const source = new PassThrough({objectMode:true}); source.cancel = () => source.destroy(); const attempt = ++attempts;
      setImmediate(() => {if (attempt === 1) source.emit('error',Object.assign(new Error('retry'),{code:14})); else {source.emit('response',{statusCode:200}); source.end({ok:true});}});
      return source;
    },{},{noResponseRetries:1,retries:1});
    const values = []; for await (const value of server) values.push(value);
    assert.deepEqual(values,[{ok:true}]); assert.equal(attempts,2); assert.equal(resends,1);

    const received = [], client = new StreamProxy(StreamType.CLIENT_STREAMING,()=>{},false,false);
    client.write({first:true}); client.end({last:true});
    const finished = once(client,'finish');
    client.setStream(() => {const sink = new Writable({objectMode:true,write(value,e,cb) {received.push(value); cb();}}); sink.cancel = () => sink.destroy(); return sink;},{});
    await finished; assert.deepEqual(received,[{first:true},{last:true}]);
    const bidi = new StreamProxy(StreamType.BIDI_STREAMING,()=>{},false,false), source = new PassThrough({objectMode:true}); source.cancel = () => source.destroy();
    bidi.setStream(()=>source,{}); bidi.end({echo:true}); const echoes = []; for await (const value of bidi) echoes.push(value); assert.deepEqual(echoes,[{echo:true}]);
    let cancelled = 0;
    const cancel = new StreamProxy(StreamType.BIDI_STREAMING,()=>{},false,false); cancel.on('error',()=>{}); cancel.cancel();
    const cancellation = new Promise(resolve => cancel.once('close',resolve));
    cancel.setStream(()=>{const s = new PassThrough({objectMode:true}); s.cancel=()=>{cancelled++; s.destroy();}; return s;},{});
    await cancellation; assert.equal(cancelled,1);
    assert.equal(uses,6); // Two Storage wrappers plus four subclass instances.
    console.log('duplexify callers: Storage 8.4.0 download/upload; google-gax 6.14.0 server retry, delayed client writes, bidirectional data and cancellation; 6 adapter instances verified.');
  } finally {
    retry.defaults.maxRetryDelay = previousDelay;
    require.cache[entry].exports = previous; require.cache[retryEntry].exports = previousRetry;
    if (previousGax) require.cache[gax] = previousGax; else delete require.cache[gax];
  }
};
if (require.main === module) module.exports(process.argv.includes('--upstream') ? fixture('duplexify') : undefined).catch(error=>{console.error(error); process.exitCode=1;});
