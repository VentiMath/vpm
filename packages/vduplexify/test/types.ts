import duplexify = require('vduplexify');
import {PassThrough, Readable, Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const child = new PassThrough();
const stream = duplexify(child, child, {highWaterMark:1024});
class Proxy extends duplexify {cancel() {this.destroy();}}
new Proxy(undefined, undefined, {objectMode:true, writable:false}).setReadable(Readable.from([1]));
duplexify.obj(child, child, Object.freeze({highWaterMark:2}));
stream.setWritable(new Writable({write(c,e,cb) {cb();}}));
stream.write('hello', 'utf8', error => {if (error) stream.destroy(error);});
stream.end('end'); stream.destroy(null, error => {const nil: null = error; void nil;});
child.pipe(stream).pipe(child);
void pipeline(Readable.from(['a']), duplexify(child,child), new Writable({write(c,e,cb) {cb();}}));
void (async () => {for await (const value of stream) void value;})();
// @ts-expect-error invalid stream
duplexify({});
// @ts-expect-error caller cannot override the adapter lifecycle
duplexify(undefined, undefined, {write() {}});
// @ts-expect-error highWaterMark must be numeric
duplexify.obj(undefined, undefined, {highWaterMark:'1'});
