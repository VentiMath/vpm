'use strict';
// Method tables for the Firestore services, from @google-cloud/firestore-api
// 0.7.1 (Apache-2.0, Google LLC). Routing rules, pagination fields and
// long-running operation types match the generated clients. Data only:
// client.js implements the behavior and scripts/build-firestore-api.cjs
// generates the TypeScript declarations from these tables.
const scopes = ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/datastore'];

exports.firestore = {
  className: 'FirestoreClient',
  service: 'google.firestore.v1.Firestore',
  stubProperty: 'firestoreStub',
  scopes,
  methods: [
    {name: 'getDocument', kind: 'unary', routing: [['name', 'name']]},
    {name: 'listDocuments', kind: 'paged', routing: [['parent', 'parent'], ['collection_id', 'collectionId']], resources: 'documents'},
    {name: 'updateDocument', kind: 'unary', routing: [['document.name', 'document.name']]},
    {name: 'deleteDocument', kind: 'unary', routing: [['name', 'name']]},
    {name: 'batchGetDocuments', kind: 'server', routing: [['database', 'database']]},
    {name: 'beginTransaction', kind: 'unary', routing: [['database', 'database']]},
    {name: 'commit', kind: 'unary', routing: [['database', 'database']]},
    {name: 'rollback', kind: 'unary', routing: [['database', 'database']]},
    {name: 'runQuery', kind: 'server', routing: [['parent', 'parent']]},
    {name: 'executePipeline', kind: 'server', routing: {from: 'database', regex: [[/projects\/(?<project_id>[^\/]+)(?:\/.*)?/, 'project_id'], [/projects\/[^\/]+\/databases\/(?<database_id>[^\/]+)(?:\/.*)?/, 'database_id']]}},
    {name: 'runAggregationQuery', kind: 'server', routing: [['parent', 'parent']]},
    {name: 'partitionQuery', kind: 'paged', routing: [['parent', 'parent']], resources: 'partitions'},
    {name: 'write', kind: 'bidi'},
    {name: 'listen', kind: 'bidi'},
    {name: 'listCollectionIds', kind: 'paged', routing: [['parent', 'parent']], resources: 'collectionIds'},
    {name: 'batchWrite', kind: 'unary', routing: [['database', 'database']]},
    {name: 'createDocument', kind: 'unary', routing: [['parent', 'parent'], ['collection_id', 'collectionId']]},
  ],
};

