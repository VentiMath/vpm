'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),r=require('..');
test('prototype-named reducers and creators remain own properties',()=>{
 const reducers=Object.fromEntries(['__proto__','constructor','toString'].map(key=>[key,(value=0,action)=>action.type==='add'?value+1:value]));
 const store=r.createStore(r.combineReducers(reducers));
 assert.deepEqual(Object.keys(store.getState()),Object.keys(reducers));
 store.dispatch({type:'add'});for(const key of Object.keys(reducers))assert.equal(store.getState()[key],1);
 assert.equal(Object.getPrototypeOf(store.getState()),Object.prototype);
 const creators=r.bindActionCreators(Object.fromEntries(Object.keys(reducers).map(key=>[key,()=>({type:'add'})])),store.dispatch);
 assert.equal(Object.getPrototypeOf(creators),Object.prototype);assert(Object.hasOwn(creators,'__proto__'));
 creators.__proto__();assert.equal(store.getState().__proto__,2);
});
test('nested dispatch observes its new listener set while the outer dispatch finishes its snapshot',()=>{
 const store=r.createStore((s=0)=>s+1),events=[];let nested=false;
 let off;store.subscribe(()=>{events.push('a'+store.getState());if(!nested){nested=true;off();store.subscribe(()=>events.push('c'+store.getState()));store.dispatch({type:'nested'});}});
 off=store.subscribe(()=>events.push('b'+store.getState()));store.dispatch({type:'outer'});
 assert.deepEqual(events,['a2','a3','c3','b3']);off();
});
test('plain objects cross realms without consulting constructor getters',()=>{
 const cross=vm.runInNewContext('({type:"ok"})');assert(r.isAction(cross));
 const action=Object.create(null);action.type='ok';Object.defineProperty(action,'constructor',{get(){throw Error('constructor read')}});
 assert(r.isAction(action));assert.equal(r.createStore((s=0)=>s).dispatch(action),action);
 assert(!r.isPlainObject(new(class Action{})()));assert(!r.isAction([]));
});
test('composition does not bind the functions array as this',()=>{
 const calls=[];const f=function(v){calls.push(this);return v+1};assert.equal(r.compose(f,f)(1),3);assert.deepEqual(calls,[undefined,undefined]);
 const owner={value:4,make:r.bindActionCreators(function(){return {type:'x',value:this.value}},x=>x)};assert.equal(owner.make().value,4);
});
test('failed reducers recover without committing state or notifying',()=>{
 const store=r.createStore((s=0,a)=>{if(a.type==='fail')throw Error('failure');return s+1});let count=0;store.subscribe(()=>count++);
 assert.throws(()=>store.dispatch({type:'fail'}),/failure/);assert.equal(store.getState(),1);assert.equal(count,0);
 store.dispatch({type:'ok'});assert.equal(store.getState(),2);assert.equal(count,1);
});
