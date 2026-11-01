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
Object.defineProperty(exports, '__esModule', {value: true});

const {AuthorizedHttpClient, AuthorizedHttp2Client, RequestResponseError} = require('../utils/api-request');
const {getSdkVersion} = require('../utils');
const {toHttpResponse} = require('../utils/error');
const {FirebaseMessagingError, MessagingErrorCode: codes} = require('./error');
const {createFirebaseError, getErrorCode, getErrorMessage, hasServerError} = require('./messaging-errors-internal');
const headers = Object.freeze({'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`, access_token_auth: 'true'});

function request(host, path, data, session, method = 'POST') {
    const plan = {method, url: `https://${host}${path}`, data, headers, timeout: 15000};
    if (session !== undefined) plan.http2SessionHandler = session;
    return plan;
}
function dispatch(client, plan, accept, reject) {
    return client.send(plan).then(accept).catch(error => {
        if (error instanceof RequestResponseError) return reject(error);
        throw error;
    });
}
function validSendData(data) {
    return data !== null && typeof data === 'object' && !Array.isArray(data)
        && !hasServerError(data) && typeof data.name === 'string' && data.name.length > 0;
}

class FirebaseMessagingRequestHandler {
    constructor(app) {
        this.httpClient = new AuthorizedHttpClient(app);
        this.http2Client = new AuthorizedHttp2Client(app);
    }
    invokeRequestHandler(host, path, data) {
        // Legacy topic management also uses this generic JSON operation.
        return dispatch(this.httpClient, request(host, path, data), response => {
            if (!response.isJson() || hasServerError(response.data)) throw new RequestResponseError(response);
            return response.data;
        }, error => {throw createFirebaseError(error);});
    }
    invokeHttpRequestHandlerForSendResponse(host, path, data) {
        return dispatch(this.httpClient, request(host, path, data),
            response => this.buildSendResponse(response), error => this.buildSendResponseFromError(error));
    }
    invokeHttp2RequestHandlerForSendResponse(host, path, data, session) {
        return dispatch(this.http2Client, request(host, path, data, session),
            response => this.buildSendResponse(response), error => this.buildSendResponseFromError(error));
    }
    buildSendResponse(response) {
        if (response.status === 200 && response.isJson()) {
            const data = response.data;
            if (validSendData(data)) return {success: true, messageId: data.name};
        }
        return this.buildSendResponseFromError(new RequestResponseError(response));
    }
    buildSendResponseFromError(error) {return {success: false, error: createFirebaseError(error)};}
    invokeHttpRequestHandlerForTopicSubscriptionResponse(host, path, method, data) {
        return dispatch(this.httpClient, request(host, path, data, undefined, method === 'subscribeToTopic' ? 'POST' : 'DELETE'),
            response => this.buildTopicSubscriptionResponse(response, method), error => this.buildTopicSubscriptionResponseFromError(error, method));
    }
    invokeHttp2RequestHandlerForTopicSubscriptionResponse(host, path, method, data, session) {
        return dispatch(this.http2Client, request(host, path, data, session, method === 'subscribeToTopic' ? 'POST' : 'DELETE'),
            response => this.buildTopicSubscriptionResponse(response, method), error => this.buildTopicSubscriptionResponseFromError(error, method));
    }
    buildTopicSubscriptionResponse(response, method) {
        return response.status === 200 ? {success: true} : this.buildTopicSubscriptionResponseFromError(new RequestResponseError(response), method);
    }
    buildTopicSubscriptionResponseFromError(cause, method) {
        const response = cause.response, status = response.status, json = response.isJson();
        const data = json ? response.data : undefined, code = json ? getErrorCode(data) : null;
        if (method === 'subscribeToTopic' && (status === 409 || code === 'ALREADY_EXISTS')) return {success: true};
        if (json) return {success: false,
            error: FirebaseMessagingError.fromTopicManagementServerError(code || 'UNKNOWN_ERROR', getErrorMessage(data), cause)};
        const mapped = status === 400 ? codes.INVALID_REGISTRATION_TOKEN : status === 401 || status === 403 ? codes.AUTHENTICATION_ERROR
            : status === 404 ? codes.REGISTRATION_TOKEN_NOT_REGISTERED : status === 429 ? codes.TOPICS_SUBSCRIPTION_RATE_EXCEEDED
            : status === 500 ? codes.INTERNAL_ERROR : status === 503 ? codes.SERVER_UNAVAILABLE : codes.UNKNOWN_ERROR;
        return {success: false, error: new FirebaseMessagingError({code: mapped,
            message: `Server responded with status ${status}.`, httpResponse: toHttpResponse(response), cause})};
    }
}
exports.FirebaseMessagingRequestHandler = FirebaseMessagingRequestHandler;
