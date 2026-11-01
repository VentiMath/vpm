/*! firebase-admin v14.5.0 */
"use strict";
/*!
 * @license
 * Copyright 2017 Google LLC
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
// Public record contracts and diagnostics are source-informed. VPM constructs
// explicit read-only projections; serialization detaches nested claim data.
const {FirebaseAuthError, authClientErrorCode} = require('./error');
const {detachClaims: detach} = require('./claim-snapshot');
const invalid = kind => new FirebaseAuthError(authClientErrorCode.INTERNAL_ERROR,
  `INTERNAL ASSERT FAILED: Invalid ${kind} response`);
const redact = Buffer.from('REDACTED').toString('base64');
const factorFields = ['uid', 'displayName', 'factorId', 'enrollmentTime'];

function readonly(target, values) {
  for (const key of Object.keys(values)) Object.defineProperty(target, key, {value: values[key], enumerable: true});
}
function project(source, keys) {
  const result = {};
  for (const key of keys) result[key] = source[key];
  return result;
}
function unixDate(value) {
  try {
    const time = new Date(Number.parseInt(value, 10));
    return Number.isNaN(time.getTime()) ? null : time.toUTCString();
  } catch {return null;}
}
const isoDate = value => value ? new Date(value).toUTCString() : null;

class UserMetadata {
  constructor(response) {
    readonly(this, {creationTime: unixDate(response.createdAt), lastSignInTime: unixDate(response.lastLoginAt),
      lastRefreshTime: isoDate(response.lastRefreshAt)});
  }
  toJSON() {return {lastSignInTime: this.lastSignInTime, creationTime: this.creationTime, lastRefreshTime: this.lastRefreshTime};}
}
class UserInfo {
  constructor(response) {
    if (!response?.rawId || !response.providerId) throw invalid('user info');
    readonly(this, {uid: response.rawId, displayName: response.displayName, email: response.email,
      photoURL: response.photoUrl, providerId: response.providerId, phoneNumber: response.phoneNumber});
  }
  toJSON() {return {uid: this.uid, displayName: this.displayName, email: this.email,
    photoURL: this.photoURL, providerId: this.providerId, phoneNumber: this.phoneNumber};}
}

class MultiFactorInfo {
  static initMultiFactorInfo(response) {
    try {
      if (response.phoneInfo !== undefined) return new PhoneMultiFactorInfo(response);
      if (response.totpInfo !== undefined) return new TotpMultiFactorInfo(response);
    } catch { /* Unknown or malformed factors do not hide other enrolled factors. */ }
    return null;
  }
  constructor(response) {this.initFromServerResponse(response);}
  initFromServerResponse(response) {
    const factorId = response && this.getFactorId(response);
    if (!factorId || !response.mfaEnrollmentId) throw invalid('multi-factor info');
    readonly(this, {uid: response.mfaEnrollmentId, factorId, displayName: response.displayName,
      enrollmentTime: isoDate(response.enrolledAt)});
  }
  toJSON() {return project(this, factorFields);}
}
class PhoneMultiFactorInfo extends MultiFactorInfo {
  constructor(response) {super(response); readonly(this, {phoneNumber: response.phoneInfo});}
  getFactorId(response) {return response?.phoneInfo ? 'phone' : null;}
  toJSON() {return {...super.toJSON(), phoneNumber: this.phoneNumber};}
}
class TotpInfo {}
class TotpMultiFactorInfo extends MultiFactorInfo {
  constructor(response) {super(response); readonly(this, {totpInfo: response.totpInfo});}
  getFactorId(response) {return response?.totpInfo ? 'totp' : null;}
  toJSON() {return {...super.toJSON(), totpInfo: detach(this.totpInfo)};}
}
class MultiFactorSettings {
  constructor(response) {
    if (!response || typeof response !== 'object' || Array.isArray(response)) throw invalid('multi-factor');
    const factors = [];
    if (response.mfaInfo && !Array.isArray(response.mfaInfo)) throw new TypeError('Multi-factor enrollments must be an array.');
    if (response.mfaInfo) for (const item of response.mfaInfo) {
      const factor = MultiFactorInfo.initMultiFactorInfo(item);
      if (factor) factors.push(factor);
    }
    readonly(this, {enrolledFactors: Object.freeze(factors)});
  }
  toJSON() {return {enrolledFactors: this.enrolledFactors.map(factor => factor.toJSON())};}
}
class UserRecord {
  constructor(response) {
    if (!response?.localId) throw invalid('user');
    const providers = Array.from(response.providerUserInfo || [], entry => new UserInfo(entry));
    readonly(this, {uid: response.localId, email: response.email, emailVerified: !!response.emailVerified,
      displayName: response.displayName, photoURL: response.photoUrl, phoneNumber: response.phoneNumber,
      disabled: response.disabled || false, metadata: new UserMetadata(response), providerData: providers,
      passwordHash: response.passwordHash === redact ? undefined : response.passwordHash, passwordSalt: response.salt});
    if (response.customAttributes) readonly(this, {customClaims: JSON.parse(response.customAttributes)});
    readonly(this, {tokensValidAfterTime: response.validSince === undefined ? undefined :
      unixDate(Number.parseInt(response.validSince, 10) * 1000) || undefined, tenantId: response.tenantId});
    const factors = new MultiFactorSettings(response);
    if (factors.enrolledFactors.length) readonly(this, {multiFactor: factors});
  }
  toJSON() {
    const result = {uid: this.uid, email: this.email, emailVerified: this.emailVerified,
      displayName: this.displayName, photoURL: this.photoURL, phoneNumber: this.phoneNumber,
      disabled: this.disabled, metadata: this.metadata.toJSON(), passwordHash: this.passwordHash,
      passwordSalt: this.passwordSalt, customClaims: detach(this.customClaims),
      tokensValidAfterTime: this.tokensValidAfterTime, tenantId: this.tenantId};
    if (this.multiFactor) result.multiFactor = this.multiFactor.toJSON();
    result.providerData = this.providerData.map(provider => provider.toJSON());
    return result;
  }
}
Object.assign(exports, {UserRecord, UserInfo, UserMetadata, MultiFactorSettings,
  MultiFactorInfo, PhoneMultiFactorInfo, TotpInfo, TotpMultiFactorInfo});
