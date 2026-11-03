'use strict';
const fs = require('node:fs/promises');
exports.callback = (promise, done, project = value => [value]) => {
  if (!done) return promise;
  promise.then(value => done(null, ...project(value)), error => done(error));
};
exports.scopes = value => Array.isArray(value) ? value.join(' ') : value;
exports.readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
exports.readStream = async stream => {
  if (!stream) throw new TypeError('A credential stream is required');
  const chunks = []; for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};
exports.tokens = (data, allowIdentity = false) => {
  if (!data || Array.isArray(data) || typeof data !== 'object' ||
      !(typeof data.access_token === 'string' && data.access_token ||
        allowIdentity && typeof data.id_token === 'string' && data.id_token)) throw new Error('Invalid token response');
  const result = {...data};
  if (Object.hasOwn(data, 'expires_in')) {
    if (typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error('Invalid token expiry');
    result.expiry_date = Date.now() + data.expires_in * 1000;
    if (!Number.isFinite(result.expiry_date) || result.expiry_date > 8.64e15) throw new Error('Invalid token expiry');
    delete result.expires_in;
  }
  if (Object.hasOwn(result, 'expiry_date') && (typeof result.expiry_date !== 'number' || !Number.isFinite(result.expiry_date))) throw new Error('Invalid token expiry');
  return result;
};
exports.serviceAccount = json => {
  if (!json || typeof json !== 'object') throw new TypeError('Service account credentials must be an object');
  for (const key of ['client_email', 'private_key']) if (typeof json[key] !== 'string' || !json[key]) throw new TypeError('Missing service account '+key);
  return {email:json.client_email,key:json.private_key,keyId:json.private_key_id,projectId:json.project_id,quotaProjectId:json.quota_project_id,universeDomain:json.universe_domain || 'googleapis.com'};
};
