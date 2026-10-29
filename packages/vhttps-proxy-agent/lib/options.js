'use strict';
const net=require('node:net');
const {validateHeaderName,validateHeaderValue}=require('node:http');
function snapshot(value,seen=new Map()){
  if(Buffer.isBuffer(value))return Buffer.from(value);
  if(ArrayBuffer.isView(value))return Buffer.from(new Uint8Array(value.buffer,value.byteOffset,value.byteLength));
  if(value&&typeof value==='object'&&(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)){
    if(seen.has(value))return seen.get(value);
    const copy=Array.isArray(value)?[]:Object.create(Object.getPrototypeOf(value));seen.set(value,copy);
    for(const key of Object.keys(value))Object.defineProperty(copy,key,{value:snapshot(value[key],seen),enumerable:true});
    return Object.freeze(copy);
  }
  return value;
}
function headers(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Proxy headers must be an object');
  const result=Object.create(null);
  for(const name of Object.keys(input)){
    const original=input[name];if(original===undefined)continue;
    try{validateHeaderName(name);}catch{throw new TypeError('Invalid proxy header name');}
    const value=String(original);
    try{validateHeaderValue(name,value);}catch{throw new TypeError('Invalid proxy header value');}
    const lower=name.toLowerCase();
    if(Object.hasOwn(result,lower))throw new TypeError('Duplicate proxy header name');
    if(lower==='transfer-encoding'||lower==='content-length'&&value!=='0')throw new TypeError('CONNECT request headers cannot declare a body');
    result[lower]=Object.freeze({name,value});
  }
  return Object.freeze(result);
}
function authority(options){
  const raw=options.host;
  if(typeof raw!=='string'||!raw)throw new TypeError('CONNECT destination host is required');
  const host=raw.startsWith('[')&&raw.endsWith(']')?raw.slice(1,-1):raw;
  const ip=net.isIP(host);
  if(!ip&&(!host||/[^A-Za-z0-9_.-]/.test(host)))throw new TypeError('Invalid CONNECT destination host');
  const port=typeof options.port==='string'&&options.port!==''&&!/\D/.test(options.port)?Number(options.port):options.port;
  if(!Number.isInteger(port)||port<1||port>65535)throw new RangeError('CONNECT destination port must be from 1 to 65535');
  return {host,port,text:(ip===6?'['+host+']':host)+':'+port};
}
function servername(options){return options.servername===undefined&&options.host&&!net.isIP(options.host)?{...options,servername:options.host}:options;}
function compileHeaders(values,auth,keepAlive){
  let text='',connection=false;
  for(const [lower,{name,value}]of Object.entries(values)){
    if(lower==='host'||lower==='proxy-authorization'&&auth!==null)continue;
    if(lower==='proxy-connection')connection=true;
    text+=name+': '+value+'\r\n';
  }
  if(auth!==null)text+='Proxy-Authorization: Basic '+auth+'\r\n';
  if(!connection)text+='Proxy-Connection: '+(keepAlive?'Keep-Alive':'close')+'\r\n';
  return text;
}
module.exports={snapshot,headers,authority,servername,compileHeaders};
