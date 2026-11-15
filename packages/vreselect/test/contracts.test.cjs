'use strict';
const previousMode=process.env.NODE_ENV;
process.env.NODE_ENV='production';
const {test:registerTest}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const own=require('..'),fixture=path.resolve(__dirname,'../../../scripts/reselect-conformance/node_modules');
const controls=[['VPM',own],['current',require(fixture+'/reselect')],['app',require(fixture+'/reselect-app')]];
// Bun shares environment mutations across test files. Only these module loads
// need production mode; later React client fixtures must retain their mode.
if(previousMode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousMode;
// These callbacks are synchronous; upstream also reads the mode at call time.
const test=(name,run)=>registerTest(name,()=>{
 const mode=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try{return run()}finally{if(mode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=mode;}
});
for(const [name,a]of controls){
 for(const key of ['lruMemoize','weakMapMemoize']){
  test(name+' '+key+' argument identity, arity, undefined results and exceptions',()=>{
   let calls=0;const m=a[key]((...args)=>{calls++;if(args[0]==='throw')throw Error('bad');return args[0]===undefined?undefined:{args}});
   const x={},y={};assert.equal(m(x),m(x));assert.notEqual(m(x),m(y));assert.notEqual(m(y),m(y,undefined));assert.equal(m(undefined),undefined);let n=calls;m(undefined);assert.equal(calls,n);
   assert.throws(()=>m('throw'));assert.throws(()=>m('throw'));assert.equal(calls,n+2);m.clearCache();assert.equal(m.resultsCount(),0);m(x);assert.equal(m.resultsCount(),1);m.resetResultsCount();assert.equal(m.resultsCount(),0);
  });
  test(name+' '+key+' result equality and receiver contract',()=>{
   const m=a[key](x=>[x%2],{resultEqualityCheck:(x,y)=>x[0]===y[0]});assert.equal(m(1),m(3));assert.equal(m.resultsCount(),1);assert.notEqual(m(2),m(3));
   const getThis=a[key](function(){return this});assert.equal(getThis.call({}),null);
  });
 }
 test(name+' bounded LRU eviction refreshes hits and accepts custom equality',()=>{
  let n=0;const m=a.lruMemoize(x=>({x,n:++n}),{maxSize:2});const x=m(1),y=m(2);assert.equal(m(1),x);m(3);assert.notEqual(m(2),y);
  const z=a.lruMemoize(x=>x,{equalityCheck:(a,b)=>a.id===b.id});assert.equal(z({id:1}),z({id:1}));
 });
 test(name+' selector counters, two cache levels and last result',()=>{
  const items=[1,2,3],aState={items},bState={items};const result=(items,n)=>items.filter(x=>x>n),dependencies=[s=>s.items,(_,n)=>n];const s=a.createSelector(dependencies,result);assert.equal(s.dependencies,dependencies);assert.equal(s.resultFunc,result);
  const x=s(aState,1);assert.equal(s(aState,1),x);assert.equal(s(bState,1),x);assert.equal(s.recomputations(),1);assert.equal(s.dependencyRecomputations(),2);assert.equal(s.lastResult(),x);
  s.clearCache();s(bState,1);assert.equal(s.dependencyRecomputations(),3);assert.equal(s.recomputations(),1);s.memoizedResultFunc.clearCache();s.clearCache();s(bState,1);assert.equal(s.recomputations(),2);s.resetRecomputations();s.resetDependencyRecomputations();assert.equal(s.recomputations(),0);assert.equal(s.dependencyRecomputations(),0);
 });
 test(name+' selector creator options, variadic inputs and structured outputs',()=>{
  const creator=a.createSelectorCreator({memoize:a.lruMemoize,memoizeOptions:{equalityCheck:Object.is,maxSize:2}});const selector=creator(s=>s.x,s=>s.y,(x,y)=>({sum:x+y}));const x=selector({x:1,y:2});assert.equal(selector({x:1,y:2}),x);assert.equal(selector.memoize,a.lruMemoize);
  const structured=a.createStructuredSelector({x:s=>s.x,sum:selector},creator);assert.deepEqual(structured({x:1,y:2}),{x:1,sum:{sum:3}});assert.equal(creator.withTypes(),creator);assert.equal(a.createSelector.withTypes(),a.createSelector);assert.equal(a.createStructuredSelector.withTypes(),a.createStructuredSelector);
  assert.throws(()=>a.createSelector([null],x=>x));assert.throws(()=>a.createSelector([x=>x],null));
 });
}
for(const name of ['lruMemoize','weakMapMemoize'])test(name+' deterministic mixed-key cache traces match latest and app controls',()=>{
 const keys=[{},[],()=>{},null,undefined,NaN,0,-0,1,'a','__proto__',Symbol('a')];
 for(const options of [{},{maxSize:3},{maxSize:1},{resultEqualityCheck:(a,b)=>a.id===b.id}]){
  if(name==='weakMapMemoize'&&options.maxSize)continue;
  function trace(api){let n=0;const m=api[name]((...args)=>({id:args.length?keys.indexOf(args[0]):0,n:++n}),options),out=[];let seed=12;for(let i=0;i<400;i++){seed=(seed*1664525+1013904223)>>>0;const args=seed%5===0?[]:seed%3===0?[keys[seed%keys.length],keys[(seed>>>8)%keys.length]]:[keys[seed%keys.length]];out.push([m(...args).n,m.resultsCount()]);if(i%83===0)m.clearCache();if(i%61===0)m.resetResultsCount();}return out;}
  assert.deepEqual(trace(own),trace(controls[1][1]));assert.deepEqual(trace(own),trace(controls[2][1]));
 }
});
test('5.3 bounded weak caches match generations for primitive, object and mixed paths',()=>{
 const keys=[{},()=>{},1,2,3,'a',null,undefined];
 for(const maxSize of [1,2,4])for(const shape of [0,1,2,3]){
  function trace(a){let n=0;const m=a.weakMapMemoize(()=>++n,{maxSize}),out=[];for(let i=0;i<90;i++){const k=keys[(i*7+i%3)%keys.length];out.push(m(...(shape===0?[k]:shape===1?[keys[0],k]:shape===2?[k,keys[0]]:[keys[i%2]])));}return out;}
  assert.deepEqual(trace(own),trace(controls[1][1]),JSON.stringify({maxSize,shape}));
 }
 for(const maxSize of [0,-1,NaN,Infinity,1.5])assert.throws(()=>own.weakMapMemoize(x=>x,{maxSize}));
});
test('structured selector preserves own __proto__ fields without altering output prototype',()=>{
 const s=own.createStructuredSelector(Object.fromEntries([['__proto__',s=>s.x],['normal',s=>s.y]])),r=s({x:3,y:4});assert.equal(Object.getPrototypeOf(r),Object.prototype);assert.equal(Object.hasOwn(r,'__proto__'),true);assert.equal(r.__proto__,3);
});
test('weak result deduplication preserves nullish sentinel and clear-cache behavior',()=>{
 for(const value of [undefined,null,false,0,'',NaN,{}]){
  function trace(a){const m=a.weakMapMemoize(()=>value,{resultEqualityCheck:()=>true}),out=[];m(1);out.push(m.resultsCount());m(2);out.push(m.resultsCount());m.clearCache();m(3);out.push(m.resultsCount());return out;}
  assert.deepEqual(trace(own),trace(controls[1][1]));assert.deepEqual(trace(own),trace(controls[2][1]));
 }
});

for(const [name,a] of controls)test(name+' weak cache zero/many arities and nested selector cache ownership',()=>{
 const key={},fn=a.weakMapMemoize((...xs)=>({xs}));
 for(const args of [[],[key],[key,1],[key,1,null],[key,1,null,undefined,Symbol.for('cache')]]){
  const value=fn(...args);assert.equal(fn(...args),value);assert.deepEqual(value.xs,args);
 }
 const seen=[],memoize=(fn,...opts)=>{seen.push(opts);return a.lruMemoize(fn,...opts)};
 const selector=a.createSelector([s=>s.items],items=>items.length,{memoize,memoizeOptions:{maxSize:2}});
 const items=[1,2];assert.equal(selector({items}),2);assert.equal(selector({items}),2);
 assert.equal(selector.recomputations(),1);assert.equal(selector.dependencyRecomputations(),2);assert.deepEqual(seen,[ [{maxSize:2}] ]);
});

for(const [name,a] of controls)test(name+' custom result memoizer receiver and live dependency array',()=>{
 const receivers=[],deps=[s=>s.x];
 function memoize(fn){return function(){receivers.push(this);return fn.apply(null,arguments)}}
 const selector=a.createSelector(deps,(...values)=>values,{memoize});
 assert.deepEqual(selector({x:1}),[1]);assert.deepEqual(receivers,[null]);
 deps.push(s=>s.y);assert.deepEqual(selector({x:2,y:3}),[2,3]);
 assert.equal(selector.dependencyRecomputations(),2);
});
