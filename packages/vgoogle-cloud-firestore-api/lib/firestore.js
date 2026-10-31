'use strict';
const {defineClient} = require('./client');
const {firestore} = require('./services');

module.exports = defineClient({
  ...firestore,
  json: require('../protos/protos.json'),
  config: require('../v1/firestore_client_config.json'),
});
