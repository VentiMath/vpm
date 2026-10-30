'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire,isBuiltin}=require('node:module');
const from=createRequire(path.join(__dirname,'package.json'));
// Isolate actual installed protobuf/loader modules per variant. Other imports
// retain their installed behavior; only long is substituted. No installed files
// or global require-cache entries are changed.
function loader(Long,stats){
  const cache=new Map(),methods=new Map();
  const instrumented=stats?new Proxy(Long,{
    construct(target,args){stats.construct=(stats.construct||0)+1;return Reflect.construct(target,args);},
    get(target,name){const value=target[name];if(typeof value!=='function'||name==='prototype')return value;
      if(!methods.has(name))methods.set(name,function(...args){stats[name]=(stats[name]||0)+1;return Reflect.apply(value,target,args);});return methods.get(name);},
  }):Long;
  function load(file){
    if(cache.has(file))return cache.get(file).exports;
    if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
    const local=createRequire(file),mod={exports:{}};cache.set(file,mod);
    function req(name){
      if(name==='long')return instrumented;
      if(isBuiltin(name))return local(name);
      const resolved=local.resolve(name);
      return /\/node_modules\/(?:protobufjs|@grpc\/proto-loader)\//.test(resolved)?load(resolved):local(name);
    }
    req.resolve=local.resolve;
    new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(mod.exports,req,mod,file,path.dirname(file));
    return mod.exports;
  }
  return load;
}
const schema={nested:{fixture:{nested:{Item:{fields:{signed:{type:'int64',id:1},unsigned:{type:'uint64',id:2},zigzag:{type:'sint64',id:3},fixed:{type:'fixed64',id:4},sfixed:{type:'sfixed64',id:5},values:{rule:'repeated',type:'int64',id:6},labels:{keyType:'int64',type:'string',id:7},stamp:{type:'Timestamp',id:8}}},Timestamp:{fields:{seconds:{type:'int64',id:1},nanos:{type:'int32',id:2}}},Catalog:{methods:{Get:{requestType:'Item',responseType:'Item'}}}}}}};
const input={signed:'-9223372036854775808',unsigned:'18446744073709551615',zigzag:'-9007199254740993',fixed:'18446744073709551615',sfixed:'-9223372036854775808',values:['0','1','-1','9223372036854775807'],labels:{'9223372036854775807':'large'},stamp:{seconds:'9007199254740993',nanos:123}};
function protobuf(Long,stats,legacy=false){const load=loader(Long,stats),entry=legacy?createRequire(from.resolve('google-gax')).resolve('protobufjs'):from.resolve('protobufjs');return load(entry);}
function protoLoader(Long,stats){return loader(Long,stats)(from.resolve('@grpc/proto-loader'));}
function gax(Long,file,stats){return loader(Long,stats)(path.join(path.dirname(from.resolve('google-gax')) ,file));}
function roundtrip(pb){const Item=pb.Root.fromJSON(structuredClone(schema)).lookupType('fixture.Item');return {Item, encode:()=>Item.encode(Item.fromObject(input)).finish(), decode:bytes=>Item.toObject(Item.decode(bytes),{longs:String})};}
module.exports={loader,protobuf,protoLoader,gax,roundtrip,schema,input,from};
