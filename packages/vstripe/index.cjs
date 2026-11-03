'use strict';
const {createHmac,timingSafeEqual,randomUUID}=require('node:crypto');
const API_VERSION='2026-10-28.endive';
const decoder=new TextDecoder('utf-8',{fatal:true});
class StripeError extends Error {
  constructor(message,details={}) {super(message);Object.assign(this,details);this.type=this.constructor.name;this.name=this.type;}
}
class StripeAPIError extends StripeError {}
class StripeInvalidRequestError extends StripeError {}
class StripeAuthenticationError extends StripeError {}
class StripePermissionError extends StripeError {}
class StripeRateLimitError extends StripeError {}
class StripeCardError extends StripeError {}
class StripeIdempotencyError extends StripeError {}
class StripeConnectionError extends StripeError {}
class StripeSignatureVerificationError extends StripeError {}
const errors={StripeError,StripeAPIError,StripeInvalidRequestError,StripeAuthenticationError,StripePermissionError,StripeRateLimitError,StripeCardError,StripeIdempotencyError,StripeConnectionError,StripeSignatureVerificationError};
const errorTypes={invalid_request_error:StripeInvalidRequestError,card_error:StripeCardError,idempotency_error:StripeIdempotencyError};
function positive(value,name,max=2147483647){if(!Number.isSafeInteger(value)||value<1||value>max)throw new TypeError(`${name} must be a positive integer up to ${max}`);return value;}
function retries(value){if(!Number.isInteger(value)||value<0||value>10)throw new TypeError('maxNetworkRetries must be an integer from 0 to 10');return value;}
function header(value,name){if(typeof value!=='string'||!value||/[^\x20-\x7e]/.test(value))throw new TypeError(`${name} must be a nonempty ASCII header value`);return value;}
function options(value,keys){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Options must be an object');for(const key of Object.keys(value))if(!keys.includes(key))throw new TypeError(`Unsupported option: ${key}`);}
function form(params){
 const output=[],seen=new Set();let nodes=0,size=0;
 function visit(value,key,depth){
  if(++nodes>20000||depth>32)throw new TypeError('Checkout parameters exceed structural limits');
  if(value===undefined)return;
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'){
   if(typeof value==='number'&&!Number.isFinite(value))throw new TypeError('Checkout numbers must be finite');
   const text=value===null?'':String(value);if(text.length>1048576||key.length>1048576)throw new TypeError('Checkout parameters exceed 1 MiB');
   const pair=encodeURIComponent(key)+'='+encodeURIComponent(text);size+=pair.length+(output.length?1:0);if(size>1048576)throw new TypeError('Checkout parameters exceed 1 MiB');output.push(pair);return;
  }
  if(typeof value!=='object'||(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))throw new TypeError('Checkout parameters must contain plain data');
  if(seen.has(value))throw new TypeError('Cyclic Checkout parameters');seen.add(value);
  for(const name of Object.keys(value)){if(/[\[\]]/.test(name))throw new TypeError('Parameter keys cannot contain brackets');visit(value[name],key?key+'['+name+']':name,depth+1);}
  seen.delete(value);
 }
 if(!params||typeof params!=='object'||Array.isArray(params))throw new TypeError('Checkout parameters must be an object');
 visit(params,'',0);const result=output.join('&');if(Buffer.byteLength(result)>1048576)throw new TypeError('Checkout parameters exceed 1 MiB');return result;
}
function raw(payload){if(typeof payload==='string')return Buffer.from(payload);if(payload instanceof Uint8Array)return Buffer.from(payload.buffer,payload.byteOffset,payload.byteLength);throw new StripeSignatureVerificationError('Webhook payload must be the raw string or bytes');}
function verify(payload,signature,secret,tolerance=300,cryptoProvider,receivedAt=Date.now()){
 if(cryptoProvider!==undefined)throw new TypeError('Custom webhook crypto providers are not supported');
 if(!Number.isFinite(tolerance)||tolerance<0)throw new TypeError('Webhook tolerance must be finite and nonnegative');
 if(!Number.isFinite(receivedAt)||receivedAt<0)throw new TypeError('receivedAt must be milliseconds since the epoch');
 if(typeof secret!=='string'||!secret.trim())throw new StripeSignatureVerificationError('A nonempty webhook secret is required');
 const bytes=typeof payload==='string'?payload:raw(payload);if(typeof signature!=='string'||signature.length>16384)throw new StripeSignatureVerificationError('Invalid Stripe signature header');
 let timestamp;const signatures=[];
 for(const part of signature.split(',')){
  const item=part.trim(),at=item.indexOf('='),key=item.slice(0,at),value=item.slice(at+1);
  if(key==='t'){if(timestamp!==undefined||!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))throw new StripeSignatureVerificationError('Invalid webhook timestamp');timestamp=value;}
  if(key==='v1'&&/^[a-f0-9]{64}$/.test(value))signatures.push(Buffer.from(value,'hex'));
 }
 if(timestamp===undefined||!signatures.length)throw new StripeSignatureVerificationError('Missing webhook timestamp or v1 signature');
 const expected=createHmac('sha256',secret).update(timestamp+'.').update(bytes).digest();let valid=0;
 for(const candidate of signatures)valid|=Number(timingSafeEqual(expected,candidate));
 if(!valid)throw new StripeSignatureVerificationError('Webhook signature does not match');
 if(tolerance>0&&Math.abs(Math.floor(receivedAt/1000)-Number(timestamp))>tolerance)throw new StripeSignatureVerificationError('Webhook timestamp outside tolerance');
 return true;
}
function constructEvent(payload,signature,secret,tolerance,cryptoProvider,receivedAt){
 verify(payload,signature,secret,tolerance,cryptoProvider,receivedAt);
 const text=typeof payload==='string'?payload:decoder.decode(raw(payload));const value=JSON.parse(text);
 if(value?.object==='v2.core.event')throw new Error('Thin event notifications are not supported; expected a snapshot webhook event');
 return value;
}
function generateTestHeaderString({payload,secret,timestamp=Math.floor(Date.now()/1000),scheme='v1',signature}={}){
 if(!Number.isSafeInteger(timestamp)||timestamp<0)throw new TypeError('timestamp must be a nonnegative integer');
 const digest=signature??createHmac('sha256',secret).update(String(timestamp)).update('.').update(raw(payload)).digest('hex');return `t=${timestamp},${scheme}=${digest}`;
}
const webhooks={DEFAULT_TOLERANCE:300,constructEvent,constructEventAsync:async(...args)=>constructEvent(...args),generateTestHeaderString,generateTestHeaderStringAsync:async(...args)=>generateTestHeaderString(...args),signature:{verifyHeader:verify,verifyHeaderAsync:async(...args)=>verify(...args)}};
async function responseJSON(response,maxBytes){
 const length=Number(response.headers.get('content-length'));if(length>maxBytes){await response.body?.cancel();throw new StripeAPIError('Stripe response exceeds size limit');}
 const reader=response.body?.getReader();if(!reader)throw new StripeAPIError('Stripe returned an empty response');const parts=[];let count=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;count+=value.byteLength;if(count>maxBytes)throw new StripeAPIError('Stripe response exceeds size limit');parts.push(Buffer.from(value));}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(parts,count).toString('utf8'));}catch{throw new StripeAPIError('Stripe returned invalid JSON');}
}
function apiError(response,body){
 const raw=body?.error??{},status=response.status;
 const Type=status===401?StripeAuthenticationError:status===403?StripePermissionError:status===429?StripeRateLimitError:errorTypes[raw.type]??StripeAPIError;
 return new Type(typeof raw.message==='string'?raw.message:`Stripe request failed (${status})`,{raw,statusCode:status,requestId:response.headers.get('request-id')??undefined,code:raw.code,param:raw.param,decline_code:raw.decline_code,headers:Object.fromEntries(response.headers)});
}
class Stripe {
 constructor(apiKey,config={}){
  options(config,['apiVersion','host','port','protocol','timeout','maxNetworkRetries','stripeAccount','fetch','maxResponseBytes']);
  const key=header(apiKey,'apiKey'),protocol=config.protocol??'https',host=config.host??'api.stripe.com';
  if(typeof host!=='string'||!host||/[\s/@?#]/.test(host))throw new TypeError('Invalid Stripe host');
  if(protocol!=='https'&&!(protocol==='http'&&['localhost','127.0.0.1','[::1]'].includes(host)))throw new TypeError('Stripe requires HTTPS except for loopback tests');
  const port=config.port===undefined?(protocol==='https'?443:80):positive(Number(config.port),'port',65535),url=new URL(`${protocol}://${host}:${port}/v1/checkout/sessions`).href;
  const defaults={timeout:positive(config.timeout??80000,'timeout'),maxNetworkRetries:retries(config.maxNetworkRetries??2),apiVersion:header(config.apiVersion??API_VERSION,'apiVersion'),stripeAccount:config.stripeAccount===undefined?undefined:header(config.stripeAccount,'stripeAccount')};
  const transport=config.fetch??globalThis.fetch,maxBytes=positive(config.maxResponseBytes??8388608,'maxResponseBytes');if(typeof transport!=='function')throw new TypeError('fetch must be a function');
  this.webhooks=webhooks;
  this.checkout={sessions:{create:async(params,request={})=>{
   options(request,['idempotencyKey','timeout','maxNetworkRetries','stripeAccount','apiVersion','signal']);
   const timeout=positive(request.timeout??defaults.timeout,'timeout'),maxRetries=retries(request.maxNetworkRetries??defaults.maxNetworkRetries),body=form(params);
   const headers={Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json','Stripe-Version':header(request.apiVersion??defaults.apiVersion,'apiVersion'),'Idempotency-Key':header(request.idempotencyKey??'vstripe-'+randomUUID(),'idempotencyKey'),'User-Agent':'vstripe/23.1.0'};
   const account=request.stripeAccount??defaults.stripeAccount;if(account!==undefined)headers['Stripe-Account']=header(account,'stripeAccount');
   const callerSignal=request.signal;if(callerSignal!==undefined&&!(callerSignal instanceof AbortSignal))throw new TypeError('signal must be an AbortSignal');
   for(let attempt=0;;attempt++){
    let response,data,shouldRetry=false,failure;const controller=new AbortController(),abort=()=>controller.abort(callerSignal.reason);
    if(callerSignal?.aborted)throw callerSignal.reason;callerSignal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(()=>controller.abort(new Error('Stripe request timed out')),timeout);
    try{
     response=await transport(url,{method:'POST',headers:{...headers},body,redirect:'manual',signal:controller.signal});
     data=await responseJSON(response,maxBytes);
     if(response.status>=200&&response.status<300){
      if(!data||typeof data!=='object'||Array.isArray(data))throw new StripeAPIError('Stripe returned a non-object response');
      Object.defineProperty(data,'lastResponse',{value:{requestId:response.headers.get('request-id')??undefined,statusCode:response.status,headers:Object.fromEntries(response.headers),idempotencyKey:headers['Idempotency-Key']},enumerable:false});return data;
     }
     failure=apiError(response,data);const advice=response.headers.get('stripe-should-retry');shouldRetry=advice==='true'||(advice!=='false'&&(response.status===409||response.status>=500));
    }catch(error){failure=error instanceof StripeError?error:new StripeConnectionError('Stripe request failed',{cause:error});shouldRetry=!(error instanceof StripeError);}
    finally{clearTimeout(timer);callerSignal?.removeEventListener('abort',abort);}
    if(callerSignal?.aborted)throw callerSignal.reason;
    if(!shouldRetry||attempt>=maxRetries)throw failure;
    const advised=Number(response?.headers.get('retry-after')),delay=advised>0&&advised<=60?advised*1000:Math.max(500,Math.min(500*2**attempt,5000)*(.5+Math.random()*.5));
    await new Promise((resolve,reject)=>{const cancel=()=>{clearTimeout(wait);callerSignal.removeEventListener('abort',cancel);reject(callerSignal.reason);},wait=setTimeout(()=>{callerSignal?.removeEventListener('abort',cancel);resolve();},delay);callerSignal?.addEventListener('abort',cancel,{once:true});if(callerSignal?.aborted)cancel();});
   }
  }}};
 }
}
Stripe.webhooks=webhooks;Stripe.errors=errors;Stripe.API_VERSION=API_VERSION;
module.exports=Stripe;module.exports.default=Stripe;module.exports.Stripe=Stripe;
