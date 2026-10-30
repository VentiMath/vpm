import {HttpProxyAgent, type ProxyConnect} from 'vhttp-proxy-agent';
import * as http from 'node:http';
const agent = new HttpProxyAgent('https://proxy.example', {keepAlive:true, headers:()=>({'X-Token':'value'}), connectTimeout:1000});
const native: http.Agent = agent;
http.get('http://example.invalid', {agent});
agent.on('proxyConnect', (event: ProxyConnect) => { event.socket.destroy(); });
const url: string = agent.proxy.href;
// @ts-expect-error automatic negotiation is explicitly unsupported
new HttpProxyAgent('http://proxy.example', {negotiate:true});
// @ts-expect-error invalid header type
new HttpProxyAgent('http://proxy.example', {headers:{Token:{}}});
void [native,url];
