import {instance, project, universe, bulk, setGCPResidency, isAvailable, HEADERS, type Options} from '..';
const options: Options = {property:'id',params:{recursive:'true'},headers:{x:['value']},timeout:1000,signal:new AbortController().signal};
const id: Promise<string> = project<string>('project-id');
const data: Promise<{id: string}> = instance<{id: string}>(options);
const domain: Promise<string> = universe<string>('universe-domain');
bulk([{metadataKey:'project/project-id',noResponseRetries:0}] as const).then(result => { const value=result['project/project-id']; void value; });
setGCPResidency(null);
const available: Promise<boolean> = isAvailable();
// @ts-expect-error timeout must be numeric
instance({timeout:'fast'});
// @ts-expect-error required header is readonly
HEADERS['Metadata-Flavor']='Other';
void [id,data,domain,available];

instance({headers: new Headers({x:'test'})});
instance({headers: [['x','one'], ['y','two']] as const});
bulk<readonly [{readonly metadataKey:'project/id'}], {'project/id':string}>([{metadataKey:'project/id'}]).then(result => { const id:string=result['project/id']; void id; });
// @ts-expect-error tuples require string values
instance({headers: [['x', 123]]});
