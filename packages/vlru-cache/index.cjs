"use strict";
// Map owns key identity; a doubly linked recency list makes hits and eviction
// constant-time without rebuilding Map insertion order.
const positive=(n,label,zero=true)=>{if(!Number.isSafeInteger(n)||n<(zero?0:1))throw new TypeError(label+" must be a "+(zero?"nonnegative":"positive")+" safe integer");return n};
class LRUCache {
 #items=new Map(); #head; #tail; #used=0; #max; #maxSize; #after=[];
 constructor(options){
  if(!options||typeof options!=="object")throw new TypeError("Cache options are required");
  const {max=0,maxSize=0,ttl=0}=options;
  this.#max=positive(max,"max");this.#maxSize=positive(maxSize,"maxSize");positive(ttl,"ttl");
  if(!max&&!maxSize)throw new TypeError("A count or size bound is required");
  for(const key of ["fetchMethod","memoMethod"])if(options[key]!==undefined)throw new TypeError(key+" is outside the synchronous cache API");
  if(options.ttlAutopurge)throw new TypeError("Automatic TTL timers are not supported; use bounded lazy expiry");
  for(const key of ["sizeCalculation","dispose","disposeAfter"])if(options[key]!==undefined&&typeof options[key]!=="function")throw new TypeError(key+" must be a function");
  if(options.sizeCalculation&&!maxSize&&!options.maxEntrySize)throw new TypeError("sizeCalculation requires a size bound");
  this.ttl=ttl;this.allowStale=!!options.allowStale;this.updateAgeOnGet=!!options.updateAgeOnGet;this.updateAgeOnHas=!!options.updateAgeOnHas;
  this.noDeleteOnStaleGet=!!options.noDeleteOnStaleGet;this.noUpdateTTL=!!options.noUpdateTTL;this.noDisposeOnSet=!!options.noDisposeOnSet;
  this.maxEntrySize=positive(options.maxEntrySize??maxSize,"maxEntrySize");
  this.sizeCalculation=options.sizeCalculation;this.dispose=options.dispose;this.disposeAfter=options.disposeAfter;
 }
 get max(){return this.#max} get maxSize(){return this.#maxSize}
 get size(){return this.#items.size} get calculatedSize(){return this.#used}
 #stale(n){return n.ttl>0&&performance.now()-n.start>n.ttl}
 #unlink(n){
  if(n.newer)n.newer.older=n.older;else this.#head=n.older;
  if(n.older)n.older.newer=n.newer;else this.#tail=n.newer;
 }
 #first(n){
  n.newer=undefined;n.older=this.#head;
  if(this.#head)this.#head.newer=n;else this.#tail=n;
  this.#head=n;
 }
 #touch(n){if(n!==this.#head){this.#unlink(n);this.#first(n)}}
 #dispose(n,reason){
  this.dispose?.(n.value,n.key,reason);
  if(this.disposeAfter)this.#after.push([n.value,n.key,reason]);
 }
 #flush(){while(this.#after.length){const batch=this.#after;this.#after=[];for(const args of batch)this.disposeAfter(...args)}}
 #remove(n,reason){this.#dispose(n,reason);this.#items.delete(n.key);this.#unlink(n);this.#used-=n.size}
 set(key,value,options={}){
  if(value===undefined){this.delete(key);return this}
  const ttl=positive(options.ttl??this.ttl,"ttl"),start=ttl?(options.start??performance.now()):0;
  let size=0;
  if(this.#maxSize||this.maxEntrySize){
   size=options.size??(options.sizeCalculation||this.sizeCalculation)?.(value,key);
   positive(size,"entry size",false);
  }else if(options.size!==undefined||options.sizeCalculation)throw new TypeError("Entry size requires a size bound");
  const old=this.#items.get(key);
  if(this.maxEntrySize&&size>this.maxEntrySize){if(old)this.#remove(old,"set");this.#flush();return this}
  if(old){
   if(old.value!==value&&!(options.noDisposeOnSet??this.noDisposeOnSet))this.#dispose(old,"set");
   this.#used+=size-old.size;old.value=value;old.size=size;
   if(!(options.noUpdateTTL??this.noUpdateTTL)){old.ttl=ttl;old.start=start}
   this.#touch(old);
  }else{
   const node={key,value,size,ttl,start,newer:undefined,older:undefined};
   this.#items.set(key,node);this.#used+=size;this.#first(node);
  }
  while((this.#max&&this.size>this.#max)||(this.#maxSize&&this.#used>this.#maxSize))this.#remove(this.#tail,"evict");
  this.#flush();return this;
 }
 get(key,options={}){
  const n=this.#items.get(key);if(!n)return undefined;
  if(this.#stale(n)){
   const value=n.value;
   if(!(options.noDeleteOnStaleGet??this.noDeleteOnStaleGet)){this.#remove(n,"expire");this.#flush()}
   return (options.allowStale??this.allowStale)?value:undefined;
  }
  this.#touch(n);if(options.updateAgeOnGet??this.updateAgeOnGet)n.start=performance.now();
  return n.value;
 }
 peek(key,options={}){const n=this.#items.get(key);return n&&(!this.#stale(n)||(options.allowStale??this.allowStale))?n.value:undefined}
 has(key,options={}){const n=this.#items.get(key);if(!n||this.#stale(n))return false;if(options.updateAgeOnHas??this.updateAgeOnHas)n.start=performance.now();return true}
 delete(key){const n=this.#items.get(key);if(!n)return false;this.#remove(n,"delete");this.#flush();return true}
 clear(){while(this.#tail)this.#remove(this.#tail,"delete");this.#flush()}
 pop(){while(this.#tail){const n=this.#tail,stale=this.#stale(n);this.#remove(n,"evict");this.#flush();if(!stale||this.allowStale)return n.value}}
 getRemainingTTL(key){const n=this.#items.get(key);return !n?0:!n.ttl?Infinity:n.ttl-(performance.now()-n.start)}
 purgeStale(){let changed=false;for(const n of this.#items.values())if(this.#stale(n)){this.#remove(n,"expire");changed=true}this.#flush();return changed}
 *#iterate(reverse){
  let n=reverse?this.#tail:this.#head;
  while(n){const next=reverse?n.newer:n.older;if(this.#items.get(n.key)===n&&(!this.#stale(n)||this.allowStale))yield [n.key,n.value];n=next}
 }
 entries(){return this.#iterate(false)} rentries(){return this.#iterate(true)}
 *keys(){for(const [key]of this.entries())yield key} *rkeys(){for(const [key]of this.rentries())yield key}
 *values(){for(const [,value]of this.entries())yield value} *rvalues(){for(const [,value]of this.rentries())yield value}
 [Symbol.iterator](){return this.entries()}
 forEach(fn,thisArg=this){for(const [key,value]of this.entries())fn.call(thisArg,value,key,this)}
 rforEach(fn,thisArg=this){for(const [key,value]of this.rentries())fn.call(thisArg,value,key,this)}
 find(fn,options={}){for(const [key,value]of this.entries())if(fn(value,key,this))return this.get(key,options)}
 get [Symbol.toStringTag](){return "LRUCache"}
}
// Babel's existing default-constructor import uses only max/get/set. The named
// modern API and that constructor alias share this implementation.
module.exports=LRUCache;
module.exports.LRUCache=LRUCache;
