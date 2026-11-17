export interface DBSchema { [store:string]: {key:IDBValidKey;value:any;indexes?:Record<string,IDBValidKey>} }
type Known<T>=keyof {[K in keyof T as string extends K?never:K]:unknown}&string;
export type StoreNames<D>=D extends DBSchema?Known<D>:string;
export type StoreKey<D,S extends StoreNames<D>>=D extends DBSchema?D[S]['key']:IDBValidKey;
export type StoreValue<D,S extends StoreNames<D>>=D extends DBSchema?D[S]['value']:any;
export type IndexNames<D,S extends StoreNames<D>>=D extends DBSchema?keyof NonNullable<D[S]['indexes']>&string:string;
export type IndexKey<D,S extends StoreNames<D>,I extends IndexNames<D,S>>=D extends DBSchema?NonNullable<D[S]['indexes']>[I]:IDBValidKey;
export interface TypedDOMStringList<T extends string> extends DOMStringList { item(index:number):T|null; [index:number]:T; [Symbol.iterator]():IterableIterator<T> }
type Query<T>=T|IDBKeyRange;
type Native<T>={[K in keyof T]:T[K] extends (...args:infer A)=>IDBRequest<infer R>?(...args:A)=>Promise<R>:T[K]};
type Write<M,F>=M extends 'readonly'?undefined:F;
export interface IDBPDatabase<D=unknown> extends Omit<IDBDatabase,'transaction'|'createObjectStore'|'deleteObjectStore'|'objectStoreNames'> {
 objectStoreNames:TypedDOMStringList<StoreNames<D>>;
 createObjectStore<S extends StoreNames<D>>(name:S,options?:IDBObjectStoreParameters):IDBPObjectStore<D,ArrayLike<StoreNames<D>>,S,'versionchange'>;
 deleteObjectStore(name:StoreNames<D>):void;
 transaction<S extends StoreNames<D>,M extends IDBTransactionMode='readonly'>(stores:S,mode?:M,options?:IDBTransactionOptions):IDBPTransaction<D,[S],M>;
 transaction<S extends ArrayLike<StoreNames<D>>,M extends IDBTransactionMode='readonly'>(stores:S,mode?:M,options?:IDBTransactionOptions):IDBPTransaction<D,S,M>;
 get<S extends StoreNames<D>>(store:S,key:Query<StoreKey<D,S>>):Promise<StoreValue<D,S>|undefined>;
 getKey<S extends StoreNames<D>>(store:S,key:Query<StoreKey<D,S>>):Promise<StoreKey<D,S>|undefined>;
 getAll<S extends StoreNames<D>>(store:S,key?:Query<StoreKey<D,S>>|null,count?:number):Promise<StoreValue<D,S>[]>;
 getAllKeys<S extends StoreNames<D>>(store:S,key?:Query<StoreKey<D,S>>|null,count?:number):Promise<StoreKey<D,S>[]>;
 count<S extends StoreNames<D>>(store:S,key?:Query<StoreKey<D,S>>|null):Promise<number>;
 put<S extends StoreNames<D>>(store:S,value:StoreValue<D,S>,key?:StoreKey<D,S>):Promise<StoreKey<D,S>>;
 add<S extends StoreNames<D>>(store:S,value:StoreValue<D,S>,key?:StoreKey<D,S>):Promise<StoreKey<D,S>>;
 delete<S extends StoreNames<D>>(store:S,key:Query<StoreKey<D,S>>):Promise<void>;
 clear(store:StoreNames<D>):Promise<void>;
 getFromIndex<S extends StoreNames<D>,I extends IndexNames<D,S>>(store:S,index:I,key:Query<IndexKey<D,S,I>>):Promise<StoreValue<D,S>|undefined>;
 getKeyFromIndex<S extends StoreNames<D>,I extends IndexNames<D,S>>(store:S,index:I,key:Query<IndexKey<D,S,I>>):Promise<StoreKey<D,S>|undefined>;
 getAllFromIndex<S extends StoreNames<D>,I extends IndexNames<D,S>>(store:S,index:I,key?:Query<IndexKey<D,S,I>>|null,count?:number):Promise<StoreValue<D,S>[]>;
 getAllKeysFromIndex<S extends StoreNames<D>,I extends IndexNames<D,S>>(store:S,index:I,key?:Query<IndexKey<D,S,I>>|null,count?:number):Promise<StoreKey<D,S>[]>;
 countFromIndex<S extends StoreNames<D>,I extends IndexNames<D,S>>(store:S,index:I,key?:Query<IndexKey<D,S,I>>|null):Promise<number>;
}
export interface IDBPTransaction<D=unknown,T extends ArrayLike<StoreNames<D>>=ArrayLike<StoreNames<D>>,M extends IDBTransactionMode='readonly'> extends Omit<IDBTransaction,'db'|'mode'|'objectStore'|'objectStoreNames'> {
 db:IDBPDatabase<D>;mode:M;objectStoreNames:TypedDOMStringList<T[number]>;done:Promise<void>;
 store:T extends readonly [infer S extends StoreNames<D>]?IDBPObjectStore<D,T,S,M>:undefined;
 objectStore<S extends T[number]>(name:S):IDBPObjectStore<D,T,S,M>;
}
type StoreOmit='transaction'|'indexNames'|'createIndex'|'index'|'deleteIndex'|'get'|'getKey'|'getAll'|'getAllKeys'|'count'|'put'|'add'|'delete'|'clear'|'openCursor'|'openKeyCursor';
export interface IDBPObjectStore<D=unknown,T extends ArrayLike<StoreNames<D>>=ArrayLike<StoreNames<D>>,S extends StoreNames<D>=StoreNames<D>,M extends IDBTransactionMode='readonly'> extends Omit<Native<IDBObjectStore>,StoreOmit> {
 transaction:IDBPTransaction<D,T,M>;indexNames:TypedDOMStringList<IndexNames<D,S>>;
 createIndex<I extends IndexNames<D,S>>(name:I,keyPath:string|string[],options?:IDBIndexParameters):IDBPIndex<D,T,S,I,M>;
 index<I extends IndexNames<D,S>>(name:I):IDBPIndex<D,T,S,I,M>;deleteIndex(name:IndexNames<D,S>):void;
 get(key:Query<StoreKey<D,S>>):Promise<StoreValue<D,S>|undefined>;getKey(key:Query<StoreKey<D,S>>):Promise<StoreKey<D,S>|undefined>;
 getAll(key?:Query<StoreKey<D,S>>|null,count?:number):Promise<StoreValue<D,S>[]>;getAllKeys(key?:Query<StoreKey<D,S>>|null,count?:number):Promise<StoreKey<D,S>[]>;count(key?:Query<StoreKey<D,S>>|null):Promise<number>;
 put:Write<M,(value:StoreValue<D,S>,key?:StoreKey<D,S>)=>Promise<StoreKey<D,S>>>;add:IDBPObjectStore<D,T,S,M>['put'];delete:Write<M,(key:Query<StoreKey<D,S>>)=>Promise<void>>;clear:Write<M,()=>Promise<void>>;
 openCursor(key?:Query<StoreKey<D,S>>|null,direction?:IDBCursorDirection):Promise<IDBPCursorWithValue<D,T,S,unknown,M>|null>;
 openKeyCursor(key?:Query<StoreKey<D,S>>|null,direction?:IDBCursorDirection):Promise<IDBPCursor<D,T,S,unknown,M>|null>;
 iterate(key?:Query<StoreKey<D,S>>|null,direction?:IDBCursorDirection):AsyncIterableIterator<IDBPCursorWithValueIteratorValue<D,T,S,unknown,M>>;
 [Symbol.asyncIterator]():AsyncIterableIterator<IDBPCursorWithValueIteratorValue<D,T,S,unknown,M>>;
}
export interface IDBPIndex<D=unknown,T extends ArrayLike<StoreNames<D>>=ArrayLike<StoreNames<D>>,S extends StoreNames<D>=StoreNames<D>,I extends IndexNames<D,S>=IndexNames<D,S>,M extends IDBTransactionMode='readonly'> extends Omit<Native<IDBIndex>,'objectStore'|'get'|'getKey'|'getAll'|'getAllKeys'|'count'|'openCursor'|'openKeyCursor'> {
 objectStore:IDBPObjectStore<D,T,S,M>;get(key:Query<IndexKey<D,S,I>>):Promise<StoreValue<D,S>|undefined>;getKey(key:Query<IndexKey<D,S,I>>):Promise<StoreKey<D,S>|undefined>;
 getAll(key?:Query<IndexKey<D,S,I>>|null,count?:number):Promise<StoreValue<D,S>[]>;getAllKeys(key?:Query<IndexKey<D,S,I>>|null,count?:number):Promise<StoreKey<D,S>[]>;count(key?:Query<IndexKey<D,S,I>>|null):Promise<number>;
 openCursor(key?:Query<IndexKey<D,S,I>>|null,direction?:IDBCursorDirection):Promise<IDBPCursorWithValue<D,T,S,I,M>|null>;
 openKeyCursor(key?:Query<IndexKey<D,S,I>>|null,direction?:IDBCursorDirection):Promise<IDBPCursor<D,T,S,I,M>|null>;
 iterate(key?:Query<IndexKey<D,S,I>>|null,direction?:IDBCursorDirection):AsyncIterableIterator<IDBPCursorWithValueIteratorValue<D,T,S,I,M>>;
 [Symbol.asyncIterator]():AsyncIterableIterator<IDBPCursorWithValueIteratorValue<D,T,S,I,M>>;
}
export interface IDBPCursor<D=unknown,T extends ArrayLike<StoreNames<D>>=ArrayLike<StoreNames<D>>,S extends StoreNames<D>=StoreNames<D>,I=unknown,M extends IDBTransactionMode='readonly'> extends Omit<IDBCursor,'source'|'advance'|'continue'|'continuePrimaryKey'|'update'|'delete'|'key'|'primaryKey'> {
 source:IDBPObjectStore<D,T,S,M>|IDBPIndex<D,T,S,IndexNames<D,S>,M>;key:I extends IndexNames<D,S>?IndexKey<D,S,I>:StoreKey<D,S>;primaryKey:StoreKey<D,S>;
 advance(count:number):Promise<this|null>;continue(key?:this['key']):Promise<this|null>;continuePrimaryKey(key:this['key'],primaryKey:StoreKey<D,S>):Promise<this|null>;
 update:Write<M,(value:StoreValue<D,S>)=>Promise<StoreKey<D,S>>>;delete:Write<M,()=>Promise<void>>;
 [Symbol.asyncIterator]():AsyncIterableIterator<IDBPCursorIteratorValue<D,T,S,I,M>>;
}
export interface IDBPCursorWithValue<D=unknown,T extends ArrayLike<StoreNames<D>>=ArrayLike<StoreNames<D>>,S extends StoreNames<D>=StoreNames<D>,I=unknown,M extends IDBTransactionMode='readonly'> extends IDBPCursor<D,T,S,I,M> {value:StoreValue<D,S>;[Symbol.asyncIterator]():AsyncIterableIterator<IDBPCursorWithValueIteratorValue<D,T,S,I,M>>}
export type IDBPCursorIteratorValue<D=unknown,T extends ArrayLike<StoreNames<D>>=ArrayLike<StoreNames<D>>,S extends StoreNames<D>=StoreNames<D>,I=unknown,M extends IDBTransactionMode='readonly'>=Omit<IDBPCursor<D,T,S,I,M>,'advance'|'continue'|'continuePrimaryKey'>&{advance(count:number):void;continue(key?:IDBPCursor<D,T,S,I,M>['key']):void;continuePrimaryKey(key:IDBPCursor<D,T,S,I,M>['key'],primaryKey:StoreKey<D,S>):void};
export type IDBPCursorWithValueIteratorValue<D=unknown,T extends ArrayLike<StoreNames<D>>=ArrayLike<StoreNames<D>>,S extends StoreNames<D>=StoreNames<D>,I=unknown,M extends IDBTransactionMode='readonly'>=IDBPCursorIteratorValue<D,T,S,I,M>&{value:StoreValue<D,S>};
export interface OpenDBCallbacks<D=unknown> {upgrade?:(db:IDBPDatabase<D>,oldVersion:number,newVersion:number|null,transaction:IDBPTransaction<D,ArrayLike<StoreNames<D>>,'versionchange'>,event:IDBVersionChangeEvent)=>void;blocked?:(oldVersion:number,newVersion:number|null,event:IDBVersionChangeEvent)=>void;blocking?:OpenDBCallbacks<D>['blocked'];terminated?:()=>void}
export interface DeleteDBCallbacks {blocked?:(oldVersion:number,event:IDBVersionChangeEvent)=>void}
export function openDB<D=unknown>(name:string,version?:number,options?:OpenDBCallbacks<D>):Promise<IDBPDatabase<D>>;
export function deleteDB(name:string,options?:DeleteDBCallbacks):Promise<void>;
export function wrap(value:IDBDatabase):IDBPDatabase;
export function wrap(value:IDBTransaction):IDBPTransaction;
export function wrap(value:IDBObjectStore):IDBPObjectStore;
export function wrap(value:IDBIndex):IDBPIndex;
export function wrap(value:IDBCursorWithValue):IDBPCursorWithValue;
export function wrap(value:IDBCursor):IDBPCursor;
export type Wrapped<T>=T extends IDBDatabase?IDBPDatabase:T extends IDBTransaction?IDBPTransaction:T extends IDBObjectStore?IDBPObjectStore:T extends IDBIndex?IDBPIndex:T extends IDBCursorWithValue?IDBPCursorWithValue:T extends IDBCursor?IDBPCursor:T;
export function wrap<T>(value:IDBRequest<T>):Promise<Wrapped<T>>;
export function wrap<T>(value:T):T;
export function unwrap<D>(value:IDBPDatabase<D>):IDBDatabase;
export function unwrap(value:IDBPTransaction):IDBTransaction;
export function unwrap(value:IDBPObjectStore):IDBObjectStore;
export function unwrap(value:IDBPIndex):IDBIndex;
export function unwrap(value:IDBPCursorWithValue):IDBCursorWithValue;
export function unwrap(value:IDBPCursor):IDBCursor;
export function unwrap<T>(value:Promise<T>):IDBRequest<T>;
export function unwrap(value:unknown):unknown;
