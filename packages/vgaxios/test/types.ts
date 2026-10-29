import {Gaxios,GaxiosError,request,type GaxiosOptions,type GaxiosResponse} from '..';
import {Readable} from 'node:stream';
import {Agent} from 'node:http';
const c=new Gaxios({baseURL:new URL('http://example.test'),agent:new Agent(),retryConfig:{retry:2}});
const options:GaxiosOptions={url:'/path',method:'POST',data:Readable.from(['x']),signal:new AbortController().signal};
c.request<{value:number}>(options).then(r=>{const n:number=r.data.value;void n;});
c.interceptors.request.add({resolved:async o=>o});c.interceptors.response.add({resolved:r=>r});c.destroy();
const prepared = {...options, url:new URL('http://example.test'), headers:new Headers()};
const response:GaxiosResponse<string>=Object.assign(new Response('x'),{config:prepared,data:'x'});
new GaxiosError('x',options,response);void request;
declare global { namespace fetch { function preconnect(url: string | URL): void; } }
const custom:GaxiosOptions['fetchImplementation']=(...args)=>c.fetch(...args);
const native:GaxiosOptions['fetchImplementation']=fetch;
void custom;void native;
c.fetch(new Request('http://example.test')).then(r=>r.headers.get('content-type'));
Gaxios.mergeHeaders(new Headers(), [['a','b']]);
