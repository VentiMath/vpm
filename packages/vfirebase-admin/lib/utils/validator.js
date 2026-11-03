'use strict';
// Predicates express the Firebase wire contract. Semantic email/phone validation
// belongs to the service, so these intentionally retain its permissive inputs.
const string=value=>typeof value==='string';
const nonempty=value=>string(value)&&value.length>0;
const record=value=>typeof value==='object'&&!Array.isArray(value);
function date(value,iso){if(!nonempty(value))return false;const d=new Date(value);return Number.isFinite(d.getTime())&&(iso?d.toISOString():d.toUTCString())===value;}
function isURL(value){
  if(!string(value)||/[^a-z0-9:/?#[\]@!$&'()*+,;=.\-_~%]/i.test(value))return false;
  let url;try{url=new URL(value)}catch{return false;}
  if(url.protocol!=='http:'&&url.protocol!=='https:')return false;
  const host=url.hostname;
  if(!/^\[[\da-f:.]+\]$/i.test(host)&&!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i.test(host))return false;
  return !url.pathname||url.pathname==='/'||/^(\/[\w\-.~!$'()*+,;=:@%]+)*\/?$/.test(url.pathname);
}
Object.assign(exports,{
 isBuffer:Buffer.isBuffer,isArray:Array.isArray,isNonEmptyArray:value=>Array.isArray(value)&&value.length>0,
 isBoolean:value=>typeof value==='boolean',isNumber:value=>typeof value==='number'&&!Number.isNaN(value),
 isString:string,isNonEmptyString:nonempty,isObject:record,isNonNullObject:value=>value!==null&&record(value),
 isBase64String:value=>string(value)&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value),
 isUid:value=>nonempty(value)&&value.length<=128,isPassword:value=>string(value)&&value.length>=6,
 isEmail:value=>string(value)&&value.indexOf('@')>0&&value.indexOf('@')===value.lastIndexOf('@')&&value.indexOf('@')<value.length-1,
 isPhoneNumber:value=>string(value)&&value[0]==='+'&&/[\da-z]/i.test(value),
 isISODateString:value=>date(value,true),isUTCDateString:value=>date(value,false),isURL,
 isTopic:value=>string(value)&&/^(\/topics\/)?(private\/)?[a-zA-Z0-9-_.~%]+$/.test(value),
 isTaskId:value=>nonempty(value)&&/^[A-Za-z0-9_-]+$/.test(value),
});
