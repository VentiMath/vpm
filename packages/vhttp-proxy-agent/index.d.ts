import { Agent, type AgentOptions, type AgentConnectOpts, type ClientRequest, type Duplex } from 'vagent-base';
export type ProxyHeaders = Record<string, string | number | readonly string[] | undefined>;
export interface HttpProxyAgentOptions<Uri extends string = string> extends AgentOptions {
  headers?: ProxyHeaders | (() => ProxyHeaders);
  /** Automatic challenge negotiation is outside the supported caller scope. */
  negotiate?: false;
  onProxyAuth?: never;
  rejectUnauthorized?: boolean;
  servername?: string;
  ALPNProtocols?: readonly string[];
  ca?: string | Uint8Array | readonly (string | Uint8Array)[];
  cert?: string | Uint8Array | readonly (string | Uint8Array)[];
  key?: string | Uint8Array | readonly (string | Uint8Array)[];
}
export interface ProxyURL { href: string; protocol: string; hostname: string; host: string; port: string; username: string; password: string; pathname: string; search: string; hash: string; origin: string; toString(): string; toJSON(): string; }
export interface ProxyConnect { socket: Duplex; }
export class HttpProxyAgent<Uri extends string = string> extends Agent {
  static readonly protocols: readonly ['http', 'https'];
  constructor(proxy: Uri | {readonly href: string}, options?: HttpProxyAgentOptions<Uri>);
  readonly proxy: ProxyURL;
  readonly proxyHeaders: Readonly<ProxyHeaders> | (() => ProxyHeaders);
  readonly connectOpts: Readonly<Record<string, unknown> & {host: string; port: number}>;
  setRequestProps(request: ClientRequest, options: AgentConnectOpts): void;
  addRequest(request: ClientRequest, options: AgentConnectOpts): void;
  connect(request: ClientRequest, options: AgentConnectOpts): Promise<Duplex>;
}
