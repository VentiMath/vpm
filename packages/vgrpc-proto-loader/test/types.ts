import {fromJSON, load, loadSync, loadFileDescriptorSetFromBuffer, loadFileDescriptorSetFromObject, isAnyExtension, Long, IdempotencyLevel, type Options, type MethodDefinition, type MessageTypeDefinition, type PackageDefinition} from 'vgrpc-proto-loader';
import {Buffer} from 'node:buffer';
const options: Options = {longs:String,bytes:Buffer,enums:String,defaults:true,keepCase:true,includeDirs:['protos']};
const def: PackageDefinition = fromJSON({nested:{}},options);
const method = {} as MethodDefinition<{id:string},{text:string}>;
const wire: Buffer = method.requestSerialize({id:'1'});
const decoded: {text:string} = method.responseDeserialize(new Uint8Array());
const message = {} as MessageTypeDefinition<{id:string},{id:Long}>;
const id: Long = message.deserialize(wire).id;
const unknownValue: unknown = {};
if(isAnyExtension(unknownValue)){const url:string=unknownValue['@type'];void url;}
load('service.proto',options);loadSync(['service.proto'],options);loadFileDescriptorSetFromBuffer(wire);loadFileDescriptorSetFromObject({file:[]});
// @ts-expect-error includeDirs is an array
loadSync('x.proto',{includeDirs:'x'});
// @ts-expect-error serializer input follows its request type
method.requestSerialize({text:'x'});
void [def,decoded,id,IdempotencyLevel.IDEMPOTENT];
