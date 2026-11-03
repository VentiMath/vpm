'use strict';
const {isValidRequest,HttpsError,decode,unsafeDecodeIdToken}=require('./https.js');
const logger=require('../../logger/index.js');
const fields=[['queueName','QueueName'],['id','TaskName'],['retryCount','TaskRetryCount',true],['executionCount','TaskExecutionCount',true],['scheduledTime','TaskETA'],['previousResponse','TaskPreviousResponse',true],['retryReason','TaskRetryReason']];
function taskContext(request){
  const context={};
  for(const [name,suffix,numeric] of fields){const value=request.header('X-CloudTasks-'+suffix);context[name]=numeric?(value?Number(value):undefined):value;}
  context.headers=Object.fromEntries(Object.entries(request.headers).filter(([,value])=>!Array.isArray(value)));
  // Cloud Run/Functions IAM authenticates the caller before this adapter.
  // Decoding here only exposes the verified platform token to the handler.
  // Local emulation deliberately follows the upstream emulator contract.
  if(!process.env.FUNCTIONS_EMULATOR){
    const token=/^Bearer (.*)$/.exec(request.header('Authorization')||'')?.[1];
    if(!token)throw new HttpsError('unauthenticated','Unauthenticated');
    const claims=unsafeDecodeIdToken(token);
    context.auth={uid:claims.uid,token:claims,rawToken:token};
  }
  return context;
}
function onDispatchHandler(handler){
  return async function dispatch(request,response){
    try{
      if(!isValidRequest(request)){logger.error('Invalid request, unable to process.');throw new HttpsError('invalid-argument','Bad Request');}
      const context=taskContext(request),data=decode(request.body.data);
      if(handler.length===2)await handler(data,context);
      else {const input={...context,data};Object.defineProperty(input,'context',{get:()=>context});await handler(input);}
      response.status(204).end();
    }catch(error){
      let failure=error;
      if(!(failure instanceof HttpsError)){logger.error('Unhandled error',failure);failure=new HttpsError('internal','INTERNAL');}
      response.status(failure.httpErrorCode.status).send({error:failure.toJSON()});
    }
  };
}
module.exports={onDispatchHandler};
