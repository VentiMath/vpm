'use strict';
// Legacy descriptor decorators and ordinary function wrappers. No transpiler is
// needed by consumers of the function API or by the published implementation.
function callable(fn) {
 if (typeof fn !== 'function') throw new TypeError('Expected a method or function');
 return fn;
}
function boundDescriptor(target, key, descriptor) {
 const fn=callable(descriptor?.value);
 return {configurable:true,get() {
  const value=fn.bind(this);
  Object.defineProperty(this,key,{value,writable:true,configurable:true});
  return value;
 }};
}
function bind(target, key, descriptor) {
 if(arguments.length>=3) return boundDescriptor(target,key,descriptor);
 if(arguments.length===2) return callable(target).bind(key);
 return boundDescriptor;
}
function cached(fn, options) {
 callable(fn);
 const cache=options?.cache || Object.create(null),fold=options?.caseSensitive===false;
 return function(...args) {
  let key=String(args[0]); if(fold) key=key.toLowerCase();
  if(Object.hasOwn(cache,key)) return cache[key];
  const value=fn.apply(this,args);
  // A supplied plain object must treat __proto__ as a cache entry, not a setter.
  if(key==='__proto__') Object.defineProperty(cache,key,{value,writable:true,enumerable:true,configurable:true});
  else cache[key]=value;
  return value;
 };
}
function delayed(fn, options) {
 callable(fn);
 const delay=options?.delay || options || 0;
 let pending=false,receiver,args;
 function flush() {
  const context=receiver,values=args;
  // Retire before invoking user code: recursive calls schedule a new window,
  // and exceptions cannot leave the wrapper permanently pending.
  pending=false;receiver=args=undefined;
  fn.apply(context,values);
 }
 return function(...values) {
  receiver=this;args=values;
  if(!pending) {pending=true;try {setTimeout(flush,delay);}catch(error){pending=false;receiver=args=undefined;throw error;}}
 };
}
function decorate(factory,options) {
 return function(target,key,descriptor) {
  if(!descriptor) throw new TypeError('Expected a method descriptor');
  descriptor.value=factory(descriptor.value,options);
 };
}
function memoize(target,options,descriptor) {
 if(arguments.length>=3) return decorate(cached)(target,options,descriptor);
 if(typeof target==='function') return cached(target,options);
 return decorate(cached,target);
}
function debounce(target,options,descriptor) {
 if(arguments.length>=3) return decorate(delayed)(target,options,descriptor);
 if(typeof target==='function') return delayed(target,options);
 if(typeof options==='function') return delayed(options,target);
 return decorate(delayed,target);
}
const api={bind,memoize,debounce};
module.exports={...api,default:api};
