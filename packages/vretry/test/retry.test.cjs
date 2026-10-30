'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const retry=require('..'),clocked=require('../../../scripts/retry-conformance/clock.cjs');

test('default, capped and decreasing schedules preserve numeric order',()=>{
 assert.deepEqual(retry.timeouts({retries:4}),[1000,2000,4000,8000]);
 assert.deepEqual(retry.timeouts({retries:4,minTimeout:10,maxTimeout:25}),[10,20,25,25]);
 assert.deepEqual(retry.timeouts({retries:3,factor:0.5}),[250,500,1000]);
 assert.deepEqual(retry.timeouts({retries:0}),[]);assert.equal(retry.createTimeout(3,{minTimeout:5}),40);
});
test('randomized schedule matches the upstream formula and sorts',()=>{
 const random=Math.random;let i=0;const values=[0.75,0.25,0.5];Math.random=()=>values[i++%3];
 try{assert.deepEqual(retry.timeouts({retries:3,factor:1,minTimeout:100,randomize:true}),[125,150,175]);}finally{Math.random=random;}
});
test('options are read once, ignore inherited fields and remain unchanged',()=>{
 let reads=0;const opts=Object.create({retries:1});Object.defineProperty(opts,'factor',{get(){reads++;return 2;}});
 assert.equal(retry.timeouts(opts).length,10);assert.equal(reads,1);
 const frozen=Object.freeze({retries:2,minTimeout:1});assert.deepEqual(retry.timeouts(frozen),[1,2]);
});
test('invalid schedules fail before allocating or scheduling',()=>{
 for(const retries of [-1,1.5,NaN,'3',100001])assert.throws(()=>retry.operation({retries}));
 for(const options of [{factor:0},{factor:Infinity},{minTimeout:-1},{maxTimeout:NaN},{minTimeout:2,maxTimeout:1},{randomize:1},{unref:'yes'},{maxRetryTime:-1}])assert.throws(()=>retry.operation(options));
 for(const delays of [[Infinity],[NaN],[-1],['1']])assert.throws(()=>retry.operation(delays));
 assert.throws(()=>retry.createTimeout(-1));assert.throws(()=>retry.createTimeout(1024));
});
test('custom schedules are copied and preserve order and fractional values',()=>{
 const values=[3,1,0,0.5],op=retry.operation(values);values[0]=99;assert.deepEqual(op._originalTimeouts,[3,1,0,0.5]);
 assert.deepEqual(retry.timeouts([3,1]),[3,1]);
});
test('finite retries preserve attempt numbering, history and terminal state',()=>clocked(clock=>{
 const op=retry.operation([1,2,3]),errors=[];let calls=0;
 op.attempt(n=>{assert.equal(n,++calls);const error=Error(String(n));errors.push(error);op.retry(error);});clock.runAll();
 assert.equal(calls,4);assert.deepEqual(op.errors(),errors);assert.equal(op.mainError(),errors[3]);assert.equal(op.retry(Error('late')),false);assert.equal(clock.countTimers(),0);
}));
test('mainError counts reserved messages and breaks ties by latest error',()=>{
 const op=retry.operation(),first=Error('__proto__'),second=Error('constructor'),third=Error('__proto__');
 op.errors().push(first,second,third);assert.equal(op.mainError(),third);op.errors().push(Error('constructor'));assert.equal(op.mainError(),op.errors()[3]);
 op.reset();const symbol=Symbol('reason'),object={};op.errors().push(symbol,object,symbol);assert.equal(op.mainError(),symbol);
 op.reset();op.errors().push(object);assert.equal(op.mainError(),object);
});
test('stop cancels both timers and ignores late completions',()=>clocked(clock=>{
 let calls=0,timeouts=0;const op=retry.operation([10]);op.attempt(()=>{calls++;op.retry(Error('e'));},{timeout:100,cb:()=>timeouts++});
 op.stop();clock.runAll();assert.equal(calls,1);assert.equal(timeouts,0);assert.equal(op.retry(Error('late')),false);assert.equal(clock.countTimers(),0);
}));
test('reset cancels pending timers and clears error and attempt state',()=>clocked(clock=>{
 let oldCalls=0,newCalls=0;const op=retry.operation([10]);op.attempt(()=>{oldCalls++;op.retry(Error('old'));});op.reset();
 assert.equal(op.attempts(),1);assert.deepEqual(op.errors(),[]);assert.equal(op.mainError(),null);clock.tick(100);assert.equal(oldCalls,1);
 op.attempt(()=>{newCalls++;op.retry(Error('new'));});clock.runAll();assert.equal(newCalls,2);
}));
test('duplicate retry calls cannot schedule overlapping attempts',()=>clocked(clock=>{
 const op=retry.operation([10]);let calls=0;op.attempt(()=>{calls++;if(calls===1){assert.equal(op.retry(Error('a')),true);assert.equal(op.retry(Error('duplicate')),true);}else op.retry(null);});
 assert.equal(clock.countTimers(),1);clock.runAll();assert.equal(calls,2);assert.equal(op.errors().length,1);
}));
test('forever and Infinity use a finite ramp and bounded error history',()=>clocked(clock=>{
 for(const options of [{retries:Infinity,minTimeout:1,maxTimeout:4},{retries:0,forever:true,minTimeout:1},{retries:null,forever:true,minTimeout:1}]){
 const op=retry.operation(options);let calls=0;op.attempt(()=>{if(++calls===50){op.stop();return;}op.retry(Error('failure'));assert.equal(op.errors().length,1);});clock.runAll();assert.equal(calls,50);
 }
}));
test('zero and insufficient retry budgets never schedule extra work',()=>clocked(clock=>{
 for(const maxRetryTime of [0,5]){const op=retry.operation({minTimeout:10,maxRetryTime});let calls=0;op.attempt(()=>{calls++;assert.equal(op.retry(Error('e')),false);});clock.runAll();assert.equal(calls,1);assert.equal(op.errors()[0].code,'ERR_RETRY_TIMEOUT');}
}));
test('retry budgets use a monotonic clock despite wall-clock changes',()=>clocked(clock=>{
 const op=retry.operation({minTimeout:1,maxRetryTime:10});op.attempt(()=>{});clock.tick(11);clock.setSystemTime(-1000000);assert.equal(op.retry(Error('e')),false);assert.equal(clock.countTimers(),0);
}));
test('long delays are chunked without runtime timer overflow',()=>clocked(clock=>{
 const op=retry.operation([2147483647+20]);let calls=0;op.attempt(()=>{if(++calls===1)op.retry(Error('e'));});
 clock.tick(2147483647);assert.equal(calls,1);clock.tick(19);assert.equal(calls,1);clock.tick(1);assert.equal(calls,2);op.stop();assert.equal(clock.countTimers(),0);
}));
test('attempt timeouts work on first and subsequent attempts and unref both timers',()=>clocked(clock=>{
 const notices=[],op=retry.operation({retries:1,minTimeout:5,unref:true});let calls=0;
 op.attempt(()=>{calls++;},{timeout:2,cb:n=>notices.push(n)});assert.equal(op._timeout.hasRef(),false);clock.tick(2);assert.deepEqual(notices,[undefined]);
 op.retry(Error('retry'));assert.equal(op._timer.hasRef(),false);clock.tick(5);assert.equal(calls,2);assert.equal(op._timeout.hasRef(),false);clock.tick(2);assert.deepEqual(notices,[undefined,2]);op.stop();
}));
test('wrap preserves owner, callback receiver and exact success arguments',()=>{
 const receiver={},obj={value:3,method(a,cb){assert.equal(this,obj);cb.call(receiver,null,this.value+a);},empty(cb){cb();}};
 retry.wrap(obj);let result;obj.method(4,function(...args){assert.equal(this,receiver);result=args;});assert.deepEqual(result,[null,7]);obj.empty(function(){assert.equal(arguments.length,0);});
});
test('wrap isolates attempts from duplicate and stale callbacks',()=>clocked(clock=>{
 let calls=0,completed=0,old;const obj={method(cb){calls++;if(calls===1){old=cb;cb(Error('retry'));cb(null,'wrong');}else{old(null,'stale');cb(null,'ok');cb(null,'duplicate');}}};
 retry.wrap(obj,{retries:2,minTimeout:1});obj.method((e,value)=>{assert.ifError(e);assert.equal(value,'ok');completed++;});clock.runAll();assert.equal(calls,2);assert.equal(completed,1);
}));
test('wrap skips accessors and inherited methods, and preflights immutable targets',()=>{
 let reads=0;const inherited=()=>{};const obj=Object.create({inherited});Object.defineProperty(obj,'accessor',{enumerable:true,get(){reads++;throw Error('getter');}});obj.ok=()=>{};
 retry.wrap(obj);assert.equal(reads,0);assert.equal(Object.hasOwn(obj,'inherited'),false);
 const original=()=>{},locked={first:original};Object.defineProperty(locked,'second',{value:()=>{},enumerable:true});assert.throws(()=>retry.wrap(locked));assert.equal(locked.first,original);
});
test('wrap snapshots options and stops pending retries on synchronous throw',()=>clocked(clock=>{
 let calls=0;const error=Error('thrown'),opts={retries:1,minTimeout:1},obj={method(cb){calls++;cb(Error('retry'));throw error;}};
 retry.wrap(obj,opts);opts.retries=9;assert.equal(obj.method.options.retries,1);assert.throws(()=>obj.method(()=>{}),e=>e===error);clock.runAll();assert.equal(calls,1);
}));
test('constructor and deprecated aliases remain callable',()=>{
 const op=new retry.RetryOperation([1],false);let calls=0;op.try(()=>calls++);op.reset();op.start(()=>calls++);assert.equal(calls,2);op.stop();
 assert.equal(require('vretry/lib/retry_operation'),retry.RetryOperation);
});
