"use strict";
// Auth resource identity and request ownership are separate from the reusable
// HTTP client and the existing endpoint schema validators.
const {FirebaseAuthError, authClientErrorCode: codes} = require('./error');
const {AuthorizedHttpClient, RequestResponseError} = require('../utils/api-request');
const {toHttpResponse} = require('../utils/error');
const utils = require('../utils/index');
const {detachClaims} = require('./claim-snapshot');
const headers = {'X-Client-Version': `Node/Admin/${utils.getSdkVersion()}`};
function component(value, pathSegment = true) {
  const text = String(value);
  if (pathSegment && (text === '.' || text === '..')) throw new FirebaseAuthError(codes.INVALID_ARGUMENT, 'Auth resource identifiers cannot be dot segments.');
  try {return encodeURIComponent(text);} catch {
    throw new FirebaseAuthError(codes.INVALID_ARGUMENT, 'Auth resource identifiers must contain valid Unicode.');
  }
}
function ownRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return detachClaims(value);
  const prototype = Object.getPrototypeOf(value);
  if (prototype === Object.prototype || prototype === null) return detachClaims(value);
  return detachClaims(Object.fromEntries(Object.entries(value)));
}
class AuthResourceUrlBuilder {
  #pending;
  constructor(app, version = 'v1', emHost) {
    this.app = app; this.version = version;
    this.base = emHost ? `http://${emHost}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';
  }
  getProjectId() {
    if (this.projectId) return Promise.resolve(this.projectId);
    if (!this.#pending) this.#pending = Promise.resolve().then(() => utils.findProjectId(this.app)).then(project => {
      if (typeof project !== 'string' || project.length === 0) throw new FirebaseAuthError(codes.INVALID_CREDENTIAL,
        'Failed to determine project ID for Auth. Initialize the SDK with service account credentials or set project ID as an app option. Alternatively set the GOOGLE_CLOUD_PROJECT environment variable.');
      this.projectId = project;
      return project;
    }).finally(() => {this.#pending = undefined;});
    return this.#pending;
  }
  getUrl(api, params) {
    // Expand only the endpoint template once. Identifiers cannot introduce new
    // placeholders, path segments, query parameters or replacement-string code.
    const values = Object.fromEntries(Object.entries(params || {}).map(([key, value]) => [key,
      key === 'updateMask' ? String(value).split(',').map(part => component(part, false)).join(',') : component(value)]));
    const endpoint = (api || '').replace(/\{(\w+)\}/g, (placeholder, name) => Object.hasOwn(values, name) ? values[name] : placeholder);
    return this.getProjectId().then(project => this.base + '/' + component(this.version) + '/projects/' + component(project) +
      (this.tenantId === undefined ? '' : '/tenants/' + component(this.tenantId)) + endpoint);
  }
}
class TenantAwareAuthResourceUrlBuilder extends AuthResourceUrlBuilder {
  constructor(app, version, tenantId, emHost) {super(app, version, emHost); this.tenantId = tenantId;}
}
class AuthHttpClient extends AuthorizedHttpClient {
  constructor(app, isEmulator) {super(app); this.isEmulator = isEmulator;}
  getToken() {return this.isEmulator ? Promise.resolve('owner') : super.getToken();}
}
async function dispatchAuth(client, urlBuilder, settings, data, params) {
  const request = ownRecord(data);
  try {
    const url = await urlBuilder.getUrl(settings.getEndpoint(), params);
    if (request) settings.getRequestValidator()(request);
    const response = await client.send({method: settings.getHttpMethod(), url, headers: {...headers}, data: request, timeout: 25000});
    settings.getResponseValidator()?.(response);
    return response.data;
  } catch (failure) {
    if (!(failure instanceof RequestResponseError)) throw failure;
    const response = failure.response;
    const code = response.isJson() ? response.data?.error?.message : undefined;
    if (typeof code === 'string' && code) throw FirebaseAuthError.fromServerError(code, undefined, failure);
    throw new FirebaseAuthError({...codes.INTERNAL_ERROR,
      message: 'An internal error occurred while attempting to extract the errorcode from the error.',
      cause: failure, httpResponse: toHttpResponse(response)});
  }
}
Object.assign(exports, {AuthResourceUrlBuilder, TenantAwareAuthResourceUrlBuilder, AuthHttpClient, dispatchAuth});
