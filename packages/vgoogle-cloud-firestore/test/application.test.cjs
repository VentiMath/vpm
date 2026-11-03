'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{PassThrough}=require('node:stream'),http=require('node:http'),path=require('node:path');
const F=require('..'),upstream=require('../../../scripts/firestore-conformance/node_modules/@google-cloud/firestore');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const proto=upstream.protos.google.firestore.v1;
const normalize=q=>proto.RunQueryRequest.toObject(proto.RunQueryRequest.fromObject(q),{longs:String,enums:String,defaults:true});
const database=()=>new F.Firestore({projectId:'fixture'});
test('current vector, collection-group, composite and cursor query contracts match upstream',()=>{
 const builders=[db=>db.collectionGroup('members').where('n','>=',1).orderBy('n').startAfter(3).select('name').limit(10),db=>db.collection('things').where(db.F.Filter.or(db.F.Filter.where('a','==',null),db.F.Filter.where('b','!=',NaN))).orderBy('x','desc').startAt(5).endBefore(1),db=>db.collection('things').findNearest({vectorField:new db.F.FieldPath('v','x.y'),queryVector:[0.2,0.3],limit:10,distanceMeasure:'COSINE',distanceResultField:'distance',distanceThreshold:0.5}),db=>db.collection('things').orderBy('n').startAt(1).endAt(9).limitToLast(3),db=>db.collection('things').where(db.F.FieldPath.documentId(),'in',['x','y'])];
 for(const build of builders){const a=new upstream.Firestore({projectId:'fixture'}),b=database();a.F=upstream;b.F=F;assert.deepEqual(normalize(build(b).toProto()),normalize(build(a).toProto()));}
 const query=database().collection('things').findNearest({vectorField:'v',queryVector:[1],limit:1,distanceMeasure:'EUCLIDEAN',distanceThreshold:0});assert.deepEqual(query.toProto().structuredQuery.findNearest.distanceThreshold,{value:0});
});
test('timestamp boundaries, fractional dates, geopoints and vectors match current values',()=>{
 for(const milliseconds of [-62135596800000,-1001.5,-0.1,0,1.9,1700000000123]){const a=F.Timestamp.fromMillis(milliseconds),b=upstream.Timestamp.fromMillis(milliseconds);assert.equal(a.valueOf(),b.valueOf());assert.equal(a.toDate().getTime(),b.toDate().getTime());assert.equal(a.toMillis(),b.toMillis());}
 for(const args of [[0,-1],[0,1e9],[Infinity,0],[253402300800,0]])assert.throws(()=>new F.Timestamp(...args));
 const values=[1,2],vector=F.FieldValue.vector(values);values[0]=3;vector.toArray()[0]=4;assert.deepEqual(vector.toArray(),[1,2]);assert.throws(()=>F.FieldValue.vector([NaN]));assert.throws(()=>new F.GeoPoint(91,0));
});
test('codec preserves prototype-shaped keys, bytes, references, nanoseconds and fresh data',()=>{
 const db=database(),input=JSON.parse('{"__proto__":{"polluted":true},"constructor":2}');input.bytes=Buffer.from([1,2]);input.time=new F.Timestamp(-1,999999999);input.ref=db.doc('a/b');input.vector=F.FieldValue.vector([1,2]);
 const fields=db._serializer.encodeFields(input),snapshot=db.snapshot_({name:input.ref._name,fields},null);input.bytes[0]=9;const a=snapshot.data();assert.equal(Object.getPrototypeOf(a),Object.prototype);assert.equal(Object.hasOwn(a,'__proto__'),true);assert.equal({}.polluted,undefined);a.bytes[0]=8;a.__proto__.polluted=false;const b=snapshot.data();assert.equal(b.bytes[0],1);assert.equal(b.__proto__.polluted,true);assert(b.ref.isEqual(input.ref));assert(b.time.isEqual(input.time));assert.deepEqual(b.vector.toArray(),[1,2]);
});
test('write construction snapshots data and rejects cycles, unsupported values and overlapping paths',()=>{
 const db=database(),ref=db.doc('a/b'),data={x:{n:1}},batch=db.batch().set(ref,data,{merge:true});data.x.n=2;assert.equal(batch._ops[0].update.fields.x.mapValue.fields.n.integerValue,'1');
 const cycle={};cycle.self=cycle;for(const value of [cycle,{x:()=>{}},{x:undefined},{x:[[1]]}])assert.throws(()=>db.batch().set(ref,value));
 assert.throws(()=>db.batch().update(ref,{'a':1,'a.b':2}));assert.throws(()=>db.batch().set(ref,{a:{b:1}},{mergeFields:['a','a.b']}));assert.throws(()=>db.batch().set(ref,{a:1,b:F.FieldValue.delete()},{mergeFields:['a']}));assert.throws(()=>db.batch().set(ref,{a:{b:F.FieldValue.delete()}},{mergeFields:['a']}));
 const foreign=database();assert.throws(()=>db.batch().set(foreign.doc('a/b'),{}));
});
test('commit is single-use and invalid transforms never enqueue partial writes',async()=>{
 const db=database(),batch=db.batch(),ref=db.doc('a/b');assert.throws(()=>batch.set(ref,{a:F.FieldValue.arrayUnion(F.FieldValue.serverTimestamp())}));assert.equal(batch._ops.length,0);batch.set(ref,{a:1});let calls=0;db._unary=async()=>{calls++;return {writeResults:[{updateTime:{seconds:1}}]};};await batch.commit();await assert.rejects(batch.commit());assert.throws(()=>batch.delete(ref));assert.equal(calls,1);
});
test('converters are isolated from storage fields and preserve references',()=>{
 const db=database(),converter={toFirestore:value=>({n:value.number}),fromFirestore:snapshot=>({number:snapshot.get('n')})},ref=db.collection('a').withConverter(converter).doc('b'),batch=db.batch().set(ref,{number:5});assert.equal(batch._ops[0].update.fields.n.integerValue,'5');const snapshot=new F.DocumentSnapshot(ref,{name:ref._name,fields:{n:{integerValue:'6'}}});assert.deepEqual(snapshot.data(),{number:6});assert.equal(snapshot.get('n'),6);
});
test('getAll preserves caller order and duplicates and rejects an incomplete response',async()=>{
 const db=database(),a=db.doc('c/a'),b=db.doc('c/b');db._responses=async function*(){yield{found:{name:b._name,fields:{n:{integerValue:'2'}}}};yield{missing:a._name};};assert.deepEqual((await db.getAll(a,b,a)).map(d=>[d.id,d.exists]),[['a',false],['b',true],['a',false]]);
 db._responses=async function*(){yield{missing:a._name};};await assert.rejects(db.getAll(a,b),/without all/);
});
test('transaction conflicts retry with a fresh write set and rollback the failed attempt',async()=>{
 const db=database(),ref=db.doc('c/a');let commits=0,reads=0,rollbacks=0,callbacks=0;
 db._responses=async function*(_method,_request,capture){capture(Buffer.from('tx'+(++reads)));yield{found:{name:ref._name,fields:{n:{integerValue:String(reads)}}}};};
 db._unary=async(method,request)=>{if(method==='rollback'){rollbacks++;return{};}assert.equal(request.writes.length,1);assert.equal(request.writes[0].update.fields.n.integerValue,'3');return {writeResults:[{updateTime:{seconds:3}}]};};
 const real=db._commit.bind(db);db._commit=async(...args)=>{if(++commits===1)throw Object.assign(Error('conflict'),{code:10});return real(...args);};
 const result=await db.runTransaction(async tx=>{callbacks++;const snapshot=await tx.get(ref);tx.update(ref,{n:snapshot.get('n')+1});return snapshot.get('n');});assert.equal(result,2);assert.equal(callbacks,2);assert.equal(rollbacks,1);
});
test('transactions reject reads after writes, read-only writes and commit after swallowed read failure',async()=>{
 const db=database(),ref=db.doc('a/b');let committed=0;db._commit=async()=>{committed++;};
 await assert.rejects(db.runTransaction(async tx=>{tx.set(ref,{});await tx.get(ref);}),/reads must precede/);
 await assert.rejects(db.runTransaction(async tx=>tx.set(ref,{}),{readOnly:true}),/Read-only/);
 db._responses=async function*(){throw Object.assign(Error('read denied'),{code:7});};await assert.rejects(db.runTransaction(async tx=>{await tx.get(ref).catch(()=>{});tx.set(ref,{n:1});}),/read denied/);assert.equal(committed,0);
});
test('concurrent transaction reads share the first transaction and then use its ID',async()=>{
 const db=database(),selectors=[];db._responses=async function*(_method,request,capture){selectors.push(request);capture(Buffer.from('one'));yield{missing:request.documents[0]};};db._unary=async()=>({writeResults:[]});await db.runTransaction(async tx=>{await Promise.all([tx.get(db.doc('c/a')),tx.get(db.doc('c/b'))]);});assert(selectors[0].newTransaction);assert.deepEqual(selectors[1].transaction,Buffer.from('one'));
});
test('bulk writes settle partial failures and do not retry indefinitely',async()=>{
 const db=database(),writer=db.bulkWriter();let calls=0;db._unary=async()=>({status:[{code:++calls<3?14:0}],writeResults:[{updateTime:{seconds:1}}]});const pending=writer.set(db.doc('a/b'),{n:1});await writer.close();assert((await pending).writeTime instanceof F.Timestamp);assert.equal(calls,3);assert.throws(()=>writer.delete(db.doc('a/b')));
 const denied=db.bulkWriter();denied.onWriteError(()=>false);db._unary=async()=>{throw Object.assign(Error('denied'),{code:7});};const failed=denied.delete(db.doc('a/b'));await denied.close();await assert.rejects(failed,{code:7});assert.equal(db._writers.size,0);
});
test('recursive deletion traverses missing parent documents and deletes descendants before ancestors',async()=>{
 const db=database(),deleted=[],root=db.doc('parents/missing');db._listCollections=async relative=>relative===root.path?[db.collection(relative+'/children')]:[];db._documentRefs=async function*(collection){yield db.doc(collection.path+'/leaf');};db._unary=async(_method,request)=>{deleted.push(...request.writes.map(w=>w.delete));return {status:request.writes.map(()=>({code:0})),writeResults:request.writes.map(()=>({updateTime:{seconds:1}}))};};await db.recursiveDelete(root);assert.deepEqual(deleted,[root._name+'/children/leaf',root._name]);
});
test('stream destruction cancels a stalled transport promptly',async()=>{
 const db=database(),source=new PassThrough({objectMode:true});let cancelled=false;source.cancel=()=>{cancelled=true;source.destroy();};db._getClient=async()=>({runQuery:()=>source});const output=db.collection('c').stream();output.on('error',()=>{});output.resume();await tick();output.destroy();await tick();assert(cancelled);assert.equal(db._streams.size,0);
});
test('REST client sends real HTTP writes and reads through the same application API',async()=>{
 const requests=[],server=http.createServer(async(req,res)=>{let data='';for await(const chunk of req)data+=chunk;requests.push({url:req.url,data:JSON.parse(data)});res.setHeader('content-type','application/json');res.end(req.url.endsWith(':commit')?JSON.stringify({writeResults:[{updateTime:'2026-01-01T00:00:00Z'}],commitTime:'2026-01-01T00:00:00Z'}):JSON.stringify([{document:{name:'projects/fixture/databases/(default)/documents/c/a',fields:{n:{integerValue:'2'}},createTime:'2026-01-01T00:00:00Z',updateTime:'2026-01-01T00:00:00Z'},readTime:'2026-01-01T00:00:00Z'}]));});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const db=new F.Firestore({projectId:'fixture',host:'127.0.0.1:'+server.address().port,ssl:false,preferRest:true});
 try{await db.doc('c/a').set({n:2});const result=await db.collection('c').get();assert.equal(result.docs[0].get('n'),2);assert.equal(requests.length,2);assert.match(requests[0].url,/:commit$/);assert.match(requests[1].url,/:runQuery$/);}finally{await db.terminate();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('root entry does not load retained upstream Firestore runtime',()=>{const root=path.resolve(__dirname,'../build/src')+path.sep;for(const file of Object.keys(require.cache).filter(f=>f.startsWith(root)))assert(file.endsWith('/snapshot-index.js'),file);});
test('automatic IDs are unbiased alphanumeric identifiers with no collisions in a sample',()=>{const ids=new Set(),c=database().collection('c');for(let i=0;i<500;i++){const id=c.doc().id;assert.match(id,/^[a-zA-Z0-9]{20}$/);ids.add(id);}assert.equal(ids.size,500);});
test('watch comparison handles cross-database references without recursing through clients',()=>{const {compare}=require('../app/watch'),a=new F.Firestore({projectId:'other'}),b=new F.Firestore({projectId:'other'});assert.equal(compare(a.doc('x/a'),b.doc('x/a')),0);assert(compare(a.doc('x/a'),b.doc('x/b'))<0);});
test('logging emits static lifecycle information and cannot fail a request',()=>{const db=database(),messages=[];try{F.setLogFunction((...parts)=>messages.push(parts));db._callOptions('commit');assert.deepEqual(messages,[['Firestore request','commit']]);F.setLogFunction(()=>{throw Error('sink failed')});assert.doesNotThrow(()=>db._callOptions('commit'));}finally{F.setLogFunction(null);}});
test('Listen reconnect never resumes past updates that were not published at a consistent read time',async()=>{
 const {Duplex}=require('node:stream'),db=database();let attempts=0,resolve,reject;const finished=new Promise((yes,no)=>{resolve=yes;reject=no});let stop;
 db._getClient=async()=>({listen(){const stream=new Duplex({objectMode:true,read(){},write(request,_encoding,done){done();if(++attempts===1)queueMicrotask(()=>{stream.push({targetChange:{targetChangeType:'CURRENT',resumeToken:Buffer.from('safe')}});stream.push({targetChange:{targetChangeType:'NO_CHANGE',readTime:{seconds:1}}});stream.push({documentChange:{document:{name:db.doc('c/a')._name,fields:{n:{integerValue:'1'}},updateTime:{seconds:2}},targetIds:[1]}});stream.push({targetChange:{targetChangeType:'CURRENT',resumeToken:Buffer.from('not-yet-consistent')}});setImmediate(()=>stream.emit('error',Object.assign(Error('disconnect'),{code:14})));});else{try{assert.deepEqual(request.addTarget.resumeToken,Buffer.from('safe'));resolve();}catch(error){reject(error);}}}});stream.cancel=()=>stream.destroy();return stream;}});
 const timer=setTimeout(()=>reject(Error('reconnect timeout')),2000);try{stop=db.collection('c').onSnapshot(()=>{},reject);await finished;}finally{clearTimeout(timer);stop?.();await db.terminate();}
});
test('Functions protocol snapshots preserve decoded int64s, timestamp precision and owned bytes',()=>{
 const db=new F.Firestore({projectId:'fixture',useBigInt:true}),Document=F.protos.google.firestore.v1.Document;
 const source=Document.decode(Document.encode({name:db.doc('c/a')._name,fields:{n:{integerValue:'9223372036854775807'},t:{timestampValue:{seconds:'1700000000',nanos:123}},bytes:{bytesValue:Buffer.from([1,2])}},createTime:{seconds:1},updateTime:{seconds:2}}).finish());
 const snapshot=db.snapshot_(source,{seconds:3},'protobufJS');source.fields.bytes.bytesValue[0]=9;
 assert.equal(snapshot.get('n'),9223372036854775807n);assert(snapshot.get('t').isEqual(new F.Timestamp(1700000000,123)));assert.deepEqual(snapshot.get('bytes'),Buffer.from([1,2]));assert.equal(snapshot.createTime.seconds,1);assert.equal(snapshot.updateTime.seconds,2);
});
test('snapshot equality ignores read/update metadata and keeps document existence significant',()=>{
 for(const lib of [upstream,F]){const db=new lib.Firestore({projectId:'fixture'}),wire={name:'projects/fixture/databases/(default)/documents/c/a',fields:{n:{integerValue:'1'}},createTime:{seconds:1}};
 const a=db.snapshot_({...wire,updateTime:{seconds:2}},{seconds:3},'protobufJS'),b=db.snapshot_({...wire,updateTime:{seconds:4}},{seconds:5},'protobufJS');assert(a.isEqual(b));assert(!a.isEqual(db.snapshot_(wire.name,{seconds:3},'protobufJS')));}
});
test('fresh Listen reconnect removes stale documents and keeps query ordering',async()=>{
 const {Duplex}=require('node:stream'),db=database();let attempts=0,resolve,reject,stop,active;const received=[],finished=new Promise((yes,no)=>{resolve=yes;reject=no});
 db._getClient=async()=>({listen(){active=new Duplex({objectMode:true,read(){},write(request,_encoding,done){done();const n=++attempts;assert.deepEqual(request.addTarget.query.structuredQuery.orderBy.map(o=>o.field.fieldPath),['score','__name__']);queueMicrotask(()=>{for(const [id,score] of (n===1?[['a',2],['b',1]]:[['b',1]]))this.push({documentChange:{document:{name:db.doc('c/'+id)._name,fields:{score:{integerValue:String(score)}},updateTime:{seconds:1}},targetIds:[1]}});this.push({targetChange:{targetChangeType:'CURRENT'}});this.push({targetChange:{targetChangeType:'NO_CHANGE',readTime:{seconds:n}}});});}});active.cancel=()=>active.destroy();return active;}});
 const timer=setTimeout(()=>reject(Error('fresh Listen timeout')),2000);try{stop=db.collection('c').where('score','>',0).orderBy('score').onSnapshot(snapshot=>{received.push(snapshot.docs.map(d=>d.id));if(received.length===1)setImmediate(()=>active.emit('error',Object.assign(Error('disconnect'),{code:14})));else{try{assert.deepEqual(received,[['b','a'],['b']]);assert.deepEqual(snapshot.docChanges().map(c=>[c.type,c.doc.id,c.oldIndex,c.newIndex]),[['removed','a',1,-1]]);resolve();}catch(error){reject(error);}}},reject);await finished;}finally{clearTimeout(timer);stop?.();await db.terminate();}
});
test('snapshot wire cloning retains every value and isolates nested containers and metadata',()=>{
 const db=new F.Firestore({projectId:'fixture',useBigInt:true}),Document=F.protos.google.firestore.v1.Document;
 const input=JSON.parse('{"__proto__":{"polluted":true},"constructor":"own","nested":{"items":[null,false,1.25,"text"]}}');
 Object.assign(input,{n:9223372036854775807n,bytes:Buffer.from([3,4]),time:new F.Timestamp(-1,999999999),point:new F.GeoPoint(12,34),ref:db.doc('c/other'),emptyMap:{},emptyArray:[],vector:F.FieldValue.vector([1,2])});
 const wire={name:db.doc('c/a')._name,fields:db._serializer.encodeFields(input),createTime:{seconds:1,nanos:9},updateTime:{seconds:2,nanos:10}};
 for(const source of [wire,Document.decode(Document.encode(wire).finish())]){
  const snapshot=db.snapshot_(source,{seconds:3},'protobufJS'),expected=snapshot.data();
  source.fields.nested.mapValue.fields.items.arrayValue.values[0].nullValue=1;
  source.fields.nested.mapValue.fields.items.arrayValue.values[3].stringValue='changed';
  source.fields.bytes.bytesValue[0]=99;source.fields.time.timestampValue.nanos=0;source.createTime.nanos=0;
  const result=snapshot.data();assert.deepEqual(result,expected);assert.equal(result.n,9223372036854775807n);assert.equal(snapshot.createTime.nanoseconds,9);
  result.nested.items.push('extra');result.bytes[1]=99;result.__proto__.polluted=false;assert.deepEqual(snapshot.data(),expected);assert.equal({}.polluted,undefined);
 }
});
test('snapshot cloning preserves noncanonical and future wire fields without aliasing',()=>{
 const db=database(),fields={a:{arrayValue:{values:[{stringValue:'a'}],future:{bytes:Buffer.from([1])}}},b:{mapValue:{fields:{n:{integerValue:'1'}},future:[2]}},c:{stringValue:{future:3}},d:{unknown:{future:[4]}},e:{arrayValue:{values:undefined}},f:{mapValue:{fields:null}},g:{arrayValue:{}},h:{stringValue:'x',future:[5]},i:null};
 const source={name:db.doc('c/a')._name,fields,future:{items:[6]}},snapshot=db.snapshot_(source,null),expected=structuredClone(snapshot._proto);
 fields.a.arrayValue.future.bytes[0]=9;fields.b.mapValue.future[0]=9;fields.c.stringValue.future=9;fields.d.unknown.future[0]=9;fields.h.future[0]=9;source.future.items[0]=9;
 assert.deepEqual(structuredClone(snapshot._proto),expected);assert(Object.hasOwn(snapshot._proto.fields.e.arrayValue,'values'));
});
test('optimized decoding preserves oneof priority, empty values, wire defaults and owned fields',()=>{
 const db=database(),values=[{nullValue:0},{stringValue:''},{booleanValue:false},{integerValue:'-0'},{doubleValue:'NaN'},{arrayValue:{}},{mapValue:{}},{bytesValue:''},{stringValue:'first',integerValue:'2'},{unknown:true,stringValue:'kept'}];
 const expected=[null,'',false,-0,NaN,[],{},Buffer.alloc(0),'first','kept'];
 for(let i=0;i<values.length;i++)assert.deepEqual(db._serializer.decodeValue(values[i]),expected[i]);
 const fields=JSON.parse('{"__proto__":{"mapValue":{"fields":{"safe":{"booleanValue":true}}}},"constructor":{"stringValue":"own"},"toString":{"stringValue":"data"}}'),symbol=Symbol('not a wire field');fields[symbol]={stringValue:'ignored'};
 let called=0;Object.defineProperty(Object.prototype,'vpmSetterFixture',{configurable:true,set(){called++;throw Error('must not call a prototype setter');}});
 try{
  Object.defineProperty(fields,'vpmSetterFixture',{enumerable:true,value:{integerValue:'7'}});
  const snapshot=db.snapshot_({name:db.doc('c/a')._name,fields});const result=snapshot.data();
  assert.equal(called,0);assert.equal(result.vpmSetterFixture,7);assert.equal(Object.getPrototypeOf(result),Object.prototype);assert.equal(Object.hasOwn(result,'__proto__'),true);assert.deepEqual(result.__proto__,{safe:true});assert.equal(result.constructor,'own');assert.equal(result.toString,'data');assert.deepEqual(Object.getOwnPropertySymbols(result),[]);assert.deepEqual(Object.getOwnPropertySymbols(snapshot._proto.fields),[]);
 }finally{delete Object.prototype.vpmSetterFixture;}
});
test('timestamp fast validation retains boundaries, precision, ordering and invalid-input rejection',()=>{
 const valid=[];
 for(const seconds of [-62135596800,-62135596799,-1,0,1,1700000000,253402300799])for(const nanos of [0,1,123,999999,500000000,999999999]){
  const a=new F.Timestamp(seconds,nanos),b=new upstream.Timestamp(seconds,nanos);assert.equal(a.valueOf(),b.valueOf());assert.equal(a.toDate().getTime(),b.toDate().getTime());assert.equal(a.toMillis(),b.toMillis());valid.push(a);
 }
 assert.deepEqual(valid.map(t=>t.valueOf()).toSorted(),valid.map(t=>t.valueOf()));
 for(const value of [NaN,Infinity,-Infinity,1.5,'1',1n,undefined,null]){assert.throws(()=>new F.Timestamp(value,0),RangeError);assert.throws(()=>new F.Timestamp(0,value),RangeError);}
 for(const value of [NaN,Infinity,-Infinity,'1',1n,undefined,null])assert.throws(()=>F.Timestamp.fromMillis(value),RangeError);
 for(const args of [[-62135596801,0],[253402300800,0],[0,-1],[0,1000000000]])assert.throws(()=>new F.Timestamp(...args),RangeError);
});
test('resource-path scan keeps normalization, depth parity and rejection behavior',()=>{
 const {path}=require('../app/values');const previous=(value,even)=>{if(typeof value!=='string'||!value||value.includes('//'))throw new TypeError('Invalid resource path');const parts=value.split('/').filter(Boolean);if(parts.length%2!==(even?0:1))throw new TypeError(even?'A document path must have an even number of segments':'A collection path must have an odd number of segments');return parts.join('/');};
 for(let count=0;count<40;count++)for(const prefix of ['','/'])for(const suffix of ['','/'])for(const even of [false,true]){const input=prefix+Array.from({length:count},(_,i)=>'x'+i).join('/')+suffix;let expected;try{expected=previous(input,even);}catch(error){assert.throws(()=>path(input,even),{name:error.name,message:error.message});continue;}assert.equal(path(input,even),expected);}
 for(const value of [undefined,null,1,{},'//a/b','a//b','a/b//'])assert.throws(()=>path(value,true),TypeError);
});
