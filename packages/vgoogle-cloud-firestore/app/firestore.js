'use strict';
const {Readable}=require('node:stream');
const {Timestamp,integer,plain,own}=require('./values');
const {Codec}=require('./codec');
const Q=require('./query'),W=require('./write');
const {version}=require('../package.json');
const transient=new Set([4,8,10,13,14]);
// Protocol decoders return Long instances. structuredClone removes their
// conversion methods, so keep wire integers losslessly as decimal strings.
function copyProtocol(value){
  if(value===null||typeof value!=='object')return value;
  if(value instanceof Uint8Array)return Buffer.from(value);
  if(Number.isInteger(value.low)&&Number.isInteger(value.high)&&typeof value.unsigned==='boolean'&&value.toString!==Object.prototype.toString)return value.toString();
  if(Array.isArray(value))return value.map(copyProtocol);
  const out={};for(const key of Object.keys(value))own(out,key,copyProtocol(value[key]));return out;
}
// Firestore Values are tagged unions. Clone their wire containers directly
// instead of walking every scalar and wrapper through the generic copier.
function copyFields(fields){
  if(!fields||typeof fields!=='object'||Array.isArray(fields)||fields instanceof Uint8Array)return copyProtocol(fields);
  const out={};for(const key of Object.keys(fields))own(out,key,copyValue(fields[key]));return out;
}
function copyValue(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||value instanceof Uint8Array)return copyProtocol(value);
  const keys=Object.keys(value);
  if(keys.length!==1)return copyProtocol(value);
  const kind=keys[0],item=value[kind];
  switch(kind){
    case 'nullValue': return {nullValue:copyProtocol(item)};
    case 'stringValue': return {stringValue:copyProtocol(item)};
    case 'booleanValue': return {booleanValue:copyProtocol(item)};
    case 'doubleValue': return {doubleValue:copyProtocol(item)};
    case 'integerValue': return {integerValue:copyProtocol(item)};
    case 'referenceValue': return {referenceValue:copyProtocol(item)};
    case 'bytesValue': return {bytesValue:copyProtocol(item)};
    case 'timestampValue': return {timestampValue:copyProtocol(item)};
    case 'geoPointValue': return {geoPointValue:copyProtocol(item)};
    case 'arrayValue':
      if(item&&Object.keys(item).length===1&&Object.hasOwn(item,'values')&&Array.isArray(item.values))return {arrayValue:{values:item.values.map(copyValue)}};
      return copyProtocol(value);
    case 'mapValue':
      if(item&&Object.keys(item).length===1&&Object.hasOwn(item,'fields'))return {mapValue:{fields:copyFields(item.fields)}};
      return copyProtocol(value);
    default:return copyProtocol(value);
  }
}
function copyDocument(document){
  const out={};for(const key of Object.keys(document))own(out,key,key==='fields'?copyFields(document[key]):copyProtocol(document[key]));return out;
}

