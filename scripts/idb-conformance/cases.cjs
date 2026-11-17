'use strict';
// Shared black-box operations; no upstream implementation is inspected.
async function exercise(api,name){
 const {openDB,deleteDB,wrap,unwrap}=api,events=[],result={};
 const db=await openDB(name,1,{upgrade(db,old,next,tx,event){events.push([old,next,event.type,tx.mode]);const store=db.createObjectStore('records',{keyPath:'id'});store.createIndex('byRank','rank');store.createIndex('name','name',{unique:true});db.createObjectStore('settings');},blocking(old,next,event){events.push(['blocking',old,next,event.type])}});
 result.upgrade=events.slice();result.identity=wrap(unwrap(db))===db;result.helpers=['get','getFromIndex','clear'].every(key=>key in db);result.native=[db.name,db.version,[...db.objectStoreNames]];
 const object={count:2,nested:{label:'local'}};await db.put('settings',object,'state');object.nested.label='changed';result.clone=(await db.get('settings','state')).nested.label;
 const tx=db.transaction('records','readwrite');result.tx=[tx.store===tx.objectStore('records'),tx.store.transaction===tx,tx.db===db,tx.done===tx.done,'done' in tx];
 for(let id=1;id<=5;id++)await tx.store.put({id,name:'record'+id,rank:Math.ceil(id/2)});await tx.done;
 result.reads=await Promise.all([db.count('records'),db.getKey('records',3),db.getAllKeys('records'),db.countFromIndex('records','byRank',1),db.getKeyFromIndex('records','byRank',2),db.getAllKeysFromIndex('records','byRank',2)]);
 result.fromIndex=(await db.getAllFromIndex('records','byRank',1)).map(x=>x.id);
 const multi=db.transaction(['records','settings']);result.multi=multi.store===undefined;await multi.done;
 const iter=db.transaction('records');result.cursor=[];let cursor=await iter.store.openCursor();while(cursor){result.cursor.push([cursor.key,cursor.value.name]);cursor=await cursor.continue();}await iter.done;
 const skipping=db.transaction('records');result.skipped=[];for await(const c of skipping.store){result.skipped.push(c.key);if(c.key===1)result.advanceReturn=c.advance(2)===undefined;}await skipping.done;
 const indexed=db.transaction('records');result.iteratedIndex=[];for await(const c of indexed.store.index('byRank').iterate(2))result.iteratedIndex.push(c.primaryKey);await indexed.done;
 const change=db.transaction('records','readwrite');const first=await change.store.openCursor();await first.update({...first.value,name:'updated'});await change.done;result.updated=(await db.get('records',1)).name;
 const bad=db.transaction('records','readwrite');const badDone=bad.done.catch(e=>e.name);try{await bad.store.add({id:1,name:'duplicate',rank:9});}catch(e){result.requestError=e.name;}result.transactionError=await badDone;result.afterError=(await db.get('records',1)).name;
 const aborted=db.transaction('settings','readwrite');const done=aborted.done.catch(e=>e.name);const pending=aborted.store.put('discard','abort').catch(e=>e.name);aborted.abort();result.aborted=[await pending,await done,await db.get('settings','abort')];
 const request=unwrap(db).transaction('settings').objectStore('settings').get('state');const wrapped=wrap(request);result.requestIdentity=unwrap(wrapped)===request;result.requestValue=(await wrapped).count;
 let blocked;const blockedPromise=new Promise(resolve=>blocked=resolve);const next=openDB(name,2,{upgrade(db,old,next,tx){events.push(['upgrade2',old,next]);tx.objectStore('settings').put(true,'migrated');},blocked(old,next,event){events.push(['blocked',old,next,event.type]);blocked();}});await blockedPromise;db.close();const newer=await next;result.migrated=await newer.get('settings','migrated');result.events=events;
 await newer.delete('records',2);result.deleted=await newer.get('records',2);await newer.clear('records');result.cleared=await newer.count('records');
 const deletion=deleteDB(name,{blocked(old,event){result.deleteBlocked=[old,event.type];newer.close();}});await deletion;
 delete result.native[0];return result;
}
module.exports={exercise};
