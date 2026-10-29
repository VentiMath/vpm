import {Gaxios,GaxiosError,request,type GaxiosOptions,type GaxiosResponse} from '..';
import {Readable} from 'node:stream';
import {Agent} from 'node:http';
const c=new Gaxios({baseURL:new URL('http://example.test'),agent:new Agent(),retryConfig:{retry:2}});
const options:GaxiosOptions={url:'/path',method:'POST',data:Readable.from(['x']),signal:new AbortController().signal};
c.request<{value:number}>(options).then(r=>{const n:number=r.data.value;void n;});
c.interceptors.request.add({resolved:async o=>o});c.interceptors.response.add({resolved:r=>r});c.destroy();
const response:GaxiosResponse<string>={config:options,data:'x',status:200,statusText:'OK',headers:{},request:{responseURL:'http://example.test'}};new GaxiosError('x',options,response);void request;
