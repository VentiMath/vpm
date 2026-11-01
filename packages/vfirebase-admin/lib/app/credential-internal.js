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
const {createPrivateKey} = require('node:crypto');
const {Compute} = require('vgoogle-auth-library');
const {CredentialDocument, fields, invalid} = require('./credential-document');
const {CredentialSession} = require('./credential-session');
const refreshFields = [['client_id', 'clientId'], ['client_secret', 'clientSecret'], ['refresh_token', 'refreshToken'], ['type', 'type']];
const document = (input, label) => input instanceof CredentialDocument ? input : new CredentialDocument(input, label);

class ApplicationDefaultCredential {
  #session;
  constructor(httpAgent) {this.#session = new CredentialSession(httpAgent);}
  get googleAuth() {return this.#session.auth;}
  getAccessToken() {return this.#session.accessToken();}
  getProjectId() {return this.#session.memo('project', () => this.googleAuth.getProjectId());}
  getQuotaProjectId() {return this.#session.client?.quotaProjectId;}
  async isComputeEngineCredential() {return await this.#session.resolveClient() instanceof Compute;}
  async getIDToken(audience) {
    const client = await this.#session.resolveClient();
    if (!(client instanceof Compute)) throw invalid('Credentials type should be Compute Engine Credentials.');
    return client.fetchIdToken(audience);
  }
  getServiceAccountEmail() {return this.#session.memo('email', async () => (await this.googleAuth.getCredentials()).client_email ?? '');}
}

// File and object credentials share one provider adapter. The data validated
// during construction is exactly the data later handed to Google Auth.
class JsonCredential {
  #session;
  constructor(data, agent, implicit) {this.implicit = implicit; this.#session = new CredentialSession(agent, data);}
  getGoogleAuth() {return this.#session.auth;}
  getAccessToken() {return this.#session.accessToken();}
}
class ServiceAccountCredential extends JsonCredential {
  constructor(input, httpAgent, implicit = false) {
    const source = document(input, 'service account json');
    const data = source.validate(raw => {
      if (raw.type !== undefined && raw.type !== 'service_account') throw invalid('Service account type must be "service_account".');
      const normalized = fields(raw, [['project_id', 'projectId'], ['private_key', 'privateKey'], ['client_email', 'clientEmail']],
        name => `Service account object must contain a string "${name}" property.`);
      normalized.type = 'service_account';
      try {createPrivateKey(normalized.private_key);}
      catch (cause) {throw invalid('Failed to parse private key.', cause);}
      return normalized;
    });
    super(data, httpAgent, implicit);
    this.projectId = data.project_id; this.privateKey = data.private_key; this.clientEmail = data.client_email;
  }
}
class RefreshTokenCredential extends JsonCredential {
  constructor(input, httpAgent, implicit = false) {
    const source = document(input, 'refresh token');
    const data = source.validate(raw => {
      const normalized = fields(raw, refreshFields, name => `Refresh token must contain a "${name}" property.`);
      // Admin's existing camel-case credential shape uses this legacy tag.
      if (normalized.type !== 'authorized_user' && normalized.type !== 'refreshToken') throw invalid('Refresh token type must be "authorized_user".');
      normalized.type = 'authorized_user';
      return normalized;
    });
    super(data, httpAgent, implicit);
  }
}
class ImpersonatedServiceAccountCredential extends JsonCredential {
  constructor(input, httpAgent, implicit = false) {
    const source = document(input, 'impersonated service account');
    const data = source.validate(raw => {
      const nested = fields(raw.source_credentials || {}, refreshFields,
        name => `Impersonated Service Account must contain a "source_credentials.${name}" property.`);
      if (raw.type !== 'impersonated_service_account' || nested.type !== 'authorized_user') throw invalid('Impersonated service account requires an authorized_user source credential.');
      return {...raw, source_credentials: nested};
    });
    super(data, httpAgent, implicit);
  }
}
function isApplicationDefault(credential) {
  return credential instanceof ApplicationDefaultCredential || (credential instanceof RefreshTokenCredential && credential.implicit);
}
function getApplicationDefault(agent) {return new ApplicationDefaultCredential(agent);}
Object.assign(exports, {ApplicationDefaultCredential, ServiceAccountCredential, RefreshTokenCredential,
  ImpersonatedServiceAccountCredential, isApplicationDefault, getApplicationDefault});
