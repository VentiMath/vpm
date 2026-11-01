'use strict';
const lazy = (name, file, member) => Object.defineProperty(exports, name, {enumerable: true, get() {return require(file)[member];}});
for (const name of ['ai', 'alerts', 'database', 'dataconnect', 'eventarc', 'firestore', 'https', 'identity', 'pubsub', 'remoteConfig', 'scheduler', 'storage', 'tasks', 'testLab']) {
  const directory = ['ai', 'alerts', 'dataconnect'].includes(name) ? name + '/index' : name;
  lazy(name, './providers/' + directory + '.js', name + '_exports');
}
for (const [name, file, member = name] of [
  ['Change', '../common/change.js'], ['logger', '../logger/index.js'], ['onInit', '../common/onInit.js'],
  ['params', '../params/index.js', 'params_exports'], ['config', '../v1/config.js'],
  ['requiresAPI', '../common/api.js'], ['requiresRole', './security.js'], ['setGlobalOptions', './options.js'],
  ['traceContext', '../common/trace.js'],
]) lazy(name, file, member);
exports.app = {setEmulatedAdminApp: require('../common/app.js').setApp};
