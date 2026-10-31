import api, {v1, FirestoreClient, FirestoreAdminClient, protos} from '..';
import {FirestoreClient as ClientV1} from 'vgoogle-cloud-firestore-api/client_v1';
import type * as gax from 'vgoogle-gax';

const client: FirestoreClient = new api.FirestoreClient({projectId: 'fixture'});
const admin = new v1.FirestoreAdminClient({projectId: 'fixture'});
const same: typeof ClientV1 = FirestoreClient;
const endpoint: string = client.apiEndpoint;
async function calls(): Promise<void> {
  const [document] = await client.getDocument({name: 'projects/p/databases/d/documents/c/a'});
  const fields: {[key: string]: protos.google.firestore.v1.IValue} | null | undefined = document.fields;
  const [documents, next] = await client.listDocuments({parent: 'projects/p/databases/d/documents', collectionId: 'c'});
  for await (const item of client.listDocumentsAsync({parent: 'p'})) void item.name;
  const [ids] = await client.listCollectionIds({parent: 'p'});
  const first: string | undefined = ids[0];
  const stream: gax.CancellableStream = client.runQuery({parent: 'p'});
  const listen: gax.CancellableStream = client.listen();
  const [operation] = await admin.createIndex({parent: 'p', index: {queryScope: 'COLLECTION'}});
  const [index] = await operation.promise();
  const name: string | null | undefined = index.name;
  const checked = await admin.checkCreateIndexProgress('operation');
  const path: string = admin.indexPath('p', 'd', 'c', 'i');
  const matched: string | number = admin.matchCollectionFromIndexName(path);
  client.commit({database: 'd', writes: []}, (error, response) => void [error, response?.commitTime]);
  void [fields, documents, next, first, stream, listen, name, checked, matched];
}
const token: protos.google.firestore.v1.IListenResponse = {targetChange: {resumeToken: new Uint8Array([1])}};
const admin2: FirestoreAdminClient = admin;
void [same, endpoint, calls, token, admin2];
// @ts-expect-error routed names are strings
client.getDocument({name: 1});
// @ts-expect-error bidirectional streams take only options
client.write({database: 'd'});
