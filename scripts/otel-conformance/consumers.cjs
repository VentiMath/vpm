'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const from=createRequire(path.resolve(__dirname,'../protobuf-conformance/package.json'));
// Private loader: only gax's OpenTelemetry import is substituted. SDKs and
// runtime modules keep their actual implementations and normal module identity.
exports.gax=function(api) {
 const cache=new Map(),root=path.dirname(from.resolve('google-gax'));
 function load(file){if(cache.has(file))return cache.get(file).exports;const local=createRequire(file),module={exports:{}};cache.set(file,module);function req(name){if(name==='@opentelemetry/api')return api;const resolved=local.resolve(name);return resolved.startsWith(root+'/')&&resolved.endsWith('.js')?load(resolved):local(name);}new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(module.exports,req,module,file,path.dirname(file));return module.exports;}
 return load(path.join(root,'observability/TracerHelper.js'));
};
exports.dynamic={clientName:'FirestoreClient',methodName:'GetDocument',apiName:'google.firestore.v1.Firestore',rpcType:'grpc'};
exports.staticArgs={gcpClientService:'firestore.googleapis.com',gcpVersion:'9.4.0',serverAddress:'localhost',serverPort:443};
