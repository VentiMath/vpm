/*! firebase-admin v14.5.0 */
"use strict";
/*!
 * @license
 * Copyright 2020 Google LLC
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
const {ApplicationDefaultCredential, ServiceAccountCredential, RefreshTokenCredential} = require('./credential-internal');
const {CredentialDocument, invalid} = require('./credential-document');
let defaultCredential, adcAgents = new WeakMap();
const weakKey = agent => agent != null;
function checkAgent(agent) {
  if (weakKey(agent) && typeof agent !== 'object' && typeof agent !== 'function') throw invalid('HTTP agent must be an object.');
}

// A credential's transport choice is part of its identity. Weak agent keys do
// not retain unused agents; JSON caches retain at most 64 credentials per agent
// and kind. Keys contain only a digest, never private key or refresh-token text.
class CredentialPool {
  #agents = new WeakMap(); #default = new Map();
  constructor(Type, label) {this.Type = Type; this.label = label;}
  get(input, agent) {
    checkAgent(agent);
    let entries = this.#default;
    if (weakKey(agent)) {
      entries = this.#agents.get(agent);
      if (!entries) this.#agents.set(agent, entries = new Map());
    }
    const source = new CredentialDocument(input, this.label), key = source.digest();
    if (entries.has(key)) return entries.get(key);
    const credential = new this.Type(source, agent);
    if (entries.size === 64) entries.delete(entries.keys().next().value);
    entries.set(key, credential);
    return credential;
  }
}
const certificates = new CredentialPool(ServiceAccountCredential, 'service account json');
const refreshTokens = new CredentialPool(RefreshTokenCredential, 'refresh token');
function applicationDefault(agent) {
  checkAgent(agent);
  if (!weakKey(agent)) return defaultCredential ??= new ApplicationDefaultCredential(agent);
  if (!adcAgents.has(agent)) adcAgents.set(agent, new ApplicationDefaultCredential(agent));
  return adcAgents.get(agent);
}
function cert(input, agent) {return certificates.get(input, agent);}
function refreshToken(input, agent) {return refreshTokens.get(input, agent);}
function clearGlobalAppDefaultCred() {defaultCredential = undefined; adcAgents = new WeakMap();}
Object.assign(exports, {applicationDefault, cert, refreshToken, clearGlobalAppDefaultCred});
