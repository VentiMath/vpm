'use strict';
const development=process.env.NODE_ENV!=='production';
const referenceEqualityCheck=(a,b)=>a===b;
const weakKey=x=>(typeof x==='object'&&x!==null)||typeof x==='function';
function fields(fn,clear,count,reset){fn.clearCache=clear;fn.resultsCount=count;fn.resetResultsCount=reset;return fn;}
function lruMemoize(fn,options={}){
 if(typeof fn!=='function')throw new TypeError('Expected a function to memoize');
 if(typeof options==='function')options={equalityCheck:options};
 const {equalityCheck=referenceEqualityCheck,resultEqualityCheck,maxSize=1}=options;

 // A one-entry cache needs two slots, not an array insertion/removal per miss.
 if(maxSize<=1){
  let savedArgs=null,savedValue,count=0;
  function single(...args){
   if(savedArgs&&savedArgs.length===args.length){let same=true;for(let i=0;i<args.length;i++)if(!equalityCheck(savedArgs[i],args[i])){same=false;break;}if(same)return savedValue;}
   let value=fn.apply(null,args);count++;
   if(savedArgs&&resultEqualityCheck?.(savedValue,value)){value=savedValue;count--;}
   savedArgs=args;savedValue=value;return value;
  }
  return fields(single,()=>{savedArgs=null;savedValue=undefined;count=0},()=>count,()=>{count=0});
 }
 let entries=[],count=0;
 function memoized(...args){
  for(let i=0;i<entries.length;i++){
   const item=entries[i];if(item.args.length!==args.length)continue;
   let same=true;for(let j=0;j<args.length;j++)if(!equalityCheck(item.args[j],args[j])){same=false;break;}
   if(same){if(i){entries.splice(i,1);entries.unshift(item);}return item.value;}
  }
  let value=fn.apply(null,args);count++;
  if(resultEqualityCheck)for(const item of entries)if(resultEqualityCheck(item.value,value)){value=item.value;count--;break;}
  entries.unshift({args,value});if(entries.length>Math.max(1,maxSize))entries.pop();return value;
 }
 return fields(memoized,()=>{entries=[];count=0},()=>count,()=>{count=0});
}
const branch=()=>({objects:null,primitives:null,done:false,value:undefined});
function descend(root,args,create){
 let node=root;
 for(let i=0;i<args.length;i++){
  const key=args[i],slot=weakKey(key)?'objects':'primitives';let map=node[slot];
  if(!map){if(!create)return;node[slot]=map=slot==='objects'?new WeakMap():new Map();}
  let next=map.get(key);if(!next){if(!create)return;map.set(key,next=branch());}node=next;
 }
 return node;
}
// The production unbounded cache needs no generation, deduplication or
// diagnostic state. Keep its common hit loop independent of those closures.
function plainWeakMemoize(fn){
 let root=branch(),count=0;
 function step(node,key){
  const objects=(typeof key==='object'&&key!==null)||typeof key==='function';
  const map=objects?(node.objects||(node.objects=new WeakMap())):(node.primitives||(node.primitives=new Map()));
  let next=map.get(key);if(!next)map.set(key,next=branch());return next;
 }
 function memoized(){
  let node=root;
  const length=arguments.length;
  if(length===1){
   const key=arguments[0];
   if((typeof key==='object'&&key!==null)||typeof key==='function'){
    const map=root.objects||(root.objects=new WeakMap());node=map.get(key);
    if(!node)map.set(key,node=branch());
   }else{
    const map=root.primitives||(root.primitives=new Map());node=map.get(key);
    if(!node)map.set(key,node=branch());
   }
   if(node.done)return node.value;
   const value=fn.call(null,key);count++;node.value=value;node.done=true;return value;
  }
  if(length){node=step(node,arguments[0]);node=step(node,arguments[1]);for(let i=2;i<length;i++)node=step(node,arguments[i]);}
  if(node.done)return node.value;
  const value=fn.apply(null,arguments);count++;node.value=value;node.done=true;return value;
 }
 return fields(memoized,()=>{root=branch();count=0},()=>count,()=>{count=0});
}
function weakMapMemoize(fn,{resultEqualityCheck,maxSize}={}){
 if(typeof fn!=='function')throw new TypeError('Expected a function to memoize');
 if(maxSize!==undefined&&(!Number.isInteger(maxSize)||maxSize<=0))throw new TypeError('maxSize must be a positive integer');
 if(!development&&maxSize===undefined&&!resultEqualityCheck)return plainWeakMemoize(fn);
 let current=branch(),previous=null,size=0,count=0,last,hasLast=false,lastWeak=false,warned=false;
 function memoized(){
  const args=arguments;let node=current;
  // Distinct object/primitive branches keep Map and WeakMap access monomorphic.
  // The hit path does not allocate an argument array or call a generic walker.
  for(let i=0;i<args.length;i++){
   const key=args[i];let next;
   if((typeof key==='object'&&key!==null)||typeof key==='function'){const map=node.objects||(node.objects=new WeakMap());next=map.get(key);if(!next)map.set(key,next=branch());}
   else{const map=node.primitives||(node.primitives=new Map());next=map.get(key);if(!next)map.set(key,next=branch());}
   node=next;
  }
  return node.done?node.value:complete(node,args);
 }
 function complete(node,args){
  const old=previous&&descend(previous,args,false);let value;
  if(old?.done)value=old.value;
  else{
   value=fn.apply(null,args);count++;
   if(resultEqualityCheck){const candidate=lastWeak?last.deref():last;if(hasLast&&candidate!=null&&resultEqualityCheck(candidate,value)){value=candidate;count--;}lastWeak=weakKey(value);last=lastWeak?new WeakRef(value):value;hasLast=true;}
  }
  node.value=value;node.done=true;
  if(development&&maxSize===undefined&&checks.cacheSizeCheck!=='never'&&(!warned||checks.cacheSizeCheck==='always')){
   let check=current;
   for(const key of args){const map=check[weakKey(key)?'objects':'primitives'];if(!weakKey(key)&&map.size>1000){console.warn('A primitive argument cache exceeds 1000 entries; configure maxSize or clearCache.');warned=true;break;}check=map.get(key);}
  }
  if(maxSize!==undefined){let primitive=false;for(let i=0;i<args.length;i++)if(!weakKey(args[i])){primitive=true;break;}if(primitive&&++size>=maxSize){previous=current;current=branch();size=0;}}
  return value;
 }
 return fields(memoized,()=>{current=branch();previous=null;size=0;count=0;warned=false},()=>count,()=>{count=0});
}
const checks={identityFunctionCheck:'once',inputStabilityCheck:'once',cacheSizeCheck:'once'};
function setGlobalDevModeChecks(options){Object.assign(checks,options);}
const optArgs=o=>o===undefined?[]:Array.isArray(o)?o:[o];
function createSelectorCreator(config,...legacyOptions){
 const defaults=typeof config==='function'?{memoize:config,memoizeOptions:legacyOptions}:config;
 if(!defaults||typeof defaults.memoize!=='function')throw new TypeError('A memoize function is required');
 function createSelector(...parts){
  const options=typeof parts.at(-1)==='object'&&!Array.isArray(parts.at(-1))?parts.pop():{};
  const resultFunc=parts.pop(),dependencies=Array.isArray(parts[0])?parts[0]:parts;
  if(typeof resultFunc!=='function'||!dependencies.every(f=>typeof f==='function'))throw new TypeError('Expected input selectors and a result function');
  const settings={...defaults,...options},memoize=settings.memoize,argsMemoize=settings.argsMemoize||weakMapMemoize;
  let recomputations=0,dependencyRecomputations=0,last,first=true;
  const memoizedResultFunc=memoize(function(){recomputations++;return resultFunc.apply(null,arguments)},...optArgs(settings.memoizeOptions));
  const compute=function(){
   dependencyRecomputations++;
   const args=arguments,values=new Array(dependencies.length);
   for(let i=0;i<dependencies.length;i++)values[i]=dependencies[i].apply(null,args);
   last=memoizedResultFunc.apply(null,values);
   if(development){
    const enabled={...checks,...settings.devModeChecks};
    if(enabled.inputStabilityCheck==='always'||first&&enabled.inputStabilityCheck==='once'){
     const repeated=dependencies.map(fn=>fn.apply(null,args)),test=memoize(()=>({}),...optArgs(settings.memoizeOptions));
     if(test(...values)!==test(...repeated))console.warn('An input selector returned a new value for unchanged arguments.');
    }
    if((enabled.identityFunctionCheck==='always'||first&&enabled.identityFunctionCheck==='once')&&values.length===1&&last===values[0]){
     const sentinel={};let identity=false;try{identity=resultFunc(sentinel)===sentinel}catch{}
     if(identity)console.warn('The result function returned its input unchanged.');
    }
    first=false;
   }
   return last;
  };
  // A single-input selector can pass its value directly instead of allocating
  // a temporary values array on each new state. Diagnostics keep the full path.
  const collect=!development&&dependencies.length===1?function(){
   if(dependencies.length!==1)return compute.apply(null,arguments);
   dependencyRecomputations++;return last=memoizedResultFunc.call(null,dependencies[0].apply(null,arguments));
  }:compute;
  const selector=argsMemoize(collect,...optArgs(settings.argsMemoizeOptions));
  return Object.assign(selector,{resultFunc,memoizedResultFunc,dependencies,memoize,argsMemoize,lastResult:()=>last,recomputations:()=>recomputations,resetRecomputations:()=>{recomputations=0},dependencyRecomputations:()=>dependencyRecomputations,resetDependencyRecomputations:()=>{dependencyRecomputations=0}});
 }
 createSelector.withTypes=()=>createSelector;return createSelector;
}
const createSelector=createSelectorCreator({memoize:weakMapMemoize});
function createStructuredSelector(selectors,creator=createSelector){
 if(!selectors||typeof selectors!=='object')throw new TypeError('Expected an object of selectors');
 const names=Object.keys(selectors);return creator(names.map(key=>selectors[key]),(...values)=>Object.fromEntries(names.map((key,i)=>[key,values[i]])));
}
createStructuredSelector.withTypes=()=>createStructuredSelector;
module.exports={createSelector,createSelectorCreator,createStructuredSelector,lruMemoize,weakMapMemoize,referenceEqualityCheck,setGlobalDevModeChecks};
