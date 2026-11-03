'use strict';
const {Readable}=require('node:stream');
const {Timestamp,FieldPath,VectorValue,plain,own,path,integer,equal}=require('./values');
const operators={'<':'LESS_THAN','<=':'LESS_THAN_OR_EQUAL','==':'EQUAL','!=':'NOT_EQUAL','>=':'GREATER_THAN_OR_EQUAL','>':'GREATER_THAN','array-contains':'ARRAY_CONTAINS','in':'IN','not-in':'NOT_IN','array-contains-any':'ARRAY_CONTAINS_ANY'};
const nameOf=field=>FieldPath.fromArgument(field).formattedName;
class Filter {
  constructor(kind,args){this.kind=kind;this.args=args;}
  static where(field,op,value){return new Filter('where',[field,op,value]);}
  static and(...filters){return new Filter('AND',filters);}static or(...filters){return new Filter('OR',filters);}
}
class DocumentReference {
  constructor(db,relative,converter=null){this.firestore=db;this._path=path(relative,true);this._converter=converter;}
  get path(){return this._path;}get id(){return this._path.split('/').at(-1);}get parent(){return new CollectionReference(this.firestore,this._path.split('/').slice(0,-1).join('/'));}
  get _name(){return this.firestore.databasePath+'/documents/'+this.path;}
  collection(child){return new CollectionReference(this.firestore,this.path+'/'+path(child,false));}
  withConverter(converter){return new DocumentReference(this.firestore,this.path,converter);}
  isEqual(other){return other instanceof DocumentReference&&this.firestore===other.firestore&&this.path===other.path&&this._converter===other._converter;}
  async get(){return (await this.firestore.getAll(this))[0];}
  async set(data,options){return (await this.firestore.batch().set(this,data,options).commit())[0];}
  async create(data){return (await this.firestore.batch().create(this,data).commit())[0];}
  async update(...args){return (await this.firestore.batch().update(this,...args).commit())[0];}
  async delete(options){return (await this.firestore.batch().delete(this,options).commit())[0];}
  listCollections(){return this.firestore._listCollections(this.path);}
  onSnapshot(next,error){return this.firestore._listen(this,next,error);}
}
class DocumentSnapshot {
  constructor(ref,proto,readTime){this._ref=ref;this._proto=proto;this._readTime=readTime&&Timestamp.fromProto(readTime);}
  get ref(){return this._ref;}get id(){return this.ref.id;}get exists(){return !!this._proto;}
  get createTime(){return this._proto?.createTime&&Timestamp.fromProto(this._proto.createTime);}get updateTime(){return this._proto?.updateTime&&Timestamp.fromProto(this._proto.updateTime);}get readTime(){return this._readTime;}
  data(){if(!this.exists)return undefined;if(this.ref._converter)return this.ref._converter.fromFirestore(new QueryDocumentSnapshot(this.ref.withConverter(null),this._proto,this._readTime?.toProto()));return this.ref.firestore._serializer.decodeFields(this._proto.fields);}
  get(field){if(!this.exists)return undefined;let value=this.ref.firestore._serializer.decodeFields(this._proto.fields);for(const key of FieldPath.fromArgument(field).segments){if(value==null||!Object.hasOwn(value,key))return undefined;value=value[key];}return value;}
  isEqual(other){return this===other||other instanceof DocumentSnapshot&&this.ref.isEqual(other.ref)&&this.exists===other.exists&&equal(this._proto?.fields,other._proto?.fields);}
}
class QueryDocumentSnapshot extends DocumentSnapshot {}
class QuerySnapshot {
  constructor(query,docs,readTime,changes){this.query=query;this._docs=docs;this.readTime=readTime&&Timestamp.fromProto(readTime);this._changes=changes;}
  get docs(){return typeof this._docs==='function'?this._docs():[...this._docs];}get size(){return this.docs.length;}get empty(){return !this.size;}
  forEach(callback,thisArg){this.docs.forEach(callback,thisArg);}
  docChanges(){return this._changes?this._changes.map(c=>({...c})):this.docs.map((doc,newIndex)=>({type:'added',doc,oldIndex:-1,newIndex}));}
  isEqual(other){return other instanceof QuerySnapshot&&this.query.isEqual(other.query)&&this.size===other.size&&this.docs.every((doc,i)=>doc.isEqual(other.docs[i]));}
}
class Query {
  constructor(db,relative,options={},converter=null){this.firestore=db;this._path=relative;this._options=options;this._converter=converter;}
  _copy(patch){return new Query(this.firestore,this._path,{...this._options,...patch},this._converter);}
  withConverter(converter){return new Query(this.firestore,this._path,this._options,converter);}
  _referenceValue(value){
    if(value instanceof DocumentReference){if(!this._options.group&&value.parent.path!==this._path)throw new TypeError('Document is outside the queried collection');if(value.firestore.databasePath!==this.firestore.databasePath)throw new TypeError('Reference belongs to another database');return value;}
    if(typeof value!=='string'||!value)throw new TypeError('Document ID must be a nonempty string or reference');
    if(!this._options.group&&value.includes('/'))throw new TypeError('Collection document ID cannot contain a slash');
    return this.firestore.doc(this._options.group?value:this._path+'/'+value);
  }
  _filter(filter){
    if(!(filter instanceof Filter))throw new TypeError('Expected a Filter');
    if(filter.kind!=='where'){const filters=filter.args.map(f=>this._filter(f)).filter(Boolean);return filters.length>1?{compositeFilter:{op:filter.kind,filters}}:filters[0];}
    const [field,op,original]=filter.args,fieldPath=nameOf(field);if(!operators[op])throw new TypeError('Invalid query operator');
    let value=original;
    if(['in','not-in','array-contains-any'].includes(op)&&(!Array.isArray(value)||!value.length||value.length>(op==='not-in'?10:30)))throw new TypeError('Invalid query array');
    if(fieldPath==='__name__'){if(op.startsWith('array-'))throw new TypeError('Array filters cannot target document IDs');value=Array.isArray(value)?value.map(v=>this._referenceValue(v)):this._referenceValue(value);}
    if(value===undefined)throw new TypeError('Query value cannot be undefined');
    if((value===null||Number.isNaN(value))&&!['==','!='].includes(op))throw new TypeError('Null and NaN only support equality filters');
    if((value===null||Number.isNaN(value))&&['==','!='].includes(op))return {unaryFilter:{field:{fieldPath},op:(op==='=='?'IS_':'IS_NOT_')+(value===null?'NULL':'NAN')}};
    return {fieldFilter:{field:{fieldPath},op:operators[op],value:this.firestore._serializer.encodeValue(value)}};
  }
  where(...args){if(this._options.startAt||this._options.endAt)throw new Error('Filters must precede cursors');const filter=this._filter(args.length===1?args[0]:Filter.where(...args));return this._copy({filters:[...(this._options.filters||[]),...(filter?[filter]:[])]});}
  orderBy(field,direction='asc'){if(!['asc','desc'].includes(direction))throw new TypeError('Invalid sort direction');if(this._options.startAt||this._options.endAt)throw new Error('Order must precede cursors');return this._copy({orders:[...(this._options.orders||[]),{field:{fieldPath:nameOf(field)},direction:direction==='asc'?'ASCENDING':'DESCENDING'}]});}
  limit(n){return this._copy({limit:integer('limit',n,1,2147483647),last:false});}limitToLast(n){return this._copy({limit:integer('limit',n,1,2147483647),last:true});}
  offset(n){return this._copy({offset:integer('offset',n,0,2147483647)});}
  select(...fields){return this._copy({select:{fields:(fields.length?fields:[FieldPath.documentId()]).map(f=>({fieldPath:nameOf(f)}))}});}
  _orders(complete=false){
    const orders=[...(this._options.orders||[])];if(!complete)return orders;
    const direction=orders.at(-1)?.direction||'ASCENDING',names=new Set(orders.map(o=>o.field.fieldPath)),inequalities=new Set();
    const visit=f=>{if(f.fieldFilter&&['LESS_THAN','LESS_THAN_OR_EQUAL','GREATER_THAN','GREATER_THAN_OR_EQUAL','NOT_EQUAL','NOT_IN'].includes(f.fieldFilter.op))inequalities.add(f.fieldFilter.field.fieldPath);if(f.unaryFilter?.op.startsWith('IS_NOT_'))inequalities.add(f.unaryFilter.field.fieldPath);f.compositeFilter?.filters.forEach(visit);};(this._options.filters||[]).forEach(visit);
    for(const name of [...inequalities].sort())if(name!=='__name__'&&!names.has(name))orders.push({field:{fieldPath:name},direction});
    if(!names.has('__name__'))orders.push({field:{fieldPath:'__name__'},direction});return orders;
  }
  _cursor(kind,before,args){
    let orders=this._orders(args[0] instanceof DocumentSnapshot),values=args;
    if(args[0] instanceof DocumentSnapshot){if(args.length!==1||!args[0].exists)throw new TypeError('Cursor requires an existing document');values=orders.map(o=>o.field.fieldPath==='__name__'?args[0].ref:args[0].get(FieldPath.fromFormatted(o.field.fieldPath)));}
    if(!values.length||values.length>orders.length||values.some(v=>v===undefined))throw new TypeError('Cursor values do not match the query order');
    return this._copy({orders,[kind]:{values:values.map((v,i)=>this.firestore._serializer.encodeValue(orders[i].field.fieldPath==='__name__'?this._referenceValue(v):v)),...(before?{before:true}:{})}});
  }
  startAt(...values){return this._cursor('startAt',true,values);}startAfter(...values){return this._cursor('startAt',false,values);}endAt(...values){return this._cursor('endAt',false,values);}endBefore(...values){return this._cursor('endAt',true,values);}
  toProto(selector,complete=false){
    const o=this._options,parts=this._path.split('/'),parent=o.group?'':parts.slice(0,-1).join('/');
    const q={from:[{collectionId:parts.at(-1),...(o.group?{allDescendants:true}:{})}]};
    if(o.filters?.length)q.where=o.filters.length===1?o.filters[0]:{compositeFilter:{op:'AND',filters:o.filters}};
    const orders=this._orders(complete);if(orders.length)q.orderBy=orders;
    if(o.limit)q.limit={value:o.limit};if(o.offset!==undefined)q.offset=o.offset;if(o.select)q.select=o.select;
    if(o.startAt)q.startAt=o.startAt;if(o.endAt)q.endAt=o.endAt;
    if(o.last){if(!orders.length)throw new Error('limitToLast requires orderBy');q.orderBy=orders.map(v=>({...v,direction:v.direction==='ASCENDING'?'DESCENDING':'ASCENDING'}));delete q.startAt;delete q.endAt;if(o.endAt)q.startAt={values:o.endAt.values,...(!o.endAt.before?{before:true}:{})};if(o.startAt)q.endAt={values:o.startAt.values,...(!o.startAt.before?{before:true}:{})};}
    if(o.vector)q.findNearest=o.vector;
    return {parent:this.firestore.databasePath+'/documents'+(parent?'/'+parent:''),structuredQuery:q,...selector};
  }
  async get(){return this.firestore._query(this);}
  stream(){if(this._options.last)throw new Error('limitToLast cannot stream');return this.firestore._queryStream(this);}
  onSnapshot(next,error){return this.firestore._listen(this,next,error);}
  count(){return this.aggregate({count:AggregateField.count()});}aggregate(spec){return new AggregateQuery(this,spec);}
  findNearest(field,vector,options){const o=plain(field)?field:{...options,vectorField:field,queryVector:vector};integer('vector limit',o.limit,1,1000);if(!['EUCLIDEAN','COSINE','DOT_PRODUCT'].includes(o.distanceMeasure))throw new TypeError('Invalid vector distance');if(o.distanceThreshold!==undefined&&(typeof o.distanceThreshold!=='number'||!Number.isFinite(o.distanceThreshold)))throw new TypeError('Invalid distance threshold');const queryVector=this.firestore._serializer.encodeValue(o.queryVector instanceof VectorValue?o.queryVector:new VectorValue(o.queryVector));return this._copy({vector:{limit:{value:o.limit},distanceMeasure:o.distanceMeasure,vectorField:{fieldPath:nameOf(o.vectorField)},queryVector,...(o.distanceResultField?{distanceResultField:nameOf(o.distanceResultField)}:{}),...(o.distanceThreshold!==undefined?{distanceThreshold:{value:o.distanceThreshold}}:{})}});}
  isEqual(other){return other instanceof Query&&this.firestore===other.firestore&&this._path===other._path&&this._converter===other._converter&&equal(this._options,other._options);}
}
class CollectionReference extends Query {
  constructor(db,relative,converter=null){super(db,path(relative,false),{},converter);}
  get path(){return this._path;}get id(){return this.path.split('/').at(-1);}get parent(){const parts=this.path.split('/');return parts.length===1?null:this.firestore.doc(parts.slice(0,-1).join('/'));}
  doc(id){if(id===undefined){id='';const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';while(id.length<20)for(const byte of require('node:crypto').randomBytes(40)){if(byte<248)id+=alphabet[byte%62];if(id.length===20)break;}}return new DocumentReference(this.firestore,this.path+'/'+path(id,false),this._converter);}
  async add(data){const ref=this.doc();await ref.create(data);return ref;}
  withConverter(converter){return new CollectionReference(this.firestore,this.path,converter);}
  async listDocuments(){return this.firestore._listDocuments(this);}
}
class CollectionGroup extends Query {constructor(db,name,converter=null){if(typeof name!=='string'||!name||name.includes('/'))throw new TypeError('Invalid collection group');super(db,name,{group:true},converter);}}
class AggregateField {constructor(kind,field){this.kind=kind;this.field=field;}static count(){return new AggregateField('count');}static sum(field){return new AggregateField('sum',nameOf(field));}static average(field){return new AggregateField('avg',nameOf(field));}isEqual(other){return other instanceof AggregateField&&this.kind===other.kind&&this.field===other.field;}}
class AggregateQuery {
  constructor(query,spec){if(!plain(spec)||!Object.keys(spec).length||Object.values(spec).some(v=>!(v instanceof AggregateField)))throw new TypeError('Expected aggregate fields');this.query=query;this.spec={...spec};}
  async get(){return this.query.firestore._aggregate(this);}
  isEqual(other){return other instanceof AggregateQuery&&this.query.isEqual(other.query)&&equal(this.spec,other.spec);}
}
class AggregateQuerySnapshot {constructor(query,data,readTime){this.query=query;this._data=data;this.readTime=Timestamp.fromProto(readTime);}data(){return {...this._data};}isEqual(other){return other instanceof AggregateQuerySnapshot&&this.query.isEqual(other.query)&&equal(this._data,other._data);}}
module.exports={DocumentReference,DocumentSnapshot,QueryDocumentSnapshot,Query,QuerySnapshot,CollectionReference,CollectionGroup,Filter,AggregateField,AggregateQuery,AggregateQuerySnapshot};
