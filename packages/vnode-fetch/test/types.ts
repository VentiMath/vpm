import fetch, {Headers,Request,Response,FetchError} from '..';
import {Readable} from 'node:stream';
import {Agent} from 'node:http';
const request=new Request(new URL('http://example.test'),{method:'POST',body:Readable.from(['abc']),agent:new Agent(),signal:new AbortController().signal});
const headers=new Headers([['x','y']]);for(const [key,value]of headers){void [key,value];}
fetch(request).then(async r=>{const b:Uint8Array=await r.buffer();const s:string=await r.text();void [b,s];});
new Response(new Blob(['x'])).blob().then(b=>b.stream().on('data',()=>{}));new FetchError('x','system',{code:'EPIPE'});
// @ts-expect-error invalid redirect mode
fetch('http://example.test',{redirect:'sometimes'});
