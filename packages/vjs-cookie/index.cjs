'use strict';
const nameSafe="!#$&'*+-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ^_`abcdefghijklmnopqrstuvwxyz|~";
const valueSafe="!#$&'()*+-./0123456789:<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";
function encoder(safe) {
 const table=new Uint8Array(128),escapes=Object.create(null),patterns=[];
 for(const c of safe){const n=c.charCodeAt(0);table[n]=1;const code=n.toString(16).toUpperCase().padStart(2,'0');escapes['%'+code]=c;if(encodeURIComponent(c)!==c)patterns.push(code);}
 const escaped=new RegExp('%(?:'+patterns.join('|')+')','g');
 return value=>{
  const text=String(value);let i=0;
  for(;i<text.length;i++)if(!table[text.charCodeAt(i)])break;
  if(i===text.length)return text;
  const encoded=encodeURIComponent(text).replace(escaped,part=>escapes[part]);
  return safe===nameSafe?encoded.replace(/[()]/g,c=>c==='('?'%28':'%29'):encoded;
 };
}
const encodeName=encoder(nameSafe),encodeValue=encoder(valueSafe);
function decodeValue(value) {
 if(value[0]==='"')value=value.slice(1,-1);
 // Decode valid percent runs independently: literal %ZZ stays literal, while
 // invalid UTF-8 causes this cookie to be omitted by the caller.
 return value.indexOf('%')<0?value:value.replace(/(?:%[\da-f]{2})+/gi,decodeURIComponent);
}
function instance(attributes,converter) {
 const defaults=Object.freeze({...attributes}),codec=Object.freeze({...converter});
 function set(name,value,options) {
  if(typeof document==='undefined')return undefined;
  const attrs={...defaults,...options};
  if(typeof attrs.expires==='number'){
   if(!Number.isFinite(attrs.expires))throw new TypeError('Cookie expires must be finite');
   attrs.expires=new Date(Date.now()+attrs.expires*86400000);
  }
  if(attrs.expires!==undefined){
   let epoch;try{epoch=Date.prototype.getTime.call(attrs.expires)}catch{}
   if(!Number.isFinite(epoch))throw new TypeError('Cookie expires must be a valid Date or number of days');
   attrs.expires=Date.prototype.toUTCString.call(attrs.expires);
  }
  let output=encodeName(name)+'='+codec.write(value,name);
  for(const key of Object.keys(attrs)){
   const value=attrs[key];if(!value)continue;
   if(!/^[!#$%&'*+\-.^_`|~\da-z]+$/i.test(key))throw new TypeError('Invalid cookie attribute name');
   if(value===true){output+='; '+key;continue;}
   const text=String(value);if(/[\r\n\0]/.test(text))throw new TypeError('Invalid cookie attribute value');
   output+='; '+key+'='+text.split(';',1)[0];
  }
  document.cookie=output;return output;
 }
 function get(name) {
  if(typeof document==='undefined'||(arguments.length&& !name))return undefined;
  const all=name===undefined,result=all?{}:undefined,text=document.cookie;
  let start=0;
  while(start<text.length){
   const delimiter=text.indexOf(';',start),end=delimiter<0?text.length:delimiter;
   while(start<end&&(text.charCodeAt(start)===32||text.charCodeAt(start)===9))start++;
   let separator=start;while(separator<end&&text.charCodeAt(separator)!==61)separator++;
   if(start<end){
    try{
     const raw=text.slice(start,separator),key=raw.includes('%')?decodeURIComponent(raw):raw;
     if(all||key===name){
      const value=codec.read(text.slice(Math.min(separator+1,end),end),key);
      if(!all)return value;
      if(!Object.hasOwn(result,key))Object.defineProperty(result,key,{value,writable:true,enumerable:true,configurable:true});
     }
    }catch{/* One malformed cookie must not hide unrelated cookies. */}
   }
   start=end+1;
  }
  return result;
 }
 const api={};
 Object.defineProperties(api,{
  set:{value:set},get:{value:get},remove:{value:(name,options)=>{set(name,'',{...options,expires:-1});}},
  withAttributes:{value:options=>instance({...defaults,...options},codec)},
  withConverter:{value:options=>instance(defaults,{...codec,...options})},
  attributes:{value:defaults},converter:{value:codec}
 });
 return api;
}
module.exports=instance({path:'/'},{read:decodeValue,write:encodeValue});
