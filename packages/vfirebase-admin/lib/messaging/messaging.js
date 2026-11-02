'use strict';

const send = require('./message-send');
const topics = require('./topic-management');
const {Http2SessionHandler} = require('../utils/api-request');
const {FirebaseMessagingRequestHandler} = require('./messaging-api-request-internal');
const {FirebaseMessagingError, messagingClientErrorCode: codes} = require('./error');

// A service owns its app identity and active sessions. Sending, validation and
// wire response handling live in separate modules with the same lifetime boundary.
class Messaging {
  #app;
  #closed = false;
  #sessions = new Set();
  constructor(app) {
    if (!app || typeof app !== 'object' || Array.isArray(app) || !('options' in app)) throw new FirebaseMessagingError(codes.INVALID_ARGUMENT,
      'First argument passed to admin.messaging() must be a valid Firebase app instance.');
    this.#app = app;
    this.useLegacyTransport = false;
    this.messagingRequestHandler = new FirebaseMessagingRequestHandler(app);
  }
  get app() {return this.#app;}
  assertActive() {if (this.#closed) throw new FirebaseMessagingError(codes.INVALID_ARGUMENT, 'Messaging service has been deleted.');}
  openSession() {
    this.assertActive();
    const session = new Http2SessionHandler('https://fcm.googleapis.com');
    this.#sessions.add(session);
    return session;
  }
  closeSession(session) {if (this.#sessions.delete(session)) session.close();}
  delete() {
    this.#closed = true;
    const failures = [];
    for (const session of this.#sessions) {try {this.closeSession(session);} catch (error) {failures.push(error);}}
    return failures.length ? Promise.reject(new AggregateError(failures, 'Messaging session cleanup failed.')) : Promise.resolve();
  }
  enableLegacyHttpTransport() {this.assertActive(); this.useLegacyTransport = true;}
  send(message, dryRun) {this.assertActive(); return send.send(this, message, dryRun);}
  sendEach(messages, dryRun) {this.assertActive(); return send.sendEach(this, messages, dryRun);}
  sendEachForMulticast(message, dryRun) {this.assertActive(); return send.multicast(this, message, dryRun);}
  getProjectId() {this.assertActive(); return send.projectId(this);}
  getUrlPath() {this.assertActive(); return send.urlPath(this);}
  parseSendResponses(results, errors = []) {return send.collect(results, errors);}
  createSessionError(reason, errors) {return send.sessionError(reason, errors);}
  parseTopicManagementResponses(results, errors = []) {return topics.collect(results, errors);}
  subscribeToTopic(tokens, topic) {this.assertActive(); return topics.send(this, tokens, topic, 'subscribeToTopic');}
  unsubscribeFromTopic(tokens, topic) {this.assertActive(); return topics.send(this, tokens, topic, 'unsubscribeFromTopic');}
  subscribeToTopicLegacy(tokens, topic) {this.assertActive(); return topics.legacy(this, tokens, topic, 'subscribeToTopicLegacy', true);}
  unsubscribeFromTopicLegacy(tokens, topic) {this.assertActive(); return topics.legacy(this, tokens, topic, 'unsubscribeFromTopicLegacy', false);}
}
exports.Messaging = Messaging;
