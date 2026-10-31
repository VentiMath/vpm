'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PathTemplate,CallSettings,createApiCall,PageDescriptor,Status}=require('..');
const {addTimeoutArg}=require('../build/src/normalCalls/timeout');
const {StreamArrayParser}=require('../build/src/streamArrayParser');
const protobuf=require('vprotobufjs');
const root=protobuf.Root.fromJSON({nested:{Message:{fields:{text:{type:'string',id:1},numbers:{rule:'repeated',type:'int32',id:2},child:{type:'Message',id:3}}},API:{methods:{Run:{requestType:'Message',responseType:'Message',responseStream:true}}}}}).resolveAll();
const rpc=root.lookupService('API').methods.Run;
function parse(chunks){return new Promise((resolve,reject)=>{const stream=new StreamArrayParser(rpc),items=[];stream.on('data',x=>items.push(x));stream.on('error',reject);stream.on('end',()=>resolve(items));for(const chunk of chunks)stream.write(chunk);stream.end();});}
test('timeout options are isolated between concurrent invocations and permit frozen callers',()=>{
 const options=Object.freeze({deadline:new Date(0),waitForReady:true}),seen=[];
 const invoke=addTimeoutArg((arg,metadata,opts,callback)=>{seen.push(opts);callback(null,arg);return arg;},1000,{options});
 const before=Date.now();assert.equal(invoke(1,()=>{}),1);invoke(2,()=>{});
 assert.notEqual(seen[0],seen[1]);assert.notEqual(seen[0],options);assert.equal(options.deadline.getTime(),0);
 assert.equal(seen[0].waitForReady,true);assert.ok(seen[0].deadline.getTime()>=before+1000);
 seen[1].deadline=new Date(2);assert.notEqual(+seen[0].deadline,2);
});
test('resource rendering preserves replacement metacharacters as literal data',()=>{
 const template=new PathTemplate('projects/{project}/documents/{document}');
 for(const document of ['$&',"$'",'$`','$$','é漢','dot.name-~']){
  const name=template.render({project:'fixture',document});assert.equal(name,'projects/fixture/documents/'+document);assert.deepEqual(template.match(name),{project:'fixture',document});
 }
});
test('atomic bindings reject embedded separators and braces, not just all-invalid input',()=>{
 const template=new PathTemplate('projects/{project}');
 for(const project of ['good/bad','good{bad','good}bad','','/good','good/'])assert.throws(()=>template.render({project}),TypeError);
 assert.throws(()=>template.render(Object.assign(Object.create({project:'inherited'}),{other:'own'})),TypeError);
});
test('unbounded bindings consume any positive number of segments and preserve literal suffixes',()=>{
 const template=new PathTemplate('projects/{project}/documents/{document=**}/tail');
 for(const document of ['one','one/two','one/two/three/four']){
  const path=template.render({project:'fixture',document});assert.deepEqual(template.match(path),{project:'fixture',document});
 }
 assert.throws(()=>template.match('projects/fixture/documents/tail'),TypeError);
 assert.throws(()=>template.render({project:'fixture',document:'one/{two}'}),TypeError);
});
test('compound bindings require their actual literal prefix, suffix and separators',()=>{
 const template=new PathTemplate('items/prefix-{a}.{b}-suffix');
 assert.deepEqual(template.match('items/prefix-one.two-suffix'),{a:'one',b:'two'});
 for(const value of ['items/other-one.two-suffix','items/prefix-one~two-suffix','items/prefix-one.two-other'])assert.throws(()=>template.match(value),TypeError);
 assert.equal(template.render({a:'one',b:'two'}),'items/prefix-one.two-suffix');
});
test('repeated bindings are rendered everywhere and must match consistently',()=>{
 const template=new PathTemplate('items/{name}/copies/{name}');
 assert.equal(template.render({name:'one'}),'items/one/copies/one');assert.deepEqual(template.match('items/one/copies/one'),{name:'one'});
 assert.throws(()=>template.match('items/one/copies/two'),TypeError);
});
test('binding names in a literal prefix do not alter that prefix',()=>{
 const template=new PathTemplate('items/name-{name}.{other}');
 assert.equal(template.render({name:'one',other:'two'}),'items/name-one.two');
 assert.deepEqual(template.match('items/name-one.two'),{name:'one',other:'two'});
});
test('prototype-named and punctuated variables are ordinary own bindings',()=>{
 const template=new PathTemplate('items/{__proto__}/{constructor}/{a.b}'),bindings=JSON.parse('{"__proto__":"one","constructor":"two","a.b":"three"}');
 assert.equal(template.render(bindings),'items/one/two/three');const result=template.match('items/one/two/three');assert.deepEqual(result,bindings);assert.equal(Object.getPrototypeOf(result),Object.prototype);
});
test('JSON streams retain Unicode, escapes and nested messages across every byte boundary',async()=>{
 const values=[{text:'é漢😀\\\"[{}]',numbers:[1,2,3],child:{text:'nested'}},{text:'last',numbers:[]}];
 const data=Buffer.from(JSON.stringify(values));const expected=await parse([data]);
 for(let split=0;split<=data.length;split++)assert.deepEqual(await parse([data.subarray(0,split),data.subarray(split)]),expected);
 assert.deepEqual(await parse([...data].map(byte=>Buffer.from([byte]))),expected);assert.equal(expected[0].text,values[0].text);
});
test('JSON streams allow empty arrays and outer whitespace',async()=>{
 assert.deepEqual(await parse([' \n[\r\n]\t']),[]);assert.equal((await parse([' \n[', '{"text":"ok"}', ']\r\n']))[0].text,'ok');
});
for(const input of ['', '[', '[{}', '[{"text":"unfinished}', '[{}{}]', '[{},]', '[{},,{}]', '[1]', '{}', '[{}]junk', '[{}][{}]', '[{"text":}]']){
 test('reject malformed or truncated JSON stream '+JSON.stringify(input),async()=>{await assert.rejects(parse([input]));});
}
test('trailing bytes in a later chunk are rejected',async()=>{await assert.rejects(parse(['[{}]','extra']),/after JSON array/);});
test('stream cancellation aborts fetch and discards an incomplete element',async()=>{
 const stream=new StreamArrayParser(rpc);stream.resume();let errors=0;stream.on('error',()=>errors++);
 const closed=new Promise(resolve=>stream.on('close',resolve));stream.write('[{"text":"unfinished');stream.cancel();await closed;
 assert.equal(stream.cancelSignal.aborted,true);assert.equal(errors,0);assert.equal(stream._parts.length,0);
});
test('invalid streamed messages emit one error and release retained chunks',async()=>{
 const stream=new StreamArrayParser(rpc);stream.resume();const errors=[];stream.on('error',error=>errors.push(error));const closed=new Promise(resolve=>stream.on('close',resolve));
 stream.write('[{"text":');stream.end('bad}]');await closed;assert.equal(errors.length,1);assert.equal(stream._parts.length,0);
});
test('API calls retain callback and promise result shapes',async()=>{
 const raw=(request,metadata,options,done)=>{done(null,{value:request.value});return{cancel(){}};};
 const call=createApiCall(raw,new CallSettings({timeout:5000}));assert.equal((await call({value:42}))[0].value,42);
 assert.equal(await new Promise((resolve,reject)=>call({value:7},{},(error,response)=>error?reject(error):resolve(response.value))),7);
});
test('automatic pagination retains page tokens and async iteration',async()=>{
 const raw=(request,metadata,options,done)=>{done(null,{items:[request.pageToken?2:1],nextPageToken:request.pageToken?'':'next'});return{cancel(){}};};
 const descriptor=new PageDescriptor('pageToken','nextPageToken','items'),call=createApiCall(raw,new CallSettings({timeout:5000}),descriptor);
 assert.deepEqual((await call({}))[0],[1,2]);const items=[];for await(const item of descriptor.asyncIterate(call,{}))items.push(item);assert.deepEqual(items,[1,2]);
});
test('CJS and ESM expose the same public entry points',async()=>{
 const esm=await import('../index.mjs'),fallback=await import('../fallback.mjs');assert.equal(esm.PathTemplate,PathTemplate);assert.equal(esm.Status.UNAVAILABLE,Status.UNAVAILABLE);assert.equal(typeof fallback.GrpcClient,'function');
});
