'use strict';
const logger = require('../../logger/index.js');
const debug = require('../debug.js');
const {Expression} = require('../../params/types.js');
const auth = require('../../runtime/callable-auth.js');
const codec = require('../../runtime/callable-codec.js');
const {HttpsError} = require('../../runtime/callable-error.js');
const {CallableResponse, DEFAULT_HEARTBEAT_SECONDS} = require('../../runtime/callable-response.js');
const cors = require('vcors');
const CALLABLE_AUTH_HEADER = 'x-callable-context-auth', ORIGINAL_AUTH_HEADER = 'x-original-auth';

function isValidRequest(request) {
  const {body, method} = request;
  if (!body) {logger.warn('Request is missing body.'); return false;}
  if (method !== 'POST') {logger.warn('Request has invalid method.', method); return false;}
  const rawType = (request.header('Content-Type') || '').toLowerCase();
  const semicolon = rawType.indexOf(';');
  const contentType = semicolon < 0 ? rawType : rawType.slice(0, semicolon).trim();
  if (contentType !== 'application/json') {logger.warn('Request has incorrect Content-Type.', contentType); return false;}
  if (!Object.hasOwn(body, 'data') || body.data === undefined) {logger.warn('Request body is missing data.', body); return false;}
  const extras = Object.keys(body).filter(key => key !== 'data');
  if (extras.length) {logger.warn('Request body has extra fields: ', extras.join(', ')); return false;}
  return true;
}
function resolveCorsOrigin(option) {
  if (option instanceof Expression) {
    try {option = option.runtimeValue();}
    catch (error) {logger.warn(`Failed to resolve CORS parameter: ${error}`); return false;}
  }
  if (option === '' || (Array.isArray(option) && !option.length)) {
    logger.warn(`CORS parameter resolved to an empty ${option === '' ? 'string' : 'array'}. Disabling CORS.`);
    return false;
  }
  if (option !== false && debug.isDebugFeatureEnabled('enableCors')) return true;
  if (option === undefined) return true;
  return Array.isArray(option) && option.length === 1 ? option[0] : option;
}
function emulatorContext(request, context, version) {
  if (version !== 'gcfv1' || !debug.isDebugFeatureEnabled('skipTokenVerification')) return;
  const override = request.header(CALLABLE_AUTH_HEADER), original = request.header(ORIGINAL_AUTH_HEADER);
  if (override) {
    logger.debug('Callable functions auth override', {key: CALLABLE_AUTH_HEADER, value: override});
    context.auth = JSON.parse(decodeURIComponent(override));
    delete request.headers[CALLABLE_AUTH_HEADER];
  }
  if (original) {
    request.headers.authorization = original;
    delete request.headers[ORIGINAL_AUTH_HEADER];
  }
}
async function invoke(request, response, options, handler, version) {
  const streaming = request.header('accept') === 'text/event-stream';
  const channel = new CallableResponse(response, streaming && version === 'gcfv2', options.heartbeatSeconds);
  try {
    if (!isValidRequest(request)) {
      logger.error('Invalid request, unable to process.');
      throw new HttpsError('invalid-argument', 'Bad Request');
    }
    const context = {rawRequest: request};
    emulatorContext(request, context, version);
    await auth.authenticate(request, context, options);
    const instance = request.header('Firebase-Instance-ID-Token');
    if (instance) context.instanceIdToken = instance;
    if (streaming && version === 'gcfv1') throw new HttpsError('invalid-argument', "Unsupported Accept header 'text/event-stream'");
    const data = codec.decode(request.body.data);
    if (options.authPolicy && !await options.authPolicy(context.auth ?? null, data)) throw new HttpsError('permission-denied', 'Permission Denied');
    channel.start();
    const result = version === 'gcfv1' ? await handler(data, context)
      : await handler({...context, data, acceptsStreaming: streaming}, channel.proxy);
    channel.result(result);
  } catch (error) {channel.error(error);}
  finally {channel.dispose();}
}
function onCallHandler(options, handler, version) {
  return (request, response) => new Promise((resolve, reject) => {
    const settle = error => {
      response.removeListener('finish', finished);
      response.removeListener('close', finished);
      if (error) reject(error); else resolve();
    };
    const finished = () => settle();
    response.on('finish', finished);
    response.on('close', finished);
    try {
      cors({...options.cors, origin: resolveCorsOrigin(options.cors.origin)})(request, response, error => {
        if (error) return settle(error);
        invoke(request, response, options, handler, version).then(finished, settle);
      });
    } catch (error) {settle(error);}
  });
}
function withErrorHandler(handler) {
  return async (request, response) => {
    try {await handler(request, response);}
    catch (error) {
      logger.error('Unhandled error', error);
      if (!response.headersSent) response.status(500).send('Internal Server Error');
    }
  };
}
module.exports = {CALLABLE_AUTH_HEADER, ORIGINAL_AUTH_HEADER, DEFAULT_HEARTBEAT_SECONDS, HttpsError,
  checkAuthToken: auth.checkAuthToken, encode: codec.encode, decode: codec.decode, isValidRequest,
  onCallHandler, resolveCorsOrigin, unsafeDecodeToken: auth.unsafeDecodeToken,
  unsafeDecodeIdToken: auth.unsafeDecodeIdToken, unsafeDecodeAppCheckToken: auth.unsafeDecodeAppCheckToken, withErrorHandler};
