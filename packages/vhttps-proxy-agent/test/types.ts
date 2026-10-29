import {HttpsProxyAgent,type HttpsProxyAgentOptions,type ProxyConnectResponse} from 'vhttps-proxy-agent';
import * as http from 'node:http';
const options:HttpsProxyAgentOptions<'https://proxy.test'>={keepAlive:true,maxProxyHeaderSize:16384,connectTimeout:2000,ca:'pem',headers:()=>({'Proxy-Authorization':'Basic abc'})};
const agent=new HttpsProxyAgent(new URL('https://proxy.test'),options);
const native:http.Agent=agent;
http.get('http://example.invalid',{agent});
agent.on('proxyConnect',(response:ProxyConnectResponse)=>{const code:number=response.statusCode;void code;});
const protocols:readonly ['http','https']=HttpsProxyAgent.protocols;
// @ts-expect-error header functions must return a header map
new HttpsProxyAgent('http://proxy.test',{headers:()=>3});
// @ts-expect-error size must be numeric
new HttpsProxyAgent('http://proxy.test',{maxProxyHeaderSize:'unlimited'});
void [native,protocols];
