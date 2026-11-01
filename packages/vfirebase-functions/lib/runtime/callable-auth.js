'use strict';
const logger = require('../logger/index.js'), debug = require('../common/debug.js');
const app = require('../common/app.js');
const {HttpsError} = require('./callable-error.js');

// These decoders deliberately do not authenticate. The only request path that
// uses them is the SDK's explicitly enabled emulator/debug feature.
function unsafeDecodeToken(token) {
  if (typeof token !== 'string' || !/^[a-zA-Z0-9_=-]+\.[a-zA-Z0-9_=-]+\.([a-zA-Z0-9_=-]+)?$/.test(token)) return {};
  const payload = Buffer.from(token.split('.')[1], 'base64url').toString();
  try {
    const parsed = JSON.parse(payload);
    return parsed !== null && typeof parsed === 'object' ? parsed : payload;
  } catch { return payload; }
}
function unsafeSubject(token, name) {
  const decoded = unsafeDecodeToken(token);
  if (decoded !== null && typeof decoded === 'object') decoded[name] = decoded.sub;
  return decoded;
}
const unsafeDecodeIdToken = token => unsafeSubject(token, 'uid');
const unsafeDecodeAppCheckToken = token => unsafeSubject(token, 'app_id');

async function checkAuthToken(request, context) {
  const header = request.header('Authorization');
  if (!header) return 'MISSING';
  const match = /^Bearer (.*)$/i.exec(header);
  if (!match) return 'INVALID';
  try {
    const token = debug.isDebugFeatureEnabled('skipTokenVerification') ? unsafeDecodeIdToken(match[1])
      : await require('vfirebase-admin/auth').getAuth(app.getApp()).verifyIdToken(match[1]);
    context.auth = {uid: token.uid, token, rawToken: match[1]};
    return 'VALID';
  } catch (error) {
    logger.warn('Failed to validate auth token.', error);
    return 'INVALID';
  }
}
async function checkAppToken(request, context, options) {
  const token = request.header('X-Firebase-AppCheck');
  if (!token) return 'MISSING';
  try {
    if (debug.isDebugFeatureEnabled('skipTokenVerification')) {
      const decoded = unsafeDecodeAppCheckToken(token);
      context.app = {appId: decoded.app_id, token: decoded};
      if (options.consumeAppCheckToken) context.app.alreadyConsumed = false;
    } else {
      const verifier = require('vfirebase-admin/app-check').getAppCheck(app.getApp());
      if (options.consumeAppCheckToken && verifier.verifyToken?.length === 1) {
        logger.error('Unsupported version of the Admin SDK. App Check token will not be consumed. Please upgrade the firebase-admin to the latest version.');
        throw new HttpsError('internal', 'Internal Error');
      }
      context.app = options.consumeAppCheckToken
        ? await verifier.verifyToken(token, {consume: true}) : await verifier.verifyToken(token);
    }
    return 'VALID';
  } catch (error) {
    logger.warn('Failed to validate AppCheck token.', error);
    if (error instanceof HttpsError) throw error;
    return 'INVALID';
  }
}
async function authenticate(request, context, options) {
  const [auth, appStatus] = await Promise.all([checkAuthToken(request, context), checkAppToken(request, context, options)]);
  const payload = {verifications: {app: appStatus, auth}, 'logging.googleapis.com/labels': {'firebase-log-type': 'callable-request-verification'}};
  const rejected = [];
  if (appStatus === 'INVALID') rejected.push('AppCheck token was rejected.');
  if (auth === 'INVALID') rejected.push('Auth token was rejected.');
  if (rejected.length) logger.warn(`Callable request verification failed: ${rejected.join(' ')}`, payload);
  else logger.debug('Callable request verification passed', payload);
  if (auth === 'INVALID' || (options.enforceAppCheck && appStatus !== 'VALID')) throw new HttpsError('unauthenticated', 'Unauthenticated');
  if (appStatus === 'INVALID') logger.warn('Allowing request with invalid AppCheck token because enforcement is disabled');
}
module.exports = {authenticate, checkAuthToken, unsafeDecodeToken, unsafeDecodeIdToken, unsafeDecodeAppCheckToken};