exports.admin = {
  className: 'FirestoreAdminClient',
  service: 'google.firestore.admin.v1.FirestoreAdmin',
  stubProperty: 'firestoreAdminStub',
  scopes,
  methods: [
    {name: 'createIndex', kind: 'lro', routing: [['parent', 'parent']], response: '.google.firestore.admin.v1.Index', metadata: '.google.firestore.admin.v1.IndexOperationMetadata'},
    {name: 'listIndexes', kind: 'paged', routing: [['parent', 'parent']], resources: 'indexes'},
    {name: 'getIndex', kind: 'unary', routing: [['name', 'name']]},
    {name: 'deleteIndex', kind: 'unary', routing: [['name', 'name']]},
    {name: 'getField', kind: 'unary', routing: [['name', 'name']]},
    {name: 'updateField', kind: 'lro', routing: [['field.name', 'field.name']], response: '.google.firestore.admin.v1.Field', metadata: '.google.firestore.admin.v1.FieldOperationMetadata'},
    {name: 'listFields', kind: 'paged', routing: [['parent', 'parent']], resources: 'fields'},
    {name: 'exportDocuments', kind: 'lro', routing: [['name', 'name']], response: '.google.firestore.admin.v1.ExportDocumentsResponse', metadata: '.google.firestore.admin.v1.ExportDocumentsMetadata'},
    {name: 'importDocuments', kind: 'lro', routing: [['name', 'name']], response: '.google.protobuf.Empty', metadata: '.google.firestore.admin.v1.ImportDocumentsMetadata'},
    {name: 'bulkDeleteDocuments', kind: 'lro', routing: [['name', 'name']], response: '.google.firestore.admin.v1.BulkDeleteDocumentsResponse', metadata: '.google.firestore.admin.v1.BulkDeleteDocumentsMetadata'},
    {name: 'createDatabase', kind: 'lro', routing: [['parent', 'parent']], response: '.google.firestore.admin.v1.Database', metadata: '.google.firestore.admin.v1.CreateDatabaseMetadata'},
    {name: 'getDatabase', kind: 'unary', routing: [['name', 'name']]},
    {name: 'listDatabases', kind: 'unary', routing: [['parent', 'parent']]},
    {name: 'updateDatabase', kind: 'lro', routing: [['database.name', 'database.name']], response: '.google.firestore.admin.v1.Database', metadata: '.google.firestore.admin.v1.UpdateDatabaseMetadata'},
    {name: 'deleteDatabase', kind: 'lro', routing: [['name', 'name']], response: '.google.firestore.admin.v1.Database', metadata: '.google.firestore.admin.v1.DeleteDatabaseMetadata'},
    {name: 'createUserCreds', kind: 'unary', routing: [['parent', 'parent']]},
    {name: 'getUserCreds', kind: 'unary', routing: [['name', 'name']]},
    {name: 'listUserCreds', kind: 'unary', routing: [['parent', 'parent']]},
    {name: 'enableUserCreds', kind: 'unary', routing: [['name', 'name']]},
    {name: 'disableUserCreds', kind: 'unary', routing: [['name', 'name']]},
    {name: 'resetUserPassword', kind: 'unary', routing: [['name', 'name']]},
    {name: 'deleteUserCreds', kind: 'unary', routing: [['name', 'name']]},
    {name: 'getBackup', kind: 'unary', routing: [['name', 'name']]},
    {name: 'listBackups', kind: 'unary', routing: [['parent', 'parent']]},
    {name: 'deleteBackup', kind: 'unary', routing: [['name', 'name']]},
    {name: 'restoreDatabase', kind: 'lro', routing: [['parent', 'parent']], response: '.google.firestore.admin.v1.Database', metadata: '.google.firestore.admin.v1.RestoreDatabaseMetadata'},
    {name: 'createBackupSchedule', kind: 'unary', routing: [['parent', 'parent']]},
    {name: 'getBackupSchedule', kind: 'unary', routing: [['name', 'name']]},
    {name: 'listBackupSchedules', kind: 'unary', routing: [['parent', 'parent']]},
    {name: 'updateBackupSchedule', kind: 'unary', routing: [['backup_schedule.name', 'backupSchedule.name']]},
    {name: 'deleteBackupSchedule', kind: 'unary', routing: [['name', 'name']]},
    {name: 'cloneDatabase', kind: 'lro', routing: {from: 'pitrSnapshot.database', regex: [[/projects\/(?<project_id>[^\/]+)(?:\/.*)?/, 'project_id'], [/projects\/[^\/]+\/databases\/(?<database_id>[^\/]+)(?:\/.*)?/, 'database_id']]}, response: '.google.firestore.admin.v1.Database', metadata: '.google.firestore.admin.v1.CloneDatabaseMetadata'},
  ],
  pathTemplates: [
    ['backup', 'projects/{project}/locations/{location}/backups/{backup}', ['project', 'location', 'backup']],
    ['backupSchedule', 'projects/{project}/databases/{database}/backupSchedules/{backup_schedule}', ['project', 'database', 'backupSchedule']],
    ['collectionGroup', 'projects/{project}/databases/{database}/collectionGroups/{collection}', ['project', 'database', 'collection']],
    ['database', 'projects/{project}/databases/{database}', ['project', 'database']],
    ['field', 'projects/{project}/databases/{database}/collectionGroups/{collection}/fields/{field}', ['project', 'database', 'collection', 'field']],
    ['index', 'projects/{project}/databases/{database}/collectionGroups/{collection}/indexes/{index}', ['project', 'database', 'collection', 'index']],
    ['location', 'projects/{project}/locations/{location}', ['project', 'location']],
    ['project', 'projects/{project}', ['project']],
    ['userCreds', 'projects/{project}/databases/{database}/userCreds/{user_creds}', ['project', 'database', 'userCreds']],
  ],
  // REST bindings for the long-running operations service.
  longRunning: {
    httpRules: [
      {selector: 'google.longrunning.Operations.CancelOperation', post: '/v1/{name=projects/*/databases/*/operations/*}:cancel', body: '*'},
      {selector: 'google.longrunning.Operations.DeleteOperation', delete: '/v1/{name=projects/*/databases/*/operations/*}'},
      {selector: 'google.longrunning.Operations.GetOperation', get: '/v1/{name=projects/*/databases/*/operations/*}'},
      {selector: 'google.longrunning.Operations.ListOperations', get: '/v1/{name=projects/*/databases/*}/operations'},
    ],
  },
};
