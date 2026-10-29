'use strict';
// Adapted from gaxios 6.7.1. Copyright Google LLC; Apache-2.0.
const {AbortError}=require('vnode-fetch');
const MAX_TIMER=2147483647;
function validateRetryConfig(config){
 if(!config||typeof config!=='object'||Array.isArray(config))throw new TypeError('retryConfig must be an object');
 for(const key of ['retry','currentRetryAttempt','noResponseRetries'])if(config[key]!=null&&(!Number.isSafeInteger(config[key])||config[key]<0))throw new RangeError('Invalid retry '+key);
 for(const key of ['retryDelay','retryDelayMultiplier','totalTimeout','maxRetryDelay','timeOfFirstRequest'])if(config[key]!=null&&(!Number.isFinite(config[key])||config[key]<0))throw new RangeError('Invalid retry '+key);
 if(config.httpMethodsToRetry!==undefined&&(!Array.isArray(config.httpMethodsToRetry)||config.httpMethodsToRetry.some(x=>typeof x!=='string')))throw new TypeError('httpMethodsToRetry must contain strings');
 if(config.statusCodesToRetry!==undefined&&(!Array.isArray(config.statusCodesToRetry)||config.statusCodesToRetry.some(x=>!Array.isArray(x)||x.length!==2||x.some(n=>!Number.isInteger(n)||n<100||n>599)||x[0]>x[1])))throw new TypeError('Invalid retry status ranges');
 for(const key of ['shouldRetry','retryBackoff','onRetryAttempt'])if(config[key]!==undefined&&typeof config[key]!=='function')throw new TypeError(key+' must be callable');
}
function wait(err,delay,remaining,config){
 return new Promise((resolve,reject)=>{
  const signal=err.config.signal;let timer,budget,done=false;
  function finish(error){if(done)return;done=true;clearTimeout(timer);clearTimeout(budget);signal?.removeEventListener('abort',abort);error?reject(error):resolve();}
  function abort(){finish(new AbortError('Retry aborted'));}
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)return abort();
  if(remaining<Number.MAX_SAFE_INTEGER)budget=setTimeout(()=>finish(Object.assign(new Error('Retry budget exhausted'),{code:'ETIMEDOUT'})),Math.min(MAX_TIMER,Math.ceil(remaining)));
  Promise.resolve().then(async()=>{
   await config.onRetryAttempt?.(err);
   if(done)return;
   if(config.retryBackoff)await config.retryBackoff(err,delay);
   else await new Promise(r=>{timer=setTimeout(r,delay);});
  }).then(()=>finish(),finish);
 });
}
async function getRetryConfig(err){
 if(!err?.config||(!err.config.retryConfig&&!err.config.retry))return{shouldRetry:false};
 const config=err.config.retryConfig||{};validateRetryConfig(config);
 config.currentRetryAttempt??=0;config.retry??=3;config.noResponseRetries??=2;
 config.retryDelayMultiplier??=2;config.timeOfFirstRequest??=Date.now();config.totalTimeout??=Number.MAX_SAFE_INTEGER;config.maxRetryDelay??=Number.MAX_SAFE_INTEGER;
 config.httpMethodsToRetry??=['GET','HEAD','PUT','OPTIONS','DELETE'];config.statusCodesToRetry??=[[100,199],[408,408],[429,429],[500,599]];
 err.config.retryConfig=config;
 const no=()=>({shouldRetry:false,config:err.config});
 const body=err.config.body;
 if(err.config.signal?.aborted||err.name==='AbortError'||err.error?.name==='AbortError')return no();
 if(body&&(typeof body.pipe==='function'||typeof body.getReader==='function'||typeof body[Symbol.asyncIterator]==='function'))return no();
 if(config.currentRetryAttempt>=config.retry||!err.response&&config.currentRetryAttempt>=config.noResponseRetries)return no();
 const remaining=config.totalTimeout-(Date.now()-config.timeOfFirstRequest);if(remaining<=0)return no();
 if(config.shouldRetry){if(!await config.shouldRetry(err))return no();}
 else{
  if(!config.httpMethodsToRetry.some(method=>method.toUpperCase()===(err.config.method||'').toUpperCase()))return no();
  if(err.response?.status&&!config.statusCodesToRetry.some(([min,max])=>err.response.status>=min&&err.response.status<=max))return no();
 }
 const initial=config.currentRetryAttempt?0:config.retryDelay??100;
 const calculated=initial+((Math.pow(config.retryDelayMultiplier,config.currentRetryAttempt)-1)/2)*1000;
 const delay=Math.max(0,Math.min(calculated,config.maxRetryDelay,MAX_TIMER));
 if(delay>=remaining)return no();
 config.currentRetryAttempt++;
 await wait(err,delay,remaining,config);
 if(Date.now()-config.timeOfFirstRequest>=config.totalTimeout)return no();
 return{shouldRetry:true,config:err.config};
}
exports.getRetryConfig=getRetryConfig;exports.validateRetryConfig=validateRetryConfig;
