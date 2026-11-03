'use strict';
const {FunctionDefinition}=require('../../runtime/definition.js');
const {initTaskQueueTrigger}=require('../../runtime/manifest.js');
const {withInit}=require('../../common/onInit.js');
const {wrapTraceContext}=require('../trace.js');
const {onDispatchHandler}=require('../../common/providers/tasks.js');
const {getGlobalOptions}=require('../options.js');
const {copyIfPresent,convertInvoker}=require('../../common/encoding.js');
function onTaskDispatched(input,callback){
  const local=arguments.length===1?{}:input,handler=arguments.length===1?input:callback;
  const definition=new FunctionDefinition(local,'scheduledOrTask');
  const invoker=trigger=>{for(const layer of [getGlobalOptions(),local])if(Object.hasOwn(layer,'invoker'))trigger.invoker=convertInvoker(layer.invoker);return trigger;};
  const trigger=invoker(initTaskQueueTrigger(getGlobalOptions(),local));
  copyIfPresent(trigger.retryConfig,local.retryConfig,'maxAttempts','maxBackoffSeconds','maxDoublings','maxRetrySeconds','minBackoffSeconds');
  copyIfPresent(trigger.rateLimits,local.rateLimits,'maxConcurrentDispatches','maxDispatchesPerSecond');
  const fn=definition.attach(wrapTraceContext(withInit(onDispatchHandler(request=>handler(request)))),{taskQueueTrigger:trigger},()=>{
    const legacy={};copyIfPresent(legacy,local,'retryConfig','rateLimits');return definition.annotations({taskQueueTrigger:invoker(legacy)});
  });
  fn.__requiredAPIs=[{api:'cloudtasks.googleapis.com',reason:'Needed for task queue functions'}];
  fn.run=handler;return fn;
}
exports.onTaskDispatched=onTaskDispatched;
exports.tasks_exports={onTaskDispatched};
