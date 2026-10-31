const require_common_trace = require('../common/trace.js');
const require_logger_index = require('../logger/index.js');
const require_common_api = require('../common/api.js');
const require_common_app = require('../common/app.js');
const require_common_change = require('../common/change.js');
const require_params_index = require('../params/index.js');
const require_common_onInit = require('../common/onInit.js');
const require_v1_config = require('../v1/config.js');
require('./core.js');
const require_v2_security = require('./security.js');
const require_v2_options = require('./options.js');
const require_v2_providers_dataconnect_index = require('../_virtual/lazy.js').lazy(() => require('./providers/dataconnect/index.js'));
const require_v2_providers_https = require('../_virtual/lazy.js').lazy(() => require('./providers/https.js'));
const require_v2_providers_ai_index = require('../_virtual/lazy.js').lazy(() => require('./providers/ai/index.js'));
const require_v2_providers_alerts_index = require('../_virtual/lazy.js').lazy(() => require('./providers/alerts/index.js'));
const require_v2_providers_database = require('../_virtual/lazy.js').lazy(() => require('./providers/database.js'));
const require_v2_providers_eventarc = require('../_virtual/lazy.js').lazy(() => require('./providers/eventarc.js'));
const require_v2_providers_identity = require('../_virtual/lazy.js').lazy(() => require('./providers/identity.js'));
const require_v2_providers_pubsub = require('../_virtual/lazy.js').lazy(() => require('./providers/pubsub.js'));
const require_v2_providers_scheduler = require('../_virtual/lazy.js').lazy(() => require('./providers/scheduler.js'));
const require_v2_providers_storage = require('../_virtual/lazy.js').lazy(() => require('./providers/storage.js'));
const require_v2_providers_tasks = require('../_virtual/lazy.js').lazy(() => require('./providers/tasks.js'));
const require_v2_providers_remoteConfig = require('../_virtual/lazy.js').lazy(() => require('./providers/remoteConfig.js'));
const require_v2_providers_testLab = require('../_virtual/lazy.js').lazy(() => require('./providers/testLab.js'));
const require_v2_providers_firestore = require('../_virtual/lazy.js').lazy(() => require('./providers/firestore.js'));

//#region src/v2/index.ts
const app = { setEmulatedAdminApp: require_common_app.setApp };

//#endregion
exports.Change = require_common_change.Change;
Object.defineProperty(exports, 'ai', {
  enumerable: true,
  get: function () {
    return require_v2_providers_ai_index.ai_exports;
  }
});
Object.defineProperty(exports, 'alerts', {
  enumerable: true,
  get: function () {
    return require_v2_providers_alerts_index.alerts_exports;
  }
});
exports.app = app;
exports.config = require_v1_config.config;
Object.defineProperty(exports, 'database', {
  enumerable: true,
  get: function () {
    return require_v2_providers_database.database_exports;
  }
});
Object.defineProperty(exports, 'dataconnect', {
  enumerable: true,
  get: function () {
    return require_v2_providers_dataconnect_index.dataconnect_exports;
  }
});
Object.defineProperty(exports, 'eventarc', {
  enumerable: true,
  get: function () {
    return require_v2_providers_eventarc.eventarc_exports;
  }
});
Object.defineProperty(exports, 'firestore', {
  enumerable: true,
  get: function () {
    return require_v2_providers_firestore.firestore_exports;
  }
});
Object.defineProperty(exports, 'https', {
  enumerable: true,
  get: function () {
    return require_v2_providers_https.https_exports;
  }
});
Object.defineProperty(exports, 'identity', {
  enumerable: true,
  get: function () {
    return require_v2_providers_identity.identity_exports;
  }
});
exports.logger = require_logger_index.logger;
exports.onInit = require_common_onInit.onInit;
Object.defineProperty(exports, 'params', {
  enumerable: true,
  get: function () {
    return require_params_index.params_exports;
  }
});
Object.defineProperty(exports, 'pubsub', {
  enumerable: true,
  get: function () {
    return require_v2_providers_pubsub.pubsub_exports;
  }
});
Object.defineProperty(exports, 'remoteConfig', {
  enumerable: true,
  get: function () {
    return require_v2_providers_remoteConfig.remoteConfig_exports;
  }
});
exports.requiresAPI = require_common_api.requiresAPI;
exports.requiresRole = require_v2_security.requiresRole;
Object.defineProperty(exports, 'scheduler', {
  enumerable: true,
  get: function () {
    return require_v2_providers_scheduler.scheduler_exports;
  }
});
exports.setGlobalOptions = require_v2_options.setGlobalOptions;
Object.defineProperty(exports, 'storage', {
  enumerable: true,
  get: function () {
    return require_v2_providers_storage.storage_exports;
  }
});
Object.defineProperty(exports, 'tasks', {
  enumerable: true,
  get: function () {
    return require_v2_providers_tasks.tasks_exports;
  }
});
Object.defineProperty(exports, 'testLab', {
  enumerable: true,
  get: function () {
    return require_v2_providers_testLab.testLab_exports;
  }
});
exports.traceContext = require_common_trace.traceContext;