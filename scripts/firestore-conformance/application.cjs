'use strict';
// Replay the hash-pinned cross-SDK data cases through public builders. The tiny
// extraction adapters observe compiled protobufs without doing a cloud write.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const libraries={upstream:require('./node_modules/@google-cloud/firestore'),vpm:require('../../packages/vgoogle-cloud-firestore')};
const proto=libraries.upstream.protos.google.firestore.v1;
const canonical=(name,value)=>{const T=proto[name];return T.toObject(T.decode(T.encode(T.fromObject(value)).finish()),{longs:String,enums:String,bytes:String,defaults:true});};
function execute(F,kind,spec){
 const db=new F.Firestore({projectId:'projectID'}),relative=value=>value.split('/documents/')[1],field=p=>new F.FieldPath(...p.field);
 const input=text=>{const visit=v=>{if(v==='NaN')return NaN;if(v==='Delete')return F.FieldValue.delete();if(v==='ServerTimestamp')return F.FieldValue.serverTimestamp();if(Array.isArray(v)){if(v[0]==='ArrayUnion')return F.FieldValue.arrayUnion(...v.slice(1).map(visit));if(v[0]==='ArrayRemove')return F.FieldValue.arrayRemove(...v.slice(1).map(visit));return v.map(visit);}if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)]));return v;};return visit(JSON.parse(text));};
 const condition=spec.precondition&&{...spec.precondition};if(condition?.updateTime){condition.lastUpdateTime=F.Timestamp.fromProto(condition.updateTime);delete condition.updateTime;}
 if(kind==='query'){
  let q=db.collection(relative(spec.collPath));for(const clause of spec.clauses||[]){
   if(clause.select)q=q.select(...(clause.select.fields||[{field:['__name__']}]).map(field));
   else if(clause.where)q=q.where(field(clause.where.path),clause.where.op,input(clause.where.jsonValue));
   else if(clause.orderBy)q=q.orderBy(field(clause.orderBy.path),clause.orderBy.direction);
   else if(clause.offset)q=q.offset(clause.offset);else if(clause.limit)q=q.limit(clause.limit);
   else for(const name of ['startAt','startAfter','endAt','endBefore'])if(clause[name]){const cursor=clause[name],args=cursor.docSnapshot?[db.snapshot_({name:cursor.docSnapshot.path,fields:db._serializer.encodeFields(input(cursor.docSnapshot.jsonData)),createTime:{seconds:1},updateTime:{seconds:1}},null,'protobufJS')]:cursor.jsonValues.map(input);q=q[name](...args);}
  }return canonical('StructuredQuery',q.toProto().structuredQuery);
 }
 const batch=db.batch(),ref=db.doc(relative(spec.docRefPath));
 if(kind==='set')batch.set(ref,input(spec.jsonData),spec.option?.all?{merge:true}:spec.option?.fields?{mergeFields:spec.option.fields.map(field)}:{});
 else if(kind==='create')batch.create(ref,input(spec.jsonData));
 else if(kind==='delete')batch.delete(ref,condition);
 else{const args=spec.jsonData?[input(spec.jsonData)]:spec.fieldPaths.flatMap((f,i)=>[field(f),input(spec.jsonValues[i])]);if(condition)args.push(condition);batch.update(ref,...args);}
 return canonical('CommitRequest',{database:'projects/projectID/databases/(default)',writes:batch._ops.map(op=>typeof op.op==='function'?op.op():op)});
}
const root=path.join(__dirname,'upstream');for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,file);
let checked=0;const failures=[];
for(const file of fs.readdirSync(path.join(root,'conformance/conformance-tests')).sort()){
 if(!file.endsWith('.json'))continue;for(const item of JSON.parse(fs.readFileSync(path.join(root,'conformance/conformance-tests',file))).tests){
  const kind=['set','create','update','updatePaths','delete','query'].find(k=>item[k]);if(!kind)continue;const spec=item[kind];const normalize=value=>{if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(['updateTime','createTime','readTime'].includes(key)&&typeof value[key]==='string')value[key]=libraries.vpm.Timestamp.fromProto(value[key]).toProto();else normalize(value[key]);}if(value.query&&typeof value.query.limit==='number')value.query.limit={value:value.query.limit};};normalize(spec);const results={};
  for(const [name,F]of Object.entries(libraries))try{results[name]={value:execute(F,kind,spec)};}catch(error){results[name]={error:true,message:error.message};}
  try{const corrected=['set-del-nomerge.json','set-del-nonleaf.json'].includes(file);assert.equal(!!results.upstream.error,corrected?false:!!spec.isError,'original error contract');if(!spec.isError)assert.deepEqual(results.upstream.value,canonical(kind==='query'?'StructuredQuery':'CommitRequest',spec.query||spec.request),'original protobuf contract');assert.equal(!!results.vpm.error,!!spec.isError,'rejection contract');if(!results.upstream.error&&!spec.isError)assert.deepEqual(results.vpm.value,results.upstream.value);checked++;}catch(error){failures.push({file,kind,original:results.upstream,vpm:results.vpm,error:error.message});}
 }
}
console.log(JSON.stringify({checked,failures},null,2));assert.equal(failures.length,0);
