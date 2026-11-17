'use strict';
// Cache the intrinsic once. It cannot be shadowed by a dictionary field, and
// avoids Node's slower Object.hasOwn path on these short property loops.
const hasOwn=Object.prototype.hasOwnProperty;
const native = /\{\s*\[native code\]\s*\}/;
const defaultString = Object.prototype.toString;
const whitespace=/\s/,separators=/\s+/;
function customString(value,fn) {
  return typeof fn === 'function' && fn !== defaultString && !native.test(Function.prototype.toString.call(fn));
}
function append(out, value, depth) {
  if (!value) return out;
  const type = typeof value;
  if (type === 'string' || type === 'number') return out ? out + ' ' + value : '' + value;
  if (type !== 'object') return out;
  if (Array.isArray(value)) {
    if (depth === 32) walk(value, item => {out=append(out,item,0);});
    else for(let i=0;i<value.length;i++) out=append(out,value[i],depth+1);
    return out;
  }
  const fn=value.toString;
  if(customString(value,fn)){const text=fn.call(value);return text?(out?out+' '+text:''+text):out;}
  for(const key in value) if(hasOwn.call(value,key)&&value[key]) out=out?out+' '+key:key;
  return out;
}
function appendBound(out,value,binding,depth){
  if(!value)return out;
  const type=typeof value;
  if(type==='string'||type==='number'){
    const text=binding&&hasOwn.call(binding,value)&&binding[value]||value;
    return out?out+' '+text:''+text;
  }
  if(type!=='object')return out;
  if(Array.isArray(value)){
    if(depth===32)walk(value,item=>{out=appendBound(out,item,binding,0);});
    else for(let i=0;i<value.length;i++)out=appendBound(out,value[i],binding,depth+1);
    return out;
  }
  const fn=value.toString;
  if(customString(value,fn)){const text=fn.call(value);return text?(out?out+' '+text:''+text):out;}
  for(const key in value)if(hasOwn.call(value,key)&&value[key]){const text=binding&&hasOwn.call(binding,key)&&binding[key]||key;out=out?out+' '+text:''+text;}
  return out;
}
// Only unusually deep arrays allocate frames and active-path bookkeeping.
// Shared arrays remain legal; a cycle cannot exhaust the JS call stack.
function walk(array,visit){
  const active=new Set([array]),frames=[{array,index:0}];
  while(frames.length){const f=frames[frames.length-1];if(f.index>=f.array.length){active.delete(f.array);frames.pop();continue;}
    const value=f.array[f.index++];if(Array.isArray(value)){if(active.has(value))throw new TypeError('Class-name arrays must not contain cycles');active.add(value);frames.push({array:value,index:0});}else visit(value);
  }
}
function classNames(){
  let out='';
  for(let i=0;i<arguments.length;i++){
    const value=arguments[i];if(!value)continue;
    const type=typeof value;
    if(type==='string'||type==='number'){out=out?out+' '+value:''+value;continue;}
    if(type!=='object')continue;
    if(Array.isArray(value)){out=append(out,value,0);continue;}
    const fn=value.toString;
    if(customString(value,fn)){const text=fn.call(value);if(text)out=out?out+' '+text:''+text;continue;}
    for(const key in value)if(hasOwn.call(value,key)&&value[key])out=out?out+' '+key:key;
  }
  return out;
}
function bind(){
  let out='';const binding=this;
  for(let i=0;i<arguments.length;i++){
    const value=arguments[i];if(!value)continue;
    const type=typeof value;
    if(type==='string'||type==='number'){const text=binding&&hasOwn.call(binding,value)&&binding[value]||value;out=out?out+' '+text:''+text;continue;}
    if(type!=='object')continue;
    if(Array.isArray(value)){out=appendBound(out,value,binding,0);continue;}
    const fn=value.toString;
    if(customString(value,fn)){const text=fn.call(value);if(text)out=out?out+' '+text:''+text;continue;}
    for(const key in value)if(hasOwn.call(value,key)&&value[key]){const text=binding&&hasOwn.call(binding,key)&&binding[key]||key;out=out?out+' '+text:''+text;}
  }
  return out;
}
function record(enabled,value,depth){
  if(!value)return;
  if(typeof value==='string'){if(!whitespace.test(value)){enabled[value]=true;return;}const keys=value.split(separators);for(let i=0;i<keys.length;i++)enabled[keys[i]]=true;return;}
  if(typeof value==='number'){enabled[value]=true;return;}
  if(typeof value!=='object')return;
  if(Array.isArray(value)){recordArray(enabled,value,depth);return;}
  const fn=value.toString;
  if(customString(value,fn)){const text=fn.call(value);if(text)enabled[text]=true;return;}
  for(const key in value)if(hasOwn.call(value,key))enabled[key]=!!value[key];
}
function recordArray(enabled,array,depth){
  if(depth===32)walk(array,item=>record(enabled,item,0));
  else for(let i=0;i<array.length;i++)record(enabled,array[i],depth+1);
}
function dedupe(){
  const enabled=Object.create(null);
  for(let i=0;i<arguments.length;i++)record(enabled,arguments[i],0);
  let out='',first=true;
  for(const key in enabled)if(enabled[key]){out+=first?key:' '+key;first=false;}
  return out;
}
for(const fn of [classNames,bind,dedupe])fn.default=fn;
module.exports={classNames,bind,dedupe};
