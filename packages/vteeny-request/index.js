'use strict';
const {PassThrough, Transform} = require('node:stream');
const fetch = require('vnode-fetch'), streamEvents = require('vstream-events');
const agents = require('./lib/agents'), {normalize, cloneHeaders, setHeader, snapshot} = require('./lib/options');
const {TeenyStatistics} = require('./lib/statistics');
class RequestError extends Error {}
function privateError(error, override) {
  if (override) return override;
  const type = error?.type || (error?.name === 'AbortError' ? 'aborted' : 'system');
  const messages = {'invalid-json': 'invalid json response body', 'aborted': 'Request aborted', 'max-size': 'Response body over limit', 'unsupported-redirect': 'Cannot replay a streamed request body', 'max-redirect': 'Too many redirects'};
  const value = new RequestError(messages[type] || 'HTTP request failed');
  value.name = type === 'aborted' ? 'AbortError' : 'RequestError'; value.type = type;
  if (typeof error?.code === 'number' || typeof error?.code === 'string' && /^[A-Z\d_]+$/.test(error.code)) value.code = error.code;
  return value;
}
function responseRecord(config, session, res) {
  const headers = Object.fromEntries(Object.entries(res.headers.raw()).map(([key, values]) => [key.toLowerCase(), values.join(', ')]));
  return Object.assign(res.body, {statusCode: res.status, statusMessage: res.statusText, headers, body: res.body,
    request: {agent: session.agent, headers: config.headers, href: res.url}, toJSON: () => ({headers})});
}
function teenyRequest(input, callback) {
  const config = normalize(input, callback), options = config.options;
  if (options.multipart !== undefined) {if (!callback) throw new TypeError('Multipart without callback is not implemented.'); const part = require('./lib/multipart')(options.multipart); config.body = part.body; setHeader(config.headers, 'Content-Type', part.type);}
  const session = agents.session(options), controller = new AbortController(), stats = teenyRequest.stats;
  let output, response, responseBody, timer, failure, stopReading, finished = false, statsFinished = false, reading = false, piping = false;
  const finishStats = () => {if (!statsFinished) {statsFinished = true; stats.requestFinished();}};
  const cleanup = () => {if (finished) return; finished = true; stopReading?.(); clearTimeout(timer); options.signal?.removeEventListener('abort', externalAbort); finishStats(); session.close();};
  const cancel = error => {failure ||= error; controller.abort(); if (responseBody && !responseBody.destroyed) responseBody.destroy(); if (config.body?.destroy && !config.body.destroyed) config.body.destroy();};
  const fail = error => {
    if (finished) return;
    const safe = privateError(error, failure); cancel(safe);
    if (callback) {cleanup(); process.nextTick(callback, safe, response || null, responseBody || null);}
    else output.destroy(safe);
  };
  const externalAbort = () => fail(Object.assign(new Error(), {name: 'AbortError', code: 'ABORT_ERR'}));
  const pipe = () => {
    if (!responseBody || !reading || piping || output.destroyed) return; piping = true;
    if (responseBody.readableEnded) {output.end(); return;}
    if (config.size) {
      let count = 0;
      const limiter = new Transform({transform(chunk, encoding, done) {count += chunk.length; done(count > config.size ? privateError({type: 'max-size'}) : null, chunk);}});
      limiter.on('error', fail); output.once('close', () => limiter.destroy()); responseBody.pipe(limiter).pipe(output);
    } else responseBody.pipe(output);
  };
  if (!callback) {
    output = streamEvents(new PassThrough({destroy(error, done) {if (!responseBody?.readableEnded) cancel(error || privateError({type: 'aborted'})); cleanup(); done(error);}}));
    output.once('reading', () => {reading = true; pipe();});
    output.abort = () => output.destroy(privateError({type: 'aborted', code: 'ABORT_ERR'}));
  }
  stats.requestStarting();
  if (options.signal?.aborted) {process.nextTick(externalAbort); return output;}
  options.signal?.addEventListener('abort', externalAbort, {once: true});
  if (config.timeout) timer = setTimeout(() => {const error = new RequestError('Request deadline exceeded'); error.code = 'ETIMEDOUT'; error.type = 'request-timeout'; error.name = 'AbortError'; failure = error; fail(error);}, config.timeout);
  const init = {method: options.method || 'GET', headers: config.headers, body: config.body, compress: callback ? options.gzip !== false : false,
    agent: url => session.select(new URL(url.href)), signal: controller.signal, size: config.size};
  fetch(config.url, init).then(res => {
    if (finished || output?.destroyed) {res.body?.destroy(); return;}
    responseBody = res.body; finishStats();
    response = responseRecord(config, session, res);
    if (callback) {
      const json = /^application\/json(?:\s*;|$)/i.test(res.headers.get('content-type') || '');
      if (res.status === 204 && json) {
        responseBody.once('end', () => {if (finished) return; cleanup(); process.nextTick(callback, null, response, responseBody);});
        responseBody.once('error', fail); responseBody.resume(); return;
      }
      stopReading = require('./lib/read')(responseBody, config.size, json, body => {if (finished) return; response.body = body; cleanup(); process.nextTick(callback, null, response, body);}, fail);
    } else {
      responseBody.on('error', fail);
      responseBody.once('close', () => {if (!responseBody.readableEnded && !finished) fail(Object.assign(new Error(), {code: 'ERR_STREAM_PREMATURE_CLOSE'}));});
      try {output.emit('response', response); pipe();} catch (error) {fail(error);}
    }
  }).catch(fail);
  return output;
}
teenyRequest.defaults = defaults => {
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) throw new TypeError('Defaults must be an object');
  const stored = snapshot(defaults); stored.headers = cloneHeaders(defaults.headers);
  return (options, callback) => teenyRequest({...stored, ...options}, callback);
};
teenyRequest.stats = new TeenyStatistics();
teenyRequest.resetStats = () => {teenyRequest.stats = new TeenyStatistics(teenyRequest.stats.getOptions());};
teenyRequest.close = agents.close;
module.exports = {teenyRequest, RequestError};
