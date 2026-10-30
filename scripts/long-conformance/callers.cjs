'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {protobuf,protoLoader,gax,roundtrip,schema,input,from}=require('./consumers.cjs');
function run(upstream=false){
  assert.equal(from('protobufjs/package.json').version,'8.8.1');assert.equal(from('@grpc/proto-loader/package.json').version,'0.8.1');assert.equal(require('./node_modules/google-gax/package.json').version,'6.14.0');
  assert.equal(require('node:module').createRequire(from.resolve('google-gax'))('protobufjs/package.json').version,'7.6.6');
  const Long=upstream?from('long'):require('../../packages/vlong'),stock=from('long'),stats={};
  // Protobuf 7 represents int64 map keys as eight-byte hashes; 8 uses decimals.
  const decodedInput={...input,labels:{['\xff'.repeat(7)+'\x7f']:'large'}};
  const files=['protobufjs/src/util/minimal.js','@grpc/proto-loader/build/src/index.js','google-gax/build/src/grpc.js','google-gax/build/src/fallback.js'].map(f=>path.join(__dirname,'node_modules',f));
  const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex'),before=files.map(hash);
  let paths=0;
  for(const legacy of [false,true]){
    const pb=protobuf(Long,stats,legacy),candidate=roundtrip(pb),control=roundtrip(protobuf(stock,null,legacy));
    const bytes=candidate.encode();assert.deepEqual(Buffer.from(bytes),Buffer.from(control.encode()));
    assert.deepEqual(candidate.decode(bytes),legacy?decodedInput:input);assert.deepEqual(candidate.decode(bytes),control.decode(bytes));assert.deepEqual(candidate.decode(control.encode()),legacy?decodedInput:input);
    // Check real Reader/Writer varint and fixed-width paths separately.
    for(const name of ['int64','uint64','sint64','fixed64','sfixed64']){
      const value=name[0]==='u'||name==='fixed64'?input.unsigned:input.signed;
      const encoded=pb.Writer.create()[name](value).finish();assert.equal(pb.Reader.create(encoded)[name]().toString(),value);paths++;
    }
    const defaults=candidate.Item.toObject(candidate.Item.create(),{longs:String,defaults:true});assert.equal(defaults.signed,'0');assert.equal(defaults.unsigned,'0');paths++;
    assert(pb.util.Long.isLong(candidate.Item.fromObject(input).signed));
  }
  for(const longs of [String,undefined]){
    const def=protoLoader(Long,stats).fromJSON(structuredClone(schema),{longs});
    const control=protoLoader(stock).fromJSON(structuredClone(schema),{longs});
    const method=def['fixture.Catalog'].Get,original=control['fixture.Catalog'].Get;
    const bytes=method.requestSerialize(input);assert.deepEqual(bytes,original.requestSerialize(input));
    const decoded=method.requestDeserialize(bytes);assert.equal(String(decoded.signed),input.signed);assert.equal(String(decoded.unsigned),input.unsigned);paths++;
  }
  for(const file of ['grpc.js','fallback.js']){
    const {GrpcClient}=gax(Long,file,stats);GrpcClient.clearProtoCache();const client=new GrpcClient({auth:{}}),loaded=client.loadProtoJSON(structuredClone(schema));
    if(file==='grpc.js'){
      const method=loaded.fixture.Catalog.service.Get,bytes=method.requestSerialize(input),decoded=method.requestDeserialize(bytes);
      assert.equal(String(decoded.signed),input.signed);assert.equal(String(decoded.unsigned),input.unsigned);
    }else{
      const Item=loaded.lookupType('fixture.Item'),bytes=Item.encode(Item.fromObject(input)).finish();assert.deepEqual(Item.toObject(Item.decode(bytes),{longs:String}),decodedInput);
    }
    GrpcClient.clearProtoCache();paths++;
  }
  assert.equal(paths,16);assert.deepEqual(files.map(hash),before,'consumer files changed');assert(stats.fromValue>0);assert(stats.fromString>0);assert(stats.construct>0);
  console.log(`${upstream?'Upstream':'VPM'} long: ${paths} real protobuf 8.8.1/7.x, proto-loader 0.8.1 and gax 6.14.0 paths; exact int64 wire bytes, JSON strings, timestamps, map keys and defaults. Calls: ${JSON.stringify(stats)}`);
  return paths;
}
module.exports=run;if(require.main===module)run(process.argv.includes('--upstream'));
