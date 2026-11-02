'use strict';
const {getApp} = require('../app');
const {Messaging} = require('./messaging');
const {FirebaseMessagingError, MessagingErrorCode} = require('./error');
function getMessaging(app = getApp()) {
  return app.getOrInitService('messaging', owner => new Messaging(owner));
}
Object.assign(exports, {getMessaging, Messaging, FirebaseMessagingError, MessagingErrorCode});
