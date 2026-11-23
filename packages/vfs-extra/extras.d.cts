import type {ReadOptions,WriteOptions,File as JsonFile} from 'vjsonfile';
export type Path = string|Uint8Array|{readonly href:string;readonly protocol:string;readonly pathname:string};
export type Callback<T=void> = (error:Error|null,value?:T)=>void;
export interface CopyOptions {overwrite?:boolean;clobber?:boolean;errorOnExist?:boolean;dereference?:boolean;preserveTimestamps?:boolean;filter?:(src:string,dest:string)=>boolean|Promise<boolean>;}
export interface CopySyncOptions extends Omit<CopyOptions,'filter'> {filter?:(src:string,dest:string)=>boolean;}
export interface MoveOptions {overwrite?:boolean;clobber?:boolean;}
export type DirectoryOptions = number|{mode?:number};
export interface Unary { (path:Path):Promise<void>; (path:Path,callback:Callback):void; }
export function copy(src:Path,dest:Path,options?:CopyOptions):Promise<void>;
export function copy(src:Path,dest:Path,callback:Callback):void;
export function copy(src:Path,dest:Path,options:CopyOptions|((src:string,dest:string)=>boolean|Promise<boolean>),callback:Callback):void;
export function copySync(src:Path,dest:Path,options?:CopySyncOptions|((src:string,dest:string)=>boolean)):void;
export function move(src:Path,dest:Path,options?:MoveOptions):Promise<void>;
export function move(src:Path,dest:Path,callback:Callback):void;
export function move(src:Path,dest:Path,options:MoveOptions,callback:Callback):void;
export function moveSync(src:Path,dest:Path,options?:MoveOptions):void;
export function ensureDir(path:Path,options?:DirectoryOptions):Promise<string|undefined>;
export function ensureDir(path:Path,callback:Callback<string>):void;
export function ensureDir(path:Path,options:DirectoryOptions,callback:Callback<string>):void;
export function ensureDirSync(path:Path,options?:DirectoryOptions):string|undefined;
export const remove:Unary,emptyDir:Unary,ensureFile:Unary;
export function removeSync(path:Path):void;
export function emptyDirSync(path:Path):void;
export function ensureFileSync(path:Path):void;
export function ensureLink(src:Path,dest:Path):Promise<void>;
export function ensureLink(src:Path,dest:Path,callback:Callback):void;
export function ensureLinkSync(src:Path,dest:Path):void;
export function ensureSymlink(src:Path,dest:Path,type?:'file'|'dir'|'junction'):Promise<void>;
export function ensureSymlink(src:Path,dest:Path,callback:Callback):void;
export function ensureSymlink(src:Path,dest:Path,type:'file'|'dir'|'junction',callback:Callback):void;
export function ensureSymlinkSync(src:Path,dest:Path,type?:'file'|'dir'|'junction'):void;
export function pathExists(path:Path):Promise<boolean>;
export function pathExists(path:Path,callback:Callback<boolean>):void;
export function pathExistsSync(path:Path):boolean;
export type OutputOptions = string|{encoding?:string|null;mode?:number|string;flag?:string;flush?:boolean;signal?:{readonly aborted:boolean}};
export function outputFile(file:Path|number,data:string|Uint8Array,options?:OutputOptions):Promise<void>;
export function outputFile(file:Path|number,data:string|Uint8Array,callback:Callback):void;
export function outputFile(file:Path|number,data:string|Uint8Array,options:OutputOptions,callback:Callback):void;
export function outputFileSync(file:Path|number,data:string|Uint8Array,options?:OutputOptions):void;
export function outputJson(file:JsonFile,data:unknown,options?:WriteOptions|string):Promise<void>;
export function outputJson(file:JsonFile,data:unknown,callback:Callback):void;
export function outputJson(file:JsonFile,data:unknown,options:WriteOptions|string,callback:Callback):void;
export function outputJsonSync(file:JsonFile,data:unknown,options?:WriteOptions|string):void;
export {readFile as readJson,readFile as readJSON,readFileSync as readJsonSync,readFileSync as readJSONSync,writeFile as writeJson,writeFile as writeJSON,writeFileSync as writeJsonSync,writeFileSync as writeJSONSync} from 'vjsonfile';
export {ensureDir as mkdirs,ensureDir as mkdirp,ensureDirSync as mkdirsSync,ensureDirSync as mkdirpSync,emptyDir as emptydir,emptyDirSync as emptydirSync,ensureFile as createFile,ensureFileSync as createFileSync,ensureLink as createLink,ensureLinkSync as createLinkSync,ensureSymlink as createSymlink,ensureSymlinkSync as createSymlinkSync,outputJson as outputJSON,outputJsonSync as outputJSONSync};
