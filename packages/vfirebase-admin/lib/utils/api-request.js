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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Http2SessionHandler = exports.ExponentialBackoffPoller = exports.ApiSettings = exports.AuthorizedHttp2Client = exports.AuthorizedHttpClient = exports.Http2Client = exports.HttpClient = exports.RequestClient = exports.RequestResponseError = void 0;
const {RetryPolicy, defaultRetryConfig} = require("./request-retry");
exports.defaultRetryConfig = defaultRetryConfig;
exports.parseHttpResponse = parseHttpResponse;
const {HttpResponse, RequestResponseError} = require("./http-response");
const error_2 = require("../app/error");
const validator = require("./validator");
const {HttpRequestPlan} = require("./http-request");
const {Http2RequestPlan} = require("./http2-request");
const {Http2SessionHandler} = require("./http2-session");
const events_1 = require("events");
const {captureRequest, authorizeRequest} = require("./authorized-request");
/**
 * Represents a multipart HTTP or HTTP/2 response. Parts that constitute the response body can be accessed
 * via the multipart getter. Getters for text and data throw errors.
 */
class MultipartRequestResponse {
    constructor(resp) {
        this.status = resp.status;
        this.headers = resp.headers;
        this.multipart = resp.multipart;
        this.config = resp.config;
    }
    get text() {
        throw new error_2.FirebaseAppError({
            code: error_2.AppErrorCode.UNABLE_TO_PARSE_RESPONSE,
            message: 'Unable to parse multipart payload as text'
        });
    }
    get data() {
        throw new error_2.FirebaseAppError({
            code: error_2.AppErrorCode.UNABLE_TO_PARSE_RESPONSE,
            message: 'Unable to parse multipart payload as JSON'
        });
    }
    isJson() {
        return false;
    }
}
exports.RequestResponseError = RequestResponseError;
class RequestClient extends RetryPolicy {
    createRequestResponse(resp) {
        return resp.multipart ? new MultipartRequestResponse(resp) : new HttpResponse(resp);
    }
    requestFailure(error) {
        if (error.response) return new RequestResponseError(this.createRequestResponse(error.response));
        const timedOut = error.code === 'ETIMEDOUT';
        return new error_2.FirebaseAppError({
            code: timedOut ? error_2.AppErrorCode.NETWORK_TIMEOUT : error_2.AppErrorCode.NETWORK_ERROR,
            message: timedOut ? `Error while making request: ${error.message}.`
                : `Error while making request: ${error.message}. Error code: ${error.code}`,
            cause: error,
        });
    }
}
exports.RequestClient = RequestClient;
class HttpClient extends RequestClient {
    send(config) { return this.sendWithRetry(config); }
    async sendWithRetry(config, retryAttempts = 0) {
        let plan;
        try { plan = new HttpRequestPlan(config); }
        catch (error) { throw this.requestFailure(error); }
        for (;;) {
            try { return this.createRequestResponse(await plan.send()); }
            catch (error) {
                const [delay, eligible] = this.getRetryDelayMillis(retryAttempts, error);
                if (!eligible || !this.retry || delay > this.retry.maxDelayInMillis)
                    throw this.requestFailure(error);
                await this.waitForRetry(delay);
                retryAttempts++;
            }
        }
    }
}
exports.HttpClient = HttpClient;
class Http2Client extends RequestClient {
    send(config) { return this.sendWithRetry(config); }
    async sendWithRetry(config, retryAttempts = 0) {
        let plan;
        try { plan = new Http2RequestPlan(config); }
        catch (error) { throw this.requestFailure(error); }
        for (;;) {
            try { return this.createRequestResponse(await plan.send()); }
            catch (error) {
                const [delay, eligible] = this.getRetryDelayMillis(retryAttempts, error);
                if (!eligible || !this.retry || delay > this.retry.maxDelayInMillis)
                    throw this.requestFailure(error);
                await this.waitForRetry(delay);
                retryAttempts++;
            }
        }
    }
}
exports.Http2Client = Http2Client;
/**
 * Parses a full HTTP or HTTP/2 response message containing both a header and a body.
 *
 * @param response - The HTTP or HTTP/2 response to be parsed.
 * @param config - The request configuration that resulted in the HTTP or HTTP/2 response.
 * @returns An object containing the response's parsed status, headers and the body.
 */
