'use strict';
const native = /\{\s*\[native code\]\s*\}/;
function customString(value) {
  const fn = value.toString;
  return typeof fn === 'function' && fn !== Object.prototype.toString && !native.test(Function.prototype.toString.call(fn)) ? {value:fn.call(value)} : null;
}
function append(out, value, binding, depth) {
  if (!value) return out;
  const type = typeof value;
  if (type === 'string' || type === 'number') {
    const text = binding && Object.hasOwn(binding,value) && binding[value] || value;
    return out ? out + ' ' + text : '' + text;
  }
  if (type !== 'object') return out;
  if (Array.isArray(value)) {
    if (depth === 32) {
      walk(value, item => {out = append(out,item,binding,0);});
    } else for (let i=0;i<value.length;i++) out = append(out,value[i],binding,depth+1);
    return out;
  }
  const custom = customString(value);
  if (custom) return custom.value ? (out ? out+' '+custom.value : ''+custom.value) : out;
  for (const key in value) if (Object.hasOwn(value,key) && value[key]) {const text=binding && Object.hasOwn(binding,key) && binding[key] || key;out=out ? out+' '+text : ''+text;}
  return out;
}
// Deep inputs use frames, so array depth cannot exhaust the JavaScript stack.
// The active path detects cycles without rejecting a shared child array.
function walk(array, visit) {
  const active=new Set([array]),frames=[{array,index:0}];
  while(frames.length){const f=frames[frames.length-1];if(f.index===f.array.length){active.delete(f.array);frames.pop();continue;}
    const value=f.array[f.index++];if(Array.isArray(value)){if(active.has(value))throw new TypeError('Class-name arrays must not contain cycles');active.add(value);frames.push({array:value,index:0});}else visit(value);
  }
}
function classNames(){let out='';for(let i=0;i<arguments.length;i++)out=append(out,arguments[i],null,0);return out;}
function bind(){let out='';for(let i=0;i<arguments.length;i++)out=append(out,arguments[i],this,0);return out;}
function dedupe(){
  const enabled=Object.create(null);
  const visit=(value,depth=0)=>{
    if(!value)return;
    if(typeof value==='string'){for(const key of value.split(/\s+/))enabled[key]=true;return;}
    if(typeof value==='number'){enabled[value]=true;return;}
    if(typeof value!=='object')return;
    if(Array.isArray(value)){if(depth===32)walk(value,visit);else for(let i=0;i<value.length;i++)visit(value[i],depth+1);return;}
    const custom=customString(value);if(custom){if(custom.value)enabled[custom.value]=true;return;}
    for(const key in value)if(Object.hasOwn(value,key))enabled[key]=!!value[key];
  };
  for(let i=0;i<arguments.length;i++)visit(arguments[i]);
  return Object.keys(enabled).filter(key=>enabled[key]).join(' ');
}
for(const fn of [classNames,bind,dedupe])fn.default=fn;
module.exports={classNames,bind,dedupe};
