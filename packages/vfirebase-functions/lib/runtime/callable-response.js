'use strict';
const logger = require('../logger/index.js');
const {HttpsError} = require('./callable-error.js'), {encode} = require('./callable-codec.js');
const DEFAULT_HEARTBEAT_SECONDS = 30;
const event = value => `data: ${JSON.stringify(value)}\n\n`;

// One response owns its cancellation signal, heartbeat and listener cleanup.
// User callbacks cannot keep writing after the invocation has completed.
class CallableResponse {
  constructor(response, streaming, heartbeatSeconds) {
    this.response = response;
    this.streaming = streaming;
    this.delay = heartbeatSeconds === undefined ? DEFAULT_HEARTBEAT_SECONDS : heartbeatSeconds;
    this.controller = new AbortController();
    this.closed = false;
    this.timer = null;
    this.disconnect = () => {this.controller.abort(); this.stopHeartbeat();};
    response.on('close', this.disconnect);
    this.proxy = {signal: this.controller.signal, sendChunk: value => this.sendChunk(value)};
  }
  stopHeartbeat() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
  heartbeat() {
    this.stopHeartbeat();
    if (this.closed || this.controller.signal.aborted || !(this.delay > 0)) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.closed || this.controller.signal.aborted) return;
      try { this.response.write(': ping\n\n'); this.heartbeat(); }
      catch { this.disconnect(); }
    }, this.delay * 1000);
  }
  start() {
    if (this.streaming) {this.response.status(200); this.heartbeat();}
  }
  sendChunk(value) {
    if (!this.streaming || this.closed || this.controller.signal.aborted) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
      const signal = this.controller.signal;
      const finish = (error, value) => {
        signal.removeEventListener('abort', cancel);
        if (error) reject(error); else resolve(value);
      };
      const cancel = () => finish(null, false);
      signal.addEventListener('abort', cancel, {once: true});
      // Real streams call back asynchronously, but custom responses may call
      // back inside write(). Settle only after its return value is available.
      let returned = false, callbackSeen = false, callbackError, wrote;
      try {
        wrote = this.response.write(event({message: value}), error => {
          callbackSeen = true;
          callbackError = error;
          if (returned) finish(error, wrote);
        });
        returned = true;
        if (callbackSeen) finish(callbackError, wrote);
        if (wrote) this.heartbeat();
      } catch (error) {finish(error);}
    });
  }
  result(value) {
    if (this.controller.signal.aborted) return this.response.end();
    this.send({result: encode(value)}, 200);
  }
  error(error) {
    if (this.controller.signal.aborted) return this.response.end();
    if (!(error instanceof HttpsError)) {
      logger.error('Unhandled error', error);
      error = new HttpsError('internal', 'INTERNAL');
    }
    this.send({error: error.toJSON()}, error.httpErrorCode.status);
  }
  send(body, status) {
    this.stopHeartbeat();
    if (this.streaming) {this.response.write(event(body)); this.response.end();}
    else this.response.status(status).send(body);
  }
  dispose() {
    this.closed = true;
    this.stopHeartbeat();
    this.response.removeListener('close', this.disconnect);
  }
}
module.exports = {CallableResponse, DEFAULT_HEARTBEAT_SECONDS};
