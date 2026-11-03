/** Independent declarations for VentiMath's Firestore 9.4 application contract. */
import type {Readable} from './platform';
import type * as ServiceAPI from 'vgoogle-cloud-firestore-api';
declare global {
namespace FirebaseFirestore {
  type DocumentData = {[field:string]:any};
  type Primitive = string|number|boolean|undefined|null;
  type WithFieldValue<T> = T extends Primitive?T:T extends object?{[K in keyof T]:WithFieldValue<T[K]>|FieldValue}:never;
  type PartialWithFieldValue<T> = T extends Primitive?T:T extends object?{[K in keyof T]?:PartialWithFieldValue<T[K]>|FieldValue}:never;
  type UpdateData<T> = {[K in keyof T]?:T[K]|FieldValue}&{[field:string]:any};
  type AddPrefixToKeys<Prefix extends string,T> = {[K in keyof T as K extends string?`${Prefix}.${K}`:never]:T[K]};
  type UnionToIntersection<U> = (U extends unknown?(value:U)=>void:never) extends ((value:infer I)=>void)?I:never;
  type ChildUpdateFields<K extends string,V> = V extends object?AddPrefixToKeys<K,UpdateData<V>>:never;
  type NestedUpdateFields<T extends Record<string,unknown>> = UnionToIntersection<{[K in keyof T&string]:ChildUpdateFields<K,T[K]>}[keyof T&string]>;
  type OrderByDirection = 'asc'|'desc';
  type WhereFilterOp = '<'|'<='|'=='|'!='|'>='|'>'|'array-contains'|'in'|'not-in'|'array-contains-any';
  type DocumentChangeType = 'added'|'removed'|'modified';
  interface Settings {projectId?:string;databaseId?:string;credentials?:{client_email?:string;private_key?:string;[key:string]:unknown};keyFilename?:string;host?:string;port?:number;ssl?:boolean;preferRest?:boolean;ignoreUndefinedProperties?:boolean;useBigInt?:boolean;[key:string]:unknown;}
  interface SetOptions {merge?:boolean;mergeFields?:(string|FieldPath)[];}
  interface Precondition {exists?:boolean;lastUpdateTime?:Timestamp;}
  interface ReadOptions {fieldMask?:(string|FieldPath)[];}
  interface ReadOnlyTransactionOptions {readOnly:true;readTime?:Timestamp;}
  interface ReadWriteTransactionOptions {readOnly?:false;maxAttempts?:number;}
  interface FirestoreDataConverter<AppModelType,DbModelType extends DocumentData=DocumentData> {toFirestore(model:WithFieldValue<AppModelType>):WithFieldValue<DbModelType>;toFirestore(model:PartialWithFieldValue<AppModelType>,options:SetOptions):PartialWithFieldValue<DbModelType>;fromFirestore(snapshot:QueryDocumentSnapshot<DocumentData,DocumentData>):AppModelType;}
  class Timestamp {constructor(seconds:number,nanoseconds:number);readonly seconds:number;readonly nanoseconds:number;static now():Timestamp;static fromDate(date:Date):Timestamp;static fromMillis(ms:number):Timestamp;static fromProto(value:{seconds?:string|number|{toString():string};nanos?:number}|string):Timestamp;toDate():Date;toMillis():number;toJSON():{seconds:number;nanoseconds:number};isEqual(other:Timestamp):boolean;valueOf():string;}
  class GeoPoint {constructor(latitude:number,longitude:number);readonly latitude:number;readonly longitude:number;isEqual(other:GeoPoint):boolean;}
  class FieldPath {constructor(...segments:string[]);static documentId():FieldPath;isEqual(other:FieldPath):boolean;}
  class FieldValue {private constructor();static delete():FieldValue;static serverTimestamp():FieldValue;static increment(n:number):FieldValue;static arrayUnion(...values:any[]):FieldValue;static arrayRemove(...values:any[]):FieldValue;static vector(values:number[]):VectorValue;isEqual(other:FieldValue):boolean;}
  class VectorValue {toArray():number[];isEqual(other:VectorValue):boolean;}
  class Filter {private constructor();static where(field:string|FieldPath,op:WhereFilterOp,value:unknown):Filter;static and(...filters:Filter[]):Filter;static or(...filters:Filter[]):Filter;}
  class DocumentReference<AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> {
    private constructor();readonly id:string;readonly path:string;readonly firestore:Firestore;readonly parent:CollectionReference<AppModelType,DbModelType>;
    collection(path:string):CollectionReference;get():Promise<DocumentSnapshot<AppModelType,DbModelType>>;
    set(data:WithFieldValue<AppModelType>):Promise<WriteResult>;set(data:PartialWithFieldValue<AppModelType>,options:SetOptions):Promise<WriteResult>;create(data:WithFieldValue<AppModelType>):Promise<WriteResult>;
    update(data:UpdateData<DbModelType>,precondition?:Precondition):Promise<WriteResult>;update(field:string|FieldPath,value:any,...rest:any[]):Promise<WriteResult>;delete(precondition?:Precondition):Promise<WriteResult>;
    listCollections():Promise<CollectionReference[]>;onSnapshot(next:(snapshot:DocumentSnapshot<AppModelType,DbModelType>)=>void,error?:(error:Error)=>void):()=>void;
    withConverter<T,U extends DocumentData=DocumentData>(converter:FirestoreDataConverter<T,U>):DocumentReference<T,U>;withConverter(converter:null):DocumentReference;
    isEqual(other:DocumentReference<AppModelType,DbModelType>):boolean;
  }
  class DocumentSnapshot<AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> {protected constructor();readonly id:string;readonly ref:DocumentReference<AppModelType,DbModelType>;readonly exists:boolean;readonly readTime:Timestamp;readonly createTime:Timestamp|undefined;readonly updateTime:Timestamp|undefined;data():AppModelType|undefined;get(field:string|FieldPath):any;isEqual(other:DocumentSnapshot<AppModelType,DbModelType>):boolean;}
  class QueryDocumentSnapshot<AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> extends DocumentSnapshot<AppModelType,DbModelType> {data():AppModelType;readonly createTime:Timestamp;readonly updateTime:Timestamp;}
  interface DocumentChange<AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> {type:DocumentChangeType;doc:QueryDocumentSnapshot<AppModelType,DbModelType>;oldIndex:number;newIndex:number;}
  class QuerySnapshot<AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> {readonly query:Query<AppModelType,DbModelType>;readonly docs:QueryDocumentSnapshot<AppModelType,DbModelType>[];readonly size:number;readonly empty:boolean;readonly readTime:Timestamp;forEach(callback:(document:QueryDocumentSnapshot<AppModelType,DbModelType>)=>void,thisArg?:unknown):void;docChanges():DocumentChange<AppModelType,DbModelType>[];isEqual(other:QuerySnapshot<AppModelType,DbModelType>):boolean;}
  interface VectorQueryOptions {vectorField:string|FieldPath;queryVector:number[]|VectorValue;limit:number;distanceMeasure:'EUCLIDEAN'|'COSINE'|'DOT_PRODUCT';distanceResultField?:string|FieldPath;distanceThreshold?:number;}
  class Query<AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> {
    protected constructor();readonly firestore:Firestore;where(filter:Filter):Query<AppModelType,DbModelType>;where(field:string|FieldPath,op:WhereFilterOp,value:unknown):Query<AppModelType,DbModelType>;orderBy(field:string|FieldPath,direction?:OrderByDirection):Query<AppModelType,DbModelType>;
    limit(n:number):Query<AppModelType,DbModelType>;limitToLast(n:number):Query<AppModelType,DbModelType>;offset(n:number):Query<AppModelType,DbModelType>;select(...fields:(string|FieldPath)[]):Query;
    startAt(snapshot:DocumentSnapshot):Query<AppModelType,DbModelType>;startAt(...values:unknown[]):Query<AppModelType,DbModelType>;startAfter(...values:unknown[]):Query<AppModelType,DbModelType>;endAt(...values:unknown[]):Query<AppModelType,DbModelType>;endBefore(...values:unknown[]):Query<AppModelType,DbModelType>;
    get():Promise<QuerySnapshot<AppModelType,DbModelType>>;stream():Readable<QueryDocumentSnapshot<AppModelType,DbModelType>>;onSnapshot(next:(snapshot:QuerySnapshot<AppModelType,DbModelType>)=>void,error?:(error:Error)=>void):()=>void;
    count():AggregateQuery<{count:AggregateField<number>},AppModelType,DbModelType>;aggregate<T extends AggregateSpec>(spec:T):AggregateQuery<T,AppModelType,DbModelType>;findNearest(options:VectorQueryOptions):Query<AppModelType,DbModelType>;findNearest(field:string|FieldPath,vector:number[]|VectorValue,options:Omit<VectorQueryOptions,'vectorField'|'queryVector'>):Query<AppModelType,DbModelType>;
    withConverter<T,U extends DocumentData=DocumentData>(converter:FirestoreDataConverter<T,U>):Query<T,U>;withConverter(converter:null):Query;isEqual(other:Query<AppModelType,DbModelType>):boolean;
  }
  class CollectionReference<AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> extends Query<AppModelType,DbModelType> {readonly id:string;readonly path:string;readonly parent:DocumentReference|null;doc(path?:string):DocumentReference<AppModelType,DbModelType>;add(data:WithFieldValue<AppModelType>):Promise<DocumentReference<AppModelType,DbModelType>>;listDocuments():Promise<DocumentReference<AppModelType,DbModelType>[]>;withConverter<T,U extends DocumentData=DocumentData>(converter:FirestoreDataConverter<T,U>):CollectionReference<T,U>;withConverter(converter:null):CollectionReference;}
  class CollectionGroup<AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> extends Query<AppModelType,DbModelType> {}
  type AggregateType = 'count'|'sum'|'avg';type AggregateFieldType = number|null;
  class AggregateField<T extends AggregateFieldType> {private constructor();static count():AggregateField<number>;static sum(field:string|FieldPath):AggregateField<number>;static average(field:string|FieldPath):AggregateField<number|null>;isEqual(other:AggregateField<T>):boolean;}
  interface AggregateSpec {[field:string]:AggregateField<AggregateFieldType>;}
  type AggregateSpecData<T extends AggregateSpec> = {[K in keyof T]:T[K] extends AggregateField<infer V>?V:never};
  class AggregateQuery<T extends AggregateSpec,AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> {readonly query:Query<AppModelType,DbModelType>;get():Promise<AggregateQuerySnapshot<T,AppModelType,DbModelType>>;isEqual(other:AggregateQuery<T,AppModelType,DbModelType>):boolean;}
  class AggregateQuerySnapshot<T extends AggregateSpec,AppModelType=DocumentData,DbModelType extends DocumentData=DocumentData> {readonly query:AggregateQuery<T,AppModelType,DbModelType>;readonly readTime:Timestamp;data():AggregateSpecData<T>;isEqual(other:AggregateQuerySnapshot<T,AppModelType,DbModelType>):boolean;}
  class WriteResult {readonly writeTime:Timestamp;isEqual(other:WriteResult):boolean;}
  class WriteBatch {protected constructor();create<T,U extends DocumentData>(ref:DocumentReference<T,U>,data:WithFieldValue<T>):this;set<T,U extends DocumentData>(ref:DocumentReference<T,U>,data:WithFieldValue<T>):this;set<T,U extends DocumentData>(ref:DocumentReference<T,U>,data:PartialWithFieldValue<T>,options:SetOptions):this;update<T,U extends DocumentData>(ref:DocumentReference<T,U>,data:UpdateData<U>,precondition?:Precondition):this;update(ref:DocumentReference<any,any>,field:string|FieldPath,value:any,...rest:any[]):this;delete(ref:DocumentReference<any,any>,precondition?:Precondition):this;commit():Promise<WriteResult[]>;}
  class Transaction {private constructor();get<T,U extends DocumentData>(ref:DocumentReference<T,U>):Promise<DocumentSnapshot<T,U>>;get<T,U extends DocumentData>(query:Query<T,U>):Promise<QuerySnapshot<T,U>>;get<T extends AggregateSpec,A,U extends DocumentData>(query:AggregateQuery<T,A,U>):Promise<AggregateQuerySnapshot<T,A,U>>;getAll<T,U extends DocumentData>(...refs:(DocumentReference<T,U>|ReadOptions)[]):Promise<DocumentSnapshot<T,U>[]>;create:WriteBatch['create'];set:WriteBatch['set'];update:WriteBatch['update'];delete:WriteBatch['delete'];}
  interface BulkWriterOptions {throttling?:false;}
  interface BulkWriterError extends Error {code:number;documentRef:DocumentReference;operationType:string;failedAttempts:number;}
  class BulkWriter {private constructor();create<T,U extends DocumentData>(ref:DocumentReference<T,U>,data:WithFieldValue<T>):Promise<WriteResult>;set<T,U extends DocumentData>(ref:DocumentReference<T,U>,data:WithFieldValue<T>):Promise<WriteResult>;set<T,U extends DocumentData>(ref:DocumentReference<T,U>,data:PartialWithFieldValue<T>,options:SetOptions):Promise<WriteResult>;update<T,U extends DocumentData>(ref:DocumentReference<T,U>,data:UpdateData<U>,precondition?:Precondition):Promise<WriteResult>;update(ref:DocumentReference<any,any>,field:string|FieldPath,value:any,...rest:any[]):Promise<WriteResult>;delete(ref:DocumentReference<any,any>,precondition?:Precondition):Promise<WriteResult>;onWriteError(callback:(error:BulkWriterError)=>boolean):void;onWriteResult(callback:(ref:DocumentReference,result:WriteResult)=>void):void;flush():Promise<void>;close():Promise<void>;}
  class Firestore {constructor(settings?:Settings);readonly projectId:string;readonly databaseId:string;settings(settings:Settings):void;doc(path:string):DocumentReference;collection(path:string):CollectionReference;collectionGroup(name:string):CollectionGroup;getAll<T,U extends DocumentData>(...refs:(DocumentReference<T,U>|ReadOptions)[]):Promise<DocumentSnapshot<T,U>[]>;batch():WriteBatch;bulkWriter(options?:BulkWriterOptions):BulkWriter;runTransaction<T>(callback:(transaction:Transaction)=>Promise<T>,options?:ReadOnlyTransactionOptions|ReadWriteTransactionOptions):Promise<T>;recursiveDelete(ref:DocumentReference|CollectionReference,writer?:BulkWriter):Promise<void>;listCollections():Promise<CollectionReference[]>;terminate():Promise<void>;}
  const GrpcStatus:Readonly<Record<'OK'|'CANCELLED'|'UNKNOWN'|'INVALID_ARGUMENT'|'DEADLINE_EXCEEDED'|'NOT_FOUND'|'ALREADY_EXISTS'|'PERMISSION_DENIED'|'RESOURCE_EXHAUSTED'|'FAILED_PRECONDITION'|'ABORTED'|'OUT_OF_RANGE'|'UNIMPLEMENTED'|'INTERNAL'|'UNAVAILABLE'|'DATA_LOSS'|'UNAUTHENTICATED',number>>;
  const v1:typeof ServiceAPI.FirestoreClient&{FirestoreClient:typeof ServiceAPI.FirestoreClient};
  const protos:typeof ServiceAPI.protos;
  function setLogFunction(fn:((...messages:unknown[])=>void)|null):void;
}
}
export = FirebaseFirestore;
