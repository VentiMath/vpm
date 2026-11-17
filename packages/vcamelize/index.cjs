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
function object(value, active) {
  if(value===null||typeof value!=='object'||value instanceof Date||value instanceof RegExp) return value;
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
