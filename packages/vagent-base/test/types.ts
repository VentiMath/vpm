import { Agent, type AgentConnectOpts, type ClientRequest, req, json, toBuffer } from 'vagent-base';
import * as http from 'node:http';
import * as net from 'node:net';
import * as tls from 'node:tls';
class Direct extends Agent {
  connect(request: ClientRequest, options: AgentConnectOpts) {
    request.setHeader('x-test', 'value');
    return options.secureEndpoint ? tls.connect(options) : net.connect(options);
  }
}
const agent = new Direct({keepAlive:true,connectTimeout:1000});
const native: http.Agent = agent;
class Delegating extends Agent { connect() { return http.globalAgent; } }
class StructuralDelegate extends Agent {
  connect() {
    return {addRequest(request: ClientRequest, options: AgentConnectOpts) { void [request, options]; }};
  }
}
const structural: http.Agent = new StructuralDelegate();
const delegated: http.Agent = new Delegating();
http.get('http://example.invalid', {agent});
const response = req(new URL('https://example.invalid'), {agent});
response.destroy();
response.then(async res => { const value: unknown = await json(res); void value; });
const bytes: Promise<Uint8Array> = toBuffer([new Uint8Array([1]),'abc'],{limit:10});
// @ts-expect-error concrete agents must implement connect
new Agent();
// @ts-expect-error only byte-like chunks are accepted
toBuffer([123]);
void [native,bytes,delegated,structural];
