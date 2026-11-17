'use strict';
// No browser globals are touched until an operation is requested.
const enhanced=new WeakMap(),original=new WeakMap(),transactions=new WeakMap(),cursorRequests=new WeakMap();
const advances=new Set(['advance','continue','continuePrimaryKey']);
const reads=new Set(['get','getKey','getAll','getAllKeys','count']);
const writes=new Set(['put','add','delete','clear']);
function kind(value){
 if(!value||typeof value!=='object')return '';
 for(const name of ['IDBRequest','IDBDatabase','IDBTransaction','IDBObjectStore','IDBIndex','IDBCursor'])if(typeof globalThis[name]==='function'&&value instanceof globalThis[name])return name;
 return '';
}
function raw(value){return original.get(value)||value;}
function requestResult(request){
 const promise=new Promise((resolve,reject)=>{
  const clear=()=>{request.removeEventListener('success',success);request.removeEventListener('error',error);};
  const success=()=>{clear();const value=request.result;if(kind(value)==='IDBCursor')cursorRequests.set(value,request);resolve(wrap(value));};
  const error=()=>{clear();reject(request.error);};
  if(request.readyState==='done'){request.error?error():success();return;}
  request.addEventListener('success',success);request.addEventListener('error',error);
 });
 original.set(promise,request);return promise;
}
function completion(transaction){
 let promise=transactions.get(transaction);if(promise)return promise;
 promise=new Promise((resolve,reject)=>{
  const clear=()=>{transaction.removeEventListener('complete',complete);transaction.removeEventListener('abort',abort);};
  const complete=()=>{clear();resolve();};
  const abort=()=>{clear();reject(transaction.error||new DOMException('The transaction was aborted.','AbortError'));};
  transaction.addEventListener('complete',complete);transaction.addEventListener('abort',abort);
 });
 // Callers can await the failed request instead of done. Keep that choice from
 // creating a second unhandled rejection while preserving done's rejection.
 promise.catch(()=>{});transactions.set(transaction,promise);return promise;
}
function method(fn,key){
 let result=enhanced.get(fn);if(result)return result;
 result=function(...args){const receiver=raw(this),value=Reflect.apply(fn,receiver,args.map(raw));
  if(advances.has(key)&&kind(receiver)==='IDBCursor')return requestResult(cursorRequests.get(receiver)||receiver.request);
  return wrap(value);
 };
 enhanced.set(fn,result);original.set(result,fn);return result;
}
const helpers=new Map();
function shortcut(key){
 if(typeof key!=='string')return;
 const index=key.endsWith('FromIndex'),operation=index?key.slice(0,-9):key;
 if(!(reads.has(operation)||!index&&writes.has(operation)))return;
 if(!helpers.has(key))helpers.set(key,async function(storeName,...args){
  const tx=this.transaction(storeName,writes.has(operation)?'readwrite':'readonly');
  const store=index?tx.store.index(args.shift()):tx.store;
  const value=store[operation](...args);
  return writes.has(operation)?(await Promise.all([value,tx.done]))[0]:await value;
 });
 return helpers.get(key);
}
async function* iterate(source,args){
 let cursor=kind(raw(source))==='IDBCursor'?source:await source.openCursor(...args);
 while(cursor){let moved;
  const current=cursor;
  const item=new Proxy(current,{get(target,key){if(advances.has(key))return(...args)=>{moved=target[key](...args);moved.catch(()=>{});};return Reflect.get(target,key);}});
  original.set(item,raw(current));yield item;
  cursor=await(moved||current.continue());
 }
}
const iterateMethod=function(...args){return iterate(this,args);};
function wrap(value){
 const cached=enhanced.get(value);if(cached)return cached;
 const type=kind(value);if(type==='IDBRequest')return requestResult(value);
 if(typeof value==='function')return method(value,value.name);
 if(!type)return value;
 let proxy=enhanced.get(value);if(proxy)return proxy;
 if(type==='IDBTransaction')completion(value);
 proxy=new Proxy(value,{
  get(target,key){
   if(type==='IDBTransaction'){
    if(key==='done')return completion(target);
    if(key==='store')return target.objectStoreNames.length===1?wrap(target.objectStore(target.objectStoreNames[0])):undefined;
   }
   if(type==='IDBDatabase'&&!(key in target)){const helper=shortcut(key);if(helper)return helper;}
   if((key===Symbol.asyncIterator||key==='iterate')&&['IDBObjectStore','IDBIndex','IDBCursor'].includes(type))return iterateMethod;
   const member=Reflect.get(target,key,target);return typeof member==='function'?method(member,key):wrap(member);
  },
  set(target,key,value){return Reflect.set(target,key,raw(value),target);},
  has(target,key){return key in target||type==='IDBTransaction'&&(key==='done'||key==='store')||type==='IDBDatabase'&&!!shortcut(key)||(key===Symbol.asyncIterator||key==='iterate')&&['IDBObjectStore','IDBIndex','IDBCursor'].includes(type);},
 });
 enhanced.set(value,proxy);original.set(proxy,value);return proxy;
}
function unwrap(value){return original.get(value);}
function openDB(name,version,options={}){
 const request=indexedDB.open(name,version);
 if(options.upgrade)request.addEventListener('upgradeneeded',event=>options.upgrade(wrap(request.result),event.oldVersion,event.newVersion,wrap(request.transaction),event));
 if(options.blocked)request.addEventListener('blocked',event=>options.blocked(event.oldVersion,event.newVersion,event));
 const promise=requestResult(request);
 promise.then(db=>{if(options.blocking)db.addEventListener('versionchange',event=>options.blocking(event.oldVersion,event.newVersion,event));if(options.terminated)db.addEventListener('close',()=>options.terminated());}).catch(()=>{});
 return promise;
}
function deleteDB(name,options={}){
 const request=indexedDB.deleteDatabase(name);
 if(options.blocked)request.addEventListener('blocked',event=>options.blocked(event.oldVersion,event));
 return requestResult(request).then(()=>undefined);
}
module.exports={openDB,deleteDB,wrap,unwrap};
