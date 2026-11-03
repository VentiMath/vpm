'use strict';
const {SnapshotIndex}=require('../build/src/snapshot-index');
const {Timestamp,GeoPoint,VectorValue,equal,FieldPath}=require('./values');
const {DocumentReference,DocumentSnapshot,QueryDocumentSnapshot,QuerySnapshot}=require('./query');
const retryable=new Set([1,2,4,8,13,14]);
const rank=v=>v===undefined?-1:v===null?0:typeof v==='boolean'?1:typeof v==='number'||typeof v==='bigint'?2:v instanceof Timestamp?3:typeof v==='string'?4:Buffer.isBuffer(v)||v instanceof Uint8Array?5:v instanceof DocumentReference?6:v instanceof GeoPoint?7:Array.isArray(v)?8:v instanceof VectorValue?9:10;
function compare(a,b){
 if(a===b)return 0;const x=rank(a),y=rank(b);if(x!==y)return x-y;
 if(x===2){if(Number.isNaN(a))return Number.isNaN(b)?0:-1;if(Number.isNaN(b))return 1;}
 if(x===3){a=a.valueOf();b=b.valueOf();}if(x===4||x===6){return Buffer.compare(Buffer.from(x===6?a._name:a),Buffer.from(x===6?b._name:b));}
 if(x===5)return Buffer.compare(a,b);if(x===7)return compare(a.latitude,b.latitude)||compare(a.longitude,b.longitude);
 if(x===9){a=a.toArray();b=b.toArray();if(a.length!==b.length)return a.length-b.length;}
 if(x===8||x===9){for(let i=0;i<Math.min(a.length,b.length);i++){const c=compare(a[i],b[i]);if(c)return c;}return a.length-b.length;}
 if(x===10){const keysA=Object.keys(a).sort(),keysB=Object.keys(b).sort();for(let i=0;i<Math.min(keysA.length,keysB.length);i++){const c=compare(keysA[i],keysB[i])||compare(a[keysA[i]],b[keysB[i]]);if(c)return c;}return keysA.length-keysB.length;}
 return a<b?-1:a>b?1:0;
}
function listen(db,target,next,onError=()=>{}){
 if(typeof next!=='function'||typeof onError!=='function')throw new TypeError('Snapshot callbacks must be functions');
 let closed=false,stream,timer,resumeToken,pendingToken,resetPending=false,attempts=0,current=false,initial=true,published=new Map(),working=new Map();
 const document=target instanceof DocumentReference;
 const orders=document?[]:target._orders(),direction=orders.at(-1)?.direction||'ASCENDING';if(!document&&!orders.some(v=>v.field.fieldPath==='__name__'))orders.push({field:{fieldPath:'__name__'},direction});
 const comparator=(a,b)=>{for(const order of orders){const field=order.field.fieldPath,c=compare(field==='__name__'?a.ref:a.get(FieldPath.fromFormatted(field)),field==='__name__'?b.ref:b.get(FieldPath.fromFormatted(field)));if(c)return order.direction==='DESCENDING'?-c:c;}return 0;};
 let tree=new SnapshotIndex(comparator);
 const stop=()=>{if(closed)return;closed=true;clearTimeout(timer);db._listeners.delete(stop);stream?.cancel?.();stream?.destroy?.();};
 const fail=error=>{if(closed)return;stop();onError(error instanceof Error?error:Object.assign(new Error(error.message||'Listen failed'),{code:error.code}));};
 db._listeners.add(stop);
 function flush(readTime){
  const changes=[],removed=[...published.values()].filter(doc=>!working.has(doc.ref.path)).sort(comparator),added=[...working.values()].filter(doc=>!published.has(doc.ref.path)).sort(comparator),modified=[...working.values()].filter(doc=>published.has(doc.ref.path)&&!doc.isEqual(published.get(doc.ref.path))).sort(comparator);
  for(const doc of removed){const r=tree.remove(doc);tree=r.tree;changes.push({type:'removed',doc,oldIndex:r.index,newIndex:-1});}
  for(const doc of added){const r=tree.insert(doc);tree=r.tree;changes.push({type:'added',doc,oldIndex:-1,newIndex:r.index});}
  for(const doc of modified){const r=tree.remove(published.get(doc.ref.path)),a=r.tree.insert(doc);tree=a.tree;changes.push({type:'modified',doc,oldIndex:r.index,newIndex:a.index});}
  published=new Map(working);resumeToken=pendingToken;attempts=0;
  if(initial||changes.length){const retained=tree;initial=false;if(document){const doc=working.get(target.path);next(new DocumentSnapshot(target,doc?._proto,readTime));}else {let docs;const materialize=doc=>new QueryDocumentSnapshot(doc.ref,doc._proto,readTime);next(new QuerySnapshot(target,()=>[...(docs??=retained.keys.map(materialize))],readTime,changes.map(c=>({...c,doc:materialize(c.doc)}))));}}
 }
 async function connect(){
  if(closed)return;current=false;working=resetPending||!resumeToken?new Map():new Map(published);resetPending=false;pendingToken=resumeToken;
  try{const client=await db._getClient(true);if(closed)return;db._assertOpen();const active=stream=client.listen(db._callOptions('listen'));let settled=false;
   const disconnected=error=>{if(settled||closed)return;settled=true;active.destroy?.();if(!retryable.has(error.code)||++attempts>5)return fail(error);timer=setTimeout(connect,Math.min(1000,20*2**attempts));};
   active.on('error',disconnected);active.on('end',()=>disconnected(Object.assign(new Error('Listen stream ended'),{code:14})));
   active.on('data',message=>{if(closed||active!==stream)return;try{
    const change=message.targetChange;
    if(change){const type=typeof change.targetChangeType==='number'?['NO_CHANGE','ADD','REMOVE','CURRENT','RESET'][change.targetChangeType]:change.targetChangeType;if(type==='ADD'&&change.targetIds?.some(id=>id!==1))throw new Error('Unexpected Listen target ID');if(change.resumeToken?.length)pendingToken=Buffer.from(change.resumeToken);if(type==='REMOVE')return fail(Object.assign(new Error(change.cause?.message||'Listen target removed'),{code:change.cause?.code||2}));if(type==='RESET'){working.clear();current=false;resumeToken=pendingToken=undefined;}if(type==='CURRENT')current=true;if(type==='NO_CHANGE'&&current&&change.readTime&&!change.targetIds?.length)flush(change.readTime);}
    if(message.documentChange){const value=message.documentChange;if(value.targetIds?.includes(1)){const ref=db._reference(value.document.name).withConverter(target._converter);const old=working.get(ref.path),updated=value.document.updateTime;if(!old?.updateTime||!updated||!old.updateTime.isEqual(Timestamp.fromProto(updated)))working.set(ref.path,new QueryDocumentSnapshot(ref,value.document));}else if(value.removedTargetIds?.includes(1))working.delete(db._reference(value.document.name).path);}
    if(message.documentDelete||message.documentRemove){const value=message.documentDelete||message.documentRemove;working.delete(db._reference(value.document).path);}
    if(message.filter&&message.filter.count!==working.size){resumeToken=pendingToken=undefined;resetPending=true;working.clear();disconnected(Object.assign(new Error('Listen existence filter reset'),{code:14}));}
   }catch(error){fail(error);}});
   const addTarget={...(document?{documents:{documents:[target._name]}}:{query:target.toProto(undefined,true)}),targetId:1,...(resumeToken?{resumeToken}:{})};active.write({database:db.databasePath,addTarget:db._resolved(addTarget)});
  }catch(error){fail(error);}
 }
 queueMicrotask(connect);return stop;
}
module.exports={listen,compare};
