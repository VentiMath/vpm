import isStream from 'vis-stream';
import {PassThrough} from 'node:stream';
const stream=new PassThrough();isStream(stream);isStream.readable(stream);isStream.duplex(stream);
declare const value:unknown;
if(isStream.readable(value)){value.pipe(stream);const state:object=value._readableState;void state;}
// @ts-expect-error unknown is not a stream until narrowed
value.pipe(stream);
