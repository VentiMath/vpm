export type File = string | Uint8Array | number | {readonly href:string;readonly protocol:string;readonly pathname:string};
export type Callback<T> = (error:Error|null, value?:T) => void;
export interface FileSystem {
  readFile?:(...args:any[])=>unknown;readFileSync?:(...args:any[])=>unknown;
  writeFile?:(...args:any[])=>unknown;writeFileSync?:(...args:any[])=>unknown;
}
export interface FormatOptions {
  spaces?:number|string;EOL?:string;finalEOL?:boolean;
  replacer?:((this:any,key:string,value:any)=>any)|(number|string)[]|null;
}
export interface CommonOptions {encoding?:string|null;flag?:string;fs?:FileSystem;signal?:{readonly aborted:boolean};}
export interface ReadOptions extends CommonOptions {throws?:boolean;reviver?:(this:any,key:string,value:any)=>any;}
export interface WriteOptions extends CommonOptions,FormatOptions {mode?:number|string;flush?:boolean;}
export function readFile<T=any>(file:File,options:ReadOptions & {throws:false}):Promise<T|null>;
export function readFile<T=any>(file:File,options?:string|(ReadOptions & {throws?:true})):Promise<T>;
export function readFile<T=any>(file:File,options:ReadOptions):Promise<T|null>;
export function readFile<T=any>(file:File,callback:Callback<T>):void;
export function readFile<T=any>(file:File,options:string|(ReadOptions & {throws?:true})|undefined,callback:Callback<T>):void;
export function readFile<T=any>(file:File,options:ReadOptions,callback:Callback<T|null>):void;
export function readFileSync<T=any>(file:File,options:ReadOptions & {throws:false}):T|null;
export function readFileSync<T=any>(file:File,options?:string|(ReadOptions & {throws?:true})):T;
export function readFileSync<T=any>(file:File,options:ReadOptions):T|null;
export function writeFile(file:File,value:unknown,options?:WriteOptions|string):Promise<void>;
export function writeFile(file:File,value:unknown,callback:Callback<void>):void;
export function writeFile(file:File,value:unknown,options:WriteOptions|string|undefined,callback:Callback<void>):void;
export function writeFileSync(file:File,value:unknown,options?:WriteOptions|string):void;
declare const api:{readFile:typeof readFile;readFileSync:typeof readFileSync;writeFile:typeof writeFile;writeFileSync:typeof writeFileSync};
export default api;
