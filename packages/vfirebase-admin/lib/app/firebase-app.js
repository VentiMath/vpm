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
const {getApplicationDefault} = require('./credential-internal');
const {FirebaseAppError, AppErrorCode} = require('./error');
const {snapshotOptions} = require('./options-snapshot');
const {FirebaseAppInternals} = require('./token-lease');

// App lifetime and service lifetime share an explicit closing boundary. A
// failed cleanup cannot reopen an app or leave another service unvisited.
class FirebaseApp {
  #name; #options; #automatic; #customCredential; #store;
  #state = 'active'; #services = new Map(); #initializing; #deletion;
  constructor(options, name, autoInit = false, store) {
    this.#name = name; this.#automatic = autoInit; this.#store = store;
    const invalid = message => new FirebaseAppError({code: AppErrorCode.INVALID_APP_OPTIONS,
      message: 'Invalid Firebase app options passed as the first argument to initializeApp() for the ' +
        `app named "${name}". ${message}`});
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw invalid('Options must be a non-null object.');
    try {this.#options = snapshotOptions(options);}
    catch (error) {throw invalid(error.message);}
    this.#customCredential = Object.hasOwn(this.#options, 'credential');
    if (!this.#customCredential) this.#options.credential = getApplicationDefault(this.#options.httpAgent);
    const credential = this.#options.credential;
    if (!credential || typeof credential !== 'object' || typeof credential.getAccessToken !== 'function') {
      throw invalid('The "credential" property must be an object which implements the Credential interface.');
    }
    this.INTERNAL = new FirebaseAppInternals(credential);
  }
  get name() {this.#assertReadable(); return this.#name;}
  get options() {this.#assertReadable(); return snapshotOptions(this.#options);}
  autoInit() {return this.#automatic;}
  customCredential() {return this.#customCredential;}
  getOrInitService(name, initialize) {return this.ensureService_(name, () => initialize(this));}
  ensureService_(name, initialize) {
    if (this.#state !== 'active') throw this.#deletedError();
    if (this.#services.has(name)) return this.#services.get(name);
    if (this.#initializing?.has(name)) throw new FirebaseAppError({code: AppErrorCode.INTERNAL_ERROR,
      message: `Recursive initialization of Firebase service "${name}".`});
    (this.#initializing ??= new Set()).add(name);
    try {
      const service = initialize();
      this.#services.set(name, service);
      return service;
    } finally {this.#initializing.delete(name);}
  }
  delete() {
    if (this.#state === 'closing') return this.#deletion;
    this.#assertReadable();
    if (this.#initializing?.size) throw new FirebaseAppError({code: AppErrorCode.INTERNAL_ERROR,
      message: 'Cannot delete an app from a service initializer.'});
    this.#state = 'closing';
    this.#store?.removeApp(this.#name, this);
    const services = [...this.#services.values()];
    this.#deletion = Promise.allSettled(services.map(service => Promise.resolve().then(() => {
      if (typeof service?.delete === 'function') return service.delete();
    }))).then(results => {
      this.#services.clear(); this.#state = 'deleted';
      const failure = results.find(result => result.status === 'rejected');
      if (failure) throw failure.reason;
    });
    return this.#deletion;
  }
  #deletedError() {return new FirebaseAppError({code: AppErrorCode.APP_DELETED,
    message: `Firebase app named "${this.#name}" has already been deleted.`});}
  #assertReadable() {if (this.#state === 'deleted') throw this.#deletedError();}
}
exports.FirebaseApp = FirebaseApp;
exports.FirebaseAppInternals = FirebaseAppInternals;
