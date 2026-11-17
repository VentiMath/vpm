"use strict";
// A separator consumes the next ASCII word character, or disappears at the end.
// Scan once so an already camel-cased property can retain its original string.
function name(value) {
  let start=0, result='';
  for(let i=0;i<value.length;i++) {
    const c=value.charCodeAt(i);
    if(c!==45&&c!==46&&c!==95) continue;
    const n=value.charCodeAt(i+1);
    if(i+1===value.length){result+=value.slice(start,i);start=i+1;break;}
    if(n===95||(n>=48&&n<=57)||(n>=65&&n<=90)||(n>=97&&n<=122)) {
      result+=value.slice(start,i)+value[i+1].toUpperCase();i++;start=i+1;
    }
  }
  return start ? result+value.slice(start) : value;
}
const objectTag=Object.prototype.toString;
const dateTime=Date.prototype.getTime;
const regexpSource=Object.getOwnPropertyDescriptor(RegExp.prototype,'source').get;
function preserved(value) {
  if(!(Symbol.toStringTag in value)) {
    const tag=objectTag.call(value);
    return tag==='[object Date]'||tag==='[object RegExp]';
  }
  // A custom tag can lie or throw. Check native internal slots without reading it.
  try { dateTime.call(value); return true; } catch {}
  try { regexpSource.call(value); return true; } catch {}
  return false;
}
function object(value, active) {
  if(value===null||typeof value!=='object'||preserved(value)) return value;
  if(active.has(value)) throw new TypeError('vcamelize does not accept cyclic objects');
  active.add(value);
  try {
    if(Array.isArray(value)) return value.map(item=>object(item,active));
    const out={};
    for(const key of Object.keys(value)) {
      const next=name(key), child=object(value[key],active);
      // Data keys must never invoke a prototype setter.
      Object.defineProperty(out,next,{value:child,writable:true,enumerable:true,configurable:true});
    }
    return out;
  } finally {active.delete(value);}
}
function camelize(value) {
  return typeof value==='string' ? name(value) : object(value,new Set());
}
module.exports=camelize;
