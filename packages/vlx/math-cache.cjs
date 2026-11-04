'use strict';
const {VlxError}=require('./source.cjs'),{normalized}=require('./render-tree.cjs');
// Both output adapters use the same validated, bounded LRU policy.
function mathCache(render,sizeOf,options={}){
 const entries=options.cacheEntries??128,maxBytes=options.cacheBytes??2097152;
 for(const [name,n,max]of [['cacheEntries',entries,4096],['cacheBytes',maxBytes,16777216]])if(!Number.isSafeInteger(n)||n<0||n>max)throw new RangeError(`${name} is outside its supported range`);
 const cache=new Map();let bytes=0;
 function math(tex,settings={}){
  if(typeof tex!=='string')throw new TypeError('TeX must be a string');
  if(tex.length>16384)throw new VlxError('LIMIT','At most 16384 TeX characters are supported');
  const checked=normalized(settings),key=JSON.stringify([tex,checked.display,checked.fontSize??null]);
  if(cache.has(key)){const item=cache.get(key);cache.delete(key);cache.set(key,item);return item.value;}
  const value=render(tex,checked),size=key.length*2+sizeOf(value);
  if(entries&&size<=maxBytes){cache.set(key,{value,size});bytes+=size;while(cache.size>entries||bytes>maxBytes){const key=cache.keys().next().value;bytes-=cache.get(key).size;cache.delete(key);}}
  return value;
 }
 return {math,clearCache(){cache.clear();bytes=0;}};
}
exports.mathCache=mathCache;
