import streamEvents = require('vstream-events');
import {PassThrough, Readable, Writable} from 'node:stream';
const passthrough: PassThrough = streamEvents(new PassThrough());
const readable: Readable = streamEvents(new Readable({read() {}}));
const writable: Writable = streamEvents(new Writable({write(_chunk, _encoding, done) {done();}}));
class Example extends PassThrough { constructor() { super(); streamEvents.call(this); } }
void [passthrough, readable, writable, Example];
const result = streamEvents({emit() {return false;}, _read() {return 42;}, custom: 'value'});
const custom: string = result.custom;
void custom;
// @ts-expect-error a primitive is not a stream
streamEvents(1);
// @ts-expect-error emit must be callable
streamEvents({_read() {}, emit: 1});
