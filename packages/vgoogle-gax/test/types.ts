import {PathTemplate,GrpcClient,CallSettings,createApiCall,PageDescriptor,GoogleError,Status,protobuf,grpc,GoogleAuth} from '..';
const name:string=new PathTemplate('projects/{project}').render({project:'fixture'});
const bindings=new PathTemplate('projects/{project}').match(name);const client=new GrpcClient({auth:new GoogleAuth({projectId:'fixture'})});
const settings=new CallSettings({timeout:5000});const call=createApiCall(()=>({cancel(){}}),settings);const page=new PageDescriptor('pageToken','nextPageToken','items');
const error:GoogleError=new GoogleError('fixture');error.code=Status.UNAVAILABLE;const root:protobuf.Root=new protobuf.Root();const metadata=new grpc.Metadata();metadata.set('x-fixture','yes');void[bindings,client,call,page,root,metadata];
// @ts-expect-error paths require strings
new PathTemplate(1);
