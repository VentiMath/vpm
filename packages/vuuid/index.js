'use strict';
const {randomUUID,createHash}=require('node:crypto');
const legacyV1=require('./lib/v1.js').default;
const rng=require('./lib/rng.js').default;
const {unsafeStringify}=require('./lib/stringify.js');
const validate=require('./lib/validate.js').default;
const parse=require('./lib/parse.js').default;
const version=require('./lib/version.js').default;
const NIL='00000000-0000-0000-0000-000000000000';
function bytes(value,length,label){
  if(!(value instanceof Uint8Array)&&!Array.isArray(value))throw new TypeError(label+' must be a byte array');
  if(value.length<length)throw new RangeError(label+' is too short');
  if(Array.isArray(value))for(let i=0;i<value.length;i++)if(!Number.isInteger(value[i])||value[i]<0||value[i]>255)throw new TypeError(label+' must contain integer bytes');
  return value;
}
function destination(buffer,offset=0){
  if(!Number.isSafeInteger(offset)||offset<0||offset>0xffffffff-16)throw new RangeError('Invalid UUID output offset');
  if(buffer!=null){if(!(buffer instanceof Uint8Array)&&!Array.isArray(buffer))throw new TypeError('Output must be a byte array');if(!Array.isArray(buffer)&&offset+16>buffer.length)throw new RangeError('UUID output buffer is too short');}
  return offset;
}
function optionsObject(options){if(options!=null&&(typeof options!=='object'||Array.isArray(options)))throw new TypeError('Options must be an object');return options||{};}
function output(value,buffer,offset){if(buffer==null)return unsafeStringify(value);for(let i=0;i<16;i++)buffer[offset+i]=value[i];return buffer;}
function randomBytes(options){const source=options.random!==undefined?options.random:options.rng!==undefined?options.rng():rng();return bytes(source,16,'Random input');}
function v4(options,buffer,offset){
  if(options==null&&buffer==null&&offset===undefined)return randomUUID();
  options=optionsObject(options);offset=destination(buffer,offset);
  // Own the bytes before modifying version and variant, including custom RNGs.
  const value=Uint8Array.from(randomBytes(options).slice(0,16));
  value[6]=value[6]&15|64;value[8]=value[8]&63|128;
  return output(value,buffer,offset);
}
function v1(options,buffer,offset){
  options=optionsObject(options);offset=destination(buffer,offset);
  const copy={};
  for(const key of ['node','clockseq','msecs','nsecs','random','rng']){const value=options[key];if(value!==undefined)copy[key]=value;}
  if(copy.node!==undefined){bytes(copy.node,6,'Node ID');if(copy.node.length!==6)throw new RangeError('Node ID must have six bytes');copy.node=Array.from(copy.node);}
  for(const [key,min,max]of [['clockseq',0,16383],['msecs',-12219292800000,103073857660684],['nsecs',0,9999]])if(copy[key]!==undefined&&(!Number.isSafeInteger(copy[key])||copy[key]<min||copy[key]>max))throw new RangeError('Invalid UUID '+key);
  if(copy.random!==undefined)bytes(copy.random,16,'Random input');
  if(copy.rng!==undefined){if(typeof copy.rng!=='function')throw new TypeError('rng must be callable');const fn=copy.rng;copy.rng=()=>bytes(fn(),16,'Random input');}
  return legacyV1(copy,buffer,offset);
}
function named(version,algorithm){
  function generate(value,namespace,buffer,offset){
    offset=destination(buffer,offset);
    const ns=typeof namespace==='string'?parse(namespace):bytes(namespace,16,'Namespace');
    if(ns.length!==16)throw new RangeError('Namespace must have sixteen bytes');
    // Native UTF-8 replaces lone surrogates consistently with Buffer/string I/O.
    if(typeof value!=='string')bytes(value,0,'Name');
    const digest=createHash(algorithm).update(Buffer.from(ns)).update(typeof value==='string'?value:Buffer.from(value)).digest();
    digest[6]=digest[6]&15|version;digest[8]=digest[8]&63|128;
    return output(digest,buffer,offset);
  }
  generate.DNS='6ba7b810-9dad-11d1-80b4-00c04fd430c8';generate.URL='6ba7b811-9dad-11d1-80b4-00c04fd430c8';return generate;
}
function stringify(value,offset=0){
  destination(undefined,offset);bytes(value,offset+16,'UUID bytes');
  const result=unsafeStringify(value,offset);if(!validate(result))throw new TypeError('Stringified UUID is invalid');return result;
}
exports.v1=v1;exports.v3=named(0x30,'md5');exports.v4=v4;exports.v5=named(0x50,'sha1');
exports.NIL=NIL;exports.parse=parse;exports.stringify=stringify;exports.validate=validate;exports.version=version;
