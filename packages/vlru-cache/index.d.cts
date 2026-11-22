declare namespace Cache {
 export import LRUCache = Cache;
 type DisposeReason="evict"|"set"|"delete"|"expire";
 interface Options<K,V> {
  max?:number;maxSize?:number;maxEntrySize?:number;ttl?:number;
  sizeCalculation?:(value:V,key:K)=>number;
  dispose?:(value:V,key:K,reason:DisposeReason)=>void;
  disposeAfter?:(value:V,key:K,reason:DisposeReason)=>void;
  allowStale?:boolean;updateAgeOnGet?:boolean;updateAgeOnHas?:boolean;
  noDeleteOnStaleGet?:boolean;noUpdateTTL?:boolean;noDisposeOnSet?:boolean;
 }
 interface SetOptions<K,V> {ttl?:number;start?:number;size?:number;sizeCalculation?:(value:V,key:K)=>number;noUpdateTTL?:boolean;noDisposeOnSet?:boolean}
 interface GetOptions {allowStale?:boolean;updateAgeOnGet?:boolean;noDeleteOnStaleGet?:boolean}
}
declare class Cache<K extends {},V extends {}> implements Iterable<[K,V]> {
 constructor(options:Cache.Options<K,V>);
 readonly max:number;readonly maxSize:number;readonly size:number;readonly calculatedSize:number;
 maxEntrySize:number;ttl:number;allowStale:boolean;updateAgeOnGet:boolean;updateAgeOnHas:boolean;
 noDeleteOnStaleGet:boolean;noUpdateTTL:boolean;noDisposeOnSet:boolean;
 sizeCalculation?:Cache.Options<K,V>["sizeCalculation"];
 dispose?:Cache.Options<K,V>["dispose"];disposeAfter?:Cache.Options<K,V>["disposeAfter"];
 set(key:K,value:V|undefined,options?:Cache.SetOptions<K,V>):this;
 get(key:K,options?:Cache.GetOptions):V|undefined;
 peek(key:K,options?:Pick<Cache.GetOptions,"allowStale">):V|undefined;
 has(key:K,options?:{updateAgeOnHas?:boolean}):boolean;
 delete(key:K):boolean;clear():void;pop():V|undefined;getRemainingTTL(key:K):number;purgeStale():boolean;
 entries():Generator<[K,V]>;rentries():Generator<[K,V]>;
 keys():Generator<K>;rkeys():Generator<K>;values():Generator<V>;rvalues():Generator<V>;
 [Symbol.iterator]():Generator<[K,V]>;
 forEach(callback:(value:V,key:K,cache:this)=>void,thisArg?:unknown):void;
 rforEach(callback:(value:V,key:K,cache:this)=>void,thisArg?:unknown):void;
 find(callback:(value:V,key:K,cache:this)=>unknown,options?:Cache.GetOptions):V|undefined;
}
export = Cache;
