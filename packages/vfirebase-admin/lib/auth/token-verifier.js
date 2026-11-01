/*! firebase-admin v14.5.0 */
"use strict";
/*!
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Source-informed diagnostic and token metadata; verification orchestration
// and claim policy are implemented independently. Crypto/key retrieval remain
// in the separately attributed utils/jwt adapter.
Object.defineProperty(exports, "__esModule", {value: true});
const {FirebaseAuthError, authClientErrorCode: codes} = require('./error');
const validator = require('../utils/validator');
const util = require('../utils/index');
const jwt = require('../utils/jwt');
const {TokenPolicy} = require('./token-policy');
const certificateUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const sessionCertificateUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys';
const emulatorVerifier = new jwt.EmulatorSignatureVerifier();
const argument = message => new FirebaseAuthError(codes.INVALID_ARGUMENT, message);
exports.ID_TOKEN_INFO = {
    url: 'https://firebase.google.com/docs/auth/admin/verify-id-tokens',
    verifyApiName: 'verifyIdToken()',
    jwtName: 'Firebase ID token',
    shortName: 'ID token',
    expiredErrorCode: codes.ID_TOKEN_EXPIRED,
};
/**
 * User facing token information related to the Firebase Auth Blocking token.
 *
 * @internal
 */
exports.AUTH_BLOCKING_TOKEN_INFO = {
    url: 'https://cloud.google.com/identity-platform/docs/blocking-functions',
    verifyApiName: '_verifyAuthBlockingToken()',
    jwtName: 'Firebase Auth Blocking token',
    shortName: 'Auth Blocking token',
    expiredErrorCode: codes.AUTH_BLOCKING_TOKEN_EXPIRED,
};
/**
 * User facing token information related to the Firebase session cookie.
 *
 * @internal
 */
exports.SESSION_COOKIE_INFO = {
    url: 'https://firebase.google.com/docs/auth/admin/manage-cookies',
    verifyApiName: 'verifySessionCookie()',
    jwtName: 'Firebase session cookie',
    shortName: 'session cookie',
    expiredErrorCode: codes.SESSION_COOKIE_EXPIRED,
};

class FirebaseTokenVerifier {
  #policy;
  constructor(clientCertUrl, issuer, tokenInfo, app) {
    if (!validator.isURL(clientCertUrl)) throw argument('The provided public client certificate URL is an invalid URL.');
    if (!validator.isURL(issuer)) throw argument('The provided JWT issuer is an invalid URL.');
    if (!validator.isNonNullObject(tokenInfo)) throw argument('The provided JWT information is not an object or null.');
    if (!validator.isURL(tokenInfo.url)) throw argument('The provided JWT verification documentation URL is invalid.');
    for (const [key, label] of [['verifyApiName', 'verify API name'], ['jwtName', 'public full name'], ['shortName', 'public short name']]) {
      if (!validator.isNonEmptyString(tokenInfo[key])) throw argument(`The JWT ${label} must be a non-empty string.`);
    }
    if (!validator.isNonNullObject(tokenInfo.expiredErrorCode) || !('code' in tokenInfo.expiredErrorCode)) {
      throw argument('The JWT expiration error code must be a non-null ErrorInfo object.');
    }
    this.app = app;
    this.issuer = issuer;
    this.tokenInfo = tokenInfo;
    this.shortNameArticle = /^[aeiou]/i.test(tokenInfo.shortName) ? 'an' : 'a';
    this.#policy = new TokenPolicy(tokenInfo, this.shortNameArticle);
    this.signatureVerifier = jwt.PublicKeySignatureVerifier.withCertificateUrl(clientCertUrl, app.options.httpAgent);
  }
  verifyJWT(token, isEmulator = false) {
    this.#argument(token);
    return this.#verify(token, isEmulator, false);
  }
  _verifyAuthBlockingToken(token, isEmulator, audience) {
    this.#argument(token);
    return this.#verify(token, isEmulator, true, audience);
  }
  #argument(token) {
    if (!validator.isString(token)) throw argument(`First argument to ${this.tokenInfo.verifyApiName} must be a ${this.tokenInfo.jwtName} string.`);
  }
  async #verify(token, emulator, blocking, audience) {
    const project = await this.ensureProjectId();
    if (blocking && audience === undefined) audience = `${project}.cloudfunctions.net/`;
    const decoded = await this.decodeAndVerify(token, project, emulator, audience);
    decoded.payload.uid = decoded.payload.sub;
    return decoded.payload;
  }
  async ensureProjectId() {
    const project = await util.findProjectId(this.app);
    if (!validator.isNonEmptyString(project)) throw new FirebaseAuthError(codes.INVALID_CREDENTIAL,
      'Must initialize app with a cert credential or set your Firebase project ID as the ' +
      `GOOGLE_CLOUD_PROJECT environment variable to call ${this.tokenInfo.verifyApiName}.`);
    return project;
  }
  async decodeAndVerify(token, projectId, isEmulator, audience) {
    const decoded = await this.safeDecode(token);
    this.verifyContent(decoded, projectId, isEmulator, audience);
    await this.verifySignature(token, isEmulator);
    return decoded;
  }
  async safeDecode(token) {
    try {return await jwt.decodeJwt(token);} catch (failure) {
      if (failure.code === jwt.JwtErrorCode.INVALID_ARGUMENT) throw argument(
        `Decoding ${this.tokenInfo.jwtName} failed. Make sure you passed the entire string JWT which represents ${this.shortNameArticle} ${this.tokenInfo.shortName}.` + this.#policy.docs);
      throw new FirebaseAuthError(codes.INTERNAL_ERROR, failure.message);
    }
  }
  verifyContent(decoded, projectId, isEmulator, audience) {
    this.#policy.check(decoded, projectId, this.issuer, isEmulator, audience);
  }
  async verifySignature(token, isEmulator) {
    try {await (isEmulator ? emulatorVerifier : this.signatureVerifier).verify(token);}
    catch (failure) {throw this.mapJwtErrorToAuthError(failure);}
  }
  mapJwtErrorToAuthError(failure) {
    const info = this.tokenInfo;
    switch (failure.code) {
      case jwt.JwtErrorCode.TOKEN_EXPIRED:
        return new FirebaseAuthError(info.expiredErrorCode,
          `${info.jwtName} has expired. Get a fresh ${info.shortName} from your client app and try again (auth/${info.expiredErrorCode.code}).` + this.#policy.docs);
      case jwt.JwtErrorCode.INVALID_SIGNATURE:
        return argument(`${info.jwtName} has invalid signature.` + this.#policy.docs);
      case jwt.JwtErrorCode.NO_MATCHING_KID:
        return argument(`${info.jwtName} has "kid" claim which does not correspond to a known public key. Most likely the ${info.shortName} is expired, so get a fresh token from your client app and try again.`);
      default: return argument(failure.message);
    }
  }
}
Object.assign(exports, {
  FirebaseTokenVerifier,
  createIdTokenVerifier: app => new FirebaseTokenVerifier(certificateUrl, 'https://securetoken.google.com/', exports.ID_TOKEN_INFO, app),
  createAuthBlockingTokenVerifier: app => new FirebaseTokenVerifier(certificateUrl, 'https://securetoken.google.com/', exports.AUTH_BLOCKING_TOKEN_INFO, app),
  createSessionCookieVerifier: app => new FirebaseTokenVerifier(sessionCertificateUrl, 'https://session.firebase.google.com/', exports.SESSION_COOKIE_INFO, app),
});
