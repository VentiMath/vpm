'use strict';
const {FieldPath,FieldValue,Timestamp,plain,own,integer,equal}=require('./values');
const {DocumentReference}=require('./query');
const prefix=(a,b)=>a.length<=b.length&&a.every((v,i)=>v===b[i]);
function precondition(value){if(value===undefined)return undefined;if(!plain(value)||Object.keys(value).some(k=>!['exists','lastUpdateTime'].includes(k))||Object.hasOwn(value,'exists')&&Object.hasOwn(value,'lastUpdateTime'))throw new TypeError('Invalid write precondition');if(Object.hasOwn(value,'exists')){if(typeof value.exists!=='boolean')throw new TypeError('exists must be boolean');return {exists:value.exists};}if(value.lastUpdateTime instanceof Timestamp)return {updateTime:value.lastUpdateTime.toProto()};if(Object.keys(value).length)throw new TypeError('Expected a Timestamp');return undefined;}
function reference(db,ref){if(!(ref instanceof DocumentReference)||ref.firestore!==db)throw new TypeError('Document reference must belong to this Firestore client');}
function build(db,ref,mode,args){
  reference(db,ref);if(mode==='delete'){const condition=precondition(args[0]);return {delete:ref._name,...(condition?{currentDocument:condition}:{})};}
  const fields={},masks=[],deletes=[],transforms=[],seen=new Set(),paths=[];
  const place=(segments,value)=>{let target=fields;for(const part of segments.slice(0,-1)){if(!Object.hasOwn(target,part))own(target,part,{mapValue:{fields:{}}});target=target[part].mapValue.fields;}own(target,segments.at(-1),value);};
  function field(segments,value,depth=0){
    if(depth>20)throw new RangeError('Write exceeds maximum nesting depth');
    const fieldPath=new FieldPath(...segments).formattedName;
    if(value instanceof FieldValue){
      if(value.kind==='delete'){if(mode==='update'&&depth>0)throw new TypeError('Delete sentinel must be a top-level update value');if(mode==='create'||mode==='set'&&!options.merge&&!options.mergeFields)throw new TypeError('Delete transforms require merge or update');masks.push(segments);deletes.push(segments);return;}
      let transform=value.values;
      if(value.kind==='increment')transform=db._serializer.encodeValue(transform);
      if(['appendMissingElements','removeAllFromArray'].includes(value.kind))transform={values:transform.map(v=>{if(Array.isArray(v))throw new TypeError('Array transforms cannot contain arrays');return db._serializer.encodeValue(v,new Set(),0,true);})};
      transforms.push({segments,proto:{fieldPath,[value.kind]:transform}});return;
    }
    if(plain(value)){
      if(seen.has(value))throw new TypeError('Circular write data');seen.add(value);
      const keys=Object.keys(value);if(!keys.length){place(segments,{mapValue:{}});masks.push(segments);}else for(const key of keys)field([...segments,key],value[key],depth+1);
      seen.delete(value);return;
    }
    const encoded=db._serializer.encodeValue(value,new Set(),depth);if(encoded!==undefined){place(segments,encoded);masks.push(segments);}
  }
  let data=args[0],options=mode==='set'?(args[1]||{}):{},condition=mode==='create'?{exists:false}:mode==='update'?{exists:true}:undefined;
  if(!plain(options)||Object.keys(options).some(k=>!['merge','mergeFields'].includes(k))||options.merge!==undefined&&typeof options.merge!=='boolean'||options.merge!==undefined&&options.mergeFields!==undefined)throw new TypeError('Invalid set options');
  if(mode!=='update'&&ref._converter)data=options.merge||options.mergeFields?ref._converter.toFirestore(data,options):ref._converter.toFirestore(data);
  if(mode==='update'){
    let entries;
    if(typeof data==='string'||data instanceof FieldPath){const list=[...args];if(list.length%2){condition=precondition(list.pop())||condition;}entries=[];for(let i=0;i<list.length;i+=2)entries.push([FieldPath.fromArgument(list[i]).segments,list[i+1]]);}
    else{if(!plain(data)||!Object.keys(data).length)throw new TypeError('Update requires nonempty data');entries=Object.keys(data).map(k=>[FieldPath.fromArgument(k).segments,data[k]]);condition=precondition(args[1])||condition;}
    for(const [segments,value] of entries){if(paths.some(p=>prefix(p,segments)||prefix(segments,p)))throw new TypeError('Conflicting update paths');paths.push(segments);
      // Object values in update replace the named map; nested transforms still
      // need their own paths, while the update mask stays at the supplied path.
      const before=masks.length;field(segments,value);if(!(value instanceof FieldValue)&&value!==undefined){masks.splice(before);masks.push(segments);}
    }
  }else{if(!plain(data))throw new TypeError('Document data must be a plain object');seen.add(data);for(const key of Object.keys(data))field([key],data[key]);}
  if(mode==='update'&&condition?.exists===false)throw new TypeError('Updates require an existing document');
  let selected=masks,selectedTransforms=transforms;
  if(options.mergeFields!==undefined){
    if(!Array.isArray(options.mergeFields))throw new TypeError('mergeFields must be an array');selected=options.mergeFields.map(f=>FieldPath.fromArgument(f).segments);
    if(selected.some((p,i)=>selected.some((q,j)=>i!==j&&p.length<q.length&&prefix(p,q))))throw new TypeError('Conflicting merge paths');
    if(deletes.some(p=>!selected.some(q=>equal(p,q))))throw new TypeError('Deleted fields must be selected explicitly by mergeFields');
    for(const p of selected)if(!masks.some(m=>prefix(p,m))&&!transforms.some(t=>prefix(p,t.segments)))throw new TypeError('mergeFields includes a missing field');
    selectedTransforms=transforms.filter(t=>selected.some(p=>prefix(p,t.segments)));
    const prune=(record,base=[])=>{for(const key of Object.keys(record)){const p=[...base,key];if(selected.some(s=>prefix(s,p)))continue;if(selected.some(s=>prefix(p,s))&&record[key].mapValue?.fields)prune(record[key].mapValue.fields,p);else delete record[key];}};prune(fields);
    selected=selected.filter(p=>!transforms.some(t=>equal(p,t.segments)));
  }
  const update={name:ref._name,...(Object.keys(fields).length?{fields}:{})},result={update};
  if(mode==='update'||options.merge||options.mergeFields){const fieldPaths=[...new Set(selected.map(s=>new FieldPath(...s).formattedName))].sort();result.updateMask=fieldPaths.length?{fieldPaths}:{};}
  if(condition)result.currentDocument=condition;if(selectedTransforms.length)result.updateTransforms=selectedTransforms.map(t=>t.proto);return result;
}
class WriteResult {constructor(writeTime){this._writeTime=writeTime instanceof Timestamp?writeTime:Timestamp.fromProto(writeTime);}get writeTime(){return this._writeTime;}isEqual(other){return other instanceof WriteResult&&this.writeTime.isEqual(other.writeTime);}}
class WriteBatch {
  constructor(db){this._firestore=db;this._ops=[];this._committed=false;}
  _add(mode,ref,args){if(this._committed)throw new Error('Write batch has already been committed');this._ops.push(build(this._firestore,ref,mode,args));return this;}
  set(ref,data,options){return this._add('set',ref,[data,options]);}create(ref,data){return this._add('create',ref,[data]);}update(ref,...args){return this._add('update',ref,args);}delete(ref,options){return this._add('delete',ref,[options]);}
  async commit(){if(this._committed)throw new Error('Write batch has already been committed');this._committed=true;return this._firestore._commit(this._ops);}
}
class Transaction extends WriteBatch {
  constructor(db,options={}){super(db);this._options=options;this._readTail=Promise.resolve();this._closed=false;}
  _add(...args){if(this._closed)throw new Error('Transaction is closed');if(this._options.readOnly)throw new Error('Read-only transactions cannot write');return super._add(...args);}
  _read(fn){if(this._closed||this._ops.length)throw new Error('All transaction reads must precede writes');const pending=this._readTail.then(async()=>{const selector=this._options.readTime?{readTime:this._options.readTime.toProto()}:this._id?{transaction:this._id}:{newTransaction:this._options.readOnly?{readOnly:{}}:{readWrite:this._retryId?{retryTransaction:this._retryId}:{}}};return fn(selector,id=>{if(id?.length)this._id=id;});});this._readTail=pending.catch(error=>{this._readError=error;});return pending;}
  get(ref){return this._read((selector,capture)=>ref instanceof DocumentReference?this._firestore._getAll([ref],selector,capture).then(v=>v[0]):ref instanceof require('./query').AggregateQuery?this._firestore._aggregate(ref,selector,capture):this._firestore._query(ref,selector,capture));}
  getAll(...refs){return this._read((selector,capture)=>this._firestore._getAll(refs,selector,capture));}
  async _commit(){await this._readTail;if(this._readError)throw this._readError;this._closed=true;if(this._options.readOnly)return;if(!this._id){const response=await this._firestore._unary('beginTransaction',{database:this._firestore.databasePath,options:{readWrite:{}}});this._id=response.transaction;}return this._firestore._commit(this._ops,this._id);}
  async _rollback(){this._closed=true;await this._readTail;if(this._id&&!this._options.readOnly)try{await this._firestore._unary('rollback',{database:this._firestore.databasePath,transaction:this._id});}catch{}}
}
class BulkWriter {
  constructor(db,options={}){if(options.throttling!==undefined&&options.throttling!==false)throw new TypeError('Custom BulkWriter throttling is outside the application contract');this._db=db;this._queue=[];this._pending=new Set();this._closed=false;this._error=e=>[10,14].includes(e.code)&&e.failedAttempts<10;db._writers.add(this);}
  onWriteError(callback){if(typeof callback!=='function')throw new TypeError('Expected callback');this._error=callback;}onWriteResult(callback){if(typeof callback!=='function')throw new TypeError('Expected callback');this._success=callback;}
  _add(mode,ref,args){if(this._closed)throw new Error('BulkWriter is closed');const write=build(this._db,ref,mode,args);let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});const item={write,ref,resolve,reject,attempts:0};this._queue.push(item);this._pending.add(promise);promise.then(()=>this._pending.delete(promise),()=>this._pending.delete(promise));if(!this._scheduled){this._scheduled=true;queueMicrotask(()=>this._drain());}return promise;}
  set(ref,data,options){return this._add('set',ref,[data,options]);}create(ref,data){return this._add('create',ref,[data]);}update(ref,...args){return this._add('update',ref,args);}delete(ref,options){return this._add('delete',ref,[options]);}
  async _drain(){if(this._draining)return;this._draining=true;this._scheduled=false;
    try{while(this._queue.length){const batch=[],names=new Set();while(this._queue.length&&batch.length<20&&!names.has(this._queue[0].ref.path)){const item=this._queue.shift();batch.push(item);names.add(item.ref.path);}let response,error;try{response=await this._db._unary('batchWrite',{database:this._db.databasePath,writes:batch.map(i=>i.write)});}catch(e){error=e;}
      for(let i=0;i<batch.length;i++){const item=batch[i],status=response?.status?.[i];item.attempts++;const failed=error||status?.code&&Object.assign(new Error(status.message||'Bulk write failed'),{code:status.code});
        if(failed){const reason=Object.assign(new Error(failed.message),{code:failed.code,documentRef:item.ref,operationType:item.write.delete?'delete':'write',failedAttempts:item.attempts});let retry=false;try{retry=!!this._error(reason);}catch(e){item.reject(e);continue;}if(retry&&item.attempts<10){await new Promise(r=>setTimeout(r,Math.min(1000,10*2**item.attempts)));this._queue.unshift(item);}else item.reject(reason);}
        else{const result=new WriteResult(response.writeResults[i].updateTime||{seconds:0});try{this._success?.(item.ref,result);item.resolve(result);}catch(e){item.reject(e);}}
      }
    }}finally{this._draining=false;if(this._queue.length)queueMicrotask(()=>this._drain());}
  }
  async flush(){await Promise.allSettled([...this._pending]);}async close(){this._closed=true;await this.flush();this._db._writers.delete(this);}
}
module.exports={WriteBatch,WriteResult,Transaction,BulkWriter,build,reference};
