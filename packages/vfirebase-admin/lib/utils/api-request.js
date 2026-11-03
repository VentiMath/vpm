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
exports.Http2SessionHandler = exports.ApiSettings = exports.AuthorizedHttp2Client = exports.AuthorizedHttpClient = exports.Http2Client = exports.HttpClient = exports.RequestClient = exports.RequestResponseError = void 0;
const {RetryPolicy, defaultRetryConfig} = require("./request-retry");
exports.defaultRetryConfig = defaultRetryConfig;
const {HttpResponse, RequestResponseError} = require("./http-response");
const error_2 = require("../app/error");
const {HttpRequestPlan} = require("./http-request");
const {Http2RequestPlan} = require("./http2-request");
const {Http2SessionHandler} = require("./http2-session");
const {captureRequest, authorizeRequest} = require("./authorized-request");
exports.RequestResponseError = RequestResponseError;
class RequestClient extends RetryPolicy {
    createRequestResponse(resp) {
        return new HttpResponse(resp);
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
// Small endpoint descriptor shared by the owned Auth transport.
const noop=()=>{};
class ApiSettings {
    constructor(endpoint,httpMethod='POST'){this.endpoint=endpoint;this.httpMethod=httpMethod;this.requestValidator=noop;this.responseValidator=noop;}
    getEndpoint(){return this.endpoint;}
    getHttpMethod(){return this.httpMethod;}
    setRequestValidator(fn){this.requestValidator=fn||noop;return this;}
    getRequestValidator(){return this.requestValidator;}
    setResponseValidator(fn){this.responseValidator=fn||noop;return this;}
    getResponseValidator(){return this.responseValidator;}
}
exports.ApiSettings=ApiSettings;
exports.Http2SessionHandler = Http2SessionHandler;
