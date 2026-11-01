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
const fs = require('node:fs');
const {FirebaseAppError, AppErrorCode} = require('./error');
const {getApplicationDefault} = require('./credential-internal');
const {FirebaseApp} = require('./firebase-app');
const {equalOptions} = require('./options-snapshot');
const DEFAULT_NAME = '[DEFAULT]';
const FIREBASE_CONFIG_VAR = 'FIREBASE_CONFIG';

class AppStore {
  #apps = new Map();
  initializeApp(options, name = DEFAULT_NAME) {
    checkName(name);
    const automatic = options === undefined;
    const current = this.#apps.get(name);
    if (current) {
      const differs = `A Firebase app named "${name}" already exists with a different configuration.`;
      if (current.autoInit() !== automatic) throw new FirebaseAppError({code: AppErrorCode.INVALID_APP_OPTIONS, message: differs});
      if (automatic) return current;
      if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new FirebaseAppError({code: AppErrorCode.INVALID_APP_OPTIONS, message: 'Invalid Firebase app options. Options must be a non-null object.'});
      }
      const stored = current.options;
      validateAppOptionsSupportDeepEquals(options, current, stored);
      delete stored.credential;
      if (!equalOptions(options, stored)) throw new FirebaseAppError({code: AppErrorCode.DUPLICATE_APP, message: differs});
      return current;
    }
    if (automatic) options = {...readEnvironment(), credential: getApplicationDefault()};
    const created = new FirebaseApp(options, name, automatic, this);
    this.#apps.set(name, created);
    return created;
  }
  getApp(name = DEFAULT_NAME) {
    checkName(name);
    const app = this.#apps.get(name);
    if (app) return app;
    const prefix = name === DEFAULT_NAME ? 'The default Firebase app does not exist. ' : `Firebase app named "${name}" does not exist. `;
    throw new FirebaseAppError({code: AppErrorCode.NO_APP,
      message: prefix + 'Make sure you call initializeApp() before using any of the Firebase services.'});
  }
  getApps() {return [...this.#apps.values()];}
  deleteApp(app) {
    if (!app || typeof app !== 'object' || !('options' in app)) throw invalidApp();
    const owned = this.getApp(app.name);
    if (owned !== app) throw invalidApp();
    return owned.delete();
  }
  clearAllApps() {return Promise.all(this.getApps().map(app => this.deleteApp(app))).then(() => {});}
  removeApp(name, owner) {
    if (owner === undefined || this.#apps.get(name) === owner) this.#apps.delete(name);
  }
}
function invalidApp() {return new FirebaseAppError({code: AppErrorCode.INVALID_ARGUMENT, message: 'Invalid app argument.'});}
function checkName(name) {
  if (typeof name !== 'string' || !name.length) throw new FirebaseAppError({code: AppErrorCode.INVALID_APP_NAME,
    message: `Invalid Firebase app name "${name}" provided. App name must be a non-empty string.`});
}
function readEnvironment() {
  const config = process.env[FIREBASE_CONFIG_VAR];
  if (!config) return {};
  try {
    const value = JSON.parse(config.trimStart().startsWith('{') ? config : fs.readFileSync(config, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Options must be a non-null object.');
    return value;
  } catch (cause) {
    throw new FirebaseAppError({code: AppErrorCode.INVALID_APP_OPTIONS,
      message: `Failed to parse app options file: ${cause.message}`, cause});
  }
}

// Credential/agent equality is intentionally unsupported, as in Admin 14.5.
function validateAppOptionsSupportDeepEquals(requestedOptions, existingApp, storedOptions) {
    // http.Agent checks.
    if (typeof requestedOptions.httpAgent !== 'undefined') {
        throw new FirebaseAppError({
            code: AppErrorCode.INVALID_APP_OPTIONS,
            message: `Firebase app named "${existingApp.name}" already exists and initializeApp was` +
                ' invoked with an optional http.Agent. The SDK cannot confirm the equality' +
                ' of http.Agent objects with the existing app. Please use getApp or getApps to reuse' +
                ' the existing app instead.'
        });
    }
    else if (typeof storedOptions.httpAgent !== 'undefined') {
        throw new FirebaseAppError({
            code: AppErrorCode.INVALID_APP_OPTIONS,
            message: `An existing app named "${existingApp.name}" already exists with a different` +
                ' options configuration: httpAgent.'
        });
    }
    // Credential checks.
    if (typeof requestedOptions.credential !== 'undefined') {
        throw new FirebaseAppError({
            code: AppErrorCode.INVALID_APP_OPTIONS,
            message: `Firebase app named "${existingApp.name}" already exists and initializeApp was` +
                ' invoked with an optional Credential. The SDK cannot confirm the equality' +
                ' of Credential objects with the existing app. Please use getApp or getApps' +
                ' to reuse the existing app instead.'
        });
    }
    if (existingApp.customCredential()) {
        throw new FirebaseAppError({
            code: AppErrorCode.INVALID_APP_OPTIONS,
            message: `An existing app named "${existingApp.name}" already exists with a different` +
                ' options configuration: Credential.'
        });
    }
}

const defaultAppStore = new AppStore();
Object.assign(exports, {AppStore, defaultAppStore, FIREBASE_CONFIG_VAR,
  initializeApp: (...args) => defaultAppStore.initializeApp(...args),
  getApp: (...args) => defaultAppStore.getApp(...args),
  getApps: () => defaultAppStore.getApps(),
  deleteApp: app => defaultAppStore.deleteApp(app),
});
