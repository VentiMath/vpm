'use strict';
const {snapshotJson}=require('./json-snapshot');
exports.deepCopy=value=>snapshotJson(value,'Data must not contain cycles.');
// Kept for internal compatibility fixtures; production callers only copy error
// data. Never traverse a destination's inherited properties during a merge.
exports.deepExtend=function deepExtend(target,source){
  const copy=exports.deepCopy(source);
  if(!copy||typeof copy!=='object'||Array.isArray(copy)||Object.getPrototypeOf(copy)!==Object.prototype)return copy;
  if(target===undefined)return copy;
  const work=[[target,copy]];
  while(work.length){const [out,input]=work.pop();for(const key of Object.keys(input)){
    const value=input[key],prior=Object.hasOwn(out,key)?out[key]:undefined;
    if(value&&Object.getPrototypeOf(value)===Object.prototype&&prior&&typeof prior==='object'&&!Array.isArray(prior))work.push([prior,value]);
    else Object.defineProperty(out,key,{value,writable:true,enumerable:true,configurable:true});
  }}
  return target;
};
