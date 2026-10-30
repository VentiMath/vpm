'use strict';
const token='{{projectId}}';
const message='Sorry, we cannot connect to Cloud Services without a project\n ID. You may specify one with an environment variable named\n "GOOGLE_CLOUD_PROJECT".';
class MissingProjectIdError extends Error {
  constructor() {super(message);this.name='MissingProjectIdError';}
}
function replaceString(value,projectId) {
  const first=value.indexOf(token);
  if (first < 0) return value;
  if (projectId == null || projectId === '' || projectId === token) throw new MissingProjectIdError();
  if (typeof projectId !== 'string') throw new TypeError('projectId must be a string');
  const after=first+token.length;
  if (value.indexOf(token,after) < 0) return value.slice(0,first)+projectId+value.slice(after);
  let result=value.slice(0,first)+projectId,start=after,next;
  while ((next=value.indexOf(token,start)) >= 0) {result+=value.slice(start,next)+projectId;start=next+token.length;}
  return result+value.slice(start);
}
function traversable(value) {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return true;
  const proto=Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}
function replaceProjectIdToken(value,projectId) {
  if (typeof value === 'string') return replaceString(value,projectId);
  if (!traversable(value)) return value;
  const result=Array.isArray(value)?new Array(value.length):value;
  let seen,stack;
  let source=value,target=result,keys=Object.keys(source),index=0;
  for (;;) {
    if (index===keys.length) {
      if (!stack?.length) return result;
      ({source,target,keys,index}=stack.pop());continue;
    }
    const key=keys[index++], descriptor=Object.getOwnPropertyDescriptor(source,key);
    if (!descriptor || !('value' in descriptor)) continue;
    const original=descriptor.value;let next=original,descend=false;
    if (typeof original==='string') next=replaceString(original,projectId);
    else if (traversable(original)) {
      seen ||= new WeakMap([[value,result]]);
      if (seen.has(original)) next=seen.get(original);
      else {next=Array.isArray(original)?new Array(original.length):original;seen.set(original,next);descend=true;}
    }
    if (target!==source) Object.defineProperty(target,key,{value:next,writable:true,enumerable:true,configurable:true});
    else if (next!==original) {
      if (!descriptor.writable) throw new TypeError('Cannot replace project ID in a read-only property: '+key);
      // String substitution cannot run user code between the descriptor check
      // and this write, so an existing own data slot can be updated directly.
      if (typeof original==='string') target[key]=next;
      else Object.defineProperty(target,key,{value:next});
    }
    if (descend) {
      if (index<keys.length) (stack ||= []).push({source,target,keys,index});
      source=original;target=next;keys=Object.keys(source);index=0;
    }
  }
}
exports.replaceProjectIdToken=replaceProjectIdToken;
exports.MissingProjectIdError=MissingProjectIdError;
