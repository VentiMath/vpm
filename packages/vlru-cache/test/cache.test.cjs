"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Cache=require(".."),Current=require("../../../scripts/source-map-conformance/node_modules/lru-current").LRUCache;
test("generated synchronous operations match current LRU order, size, callbacks and return values",()=>{
 let seed=7193;const random=n=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)%n;
 let count=0;
 for(const config of [{max:1},{max:17},{maxSize:32,sizeCalculation:v=>v.length},{max:9,maxSize:35,maxEntrySize:12,sizeCalculation:v=>v.length}]){
  const logA=[],logB=[],make=(C,log)=>new C({...config,dispose:(...x)=>log.push(["before",...x]),disposeAfter:(...x)=>log.push(["after",...x])});
  const a=make(Cache,logA),b=make(Current,logB),keys=["",0,NaN,{},Symbol("key"),...Array.from({length:25},(_,i)=>"k"+i)];
  for(let i=0;i<16000;i++){
   const key=keys[random(keys.length)],op=random(8),value="x".repeat(1+random(18));
   let x,y;
   switch(op){
    case 0:case 1:a.set(key,value);b.set(key,value);break;
    case 2:x=a.get(key);y=b.get(key);break;
    case 3:x=a.peek(key);y=b.peek(key);break;
    case 4:x=a.has(key);y=b.has(key);break;
    case 5:x=a.delete(key);y=b.delete(key);break;
    case 6:x=a.pop();y=b.pop();break;
    case 7:if(random(20)===0){a.clear();b.clear()}else{a.set(key,undefined);b.set(key,undefined)}break;
   }
   assert.deepEqual(x,y);assert.deepEqual([...a],[...b]);assert.deepEqual([...a.rentries()],[...b.rentries()]);
   assert.equal(a.size,b.size);assert.equal(a.calculatedSize,b.calculatedSize);assert.deepEqual(logA,logB);
   logA.length=logB.length=0;count++;
  }
 }
 assert.equal(count,64000);
});
test("bounded cache validation and reference identity",()=>{
 for(const options of [{},{max:-1},{max:1.5},{max:Infinity},{max:2,ttl:-1},{maxSize:NaN},{max:1,fetchMethod:()=>1},{max:1,ttlAutopurge:true}])assert.throws(()=>new Cache(options),TypeError);
 const c=new Cache({max:2}),key={},value={a:1};assert.equal(c.set(key,value),c);assert.equal(c.get(key),value);assert.equal(c.max,2);
 assert.throws(()=>c.set("bad","x",{size:1}),TypeError);
 assert.throws(()=>new Cache({maxSize:10}).set("bad","x"),TypeError);
 assert.equal(c.getRemainingTTL(key),Infinity);assert.equal(c.getRemainingTTL("absent"),0);
});
test("disposal after mutation sees the final cache and iterator directions match",()=>{
 const seen=[],cache=new Cache({max:2,disposeAfter:(v,k,why)=>seen.push([k,why,cache.has(k),cache.size])});
 cache.set("a",1).set("b",2).set("c",3);assert.deepEqual(seen,[["a","evict",false,2]]);
 const forwards=[],backwards=[];cache.forEach((v,k,c)=>{assert.equal(c,cache);forwards.push([k,v])});cache.rforEach((v,k)=>backwards.push([k,v]));
 assert.deepEqual(forwards,[["c",3],["b",2]]);assert.deepEqual(backwards,[["b",2],["c",3]]);
 assert.equal(cache.find(v=>v===2),2);assert.deepEqual([...cache.keys()],["b","c"]);
 cache.clear();assert.equal(cache.size,0);assert.equal(cache.calculatedSize,0);
});
test("TTL and stale policies match with a controlled monotonic clock",()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,"performance");let now=100;
 Object.defineProperty(globalThis,"performance",{configurable:true,value:{now:()=>now}});
 // Current captures performance at import; load its module in a fresh VM.
 const fs=require("node:fs"),vm=require("node:vm"),file=require.resolve("../../../scripts/source-map-conformance/node_modules/lru-current");
 const mod={exports:{}};vm.runInNewContext(fs.readFileSync(file,"utf8"),{module:mod,exports:mod.exports,require,performance:globalThis.performance,process,console,setTimeout,clearTimeout,AbortController});
 const Control=mod.exports.LRUCache;
 try{for(const opts of [{},{allowStale:true},{noDeleteOnStaleGet:true,allowStale:true},{updateAgeOnGet:true},{updateAgeOnHas:true}]){
  now=100;const a=new Cache({max:3,ttl:20,...opts}),b=new Control({max:3,ttl:20,ttlResolution:0,...opts});
  a.set("x","one");b.set("x","one");
  for(const advance of [5,10,30,2]){
   now+=advance;
   for(const method of ["getRemainingTTL","peek","has","get"]){assert.equal(a[method]("x"),b[method]("x"),method);assert.equal(a.size,b.size)}
  }
  a.set("y","two");b.set("y","two");now+=30;
  assert.equal(a.purgeStale(),b.purgeStale());assert.equal(a.size,b.size);
 }}finally{Object.defineProperty(globalThis,"performance",descriptor)}
});
