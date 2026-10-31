'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const directories=[path.join(__dirname,'node_modules/google-gax'),path.resolve(__dirname,'../../packages/vgoogle-gax')];
async function parse(directory,input){const lib=require(directory),Parser=require(path.join(directory,'build/src/streamArrayParser')).StreamArrayParser;const root=lib.protobuf.Root.fromJSON({nested:{M:{fields:{text:{id:1,type:'string'},child:{id:2,type:'M'}}},S:{methods:{Run:{requestType:'M',responseType:'M',responseStream:true}}}}}).resolveAll();return new Promise((resolve,reject)=>{const result=[],parser=new Parser(root.lookupService('S').methods.Run);parser.on('data',x=>result.push(x));parser.on('error',reject);parser.on('end',()=>resolve(result));parser.end(input);});}
(async()=>{
 const [original,vpm]=directories,[upstream,current]=directories.map(directory=>require(directory));
 assert.notEqual(new upstream.PathTemplate('items/{name}').render({name:'$&'}),'items/$&');assert.equal(new current.PathTemplate('items/{name}').render({name:'$&'}),'items/$&');
 assert.equal(new upstream.PathTemplate('items/{name}').render({name:'one/two'}),'items/one/two');assert.throws(()=>new current.PathTemplate('items/{name}').render({name:'one/two'}),TypeError);
 assert.throws(()=>new upstream.PathTemplate('items/{name=**}').match('items/one/two/three'));assert.deepEqual(new current.PathTemplate('items/{name=**}').match('items/one/two/three'),{name:'one/two/three'});
 for(const [directory,mutated]of [[original,true],[vpm,false]]){const options={},seen=[];const call=require(path.join(directory,'build/src/normalCalls/timeout')).addTimeoutArg((a,m,o)=>seen.push(o),1000,{options});call({});call({});assert.equal(Object.hasOwn(options,'deadline'),mutated);assert.equal(seen[0]===seen[1],mutated);}
 for(const input of ['[{"text":"ok"}','[{"text":"ok"}]junk','[{},]','[{}{}]']){await parse(original,input);await assert.rejects(parse(vpm,input));}
 assert.equal((await parse(original,'[{"child":"invalid"}]')).length,1);await assert.rejects(parse(vpm,'[{"child":"invalid"}]'),TypeError);
 console.log('Gax controls reproduce literal replacement, separator validation, wildcard, shared-deadline, malformed/truncated JSON and invalid ProtoJSON differences; VPM fixes pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});
