declare function fetch(input: fetch.RequestInfo, init?: fetch.RequestInit): Promise<fetch.Response>;
declare namespace fetch {
  interface URLLike {readonly href: string;toString(): string;}
  interface URLRecord {href?: string;hostname?: string | null;port?: string | null;protocol?: string | null;[key:string]:unknown;}
  interface Signal {readonly aborted:boolean;addEventListener(type:'abort',listener:(...args:any[])=>void,...args:any[]):void;removeEventListener(type:'abort',listener:(...args:any[])=>void,...args:any[]):void;}
  interface ByteBuffer extends Uint8Array {toString(encoding?:string,start?:number,end?:number):string;}
  interface StreamLike extends AsyncIterable<any> {
    pipe<T>(destination:T,...args:any[]):T;
    on(event:string|symbol,listener:(...args:any[])=>void):this;
    once(event:string|symbol,listener:(...args:any[])=>void):this;
    removeListener(event:string|symbol,listener:(...args:any[])=>void):this;
    destroy(error?:Error):this;readonly destroyed:boolean;
  }
  interface BlobLike {readonly size:number;readonly type:string;arrayBuffer():Promise<ArrayBuffer>;text():Promise<string>;stream():unknown;}
  interface Blob extends BlobLike {slice(start?:number,end?:number,type?:string):Blob;stream():StreamLike;}
  type BodyInit = string | Uint8Array | ArrayBuffer | ArrayBufferView | StreamLike | BlobLike | {toString():string};
  type HeadersInit = Headers | Iterable<readonly [string,string]> | Record<string,string | readonly string[]>;
  type RequestInfo = string | URLLike | Request;
  interface RequestInit {
    method?:string;headers?:HeadersInit;body?:BodyInit|null;redirect?:'follow'|'manual'|'error';signal?:Signal|null;
    size?:number;timeout?:number;follow?:number;counter?:number;compress?:boolean;
    agent?:object|false|((url:URLRecord)=>object|false|undefined);
  }
  interface ResponseInit {url?:string;status?:number;statusText?:string;headers?:HeadersInit;size?:number;timeout?:number;counter?:number;}
  class Headers implements Iterable<[string,string]> {
    constructor(init?:HeadersInit);
    append(name:string,value:string):void;set(name:string,value:string):void;get(name:string):string|null;has(name:string):boolean;delete(name:string):void;
    raw():Record<string,string[]>;
    keys():IterableIterator<string>;values():IterableIterator<string>;entries():IterableIterator<[string,string]>;
    forEach(callback:(value:string,name:string,headers:Headers)=>void,thisArg?:any):void;
    [Symbol.iterator]():IterableIterator<[string,string]>;
  }
  interface Body {
    readonly body:StreamLike|ByteBuffer|BlobLike|null;readonly bodyUsed:boolean;size:number;timeout:number;
    arrayBuffer():Promise<ArrayBuffer>;blob():Promise<Blob>;buffer():Promise<ByteBuffer>;text():Promise<string>;textConverted():Promise<string>;json():Promise<any>;
  }
  interface Request extends Body {}
  class Request {
    constructor(input:RequestInfo,init?:RequestInit);
    readonly url:string;readonly method:string;readonly headers:Headers;readonly redirect:'follow'|'manual'|'error';readonly signal:Signal|null;
    follow:number;counter:number;compress:boolean;agent:RequestInit['agent'];clone():Request;
  }
  interface Response extends Body {}
  class Response {
    constructor(body?:BodyInit|null,init?:ResponseInit);
    readonly url:string;readonly status:number;readonly statusText:string;readonly ok:boolean;readonly redirected:boolean;readonly headers:Headers;clone():Response;
  }
  class FetchError extends Error {constructor(message:string,type:string,systemError?:{code?:string});type:string;code?:string;errno?:string;}
  class AbortError extends Error {constructor(message:string);type:'aborted';}
  function isRedirect(status:number):boolean;
  let Promise:PromiseConstructor;
}
export = fetch;
