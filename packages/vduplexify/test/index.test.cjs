'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {Duplex, PassThrough, Readable, Writable, Stream} = require('node:stream');
const {once} = require('node:events'), {pipeline} = require('node:stream/promises');
const duplexify = require('..');
const tick = () => new Promise(resolve => setImmediate(resolve));
const closed = stream => new Promise(resolve => stream.once('close', resolve));
const finish = stream => new Promise((resolve, reject) => stream.end(error => error ? reject(error) : resolve()));

test('factory, constructor and subclasses are native duplex streams', () => {
  class Proxy extends duplexify {}
  for (const stream of [duplexify(), new duplexify(), new Proxy()]) {assert(stream instanceof Duplex); assert(stream instanceof duplexify); stream.destroy();}
});
test('object factory preserves frozen options and explicit buffering', () => {
  const options = Object.freeze({highWaterMark:3});
  const stream = duplexify.obj(null, null, options);
  assert.equal(stream.readableHighWaterMark, 3); assert.equal(stream.writableHighWaterMark, 3);
  assert.equal(options.objectMode, undefined); stream.destroy();
});
test('byte defaults and directional watermarks preserve upstream backpressure', () => {
  const plain = duplexify(), configured = duplexify(null,null,{readableHighWaterMark:17,writableObjectMode:true});
  assert.equal(plain.readableHighWaterMark,16384); assert.equal(plain.writableHighWaterMark,16384);
  assert.equal(configured.readableHighWaterMark,17); assert.equal(configured.writableHighWaterMark,16);
  plain.destroy(); configured.destroy();
});
for (const value of [false, 0, '']) test('end preserves falsy object value ' + JSON.stringify(value), async () => {
  const sink = new PassThrough({objectMode:true}), stream = duplexify.obj(sink, sink);
  stream.end(value); const values = []; for await (const chunk of stream) values.push(chunk);
  assert.deepEqual(values, [value]);
});
test('empty end before first attachment waits for the sink', async () => {
  const stream = duplexify(null, null, {readable:false}); let ended = false;
  const done = finish(stream).then(() => {ended = true;}); await tick(); assert.equal(ended, false);
  stream.setWritable(new Writable({write(c,e,cb) {cb();}})); await done; assert.equal(ended, true);
});
test('buffered writes and end before attachment preserve order', async () => {
  const stream = duplexify.obj(); const values = [];
  stream.write(0); stream.write(false); stream.end('last');
  await tick(); const child = new PassThrough({objectMode:true}); stream.setWritable(child); stream.setReadable(child);
  for await (const value of stream) values.push(value);
  assert.deepEqual(values, [0,false,'last']);
});
test('nested cork gates writes and prefinish gates completion once', async () => {
  const received = [], sink = new Writable({write(c,e,cb) {received.push(String(c)); cb();}});
  const stream = duplexify(sink, null, {readable:false});
  stream.cork(); stream.cork(); stream.write('a'); stream.uncork(); assert.deepEqual(received, []);
  stream.uncork(); assert.deepEqual(received, ['a']);
  let count = 0, released = false;
  stream.on('prefinish', () => {count++; stream.cork(); setImmediate(() => {released = true; stream.uncork();});});
  await finish(stream); assert.equal(count, 1); assert.equal(released, true);
});
test('reattaching the same sink uncorks once without duplicating listeners', async () => {
  const sink = new Writable({write(c,e,cb) {cb();}}), stream = duplexify(sink,null,{readable:false});
  stream.cork(); stream.write('queued'); stream.setWritable(sink);
  assert.equal(sink.listenerCount('drain'),1); await finish(stream); stream.destroy();
});
test('backpressure blocks the next write until drain', async () => {
  const values = []; let release;
  const sink = new Writable({highWaterMark:1, write(c,e,cb) {values.push(String(c)); release = cb;}});
  const stream = duplexify(sink, null, {readable:false});
  let calls = 0; stream.write('a', () => calls++); stream.write('b', () => calls++);
  assert.deepEqual(values, ['a']); release(); await tick(); assert.deepEqual(values, ['a','b']);
  release(); await finish(stream); assert.equal(calls, 2);
});
for (const attached of [false, true]) test('destroy settles active and queued writes, attached=' + attached, async () => {
  const sink = new Writable({highWaterMark:1, write() {}}), stream = duplexify(attached ? sink : undefined);
  const errors = []; stream.on('error', error => errors.push(error));
  const callbacks = [new Promise(resolve => stream.write('a', resolve)), new Promise(resolve => stream.write('b', resolve)), new Promise(resolve => stream.end(resolve))];
  const done = closed(stream); stream.destroy(); await done;
  for (const error of await Promise.all(callbacks)) assert.equal(error.code, 'ERR_STREAM_DESTROYED');
  assert.deepEqual(errors, []); if (!attached) sink.destroy();
});
test('destroy settles a pending final callback', async () => {
  const stream = duplexify(); const callback = new Promise(resolve => stream.end(resolve));
  const done = closed(stream); stream.destroy(); await done;
  assert.equal((await callback).code, 'ERR_STREAM_DESTROYED');
});
test('first child error wins and close follows error', async () => {
  const read = new PassThrough(), write = new PassThrough(), stream = duplexify(write, read), events = [];
  stream.on('error', error => events.push(error.message)); stream.on('close', () => events.push('close'));
  const done = closed(stream); read.emit('error', new Error('first')); write.emit('error', new Error('second')); await done;
  assert.deepEqual(events, ['first','close']); assert(read.destroyed && write.destroyed);
});
test('premature close is an observable failure', async () => {
  const child = new PassThrough(), stream = duplexify(child, child), errors = [];
  stream.on('error', error => errors.push(error)); const done = closed(stream); child.destroy(); await done;
  assert.equal(errors.length, 1); assert.equal(errors[0].code, 'ERR_STREAM_PREMATURE_CLOSE');
});
test('already destroying children cannot emit an unhandled second error', async () => {
  const read = new PassThrough(), write = new PassThrough();
  read.destroy(new Error('first')); write.destroy(new Error('second'));
  const stream = duplexify(write,read), errors = [];
  stream.on('error',error=>errors.push(error.message)); await closed(stream);
  assert.deepEqual(errors,['first']); assert.equal(read.listenerCount('error'),0); assert.equal(write.listenerCount('error'),0);
});
test('replacing blocked writable releases queue without replaying accepted bytes', async () => {
  const old = [], current = [], a = new Writable({highWaterMark:1, write(c,e,cb) {old.push(String(c));}});
  const b = new Writable({write(c,e,cb) {current.push(String(c)); cb();}}), stream = duplexify(a, null, {readable:false});
  stream.write('a'); stream.write('b'); stream.setWritable(b); await finish(stream);
  assert.deepEqual(old, ['a']); assert.deepEqual(current, ['b']); assert.equal(a.listenerCount('drain'), 0); a.destroy();
});
test('readable replacement detaches listeners and stops forwarding old source', async () => {
  const a = new PassThrough({objectMode:true}), b = new PassThrough({objectMode:true}), stream = duplexify.obj(null,a,{writable:false});
  const values = []; stream.on('data', value => {values.push(value); if (value === 1) stream.setReadable(b);});
  const done = once(stream,'end'); a.write(1); await tick(); a.write(2); b.end(3); await done;
  assert.deepEqual(values,[1,3]); assert.equal(a.listenerCount('readable'), 0); assert.equal(a.listenerCount('error'),0); a.destroy();
});
test('invalid attachment is atomic', async () => {
  const child = new PassThrough(), stream = duplexify(child,child);
  assert.throws(() => stream.setWritable({}), TypeError); assert.throws(() => stream.setReadable(stream), TypeError);
  stream.end('intact'); let body = ''; for await (const chunk of stream) body += chunk; assert.equal(body,'intact');
});
test('null readable preserves buffered data before EOF', async () => {
  const source = new PassThrough(), stream = duplexify(null,source,{writable:false});
  stream.read(0); source.write('buffered'); await tick(); stream.setReadable(null);
  let body = ''; for await (const chunk of stream) body += chunk; assert.equal(body,'buffered');
  source.destroy();
});
test('already ended readable and finished writable complete', async () => {
  const readable = Readable.from(['done']); readable.resume(); await once(readable,'end');
  const sink = new Writable({write(c,e,cb) {cb();}}); await finish(sink);
  const stream = duplexify(sink,readable); const values = []; for await (const value of stream) values.push(value);
  assert.deepEqual(values,[]); assert(stream.writableEnded);
});
test('legacy readable streams are wrapped', async () => {
  const source = new Stream(); source.readable = true; source.pause = () => {}; source.resume = () => {};
  const stream = duplexify.obj(null,source,{writable:false}); const values = [];
  stream.on('data', value => values.push(value)); const done = once(stream,'end');
  source.emit('data',false); source.emit('data',0); source.emit('end'); await done; assert.deepEqual(values,[false,0]);
});
test('shared child is destroyed once and adapter listeners are removed', async () => {
  const child = new PassThrough(); let destroys = 0; const original = child.destroy;
  child.destroy = function(...args) {destroys++; return original.apply(this,args);};
  const stream = duplexify(child,child); const done = closed(stream); stream.destroy(); stream.destroy(); await done;
  assert.equal(destroys,1); for (const event of ['readable','drain','end','finish','error','close']) assert.equal(child.listenerCount(event),0,event);
});
test('destroy:false leaves current and later children owned by caller', async () => {
  const child = new PassThrough(), later = new PassThrough(), stream = duplexify(child,child,{destroy:false});
  const done = closed(stream); stream.destroy(); await done; stream.setWritable(later); stream.setReadable(later);
  assert(!child.destroyed && !later.destroyed); assert.equal(child.listenerCount('error'),0); child.destroy(); later.destroy();
});
test('end:false preserves sink and autoDestroy:false preserves adapter', async () => {
  const sink = new PassThrough(), stream = duplexify(sink,null,{readable:false,end:false,autoDestroy:false});
  await finish(stream); assert.equal(sink.writableEnded,false); assert.equal(stream.destroyed,false); stream.destroy();
});
test('finishing an upload does not destroy a sink awaiting its response', async () => {
  const sink = new PassThrough({autoDestroy:false}), stream = duplexify(sink,null,{readable:false});
  sink.resume(); await finish(stream);
  assert.equal(stream.destroyed,false); assert.equal(sink.destroyed,false); stream.destroy();
});
test('autoDestroy:false lets caller replace a failed child', async () => {
  const child = new PassThrough(), stream = duplexify(child,child,{autoDestroy:false});
  child.emit('error',new Error('recover')); assert.equal(stream.destroyed,false);
  const next = new PassThrough(); stream.setWritable(next); stream.setReadable(next); stream.end('ok');
  let body = ''; for await (const chunk of stream) body += chunk; assert.equal(body,'ok'); stream.destroy(); child.destroy();
});
test('destroy callback runs with emitClose:false and on repeated destroy', async () => {
  const stream = duplexify(null,null,{emitClose:false});
  assert.equal(await new Promise(resolve => stream.destroy(null,resolve)),null);
  assert.equal(await new Promise(resolve => stream.destroy(null,resolve)),null);
});
test('thrown sink errors settle writes once', async () => {
  const sink = new PassThrough(), expected = new Error('sync failure'); sink.write = () => {throw expected;};
  const stream = duplexify(sink); stream.on('error',()=>{}); const done = closed(stream);
  const error = new Promise(resolve => stream.write('x',resolve)); await done; assert.equal(await error,expected);
});
test('pipeline forwards exact bytes with bounded read buffering', async () => {
  const child = new PassThrough({highWaterMark:1024}), stream = duplexify(child,child,{highWaterMark:1024});
  const chunks = Array.from({length:128},(_,i)=>Buffer.alloc(512,i)), received = [];
  const consume = pipeline(stream,new Writable({highWaterMark:512,write(c,e,cb) {received.push(c); setImmediate(cb);}}));
  await pipeline(Readable.from(chunks),stream); await consume; assert.deepEqual(Buffer.concat(received),Buffer.concat(chunks));
});
test('validates options and protects lifecycle methods', () => {
  for (const options of [[],1,'x',{destroy:()=>{}},{read:()=>{}},{write:()=>{}},{end:0},{autoDestroy:'yes'}]) assert.throws(()=>duplexify(null,null,options),TypeError);
  assert.throws(()=>duplexify.obj(null,null,[]),TypeError);
});
