'use strict';
// Cloud Firestore API clients. Nothing heavy loads at import: each client
// loads when first used, and `protos` (the 1.3 MB static message module)
// loads only when accessed.
const lazy = require('./lib/lazy');
const v1 = require('./v1');
Object.defineProperty(exports, '__esModule', {value: true});
exports.v1 = v1;
lazy(exports, 'FirestoreAdminClient', () => v1.FirestoreAdminClient);
lazy(exports, 'FirestoreClient', () => v1.FirestoreClient);
lazy(exports, 'protos', () => require('./protos/protos'));
const defaults = {v1};
lazy(defaults, 'FirestoreAdminClient', () => v1.FirestoreAdminClient);
lazy(defaults, 'FirestoreClient', () => v1.FirestoreClient);
exports.default = defaults;
