"use strict";
const {GoogleAuth} = require('vgoogle-auth-library');
const {invalid} = require('./credential-document');
const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/firebase.messaging',
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/userinfo.email',
];

// The Google auth client owns OAuth caching. This adapter owns discovery and
// in-flight work, shared across all the credential's public methods.
class CredentialSession {
  #agent; #data; #auth; #client; #clientPending; #tokenPending; #memo = new Map();
  constructor(agent, data) {this.#agent = agent; this.#data = data;}
  get auth() {
    if (!this.#auth) this.#auth = new GoogleAuth({scopes: [...SCOPES], clientOptions: {transporterOptions: {agent: this.#agent}}});
    return this.#auth;
  }
  get client() {return this.#client;}
  resolveClient() {
    if (this.#client) return Promise.resolve(this.#client);
    if (!this.#clientPending) this.#clientPending = Promise.resolve().then(() =>
      this.#data ? this.auth.fromJSON(this.#data, this.auth.clientOptions) : this.auth.getClient()
    ).then(client => (this.#client = client)).finally(() => {this.#clientPending = undefined;});
    return this.#clientPending;
  }
  accessToken() {
    if (!this.#tokenPending) this.#tokenPending = this.resolveClient().then(async client => {
      await client.getAccessToken();
      const {access_token, expiry_date} = client.credentials || {};
      if (typeof access_token !== 'string' || !access_token.length) throw invalid('Failed to parse Google auth credential: access_token must be a non empty string.');
      const expires_in = typeof expiry_date === 'number' ? Math.floor((expiry_date - Date.now()) / 1000) : NaN;
      if (typeof expiry_date !== 'number' || !Number.isFinite(expiry_date) || !Number.isFinite(expires_in) || expires_in <= 0) throw invalid('Failed to parse Google auth credential: Invalid expiry_date.');
      return {access_token, expires_in};
    }).finally(() => {this.#tokenPending = undefined;});
    return this.#tokenPending;
  }
  memo(key, load) {
    if (!this.#memo.has(key)) {
      const pending = Promise.resolve().then(load).catch(error => {this.#memo.delete(key); throw error;});
      this.#memo.set(key, pending);
    }
    return this.#memo.get(key);
  }
}
exports.CredentialSession = CredentialSession;
