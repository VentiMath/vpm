/** Structural Node capabilities; consumers do not need ambient platform types. */
export type BufferEncoding = 'ascii'|'utf8'|'utf-8'|'utf16le'|'utf-16le'|'ucs2'|'ucs-2'|'base64'|'base64url'|'latin1'|'binary'|'hex';
export type Buffer<T extends ArrayBufferLike = ArrayBufferLike> = import('vgrpc-proto-loader').ByteBuffer;
export interface URL { href: string; protocol: string; host: string; hostname: string; port: string; pathname: string; search: string; hash: string; toString(): string; }
export type PathLike = string | Buffer | URL;
export interface OutgoingHttpHeaders { [key: string]: string | number | readonly string[] | undefined; }
export interface ParsedUrlQueryInput { [key: string]: string | number | boolean | readonly string[] | readonly number[] | readonly boolean[] | null | undefined; }
export class EventEmitter {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  listenerCount(event: string | symbol): number;
  listeners(event: string | symbol): Function[];
  setMaxListeners(count: number): this;
  getMaxListeners(): number;
  eventNames(): (string | symbol)[];
}
export interface WritableOptions { highWaterMark?: number; objectMode?: boolean; decodeStrings?: boolean; autoDestroy?: boolean; emitClose?: boolean; [name: string]: unknown; }
export interface DuplexOptions extends WritableOptions { readableObjectMode?: boolean; writableObjectMode?: boolean; allowHalfOpen?: boolean; }
export class Readable extends EventEmitter implements AsyncIterable<any> {
  constructor(options?: WritableOptions);
  read(size?: number): any;
  _read(size: number): void;
  push(chunk: any, encoding?: BufferEncoding): boolean;
  destroy(error?: Error): this;
  pause(): this;
  resume(): this;
  isPaused(): boolean;
  pipe<T>(destination: T, options?: {end?: boolean}): T;
  unpipe(destination?: any): this;
  setEncoding(encoding: BufferEncoding): this;
  [Symbol.asyncIterator](): AsyncIterableIterator<any>;
  readonly destroyed: boolean;
  readonly readable: boolean;
  readonly readableEnded: boolean;
  readonly readableLength: number;
}
export class Writable extends EventEmitter {
  constructor(options?: WritableOptions);
  _write(chunk: any, encoding: string, callback: Function): void;
  setDefaultEncoding(encoding: string): this;
  write(chunk: any, callback?: (error?: Error | null) => void): boolean;
  write(chunk: any, encoding?: BufferEncoding, callback?: (error?: Error | null) => void): boolean;
  end(callback?: () => void): this;
  end(chunk: any, callback?: () => void): this;
  end(chunk: any, encoding?: BufferEncoding, callback?: () => void): this;
  destroy(error?: Error): this;
  readonly destroyed: boolean;
  readonly writable: boolean;
  readonly writableFinished: boolean;
  readonly writableEnded: boolean;
}
export interface Duplex extends Readable, Writable {}
export class Duplex extends Readable {}
export class Transform extends Duplex {}
export class PassThrough extends Transform {}

export interface Console { log(...data: any[]): void; info(...data: any[]): void; warn(...data: any[]): void; error(...data: any[]): void; debug(...data: any[]): void; }
export interface SecureContext { context: unknown; }
export interface Certificate { [key:string]: string | string[] | undefined; C?: string | string[]; ST?: string | string[]; L?: string | string[]; O?: string | string[]; OU?: string | string[]; CN?: string | string[]; }
export interface PeerCertificate {
  subject: Certificate; issuer: Certificate; subjectaltname?: string; infoAccess?: Record<string,string[]|undefined>;
  valid_from: string; valid_to: string; fingerprint: string; fingerprint256: string; fingerprint512: string;
  serialNumber: string; raw: Buffer; ca: boolean; pubkey?: Buffer; bits?: number; exponent?: string;
  modulus?: string; ext_key_usage?: string[]; asn1Curve?: string; nistCurve?: string;
}
export interface SecureContextOptions {
  ca?: string | Buffer | (string | Buffer)[];
  cert?: string | Buffer | (string | Buffer)[];
  key?: string | Buffer | (string | Buffer | {pem:string|Buffer;passphrase?:string})[];
  passphrase?: string; ciphers?: string; minVersion?: 'TLSv1'|'TLSv1.1'|'TLSv1.2'|'TLSv1.3'; maxVersion?: 'TLSv1'|'TLSv1.1'|'TLSv1.2'|'TLSv1.3';
  secureOptions?: number; secureProtocol?: string; sessionIdContext?: string;
}
export interface SecureServerOptions extends SecureContextOptions {
  requestCert?: boolean; rejectUnauthorized?: boolean; allowHTTP1?: boolean; enableTrace?: boolean;
  settings?: Record<string,number|boolean>; maxSessionMemory?: number;
}
export interface IncomingHttpHeaders { [key:string]: string | string[] | number | undefined; }
export class Socket extends Duplex {
  readonly remoteAddress?: string; readonly remotePort?: number; readonly localAddress?: string;
  readonly localPort?: number; readonly connecting: boolean;
  setNoDelay(noDelay?:boolean): this; setKeepAlive(enable?:boolean,initialDelay?:number):this;
  setTimeout(timeout:number,callback?:()=>void):this; ref():this; unref():this;
}
export class ClientHttp2Stream extends Duplex {
  readonly id?:number; readonly closed:boolean; readonly rstCode:number; readonly session:ClientHttp2Session|undefined;
  close(code?:number,callback?:()=>void):void; setTimeout(timeout:number,callback?:()=>void):void;
}
export class ServerHttp2Stream extends ClientHttp2Stream {
  respond(headers?:OutgoingHttpHeaders,options?:{endStream?:boolean;waitForTrailers?:boolean}):void;
  sendTrailers(headers:OutgoingHttpHeaders):void;
}
export class ClientHttp2Session extends EventEmitter {
  readonly closed:boolean; readonly destroyed:boolean; readonly socket:Socket;
  request(headers?:OutgoingHttpHeaders,options?:{endStream?:boolean;waitForTrailers?:boolean}):ClientHttp2Stream;
  close(callback?:()=>void):void; destroy(error?:Error,code?:number):void;
  ping(callback:(error:Error|null,duration:number,payload:Buffer)=>void):boolean;
  ref():void; unref():void;
}
