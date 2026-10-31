import * as v1 from './v1';
import {FirestoreClient, FirestoreAdminClient} from './v1';
import * as protos from './protos/protos';

export {v1, FirestoreClient, FirestoreAdminClient, protos};
declare const api: {
  v1: typeof v1;
  FirestoreClient: typeof FirestoreClient;
  FirestoreAdminClient: typeof FirestoreAdminClient;
};
export default api;