class Firestore {
  constructor(settings={}){this._settings={};this._listeners=new Set();this._writers=new Set();this._streams=new Set();this._active=new Set();this._clients=new Map();this._serializer=new Codec(this);this.settings(settings);}
  settings(settings){if(this._started)throw new Error('Firestore settings cannot change after the first request');if(!plain(settings))throw new TypeError('Expected Firestore settings');for(const key of ['projectId','databaseId'])if(settings[key]!==undefined&&(typeof settings[key]!=='string'||!settings[key]||settings[key].includes('/')))throw new TypeError('Invalid '+key);for(const key of ['ignoreUndefinedProperties','useBigInt','preferRest','ssl'])if(settings[key]!==undefined&&typeof settings[key]!=='boolean')throw new TypeError('Invalid '+key);this._settings={...this._settings,...settings};this._projectId=this._settings.projectId;}
  get projectId(){if(!this._projectId)throw new Error('Project ID is not initialized');return this._projectId;}get databaseId(){return this._settings.databaseId||'(default)';}
  get databasePath(){return 'projects/'+(this._projectId||'__VPM_PROJECT__')+'/databases/'+this.databaseId;}
  _assertOpen(){if(this._terminated)throw new Error('The client has already been terminated');}
  _track(promise){this._active.add(promise);promise.then(()=>this._active.delete(promise),()=>this._active.delete(promise));return promise;}
  async _getClient(grpc=false){
    this._assertOpen();this._started=true;const settings=this._settings,rest=!grpc&&(settings.preferRest??process.env.FIRESTORE_PREFER_REST==='true'),key=rest?'rest':'grpc';
    if(!this._clients.has(key))this._clients.set(key,(async()=>{
      const {FirestoreClient}=require('vgoogle-cloud-firestore-api'),gax=require('vgoogle-gax');
      const opts={...settings,fallback:rest?'rest':false,libName:'vgoogle-cloud-firestore',libVersion:version};
      const host=process.env.FIRESTORE_EMULATOR_HOST||settings.host;
      if(host){if(typeof host!=='string'||host.includes('://')||/[/?#\s]/.test(host))throw new TypeError('Invalid Firestore host');const u=new URL('http://'+host);opts.servicePath=u.hostname.replace(/^\[|\]$/g,'');opts.port=Number(u.port||((process.env.FIRESTORE_EMULATOR_HOST||settings.ssl===false)?80:443));}
      if(process.env.FIRESTORE_EMULATOR_HOST||settings.ssl===false){opts.sslCreds=gax.grpc.credentials.createInsecure();opts.protocol='http';opts.authClient=new (require('vgoogle-auth-library').PassThroughClient)();}
      const client=new FirestoreClient(opts);try{if(!this._projectId)this._projectId=await client.getProjectId();await client.initialize();return client;}catch(error){await client.close().catch(()=>{});this._clients.delete(key);throw error;}
    })());return this._clients.get(key);
  }
  _resolved(value){if(Array.isArray(value))return value.map(v=>this._resolved(v));if(!plain(value))return value;const out={};for(const key of Object.keys(value)){const v=value[key];Object.defineProperty(out,key,{value:typeof v==='string'&&['name','referenceValue','parent','database','delete'].includes(key)&&v.startsWith('projects/__VPM_PROJECT__/')?v.replace('projects/__VPM_PROJECT__/','projects/'+this.projectId+'/'):this._resolved(v),enumerable:true,writable:true,configurable:true});}return out;}
  _callOptions(method){require('./log').lifecycle(method);return {otherArgs:{headers:{'google-cloud-resource-prefix':this.databasePath,...(process.env.FIRESTORE_EMULATOR_HOST?{authorization:'Bearer owner'}:{}),...this._settings.customHeaders,...this._settings[method]?.customHeaders}}};}
  get _traceUtil(){if(!this._trace){const api=require('vopentelemetry-api'),provider=api.trace.getTracerProvider(),tracer=provider.getTracer('vgoogle-cloud-firestore',version),disabled=process.env.FIRESTORE_ENABLE_TRACING==='false';this._trace={tracerProvider:provider,startActiveSpan:(name,fn)=>disabled?fn({setAttributes(){}}):tracer.startActiveSpan(name,async span=>{span.setAttributes({'gcp.firestore.settings.project_id':this._projectId||''});try{return await fn(span);}catch(error){span.setStatus({code:2});throw error;}finally{span.end();}})};}return this._trace;}
  _unary(method,request){return this._track((async()=>{const client=await this._getClient();this._assertOpen();return this._traceUtil.startActiveSpan('Firestore.'+method,async()=>{const [response]=await client[method](this._resolved(request),this._callOptions(method));return response;});})());}
  async *_responses(method,request,capture,signal){
    const client=await this._getClient();this._assertOpen();if(signal?.aborted)throw new Error('Stream cancelled');const stream=client[method](this._resolved(request),this._callOptions(method));this._streams.add(stream);const abort=()=>{stream.cancel?.();stream.destroy?.(Object.assign(new Error('Stream cancelled'),{code:1}));};signal?.addEventListener('abort',abort,{once:true});
    try{for await(const response of stream){if(response.transaction)capture?.(response.transaction);yield response;}}finally{signal?.removeEventListener('abort',abort);this._streams.delete(stream);stream.cancel?.();stream.destroy?.();}
  }
  doc(relative){return new Q.DocumentReference(this,relative);}collection(relative){return new Q.CollectionReference(this,relative);}collectionGroup(name){return new Q.CollectionGroup(this,name);}batch(){return new W.WriteBatch(this);}bulkWriter(options){this._assertOpen();return new W.BulkWriter(this,options);}
  _reference(name){const match=/^projects\/([^/]+)\/databases\/([^/]+)\/documents\/(.+)$/.exec(name);if(!match)throw new TypeError('Invalid document resource');const db=(match[1]===this._projectId||!this._projectId)&&match[2]===this.databaseId?this:new Firestore({...this._settings,projectId:match[1],databaseId:match[2]});return db.doc(match[3]);}
  snapshot_(document,readTime){const ref=this._reference(typeof document==='string'?document:document.name);return new Q.DocumentSnapshot(ref,typeof document==='string'?undefined:copyDocument(document),readTime);}
  getAll(...refs){return this._getAll(refs);}
  async _getAll(arguments_,selector={},capture){
    this._assertOpen();const refs=[...arguments_],options=plain(refs.at(-1))?refs.pop():{};if(!refs.length)throw new TypeError('getAll requires document references');for(const ref of refs)W.reference(this,ref);
    const request={database:this.databasePath,documents:[...new Set(refs.map(r=>r._name))],...selector};if(options.fieldMask!==undefined){if(!Array.isArray(options.fieldMask))throw new TypeError('fieldMask must be an array');request.mask={fieldPaths:options.fieldMask.map(f=>require('./values').FieldPath.fromArgument(f).formattedName)};}
    const found=new Map();for await(const result of this._responses('batchGetDocuments',request,capture)){const name=result.found?.name||result.missing;if(name)found.set(name,{proto:result.found,readTime:result.readTime});}
    return refs.map(ref=>{const result=found.get(ref._name);if(!result)throw new Error('Batch read ended without all requested documents');return new Q.DocumentSnapshot(ref,result.proto,result.readTime);});
  }
  async _query(query,selector={},capture){
    if(!(query instanceof Q.Query)||query.firestore!==this)throw new TypeError('Expected this client’s query');let readTime,docs=[];
    for await(const result of this._responses('runQuery',query.toProto(selector),capture)){readTime=result.readTime||readTime;if(result.document)docs.push(new Q.QueryDocumentSnapshot(this._reference(result.document.name).withConverter(query._converter),result.document,result.readTime));}
    if(query._options.last)docs.reverse();return new Q.QuerySnapshot(query,docs,readTime);
  }
  _queryStream(query){const db=this,controller=new AbortController();const output=Readable.from((async function*(){for await(const result of db._responses('runQuery',query.toProto(),undefined,controller.signal))if(result.document)yield new Q.QueryDocumentSnapshot(db._reference(result.document.name).withConverter(query._converter),result.document,result.readTime);})(),{objectMode:true,highWaterMark:16});const destroy=output._destroy;output._destroy=function(error,done){controller.abort();destroy.call(this,error,done);};return output;}
  async _aggregate(aggregate,selector={},capture){const request=aggregate.query.toProto(selector),names=Object.keys(aggregate.spec),aggregations=names.map((key,i)=>{const a=aggregate.spec[key];return {alias:'aggregate_'+i,[a.kind]:a.field?{field:{fieldPath:a.field}}:{}};});const q={parent:request.parent,structuredAggregationQuery:{structuredQuery:request.structuredQuery,aggregations},...selector};let response;for await(const value of this._responses('runAggregationQuery',q,capture))response=value;if(!response)throw new Error('Aggregation ended without a result');const data={};for(let i=0;i<names.length;i++)Object.defineProperty(data,names[i],{value:this._serializer.decodeValue(response.result.aggregateFields['aggregate_'+i]),enumerable:true});return new Q.AggregateQuerySnapshot(aggregate,data,response.readTime);}
  async _commit(writes,transaction){this._assertOpen();if(!writes.length&&!transaction)return [];const response=await this._unary('commit',{database:this.databasePath,writes,...(transaction?{transaction}:{})});return response.writeResults.map(result=>new W.WriteResult(result.updateTime||response.commitTime));}
  async runTransaction(update,options={}){
    this._assertOpen();if(typeof update!=='function'||!plain(options))throw new TypeError('Invalid transaction');if(options.readTime!==undefined&&(!(options.readTime instanceof Timestamp)||!options.readOnly))throw new TypeError('readTime requires a read-only transaction');const max=options.readOnly?1:integer('maxAttempts',options.maxAttempts??5,1,100);let previous;
    for(let attempt=0;attempt<max;attempt++){const transaction=new W.Transaction(this,options);transaction._retryId=previous;try{const pending=update(transaction);if(!pending||typeof pending.then!=='function')throw new TypeError('Transaction callback must return a Promise');const result=await pending;await transaction._commit();return result;}catch(error){previous=transaction._id;await transaction._rollback();if(attempt===max-1||!transient.has(error.code))throw error;await new Promise(resolve=>setTimeout(resolve,Math.min(1000,25*2**attempt)*(0.5+Math.random())));}}
  }
  async _listCollections(relative=''){const client=await this._getClient(),parent=this.databasePath+'/documents'+(relative?'/'+relative:'');const [names]=await client.listCollectionIds({parent},this._callOptions('listCollectionIds'));return names.sort().map(name=>this.collection((relative?relative+'/':'')+name));}
  listCollections(){return this._listCollections();}
  async *_documentRefs(collection){const client=await this._getClient(),parts=collection.path.split('/'),request={parent:this.databasePath+'/documents'+(parts.length>1?'/'+parts.slice(0,-1).join('/'):''),collectionId:parts.at(-1),showMissing:true,mask:{fieldPaths:['__name__']}};for await(const doc of client.listDocumentsAsync(request,this._callOptions('listDocuments')))yield this._reference(doc.name);}
  async _listDocuments(collection){const refs=[];for await(const ref of this._documentRefs(collection))refs.push(ref);return refs;}
  async recursiveDelete(ref,writer){
    if(!(ref instanceof Q.DocumentReference||ref instanceof Q.CollectionReference)||ref.firestore!==this)throw new TypeError('Expected this client’s document or collection');if(writer&&(!(writer instanceof W.BulkWriter)||writer._db!==this))throw new TypeError('BulkWriter belongs to another client');const db=this,bulk=writer||this.bulkWriter();let failures=0,last,count=0;
    async function* walk(value,depth=0){if(depth>100)throw new RangeError('Document nesting exceeds 100 levels');if(value instanceof Q.CollectionReference){for await(const doc of db._documentRefs(value))yield*walk(doc,depth+1);}else{for(const child of await value.listCollections())yield*walk(child,depth);yield value;}}
    try{for await(const doc of walk(ref)){bulk.delete(doc).catch(error=>{failures++;last=error;});if(++count%100===0)await bulk.flush();}}catch(error){failures++;last=error;}finally{await (writer?bulk.flush():bulk.close());}
    if(failures)throw Object.assign(new Error('Recursive deletion failed for '+failures+' operations',{cause:last}),{code:last?.code});
  }
  _listen(target,next,error){return require('./watch').listen(this,target,next,error);}
  async terminate(){if(this._listeners.size)throw new Error('All onSnapshot() listeners must be unsubscribed before calling terminate(). There are '+this._listeners.size+' active listeners.');if(this._writers.size)throw new Error('All BulkWriters must be closed before calling terminate().');this._terminated=true;for(const stream of this._streams){stream.cancel?.();stream.destroy?.(new Error('The client has already been terminated'));}await Promise.allSettled([...this._active]);await Promise.allSettled([...this._clients.values()].map(async pending=>(await pending).close()));}
}
module.exports={Firestore};
