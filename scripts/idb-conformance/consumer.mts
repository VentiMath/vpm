import {openDB,wrap,unwrap,type DBSchema,type IDBPDatabase} from 'vidb';
interface Schema extends DBSchema { records:{key:string;value:{name:string;rank:number};indexes:{byRank:number}}; counts:{key:string;value:number} }
const db=await openDB<Schema>('typed',1,{upgrade(db){db.createObjectStore('records').createIndex('byRank','rank');db.createObjectStore('counts')}});
await db.put('records',{name:'Synthetic',rank:3},'a');
const row=await db.getFromIndex('records','byRank',3);if(row)row.name.toUpperCase();
const tx=db.transaction(['records','counts'] as const,'readwrite');await tx.objectStore('counts').put(3,'a');await tx.done;
const one=db.transaction('records','readwrite');await one.store.put({name:'B',rank:4},'b');
for await(const cursor of db.transaction('records').store){cursor.value.name;cursor.advance(2)}
const raw:IDBDatabase=unwrap(db);const again:IDBPDatabase=wrap(raw);void again;
const cursorResult=await wrap(raw.transaction('records').objectStore('records').openCursor());
if(cursorResult){const moved:Promise<typeof cursorResult|null>=cursorResult.continue();void moved;}
// @ts-expect-error wrong store
await db.get('missing','a');
// @ts-expect-error wrong value
await db.put('counts','bad','a');
// @ts-expect-error wrong index key
await db.getFromIndex('records','byRank','bad');
// @ts-expect-error readonly transaction
await db.transaction('records').store.put({name:'A',rank:1},'a');
// @ts-expect-error transaction store list
one.objectStore('counts');
