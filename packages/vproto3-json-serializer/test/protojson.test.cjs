'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),pb=require('vprotobufjs'),{toProto3JSON:to,fromProto3JSON:from}=require('..');
function root(){const r=new pb.Root();for(const key of ['timestamp','duration','struct','wrappers','any','field_mask'])r.addJSON(pb.common['google/protobuf/'+key+'.proto'].nested);pb.parse(`syntax="proto3";message Item{bytes data=1;repeated bytes chunks=2;map<string,bytes> blobs=3;repeated double numbers=4;map<string,double> floats=5;repeated sint64 ids=6;map<string,int64> counts=7;int32 count=8;bool enabled=9;string display_name=10 [json_name="label"];oneof pick{string first=11;string second=12;}google.protobuf.Value value=13;google.protobuf.Timestamp stamp=14;google.protobuf.Duration elapsed=15;google.protobuf.Any payload=16;enum Mode{OFF=0;ON=1;}Mode mode=17;}message Small{string name=1;int64 id=2;}`,r);return r;}
const r=root(),T=r.lookupType('Item'),wkt=n=>r.lookupType('google.protobuf.'+n);
test('byte slices, repeated bytes and map bytes preserve exactly the selected bytes',()=>{
 const slice=new Uint8Array([99,1,2,88]).subarray(1,3),message=T.create({data:slice,chunks:[slice],blobs:{a:slice}}),json=to(message);
 assert.equal(json.data,'AQI=');assert.deepEqual(json.chunks,['AQI=']);assert.deepEqual(json.blobs,{a:'AQI='});
 const value=from(T,{data:'AQI',chunks:['-_8='],blobs:{a:'AQI='}});assert.deepEqual([...value.data],[1,2]);assert.deepEqual([...value.chunks[0]],[251,255]);assert.deepEqual([...value.blobs.a],[1,2]);
});
test('large byte inputs and malformed trailing text are handled without regexp stack growth',()=>{
 const bytes=Buffer.alloc(4*1024*1024,173),encoded=bytes.toString('base64');assert.deepEqual(Buffer.from(from(T,{data:encoded}).data),bytes);
 const urlBytes=Buffer.alloc(256,255);assert.deepEqual(Buffer.from(from(T,{data:urlBytes.toString('base64url')}).data),urlBytes);
 const zeroBytes=Buffer.alloc(256),noncanonical=zeroBytes.toString('base64').slice(0,-4)+'AB==';assert.deepEqual(Buffer.from(from(T,{data:noncanonical}).data),zeroBytes);
 for(const text of ['A','AA=','AAA==','A===','AA\n','AA==\n','AAAA\n','AA=AA',encoded+'!'])assert.throws(()=>from(T,{data:text}),/base64/);
 for(const text of ['AA','AAA','AAAA','AA==','AAA=','-_8='])assert.doesNotThrow(()=>from(T,{data:text}));
 for(const json of [{count:'12\n'},{ids:['12\n']},{numbers:['1.5\n']},{stamp:'2026-10-30T00:00:00Z\n'},{elapsed:'1s\n'}])assert.throws(()=>from(T,json));
 assert.throws(()=>from(wkt('FieldMask'),'name\n'));assert.throws(()=>to(wkt('FieldMask').create({paths:['name\n']})));
});
test('special floats and int64 strings use the same representation in all containers',()=>{
 const message=T.fromObject({numbers:[NaN,Infinity,-Infinity],floats:{n:NaN},ids:['-9223372036854775808','9007199254740993'],counts:{big:'9223372036854775807'}}),json=to(message);
 assert.deepEqual(json.numbers,['NaN','Infinity','-Infinity']);assert.deepEqual(json.floats,{n:'NaN'});assert.deepEqual(json.ids,['-9223372036854775808','9007199254740993']);
 const out=from(T,json);assert(Number.isNaN(out.numbers[0]));assert.equal(out.ids[1].toString(),'9007199254740993');assert.equal(out.counts.big.toString(),'9223372036854775807');
});
test('negative durations preserve sign and nanosecond precision',()=>{
 const D=wkt('Duration');for(const value of ['-1.234567890s','-0.000000001s','0s','315576000000s','-315576000000s'])assert.equal(to(from(D,value)),value==='-1.234567890s'?'-1.234567890s':value);
 for(const value of ['s','.s','1.s','1.1234567890s','315576000001s','+1s','1e2s'])assert.throws(()=>from(D,value));
 assert.throws(()=>to(D.create({seconds:1,nanos:-1})));assert.throws(()=>to(D.create({seconds:NaN})));
});
test('timestamp offsets retain nanos and validate calendar, zone and range',()=>{
 const D=wkt('Timestamp');assert.equal(to(from(D,'2026-10-30T13:04:05.123+02:30')),'2026-10-30T10:34:05.123Z');assert.equal(to(from(D,'2026-10-30T13:04:05.123456789+02:30')),'2026-10-30T10:34:05.123456789Z');
 assert.equal(to(from(D,'1969-12-31T23:59:59.999999999Z')),'1969-12-31T23:59:59.999999999Z');
 for(const value of ['0001-01-01T00:00:00Z','9999-12-31T23:59:59Z','2000-02-29T00:00:00Z'])assert.equal(to(from(D,value)),value.replace('Z','.000Z'));
 for(const value of ['2025-02-29T00:00:00Z','2026-04-31T00:00:00Z','2026-10-30T24:00:00Z','2026-10-30T00:00:00','2026-10-30T00:00:00.1234567890Z','2026-10-30T00:00:00+24:00','0001-01-01T00:00:00+00:01','9999-12-31T23:59:59-00:01'])assert.throws(()=>from(D,value));
});
test('FieldMask converts snake case and rejects irreversible paths',()=>{
 const F=wkt('FieldMask');assert.equal(to(F.create({paths:['display_name','nested.child_id']})),'displayName,nested.childId');assert.deepEqual(from(F,'displayName,nested.childId').paths,['display_name','nested.child_id']);assert.deepEqual(from(F,'').paths,[]);assert.equal(to(F.create({paths:['_private','nested._id']})),'Private,nested.Id');assert.deepEqual(from(F,'Private,nested.Id').paths,['_private','nested._id']);
 for(const path of ['bad_','UPPER','bad__name','value_1'])assert.throws(()=>to(F.create({paths:[path]})));
});
test('Any wrappers use the required value envelope and carry numeric enums',()=>{
 const A=wkt('Any'),I=wkt('Int64Value'),url='type.googleapis.com/google.protobuf.Int64Value';
 const message=A.fromObject({type_url:url,value:I.encode(I.fromObject({value:'9007199254740993'})).finish()});assert.deepEqual(to(message),{'@type':url,value:'9007199254740993'});
 const back=from(A,{'@type':url,value:'9007199254740993'});assert.equal(I.decode(back.value).value.toString(),'9007199254740993');
 const item=T.fromObject({mode:1}),outer=A.fromObject({type_url:'type.googleapis.com/Item',value:T.encode(item).finish()});assert.equal(to(outer,{numericEnums:true}).mode,1);
});
test('JSON field aliases are accepted and canonical names are emitted',()=>{
 assert.equal(from(T,{display_name:'a'}).displayName,'a');assert.equal(from(T,{displayName:'b'}).displayName,'b');assert.equal(from(T,{label:'c'}).displayName,'c');assert.equal(to(T.fromObject({displayName:'d'})).label,'d');assert.throws(()=>from(T,{label:'a',displayName:'b'}),/Duplicate/);
 const EmptyName=pb.parse('message E {optional string value=1 [json_name=\"\"];}').root.lookupType('E');assert.deepEqual(to(EmptyName.create({value:'x'})),{'':'x'});assert.equal(from(EmptyName,{'':'x'}).value,'x');
});
test('scalar validation covers repeated and map entries and every integer width',()=>{
 for(const type of ['int32','sint32','sfixed32','uint32','fixed32','int64','sint64','sfixed64','uint64','fixed64']) {
  const Q=pb.parse(`syntax="proto3";message Q{${type} value=1;repeated ${type} values=2;map<string,${type}> map=3;}`).root.lookupType('Q');
  for(const bad of [true,'12junk','1.5','1e100','NaN',{},''])for(const input of [{value:bad},{values:[bad]},{map:{x:bad}}])assert.throws(()=>from(Q,input),type);
  assert.equal(String(from(Q,{value:'100e-2'}).value),'1');
 }
 assert.throws(()=>from(T,{count:'2147483648'}));assert.throws(()=>from(T,{ids:['9223372036854775808']}));assert.throws(()=>from(T,{counts:{x:'-9223372036854775809'}}));
 for(const json of [{data:'AA!A'},{chunks:['A']},{blobs:{x:'A==='}},{numbers:['no']},{enabled:'true'},{floats:{x:'1e999'}}])assert.throws(()=>from(T,json));
});
test('null fields stay unset, containers become empty, and Value null remains a sentinel',()=>{
 const message=from(T,{count:null,enabled:null,chunks:null,blobs:null,value:null});assert(!Object.hasOwn(message,'count'));assert(!Object.hasOwn(message,'enabled'));assert.deepEqual(message.chunks,[]);assert.deepEqual(message.blobs,{});assert.equal(to(message).value,null);
 assert.equal(from(T,null),null);assert.throws(()=>from(T,{chunks:[null]}));assert.throws(()=>from(T,{counts:{x:null}}));
});
test('prototype-named data remains an own property without changing prototypes',()=>{
 const S=wkt('Struct'),json=JSON.parse('{"__proto__":{"polluted":true},"constructor":"safe"}'),out=to(from(S,json));assert.deepEqual(out,json);assert.equal(Object.getPrototypeOf(out),Object.prototype);assert.equal({}.polluted,undefined);
 const message=T.create({blobs:JSON.parse('{"__proto__":null}')});message.blobs.__proto__=Uint8Array.of(1);const map=to(message).blobs;assert.equal(map.__proto__,'AQ==');assert(own(map,'__proto__'));
 function own(o,k){return Object.hasOwn(o,k);}
});
test('nonfinite Value numbers are rejected without converting numbers into strings',()=>{
 const V=wkt('Value');for(const value of [NaN,Infinity,-Infinity]){assert.throws(()=>to(V.create({numberValue:value})));assert.throws(()=>from(V,value));}
 assert.equal(to(from(V,'NaN')),'NaN');
});
test('oneof conflicts and deep or cyclic JSON fail with bounded errors',()=>{
 assert.throws(()=>from(T,{first:'a',second:'b'}),/oneof/);const V=wkt('Value'),cycle={};cycle.self=cycle;assert.throws(()=>from(V,cycle),/nesting/);
 const nested={};let node=nested;for(let i=0;i<120;i++)node=node.child={};assert.throws(()=>from(V,nested),/nesting/);
});
test('schema cache notices newly added fields and ignores unknown own properties',()=>{
 const Q=pb.parse('message Q {optional string a=1;}').root.lookupType('Q');assert.deepEqual(to(Q.create({a:'x'})),{a:'x'});Q.add(new pb.Field('b',2,'string'));assert.equal(from(Q,{b:'y'}).b,'y');assert.deepEqual(to(Q.create({a:'x',extra:1})),{a:'x'});
});
test('inputs are not mutated and CommonJS/ESM share functions',async()=>{
 const json=Object.freeze({count:3,label:'name'});from(T,json);assert.deepEqual(json,{count:3,label:'name'});const esm=await import('../index.js');assert.equal(esm.toProto3JSON,to);assert.equal(esm.fromProto3JSON,from);
});
