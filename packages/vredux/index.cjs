'use strict';

const suffix=()=>Math.random().toString(36).slice(2).split('').join('.');
const actions={INIT:'@@redux/INIT'+suffix(),REPLACE:'@@redux/REPLACE'+suffix(),PROBE_UNKNOWN_ACTION:()=>'@@redux/PROBE_UNKNOWN_ACTION'+suffix()};
const observable=typeof Symbol==='function'&&Symbol.observable||'@@observable';
function kind(value){
  if(value===null)return 'null';
  if(typeof value!=='object')return typeof value;
  const tag=Object.prototype.toString.call(value).slice(8,-1);
  return ['Promise','WeakMap','WeakSet','Map','Set','Symbol'].includes(tag)?tag:tag.toLowerCase();
}
function fail(code,message){throw new Error(process.env.NODE_ENV==='production'?`Minified Redux error #${code}; visit https://redux.js.org/Errors?code=${code} for the full message or use the non-minified dev environment for full errors. `:message)}
function isPlainObject(value){
  if(value===null||typeof value!=='object')return false;
  const parent=Object.getPrototypeOf(value);
  return parent===null||Object.getPrototypeOf(parent)===null;
}
function isAction(value){return isPlainObject(value)&&typeof value.type==='string'}
function compose(...functions){
  if(!functions.length)return value=>value;
  if(functions.length===1)return functions[0];
  return function(...args){let fn=functions[functions.length-1],value=fn(...args);for(let i=functions.length-2;i>=0;i--){fn=functions[i];value=fn(value);}return value};
}
function createStore(reducer,preloaded,enhancer){
  if(typeof reducer!=='function')fail(2,`Expected the root reducer to be a function. Instead, received: '${kind(reducer)}'`);
  if(typeof preloaded==='function'&&typeof enhancer==='function'||typeof enhancer==='function'&&typeof arguments[3]==='function')fail(0,'Passing several store enhancers is not supported. Compose them into a single enhancer.');
  if(typeof preloaded==='function'&&enhancer===undefined){enhancer=preloaded;preloaded=undefined}
  if(enhancer!==undefined){if(typeof enhancer!=='function')fail(1,`Expected the enhancer to be a function. Instead, received: '${kind(enhancer)}'`);return enhancer(createStore)(reducer,preloaded)}
  let state=preloaded,reducing=false,snapshot=null,nextId=0;
  const listeners=new Map();
  function getState(){if(reducing)fail(3,'You may not call store.getState() while the reducer is executing.');return state}
  function subscribe(listener){
    if(typeof listener!=='function')fail(4,`Expected the listener to be a function. Instead, received: '${kind(listener)}'`);
    if(reducing)fail(5,'You may not call store.subscribe() while the reducer is executing.');
    const id=nextId++;listeners.set(id,listener);snapshot=null;let active=true;
    return()=>{if(!active)return;if(reducing)fail(6,'You may not unsubscribe from a store listener while the reducer is executing.');active=false;listeners.delete(id);snapshot=null};
  }
  function dispatch(action){
    if(!isPlainObject(action))fail(7,`Actions must be plain objects. Instead, the actual type was: '${kind(action)}'.`);
    if(action.type===undefined)fail(8,'Actions may not have an undefined "type" property.');
    if(typeof action.type!=='string')fail(17,`Action "type" property must be a string. Instead, the actual type was: '${kind(action.type)}'. Value was: '${String(action.type)}'.`);
    if(reducing)fail(9,'Reducers may not dispatch actions.');
    try{reducing=true;state=reducer(state,action)}finally{reducing=false}
    // Membership changes invalidate a cached array. Each dispatch holds its own
    // snapshot, so nested dispatch and unsubscription preserve notification order.
    const active=snapshot??(snapshot=Array.from(listeners.values()));
    for(const listener of active)listener();
    return action;
  }
  function replaceReducer(next){if(typeof next!=='function')fail(10,`Expected the nextReducer to be a function. Instead, received: '${kind(next)}'`);reducer=next;dispatch({type:actions.REPLACE})}
  const store={dispatch,subscribe,getState,replaceReducer,[observable](){
    return {subscribe(observer){
      if(typeof observer!=='object'||observer===null)fail(11,`Expected the observer to be an object. Instead, received: '${kind(observer)}'`);
      const notify=()=>{if(observer.next)observer.next(getState())};notify();return {unsubscribe:subscribe(notify)};
    },[observable](){return this}};
  }};
  dispatch({type:actions.INIT});return store;
}
function ownSet(object,key,value){if(key==='__proto__')Object.defineProperty(object,key,{value,enumerable:true,configurable:true,writable:true});else object[key]=value}
function combineReducers(reducers){
  const entries=[],warned=new Set();
  for(const key of Object.keys(reducers)){
    const reducer=reducers[key];
    if(reducer===undefined&&process.env.NODE_ENV!=='production')console.error(`No reducer provided for key "${key}"`);
    if(typeof reducer==='function')entries.push([key,reducer]);
  }
  const keys=entries.map(entry=>entry[0]),functions=entries.map(entry=>entry[1]);
  const names=new Set(keys);let shapeError;
  try{for(const [key,reducer]of entries){
    if(reducer(undefined,{type:actions.INIT})===undefined)fail(12,`The slice reducer for key "${key}" returned undefined during initialization.`);
    if(reducer(undefined,{type:actions.PROBE_UNKNOWN_ACTION()})===undefined)fail(13,`The slice reducer for key "${key}" returned undefined for a private action.`);
  }}catch(error){shapeError=error}
  return function combination(state={},action){
    if(shapeError)throw shapeError;
    if(process.env.NODE_ENV!=='production'){
      const where=action?.type===actions.INIT?'createStore':'reducer',keys=entries.map(([key])=>`"${key}"`).join(', ');
      if(!entries.length)console.error('Store does not have a valid reducer.');
      else if(!isPlainObject(state))console.error(`The state passed to ${where} has unexpected type of "${kind(state)}". Expected an object with keys: ${keys}`);
      else if(action?.type!==actions.REPLACE){const extra=Object.keys(state).filter(key=>!names.has(key)&&!warned.has(key));for(const key of extra)warned.add(key);if(extra.length)console.error(`Unexpected key${extra.length===1?'':'s'} ${extra.map(key=>`"${key}"`).join(', ')} found in ${where}. Expected keys instead: ${keys}`)}
    }
    const result={};let changed=Object.keys(state).length!==entries.length;
    for(let i=0;i<keys.length;i++){
      const key=keys[i],reduce=functions[i];
      const before=Object.hasOwn(state,key)?state[key]:undefined,next=reduce(before,action);
      if(next===undefined)fail(14,action?.type?`When called with action "${String(action.type)}", the slice reducer for key "${key}" returned undefined.`:`The slice reducer for key "${key}" returned undefined when called with an action.`);
      ownSet(result,key,next);if(next!==before)changed=true;
    }
    return changed?result:state;
  };
}
function bindActionCreators(creators,dispatch){
  const bind=creator=>function(...args){return dispatch(creator.apply(this,args))};
  if(typeof creators==='function')return bind(creators);
  if(creators===null||typeof creators!=='object')fail(16,`bindActionCreators expected an object or a function, but instead received: '${kind(creators)}'. Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`);
  const bound={};for(const key of Object.keys(creators))if(typeof creators[key]==='function')ownSet(bound,key,bind(creators[key]));return bound;
}
function applyMiddleware(...middleware){return create=>(...args)=>{
  const store=create(...args);let dispatch=()=>fail(15,'Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.');
  const api={getState:store.getState,dispatch:(...input)=>dispatch(...input)};
  dispatch=compose(...middleware.map(make=>make(api)))(store.dispatch);
  return {...store,dispatch};
}}
module.exports={createStore,legacy_createStore:createStore,combineReducers,bindActionCreators,applyMiddleware,compose,isAction,isPlainObject,__DO_NOT_USE__ActionTypes:actions};
