'use strict';
const {Expression}=require('../params/types.js');
const own=(object,key,value)=>Object.defineProperty(object,key,{value,enumerable:true,writable:true,configurable:true});
const durationFromSeconds=seconds=>`${seconds}s`;
function copyIfPresent(target,source,...keys){if(source)for(const key of keys)if(Object.hasOwn(source,key))own(target,key,source[key]);}
function convertIfPresent(target,source,to,from,convert=x=>x){if(source&&Object.hasOwn(source,from))own(target,to,convert(source[from]));}
function convertInvoker(value){
  const list=typeof value==='string'?[value]:value;
  if(!Array.isArray(list)||!list.length)throw new Error('Invalid option for invoker: Must be a non-empty array.');
  if(list.some(v=>typeof v!=='string'||!v.length))throw new Error('Invalid option for invoker: Must be a non-empty string.');
  if(list.length>1&&list.some(v=>v==='public'||v==='private'))throw new Error("Invalid option for invoker: Cannot have 'public' or 'private' in an array of service accounts.");
  return list;
}
function serviceAccountFromShorthand(value){
  if(value==='default')return null;
  if(value instanceof Expression)return value;
  if(typeof value==='string'&&value.includes('@')) {
    if(!value.endsWith('@'))return value;
    const project=process.env.GCLOUD_PROJECT;
    if(!project)throw new Error(`Unable to determine email for service account '${value}' because process.env.GCLOUD_PROJECT is not set.`);
    return `${value}${project}.iam.gserviceaccount.com`;
  }
  throw new Error(`Invalid option for serviceAccount: '${value}'. Valid options are 'default', a service account email, or '{serviceAccountName}@'`);
}
module.exports={durationFromSeconds,copyIfPresent,convertIfPresent,convertInvoker,serviceAccountFromShorthand};
