// Bun hands `import x from` an __esModule CommonJS module's `default` export,
// Node hands it module.exports; require the CommonJS entry so both agree.
import {createRequire} from 'node:module';

const api = createRequire(import.meta.url)('./index.js');
export default api.default;
export const v1 = api.v1;
export const {FirestoreClient, FirestoreAdminClient} = api.v1;
export const protos = api.protos;
