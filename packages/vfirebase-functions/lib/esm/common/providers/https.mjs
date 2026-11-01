import api from '../../../common/providers/https.js';
export const {CALLABLE_AUTH_HEADER, ORIGINAL_AUTH_HEADER, DEFAULT_HEARTBEAT_SECONDS, HttpsError,
  checkAuthToken, encode, decode, isValidRequest, onCallHandler, resolveCorsOrigin,
  unsafeDecodeToken, unsafeDecodeIdToken, unsafeDecodeAppCheckToken, withErrorHandler} = api;
