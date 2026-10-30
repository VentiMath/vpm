/** Structural Node interfaces keep platform declarations optional for consumers. */
export interface Emitter {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  eventNames(): Array<string | symbol>;
  listeners(event: string | symbol): Function[];
  rawListeners(event: string | symbol): Function[];
  listenerCount(event: string | symbol, listener?: Function): number;
  getMaxListeners(): number;
  setMaxListeners(value: number): this;
}
export interface Duplex extends Emitter {
  readonly destroyed: boolean;
  readonly readable: boolean;
  readonly writable: boolean;
  destroy(error?: Error): this;
  write(chunk: any, ...args: any[]): boolean;
  end(...args: any[]): this;
  resume(): this;
  pause(): this;
}
export interface ClientRequest extends Emitter {
  readonly destroyed: boolean;
  readonly aborted: boolean;
  readonly method: string;
  readonly path: string;
  socket: Duplex | null;
  destroy(error?: Error): this;
  abort(): void;
  getHeader(name: string): string | number | string[] | undefined;
  getHeaders(): Record<string, string | number | string[] | undefined>;
  getHeaderNames(): string[];
  hasHeader(name: string): boolean;
  setHeader(name: string, value: string | number | readonly string[]): this;
  removeHeader(name: string): void;
  flushHeaders(): void;
  write(chunk: any, ...args: any[]): boolean;
  end(...args: any[]): this;
  setTimeout(ms: number, callback?: () => void): this;
}
export interface AgentConnectOpts {
  secureEndpoint: boolean;
  host: string;
  port: number;
  protocol?: string;
  localAddress?: string;
  family?: number;
  servername?: string;
  rejectUnauthorized?: boolean;
  /** Additional native TCP/TLS options pass through unchanged. */
  [key: string]: any;
}
export interface AgentOptions {
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  maxSockets?: number;
  maxTotalSockets?: number;
  maxFreeSockets?: number;
  scheduling?: 'fifo' | 'lifo';
  timeout?: number;
  /** Deadline while connect() is pending, in ms. Default 30000; 0 disables it. */
  connectTimeout?: number;
  [key: string]: unknown;
}
export interface DelegateAgent { destroy(): void; maxSockets: number; }
/** A structural delegate, supported by agent-base 9 without native inheritance. */
export interface RequestDelegate {
  addRequest(request: ClientRequest, options: AgentConnectOpts): void;
}
export abstract class Agent {
  constructor(options?: AgentOptions);
  abstract connect(request: ClientRequest, options: AgentConnectOpts): Duplex | DelegateAgent | RequestDelegate | PromiseLike<Duplex | DelegateAgent | RequestDelegate>;
  options: Record<string, any>;
  keepAlive: boolean;
  keepAliveMsecs: number;
  maxSockets: number;
  maxTotalSockets: number;
  maxFreeSockets: number;
  totalSocketCount: number;
  scheduling: 'fifo' | 'lifo';
  /** Native-owned pools. Entries retain their runtime's complete socket/request API. */
  readonly sockets: Readonly<Record<string, any[]>>;
  readonly freeSockets: Readonly<Record<string, any[]>>;
  readonly requests: Readonly<Record<string, any[]>>;
  protocol: string;
  defaultPort: number;
  isSecureEndpoint(options?: Partial<AgentConnectOpts>): boolean;
  getName(options?: Partial<AgentConnectOpts>): string;
  addRequest(request: ClientRequest, options: Partial<AgentConnectOpts>): void;
  createSocket(request: ClientRequest, options: Partial<AgentConnectOpts>, callback: (error: Error | null, socket?: Duplex) => void): void;
  /** Internal native handoff; subclasses implement connect(), not this method. */
  createConnection(): any;
  keepSocketAlive(socket: Duplex): boolean;
  reuseSocket(socket: Duplex, request: ClientRequest): void;
  destroy(): void;

}
export interface Agent extends Emitter {}
export interface ByteBuffer extends Uint8Array { toString(encoding?: string, start?: number, end?: number): string; }
export type BodyChunk = string | ArrayBufferView;
export type Body = AsyncIterable<BodyChunk> | Iterable<BodyChunk>;
export interface BodyOptions { limit?: number; }
export function toBuffer(stream: Body, options?: BodyOptions): Promise<ByteBuffer>;
export function json<T = unknown>(stream: Body, options?: BodyOptions): Promise<T>;
export interface IncomingMessage extends Emitter, AsyncIterable<BodyChunk> {
  statusCode?: number;
  statusMessage?: string;
  headers: Record<string, string | string[] | undefined>;
  readonly complete: boolean;
  readonly destroyed: boolean;
  socket: Duplex;
  resume(): this;
  destroy(error?: Error): this;
  setEncoding(encoding: string): this;
}
export interface RequestOptions extends Partial<AgentConnectOpts> {
  agent?: Agent | DelegateAgent | false;
  method?: string;
  headers?: Record<string, string | number | readonly string[]>;
}
export type ThenableRequest = ClientRequest & PromiseLike<IncomingMessage>;
export function req(url: string | { readonly href: string }, options?: RequestOptions): ThenableRequest;
