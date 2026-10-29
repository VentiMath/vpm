import {Gaxios,GaxiosError,request,type GaxiosOptions,type GaxiosResponse} from '..';
import {Readable} from 'node:stream';
import {Agent} from 'node:http';
const c=new Gaxios({baseURL:new URL('http://example.test'),agent:new Agent(),retryConfig:{retry:2}});
const options:GaxiosOptions={url:'/path',method:'POST',data:Readable.from(['x']),signal:new AbortController().signal};
c.request<{value:number}>(options).then(r=>{const n:number=r.data.value;void n;});
c.interceptors.request.add({resolved:async o=>o});c.interceptors.response.add({resolved:r=>r});c.destroy();
// Check the client response directly: the historical upstream platform fixture
// omits native Response.bytes(), which vundici-types deliberately corrects.
c.request<string>(options).then((response:GaxiosResponse<string>)=>{
  new GaxiosError('x',options,response);
  const bytes:Promise<Uint8Array>=response.bytes();
  response.config.url.searchParams.get('q');
  void bytes;
});
void request;
declare global { namespace fetch { function preconnect(url: string | URL): void; } }
const custom:GaxiosOptions['fetchImplementation']=(...args)=>c.fetch(...args);
const native:GaxiosOptions['fetchImplementation']=fetch;
void custom;void native;
c.fetch(new Request('http://example.test')).then(r=>r.headers.get('content-type'));
Gaxios.mergeHeaders(new Headers(), [['a','b']]);
