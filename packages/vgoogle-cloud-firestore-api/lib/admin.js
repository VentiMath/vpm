'use strict';
const {defineClient} = require('./client');
const {admin} = require('./services');

module.exports = defineClient({
  ...admin,
  json: require('../protos/protos.json'),
  config: require('../v1/firestore_admin_client_config.json'),
});
