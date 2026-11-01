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
const {FirebaseAppError, AppErrorCode} = require('./error');
const EARLY_REFRESH = 300000;

// One pending acquisition owns all callers, including forced refreshes. A
// failed acquisition never replaces a usable cached token or blocks a retry.
class FirebaseAppInternals {
  #credential; #token = null; #cachedPromise; #pending; #listeners = [];
  constructor(credential) {this.#credential = credential;}
  getCachedToken() {return this.#token;}
  getToken(forceRefresh = false) {
    if (this.#pending) return this.#pending;
    if (!forceRefresh && this.#token && this.#token.expirationTime - Date.now() > EARLY_REFRESH) return this.#cachedPromise;
    const acquisition = Promise.withResolvers();
    this.#pending = acquisition.promise.then(result => this.#accept(result))
      .catch(error => {throw credentialError(error);})
      .finally(() => {this.#pending = undefined;});
    // Call immediately for the Credential contract, but turn synchronous throws
    // into the same rejected promise as asynchronous failures.
    try {acquisition.resolve(this.#credential.getAccessToken());}
    catch (error) {acquisition.reject(error);}
    return this.#pending;
  }
  #accept(result) {
    const seconds = result?.expires_in, accessToken = result?.access_token;
    const expirationTime = typeof seconds === 'number' ? Date.now() + seconds * 1000 : NaN;
    if (!result || typeof result !== 'object' || typeof seconds !== 'number' ||
      !Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(expirationTime) ||
      typeof accessToken !== 'string' || accessToken.length === 0) {
      // Never embed a provider's token response in diagnostics or their cause.
      throw new FirebaseAppError({code: AppErrorCode.INVALID_CREDENTIAL,
        message: 'Invalid access token generated. Expected a non-empty access_token and a finite positive expires_in.'});
    }
    const token = {accessToken, expirationTime}, previous = this.#token;
    this.#token = token;
    this.#cachedPromise = Promise.resolve(token);
    if (!previous || previous.accessToken !== accessToken || previous.expirationTime !== expirationTime) {
      for (const listener of this.#listeners.slice()) listener(accessToken);
    }
    return token;
  }
  addAuthTokenListener(listener) {
    this.#listeners.push(listener);
    if (this.#token) listener(this.#token.accessToken);
  }
  removeAuthTokenListener(listener) {this.#listeners = this.#listeners.filter(item => item !== listener);}
}

// Preserve the SDK's public error contract, including the provider's cause.
function credentialError(error) {
  const detail = typeof error === 'string' ? error : error?.message ?? String(error);
  let message = 'Credential implementation provided to initializeApp() via the ' +
    '"credential" property failed to fetch a valid Google OAuth2 access token with the ' +
    `following error: "${detail}".`;
  if (message.includes('invalid_grant')) message += ' There are two likely causes: (1) your server time is not properly ' +
    'synced or (2) your certificate key file has been revoked. To solve (1), re-sync the ' +
    'time on your server. To solve (2), make sure the key ID for your key file is still ' +
    'present at https://console.firebase.google.com/iam-admin/serviceaccounts/project. If ' +
    'not, generate a new key file at ' +
    'https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk.';
  return new FirebaseAppError({code: AppErrorCode.INVALID_CREDENTIAL, message, cause: error});
}
exports.FirebaseAppInternals = FirebaseAppInternals;