function parseHttpResponse(response, config) {
    const responseText = validator.isBuffer(response) ?
        response.toString('utf-8') : response;
    const endOfHeaderPos = responseText.indexOf('\r\n\r\n');
    const headerLines = responseText.substring(0, endOfHeaderPos).split('\r\n');
    const statusLine = headerLines[0];
    const status = statusLine.trim().split(/\s/)[1];
    const headers = {};
    headerLines.slice(1).forEach((line) => {
        const colonPos = line.indexOf(':');
        const name = line.substring(0, colonPos).trim().toLowerCase();
        const value = line.substring(colonPos + 1).trim();
        headers[name] = value;
    });
    let data = responseText.substring(endOfHeaderPos + 4);
    if (data.endsWith('\n')) {
        data = data.slice(0, -1);
    }
    if (data.endsWith('\r')) {
        data = data.slice(0, -1);
    }
    const lowLevelResponse = {
        status: parseInt(status, 10),
        headers,
        data,
        config,
        request: null,
    };
    if (!validator.isNumber(lowLevelResponse.status)) {
        throw new error_2.FirebaseAppError({ code: error_2.AppErrorCode.INTERNAL_ERROR, message: 'Malformed HTTP status line.' });
    }
    return new HttpResponse(lowLevelResponse);
}
class AuthorizedHttpClient extends HttpClient {
    constructor(app) {
        super();
        this.app = app;
    }
    async send(request) {
        const captured = captureRequest(request);
        const token = await this.getToken();
        return super.send(authorizeRequest(captured, this.app, token, true));
    }
    getToken() {
        return this.app.INTERNAL.getToken()
            .then((accessTokenObj) => accessTokenObj.accessToken);
    }
}
exports.AuthorizedHttpClient = AuthorizedHttpClient;
class AuthorizedHttp2Client extends Http2Client {
    constructor(app) {
        super();
        this.app = app;
    }
    async send(request) {
        const captured = captureRequest(request);
        const token = await this.getToken();
        return super.send(authorizeRequest(captured, this.app, token, false));
    }
    getToken() {
        return this.app.INTERNAL.getToken()
            .then((accessTokenObj) => accessTokenObj.accessToken);
    }
}
exports.AuthorizedHttp2Client = AuthorizedHttp2Client;
/**
 * Class that defines all the settings for the backend API endpoint.
 *
 * @param endpoint - The Firebase Auth backend endpoint.
 * @param httpMethod - The HTTP method for that endpoint.
 * @constructor
 */
class ApiSettings {
    constructor(endpoint, httpMethod = 'POST') {
        this.endpoint = endpoint;
        this.httpMethod = httpMethod;
        this.setRequestValidator(null)
            .setResponseValidator(null);
    }
    /** @returns The backend API endpoint. */
    getEndpoint() {
        return this.endpoint;
    }
    /** @returns The request HTTP method. */
    getHttpMethod() {
        return this.httpMethod;
    }
    /**
     * @param requestValidator - The request validator.
     * @returns The current API settings instance.
     */
    setRequestValidator(requestValidator) {
        const nullFunction = () => undefined;
        this.requestValidator = requestValidator || nullFunction;
        return this;
    }
    /** @returns The request validator. */
    getRequestValidator() {
        return this.requestValidator;
    }
    /**
     * @param responseValidator - The response validator.
     * @returns The current API settings instance.
     */
    setResponseValidator(responseValidator) {
        const nullFunction = () => undefined;
        this.responseValidator = responseValidator || nullFunction;
        return this;
    }
    /** @returns The response validator. */
    getResponseValidator() {
        return this.responseValidator;
    }
}
exports.ApiSettings = ApiSettings;
/**
 * Class used for polling an endpoint with exponential backoff.
 *
 * Example usage:
 * ```
 * const poller = new ExponentialBackoffPoller();
 * poller
 *     .poll(() => {
 *       return myRequestToPoll()
 *           .then((responseData: any) => {
 *             if (!isValid(responseData)) {
 *               // Continue polling.
 *               return null;
 *             }
 *
 *             // Polling complete. Resolve promise with final response data.
 *             return responseData;
 *           });
 *     })
 *     .then((responseData: any) => {
 *       console.log(`Final response: ${responseData}`);
 *     });
 * ```
 */
class ExponentialBackoffPoller extends events_1.EventEmitter {
    constructor(initialPollingDelayMillis = 1000, maxPollingDelayMillis = 10000, masterTimeoutMillis = 60000) {
        super();
        this.initialPollingDelayMillis = initialPollingDelayMillis;
        this.maxPollingDelayMillis = maxPollingDelayMillis;
        this.masterTimeoutMillis = masterTimeoutMillis;
        this.numTries = 0;
        this.completed = false;
    }
    /**
     * Poll the provided callback with exponential backoff.
     *
     * @param callback - The callback to be called for each poll. If the
     *     callback resolves to a falsey value, polling will continue. Otherwise, the truthy
     *     resolution will be used to resolve the promise returned by this method.
     * @returns A Promise which resolves to the truthy value returned by the provided
     *     callback when polling is complete.
     */
    poll(callback) {
        if (this.pollCallback) {
            throw new Error('poll() can only be called once per instance of ExponentialBackoffPoller');
        }
        this.pollCallback = callback;
        this.on('poll', this.repoll);
        this.masterTimer = setTimeout(() => {
            if (this.completed) {
                return;
            }
            this.markCompleted();
            this.reject(new Error('ExponentialBackoffPoller deadline exceeded - Master timeout reached'));
        }, this.masterTimeoutMillis);
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.repoll();
        });
    }
    repoll() {
        this.pollCallback()
            .then((result) => {
            if (this.completed) {
                return;
            }
            if (!result) {
                this.repollTimer =
                    setTimeout(() => this.emit('poll'), this.getPollingDelayMillis());
                this.numTries++;
                return;
            }
            this.markCompleted();
            this.resolve(result);
        })
            .catch((err) => {
            if (this.completed) {
                return;
            }
            this.markCompleted();
            this.reject(err);
        });
    }
    getPollingDelayMillis() {
        const increasedPollingDelay = Math.pow(2, this.numTries) * this.initialPollingDelayMillis;
        return Math.min(increasedPollingDelay, this.maxPollingDelayMillis);
    }
    markCompleted() {
        this.completed = true;
        if (this.masterTimer) {
            clearTimeout(this.masterTimer);
        }
        if (this.repollTimer) {
            clearTimeout(this.repollTimer);
        }
    }
}
exports.ExponentialBackoffPoller = ExponentialBackoffPoller;
exports.Http2SessionHandler = Http2SessionHandler;
