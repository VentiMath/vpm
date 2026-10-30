import {Paginator, paginator, ResourceStream, type ParsedArguments, type PageRequest} from '../index.js';
import {Writable} from 'node:stream';
const request: PageRequest<{id:number}> = (_query, cb) => cb(null, [{id:1}], null, {status:200});
const options: ParsedArguments<{id:number}> = {query:{prefix:'a'},maxApiCalls:2,streamOptions:{signal:new AbortController().signal,highWaterMark:1}};
const stream = new ResourceStream(options,request);
stream.on('data',item=>{const id:number=item.id;void id;});
stream.pipe(new Writable({objectMode:true,write(_x,_e,cb){cb();}}));
async function collect(){for await(const item of stream){const id:number=item.id;void id;}}
paginator.runAsStream_(options,request);
const p=new Paginator();class C{list(_q:unknown,cb:Function){cb(null,[]);}}p.extend(C,['list']);
p.streamify<{id:number}>('list').call(new C());void collect;
// @ts-expect-error count must be numeric
const invalid: ParsedArguments={maxResults:'1'};void invalid;
// @ts-expect-error lifecycle hooks are not configurable
new ResourceStream({streamOptions:{read(){}}},request);
