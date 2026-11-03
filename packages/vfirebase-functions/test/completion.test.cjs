'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const original=path.resolve(__dirname,'../../../scripts/firebase-functions-conformance/node_modules/firebase-functions');
const replacement=path.resolve(__dirname,'..');
const types=require('../lib/params/types.js');
test('parameter specification preserves frozen validation options and quotes CEL literals',()=>{
 const rule=Object.freeze({validationRegex:/^abc$/}),input=Object.freeze({text:rule}),options=Object.freeze({input});
 const parameter=new types.StringParam('TOKEN',options),spec=parameter.toSpec();
 assert.equal(spec.input.text.validationRegex,'^abc$');assert.equal(rule.validationRegex.source,'^abc$');assert.notEqual(spec.input,input);
 assert.equal(parameter.equals('a"\n\\b').toString(),'params.TOKEN == '+JSON.stringify('a"\n\\b'));
 for(const method of ['lessThanOrEqualTo','lessThanorEqualTo','greaterThan','lessThan'])assert.throws(()=>new types.ListParam('LIST')[method]([]),/comparison operators not supported/);
});
test('paired controls reproduce frozen mutation, unescaped CEL and interpolation placeholder collision',()=>{
 for(const root of [original,replacement]){
  const p=require(path.join(root,'lib/params/types.js')),item=new p.StringParam('X',{input:Object.freeze({text:Object.freeze({validationRegex:/x/})})});
  if(root===original)assert.throws(()=>item.toSpec(),TypeError);else assert.equal(item.toSpec().input.text.validationRegex,'x');
  const literal='🤿🤿🤿🐙🐙🐙0🐙🐙🐙🤿🤿🤿',expression=new p.InterpolationExpression([literal+' / ',''],[new p.StringParam('X')]);
  assert.equal(expression.toCEL(),(root===original?'{{ params.X }}':literal)+' / {{ params.X }}');
 }
});
test('encoding and debug helpers reject prototype injection and malformed debug records',()=>{
 const encoding=require('../lib/common/encoding.js'),source=JSON.parse('{"__proto__":{"bad":true}}'),target={};
 encoding.copyIfPresent(target,source,'__proto__');assert.equal(Object.getPrototypeOf(target),Object.prototype);assert.equal(target.__proto__.bad,true);assert(Object.hasOwn(target,'__proto__'));
 const script=`process.env.FIREBASE_DEBUG_MODE='true';process.env.FIREBASE_DEBUG_FEATURES='null';const d=require(${JSON.stringify(path.join(replacement,'lib/common/debug.js'))});if(d.isDebugFeatureEnabled('skipTokenVerification'))throw Error('enabled');process.env.FIREBASE_DEBUG_FEATURES='{}';if(d.isDebugFeatureEnabled('constructor'))throw Error('inherited');`;
 const child=spawnSync(process.execPath,['-e',script],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);
});
test('task declarations preserve the app IAM invoker, retries, limits, timeout and CLI manifest',()=>{
 const opts=Object.freeze({invoker:Object.freeze(['task-runner@example-project.iam.gserviceaccount.com']),timeoutSeconds:60,retryConfig:Object.freeze({maxAttempts:100,maxRetrySeconds:86400,minBackoffSeconds:5,maxBackoffSeconds:300,maxDoublings:5}),rateLimits:Object.freeze({maxConcurrentDispatches:1})});
 const make=root=>{require(path.join(root,'lib/v2/options.js')).setGlobalOptions({});const task=require(path.join(root,'lib/v2/providers/tasks.js')).onTaskDispatched(opts,()=>{});return JSON.parse(JSON.stringify({endpoint:task.__endpoint,trigger:task.__trigger,apis:task.__requiredAPIs}));};
 assert.deepEqual(make(replacement),make(original));
});
test('task transport: platform token context, IAM configuration, validation and retry errors',async()=>{
 const prior=process.env.FUNCTIONS_EMULATOR;delete process.env.FUNCTIONS_EMULATOR;
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:'caller',uid:'caller'})).toString('base64url')+'.signature','X-CloudTasks-TaskRetryCount':'2','X-CloudTasks-TaskName':'task-id'};
 const request={method:'POST',body:{data:{ok:true}},headers,header:key=>headers[key]};
 const invoke=async(root,req,fn)=>{const result={};const res={status(n){result.status=n;return this},end(){return this},send(body){result.body=body;return this}};await require(path.join(root,'lib/common/providers/tasks.js')).onDispatchHandler(fn)(req,res);return result;};
 try {
  const outputs=[];
  for(const root of [original,replacement]){
   let seen;const pass=await invoke(root,request,arg=>{seen={data:arg.data,id:arg.id,retryCount:arg.retryCount,auth:arg.auth,contextSame:arg.context.id===arg.id}});
   assert.equal(pass.status,204);const rejected=await invoke(root,{...request,header:key=>key==='Authorization'?undefined:headers[key]},()=>assert.fail());assert.equal(rejected.status,401);
   const failure=await invoke(root,request,()=>{throw new Error('retry')});assert.equal(failure.status,500);const malformed=await invoke(root,{...request,method:'GET'},()=>assert.fail());assert.equal(malformed.status,400);
   outputs.push({seen,pass,rejected,failure,malformed});
  }
  assert.deepEqual(outputs[0],outputs[1]);
 } finally {if(prior===undefined)delete process.env.FUNCTIONS_EMULATOR;else process.env.FUNCTIONS_EMULATOR=prior;}
});
