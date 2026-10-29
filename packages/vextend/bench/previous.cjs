'use strict';
const hasOwn=Object.hasOwn;
const objectSource=Function.prototype.toString.call(Object);
function plain(value){
  if(!value||typeof value!=='object')return false;
  const proto=Object.getPrototypeOf(value);
  if(proto===null||proto===Object.prototype)return true;
  if(Object.getPrototypeOf(proto)!==null)return false;
  const ctor=Object.getOwnPropertyDescriptor(proto,'constructor')?.value;
  return typeof ctor==='function'&&Function.prototype.toString.call(ctor)===objectSource;
}
function keys(value){
  const result=Object.keys(value);
  for(const key of Object.getOwnPropertySymbols(value))if(Object.prototype.propertyIsEnumerable.call(value,key))result.push(key);
  return result;
}
function assign(target,key,value){
  // Create an own field instead of invoking an inherited setter or mutating a
  // prototype. Existing own setters and native assignment failures remain visible.
  if(key==='__proto__'||!hasOwn(target,key)&&key in target)Object.defineProperty(target,key,{value,writable:true,enumerable:true,configurable:true});
  else target[key]=value;
}
function extend(...args){
  let deep=false,index=1,target=args[0];
  if(typeof target==='boolean'){deep=target;target=args[1];index=2;}
  if(target===null||typeof target!=='object'&&typeof target!=='function')target={};
  for(;index<args.length;index++){
    const source=args[index];if(source==null)continue;
    const input=Object(source);
    if(!deep){for(const key of keys(input)){if(!hasOwn(input,key))continue;const value=input[key];if(value!==undefined&&value!==target)assign(target,key,value);}continue;}
    const seen=new Map([[input,target]]),stack=[{input,target,keys:keys(input),index:0}];
    while(stack.length){
      const frame=stack[stack.length-1];
      if(frame.index===frame.keys.length){stack.pop();continue;}
      const key=frame.keys[frame.index++];if(!hasOwn(frame.input,key))continue;
      const value=frame.input[key];if(value===undefined||value===frame.target)continue;
      const array=Array.isArray(value);
      if(!array&&!plain(value)){assign(frame.target,key,value);continue;}
      if(seen.has(value)){assign(frame.target,key,seen.get(value));continue;}
      const previous=hasOwn(frame.target,key)?frame.target[key]:undefined;
      const clone=array?(Array.isArray(previous)?previous:[]):(plain(previous)?previous:{});
      seen.set(value,clone);assign(frame.target,key,clone);
      stack.push({input:value,target:clone,keys:keys(value),index:0});
    }
  }
  return target;
}
module.exports=extend;
