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
exports.Messaging = void 0;
const messageSend = require("./message-send");
const api_request_1 = require("../utils/api-request");
const error_1 = require("./error");
const validator = require("../utils/validator");
const messaging_api_request_internal_1 = require("./messaging-api-request-internal");
// FCM endpoints
const FCM_SEND_HOST = 'fcm.googleapis.com';
const FCM_TOPIC_MANAGEMENT_HOST = 'iid.googleapis.com';
const FCM_TOPIC_MANAGEMENT_ADD_PATH = '/iid/v1:batchAdd';
const FCM_TOPIC_MANAGEMENT_REMOVE_PATH = '/iid/v1:batchRemove';
/**
 * Maps a raw FCM server response to a `MessagingTopicManagementResponse` object.
 *
 * @param {object} response The raw FCM server response to map.
 *
 * @returns {MessagingTopicManagementResponse} The mapped `MessagingTopicManagementResponse` object.
 */
function mapRawResponseToTopicManagementResponse(response) {
    // Add the success and failure counts.
    const result = {
        successCount: 0,
        failureCount: 0,
        errors: [],
    };
    if ('results' in response) {
        response.results.forEach((tokenManagementResult, index) => {
            // Map the FCM server's error strings to actual error objects.
            if ('error' in tokenManagementResult) {
                result.failureCount += 1;
                const newError = error_1.FirebaseMessagingError.fromTopicManagementServerError(tokenManagementResult.error, /* message */ undefined, tokenManagementResult.error);
                result.errors.push({
                    index,
                    error: newError,
                });
            }
            else {
                result.successCount += 1;
            }
        });
    }
    return result;
}
/**
 * Runs a list of async tasks with a maximum concurrency limit.
 *
 * @param tasks - Array of functions that return a Promise.
 * @param limit - Maximum number of tasks to run concurrently.
 * @returns A Promise that resolves with an array of PromiseSettledResult in the same order as the tasks.
 */
async function runWithConcurrencyLimit(tasks, limit = 100) {
    const results = new Array(tasks.length);
    let currentIndex = 0;
    const worker = async () => {
        while (currentIndex < tasks.length) {
            const index = currentIndex++;
            try {
                const value = await tasks[index]();
                results[index] = { status: 'fulfilled', value };
            }
            catch (reason) {
                results[index] = { status: 'rejected', reason };
            }
        }
    };
    const workers = [];
    const workerCount = Math.min(limit, tasks.length);
    for (let i = 0; i < workerCount; i++) {
        workers.push(worker());
    }
    await Promise.all(workers);
    return results;
}
/**
 * Messaging service bound to the provided app.
 */
