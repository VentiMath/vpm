'use strict';
const {getApp}=require('../app'),{FirestoreService,DEFAULT_DATABASE_ID}=require('./firestore-internal');
const registry=app=>app.getOrInitService('firestore',value=>new FirestoreService(value));
exports.getFirestore=(appOrId,id)=>{const app=typeof appOrId==='object'?appOrId:getApp();return registry(app).getDatabase((typeof appOrId==='string'?appOrId:id)||DEFAULT_DATABASE_ID)};
exports.initializeFirestore=(app,settings={},id=DEFAULT_DATABASE_ID)=>registry(app).initializeDatabase(id,settings??{});
for(const name of ["AggregateField", "AggregateQuery", "AggregateQuerySnapshot", "BulkWriter", "CollectionGroup", "CollectionReference", "DocumentReference", "DocumentSnapshot", "FieldPath", "FieldValue", "Filter", "Firestore", "GeoPoint", "GrpcStatus", "Query", "QueryDocumentSnapshot", "QuerySnapshot", "Timestamp", "Transaction", "WriteBatch", "WriteResult", "v1", "setLogFunction"])Object.defineProperty(exports,name,{enumerable:true,get:()=>require('vgoogle-cloud-firestore')[name]});
Object.assign(exports,require('./error'));
