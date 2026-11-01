/*! firebase-admin v14.5.0 */
"use strict";
/*!
 * Copyright 2019 Google LLC
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

const {FirebaseMessagingError, messagingClientErrorCode: codes} = require('./error');
const {toHttpResponse} = require('../utils/error');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const own = (value, key) => record(value) && Object.hasOwn(value, key);
const detailType = 'type.googleapis.com/google.firebase.fcm.v1.FcmError';

// The wire error envelope is data, including malformed or prototype-named fields.
// Select a usable FCM detail first, then the canonical status or legacy message.
function getErrorCode(response) {
    if (!own(response, 'error')) return null;
    const error = response.error;
    if (typeof error === 'string') return error;
    if (!record(error)) return null;
    if (Array.isArray(error.details)) {
        for (const detail of error.details) {
            if (record(detail) && detail['@type'] === detailType && text(detail.errorCode)) return detail.errorCode;
        }
    }
    return text(error.status) ? error.status : text(error.message) ? error.message : null;
}
function getErrorMessage(response) {
    const error = own(response, 'error') ? response.error : null;
    return record(error) && text(error.message) ? error.message : null;
}
function hasServerError(response) {return own(response, 'error') && response.error !== undefined;}
function requestMessage(config) {
    let data = config?.data;
    if (typeof data === 'string' || Buffer.isBuffer(data)) {
        try {data = JSON.parse(typeof data === 'string' ? data : data.toString('utf8'));} catch {return undefined;}
    }
    return record(data) ? data.message : undefined;
}
function createFirebaseError(cause) {
    const response = cause.response;
    if (response.isJson()) {
        const data = response.data;
        let code = getErrorCode(data);
        if ((code === 'UNREGISTERED' || code === 'NOT_FOUND') && typeof requestMessage(response.config)?.fid === 'string') code = 'UNREGISTERED_FID';
        return FirebaseMessagingError.fromServerError(code, getErrorMessage(data), cause);
    }
    const status = response.status;
    const info = status === 400 ? codes.INVALID_ARGUMENT : status === 401 || status === 403 ? codes.AUTHENTICATION_ERROR
        : status === 500 ? codes.INTERNAL_ERROR : status === 503 ? codes.SERVER_UNAVAILABLE : codes.UNKNOWN_ERROR;
    return new FirebaseMessagingError({code: info.code,
        message: `${info.message} Raw server response: "${response.text}". Status code: ${status}.`,
        httpResponse: toHttpResponse(response), cause});
}
Object.assign(exports, {createFirebaseError, getErrorCode, getErrorMessage, hasServerError});
