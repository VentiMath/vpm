import { Agent, type AgentOptions, type AgentConnectOpts, type ClientRequest, type Duplex } from 'vagent-base';
export type ProxyHeaders = Record<string, string | number | readonly string[] | undefined>;
export interface HttpsProxyAgentOptions<Uri extends string = string> extends AgentOptions {
  headers?: ProxyHeaders | (() => ProxyHeaders);
  /** Cumulative CONNECT response header bytes, including informational responses. Default 16384. */
  maxProxyHeaderSize?: number;
  rejectUnauthorized?: boolean;
  servername?: string;
  ALPNProtocols?: readonly (string | Uint8Array)[];
  ca?: string | Uint8Array | readonly (string | Uint8Array)[];
  cert?: string | Uint8Array | readonly (string | Uint8Array)[];
  key?: string | Uint8Array | readonly (string | Uint8Array)[];
}
/** A detached URL snapshot; changing it does not reconfigure an agent. */
export interface ProxyURL { href:string; protocol:string; hostname:string; host:string; port:string; username:string; password:string; pathname:string; search:string; hash:string; origin:string; toString():string; toJSON():string; }
export interface ProxyConnectResponse { statusCode:number; statusText:string; headers:Record<string,string|string[]>; }
export class HttpsProxyAgent<Uri extends string = string> extends Agent {
  static readonly protocols: readonly ['http','https'];
  constructor(proxy:Uri | { readonly href:string }, options?: HttpsProxyAgentOptions<Uri>);
  readonly proxy: ProxyURL;
  readonly proxyHeaders: Readonly<ProxyHeaders> | (() => ProxyHeaders);
  readonly connectOpts: Readonly<Record<string, unknown> & {host:string;port:number}>;
  connect(request:ClientRequest, options:AgentConnectOpts):Promise<Duplex>;
}
