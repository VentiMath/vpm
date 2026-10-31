import {Metadata,Server,credentials,ServerCredentials,Client,status,type ServiceDefinition,type ServerUnaryCall,type sendUnaryData,type ClientReadableStream,type ClientDuplexStream} from '..';
const m=new Metadata();m.set('name','value');m.add('trace-bin',Buffer.from('bytes'));
const headers=m.toHttp2Headers();const again=Metadata.fromHttp2Headers({'name':'value'});
const definition:ServiceDefinition={echo:{path:'/test/Echo',requestStream:false,responseStream:false,requestSerialize:(x:{text:string})=>Buffer.from(x.text),responseSerialize:(x:{text:string})=>Buffer.from(x.text),requestDeserialize:b=>({text:b.toString()}),responseDeserialize:b=>({text:b.toString()})}};
const server=new Server();server.addService(definition,{echo:(call:ServerUnaryCall<{text:string},{text:string}>,done:sendUnaryData<{text:string}>)=>done(null,call.request)});
server.bindAsync('127.0.0.1:0',ServerCredentials.createInsecure(),(error,port)=>{void[error,port];});server.forceShutdown();
const client=new Client('localhost:1',credentials.createInsecure());client.close();
declare const stream:ClientReadableStream<{text:string}>;
stream.on('data',value=>{const text:string=value.text;void text;});
declare const duplex:ClientDuplexStream<{id:number},{name:string}>;
duplex.write({id:1});duplex.on('data',value=>{const name:string=value.name;void name;});
// @ts-expect-error metadata strings cannot be numbers
m.set('name',42);
void[again,status.OK];

import {checkServerIdentity,createSecureContext,type PeerCertificate} from 'node:tls';
import {ChannelCredentials,type ClientUnaryCall} from '..';
type AuthContext=NonNullable<ReturnType<ClientUnaryCall['getAuthContext']>>;
credentials.createSsl(undefined,undefined,undefined,{checkServerIdentity});
ChannelCredentials.createFromSecureContext(createSecureContext());
declare const peer:PeerCertificate;
const authContext:AuthContext={sslPeerCertificate:peer};
const restoredPeer:PeerCertificate=authContext.sslPeerCertificate!;
void restoredPeer;