class Messaging {
    /**
     * @internal
     */
    constructor(app) {
        this.useLegacyTransport = false;
        if (!validator.isNonNullObject(app) || !('options' in app)) {
            throw new error_1.FirebaseMessagingError(error_1.messagingClientErrorCode.INVALID_ARGUMENT, 'First argument passed to admin.messaging() must be a valid Firebase app instance.');
        }
        this.appInternal = app;
        this.messagingRequestHandler = new messaging_api_request_internal_1.FirebaseMessagingRequestHandler(app);
    }
    /**
     * The {@link firebase-admin.app#App} associated with the current `Messaging` service
     * instance.
     *
     * @example
     * ```javascript
     * var app = messaging.app;
     * ```
     */
    get app() {
        return this.appInternal;
    }
    /**
     * Enables the use of legacy HTTP/1.1 transport for `sendEach()` and `sendEachForMulticast()`.
     *
     * @example
     * ```javascript
     * const messaging = getMessaging(app);
     * messaging.enableLegacyTransport();
     * messaging.sendEach(messages);
     * ```
     *
     * @deprecated This will be removed when the HTTP/2 transport implementation reaches the same
     * stability as the legacy HTTP/1.1 implementation.
     */
    enableLegacyHttpTransport() {
        this.useLegacyTransport = true;
    }
    /**
     * Sends the given message via FCM.
     *
     * @param message - The message payload.
     * @param dryRun - Whether to send the message in the dry-run
     *   (validation only) mode.
     * @returns A promise fulfilled with a unique message ID
     *   string after the message has been successfully handed off to the FCM
     *   service for delivery.
     */
    send(message, dryRun) {return messageSend.send(this, message, dryRun);}
    sendEach(messages, dryRun) {return messageSend.sendEach(this, messages, dryRun);}
    sendEachForMulticast(message, dryRun) {return messageSend.multicast(this, message, dryRun);}
    parseSendResponses(results, errors = []) {return messageSend.collect(results, errors);}
    createSessionError(reason, errors) {return messageSend.sessionError(reason, errors);}
    /**
     * Subscribes a device to an FCM topic.
     *
     * See {@link https://firebase.google.com/docs/cloud-messaging/manage-topics#suscribe_and_unsubscribe_using_the |
     * Subscribe to a topic}
     * for code samples and detailed documentation. Optionally, you can provide an
     * array of tokens to subscribe multiple devices.
     *
     * @param registrationTokenOrTokens - A token or array of registration tokens
     *   for the devices to subscribe to the topic.
     * @param topic - The topic to which to subscribe.
     *
     * @returns A promise fulfilled with the server's response after the device has been
     *   subscribed to the topic.
     */
    subscribeToTopic(registrationTokenOrTokens, topic) {
        return this.sendTopicManagementRequestV1(registrationTokenOrTokens, topic, 'subscribeToTopic');
    }
    /**
     * Subscribes a device or list of devices to an FCM topic using the legacy Instance ID API.
     * Served as a backup/legacy endpoint.
     *
     * @param registrationTokenOrTokens - A token or array of registration tokens
     *   for the devices to subscribe to the topic.
     * @param topic - The topic to which to subscribe.
     *
     * @returns A promise fulfilled with the server's response after the device has been
     *   subscribed to the topic.
     *
     * @deprecated Use {@link Messaging.subscribeToTopic} instead.
     */
    subscribeToTopicLegacy(registrationTokenOrTokens, topic) {
        return this.sendTopicManagementRequest(registrationTokenOrTokens, topic, 'subscribeToTopicLegacy', FCM_TOPIC_MANAGEMENT_ADD_PATH);
    }
    /**
     * Unsubscribes a device from an FCM topic.
     *
     * See {@link https://firebase.google.com/docs/cloud-messaging/admin/manage-topic-subscriptions#unsubscribe_from_a_topic |
     * Unsubscribe from a topic}
     * for code samples and detailed documentation.  Optionally, you can provide an
     * array of tokens to unsubscribe multiple devices.
     *
     * @param registrationTokenOrTokens - A device registration token or an array of
     *   device registration tokens to unsubscribe from the topic.
     * @param topic - The topic from which to unsubscribe.
     *
     * @returns A promise fulfilled with the server's response after the device has been
     *   unsubscribed from the topic.
     */
    unsubscribeFromTopic(registrationTokenOrTokens, topic) {
        return this.sendTopicManagementRequestV1(registrationTokenOrTokens, topic, 'unsubscribeFromTopic');
    }
    /**
     * Unsubscribes a device or list of devices from an FCM topic using the legacy Instance ID API.
     * Served as a backup/legacy endpoint.
     *
     * @param registrationTokenOrTokens - A device registration token or an array of
     *   device registration tokens to unsubscribe from the topic.
     * @param topic - The topic from which to unsubscribe.
     *
     * @returns A promise fulfilled with the server's response after the device has been
     *   unsubscribed from the topic.
     *
     * @deprecated Use {@link Messaging.unsubscribeFromTopic} instead.
     */
    unsubscribeFromTopicLegacy(registrationTokenOrTokens, topic) {
        return this.sendTopicManagementRequest(registrationTokenOrTokens, topic, 'unsubscribeFromTopicLegacy', FCM_TOPIC_MANAGEMENT_REMOVE_PATH);
    }
    getProjectId() {return messageSend.projectId(this);}
    getUrlPath() {return messageSend.urlPath(this);}
    /**
     * Helper method which sends and handles topic subscription management requests via FCM v1 API.
     *
     * @param registrationTokenOrTokens - The registration token or an array of
     *     registration tokens to subscribe/unsubscribe.
     * @param topic - The topic to subscribe/unsubscribe.
     * @param methodName - The name of the original method called.
     *
     * @returns A Promise fulfilled with the parsed server response.
     */
    sendTopicManagementRequestV1(registrationTokenOrTokens, topic, methodName) {
        this.validateRegistrationTokensType(registrationTokenOrTokens, methodName);
        this.validateTopicType(topic, methodName);
        const normalizedTopic = this.normalizeTopic(topic);
        return Promise.resolve()
            .then(() => {
            this.validateRegistrationTokens(registrationTokenOrTokens, methodName);
            this.validateTopic(normalizedTopic, methodName);
            let registrationTokensArray = registrationTokenOrTokens;
            if (validator.isString(registrationTokenOrTokens)) {
                registrationTokensArray = [registrationTokenOrTokens];
            }
            const topicName = normalizedTopic.replace(/^\/topics\//, '');
            const http2SessionHandler = this.useLegacyTransport ? undefined : new api_request_1.Http2SessionHandler(`https://${FCM_SEND_HOST}`);
            return this.getProjectId()
                .then((projectId) => {
                const tasks = registrationTokensArray.map((token) => async () => {
                    const encodedToken = encodeURIComponent(token);
                    const encodedTopic = encodeURIComponent(topicName);
                    const basePath = `/v1/projects/${projectId}/registrations/${encodedToken}/topicSubscriptions`;
                    const path = methodName === 'subscribeToTopic'
                        ? `${basePath}?topic_name=${encodedTopic}`
                        : `${basePath}/${encodedTopic}?allow_missing=true`;
                    const requestData = methodName === 'subscribeToTopic' ? {} : undefined;
                    if (http2SessionHandler) {
                        return this.messagingRequestHandler.invokeHttp2RequestHandlerForTopicSubscriptionResponse(FCM_SEND_HOST, path, methodName, requestData, http2SessionHandler);
                    }
                    return this.messagingRequestHandler.invokeHttpRequestHandlerForTopicSubscriptionResponse(FCM_SEND_HOST, path, methodName, requestData);
                });
                return runWithConcurrencyLimit(tasks, 100);
            })
                .then((results) => {
                const sessionErrors = http2SessionHandler ? http2SessionHandler.getErrors() : [];
                return this.parseTopicManagementResponses(results, sessionErrors);
            })
                .finally(() => {
                http2SessionHandler?.close();
            });
        });
    }
    parseTopicManagementResponses(results, sessionErrors = []) {
        const response = {
            successCount: 0,
            failureCount: 0,
            errors: [],
        };
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const tokenResponse = result.value;
                if (tokenResponse.success) {
                    response.successCount += 1;
                }
                else {
                    response.failureCount += 1;
                    const error = tokenResponse.error || error_1.FirebaseMessagingError.fromTopicManagementServerError('UNKNOWN_ERROR', 'Unknown error during topic management.');
                    response.errors.push({
                        index,
                        error,
                    });
                }
            }
            else {
                response.failureCount += 1;
                let error;
                if (sessionErrors.length > 0) {
                    error = this.createSessionError(result.reason, sessionErrors);
                }
                else if (result.reason instanceof error_1.FirebaseMessagingError) {
                    error = result.reason;
                }
                else {
                    error = error_1.FirebaseMessagingError.fromTopicManagementServerError('UNKNOWN_ERROR', result.reason?.message || result.reason?.toString() || 'Unknown error during topic management.');
                }
                response.errors.push({
                    index,
                    error,
                });
            }
        });
        return response;
    }
    /**
     * Helper method which sends and handles topic subscription management requests.
     *
     * @param registrationTokenOrTokens - The registration token or an array of
     *     registration tokens to unsubscribe from the topic.
     * @param topic - The topic to which to subscribe.
     * @param methodName - The name of the original method called.
     * @param path - The endpoint path to use for the request.
     *
     * @returns A Promise fulfilled with the parsed server
     *   response.
     */
    sendTopicManagementRequest(registrationTokenOrTokens, topic, methodName, path) {
        this.validateRegistrationTokensType(registrationTokenOrTokens, methodName);
        this.validateTopicType(topic, methodName);
        // Prepend the topic with /topics/ if necessary.
        topic = this.normalizeTopic(topic);
        return Promise.resolve()
            .then(() => {
            // Validate the contents of the input arguments. Because we are now in a promise, any thrown
            // error will cause this method to return a rejected promise.
            this.validateRegistrationTokens(registrationTokenOrTokens, methodName);
            this.validateTopic(topic, methodName);
            // Ensure the registration token(s) input argument is an array.
            let registrationTokensArray = registrationTokenOrTokens;
            if (validator.isString(registrationTokenOrTokens)) {
                registrationTokensArray = [registrationTokenOrTokens];
            }
            const request = {
                to: topic,
                registration_tokens: registrationTokensArray,
            };
            return this.messagingRequestHandler.invokeRequestHandler(FCM_TOPIC_MANAGEMENT_HOST, path, request);
        })
            .then((response) => {
            return mapRawResponseToTopicManagementResponse(response);
        });
    }
    /**
     * Validates the type of the provided registration token(s). If invalid, an error will be thrown.
     *
     * @param registrationTokenOrTokens - The registration token(s) to validate.
     * @param method - The method name to use in error messages.
     * @param errorInfo - The error info to use if the registration tokens are invalid.
     */
    validateRegistrationTokensType(registrationTokenOrTokens, methodName, errorInfo = error_1.messagingClientErrorCode.INVALID_ARGUMENT) {
        if (!validator.isNonEmptyArray(registrationTokenOrTokens) &&
            !validator.isNonEmptyString(registrationTokenOrTokens)) {
            throw new error_1.FirebaseMessagingError(errorInfo, `Registration token(s) provided to ${methodName}() must be a non-empty string or a ` +
                'non-empty array.');
        }
    }
    /**
     * Validates the provided registration tokens. If invalid, an error will be thrown.
     *
     * @param registrationTokenOrTokens - The registration token or an array of
     *     registration tokens to validate.
     * @param method - The method name to use in error messages.
     * @param errorInfo - The error info to use if the registration tokens are invalid.
     */
    validateRegistrationTokens(registrationTokenOrTokens, methodName, errorInfo = error_1.messagingClientErrorCode.INVALID_ARGUMENT) {
        if (validator.isArray(registrationTokenOrTokens)) {
            // Validate the array contains no more than 1,000 registration tokens.
            if (registrationTokenOrTokens.length > 1000) {
                throw new error_1.FirebaseMessagingError(errorInfo, `Too many registration tokens provided in a single request to ${methodName}(). Batch ` +
                    'your requests to contain no more than 1,000 registration tokens per request.');
            }
            // Validate the array contains registration tokens which are non-empty strings.
            registrationTokenOrTokens.forEach((registrationToken, index) => {
                if (!validator.isNonEmptyString(registrationToken)) {
                    throw new error_1.FirebaseMessagingError(errorInfo, `Registration token provided to ${methodName}() at index ${index} must be a ` +
                        'non-empty string.');
                }
            });
        }
    }
    /**
     * Validates the type of the provided topic. If invalid, an error will be thrown.
     *
     * @param topic - The topic to validate.
     * @param method - The method name to use in error messages.
     * @param errorInfo - The error info to use if the topic is invalid.
     */
    validateTopicType(topic, methodName, errorInfo = error_1.messagingClientErrorCode.INVALID_ARGUMENT) {
        if (!validator.isNonEmptyString(topic)) {
            throw new error_1.FirebaseMessagingError(errorInfo, `Topic provided to ${methodName}() must be a string which matches the format ` +
                '"/topics/[a-zA-Z0-9-_.~%]+".');
        }
    }
    /**
     * Validates the provided topic. If invalid, an error will be thrown.
     *
     * @param topic - The topic to validate.
     * @param method - The method name to use in error messages.
     * @param errorInfo - The error info to use if the topic is invalid.
     */
    validateTopic(topic, methodName, errorInfo = error_1.messagingClientErrorCode.INVALID_ARGUMENT) {
        if (!validator.isTopic(topic)) {
            throw new error_1.FirebaseMessagingError(errorInfo, `Topic provided to ${methodName}() must be a string which matches the format ` +
                '"/topics/[a-zA-Z0-9-_.~%]+".');
        }
    }
    /**
     * Normalizes the provided topic name by prepending it with '/topics/', if necessary.
     *
     * @param topic - The topic name to normalize.
     *
     * @returns The normalized topic name.
     */
    normalizeTopic(topic) {
        if (!/^\/topics\//.test(topic)) {
            topic = `/topics/${topic}`;
        }
        return topic;
    }
}
exports.Messaging = Messaging;
