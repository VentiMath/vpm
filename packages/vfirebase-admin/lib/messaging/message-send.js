'use strict';

// Message ownership, project discovery and batch lifetime are separate from
// the retained FCM schema validators and server-error mapping.
const {snapshotJson} = require('../utils/json-snapshot');
const {validateMessage} = require('./messaging-internal');
const {FirebaseMessagingError, messagingClientErrorCode: codes} = require('./error');
const {Http2SessionHandler} = require('../utils/api-request');
const utils = require('../utils');
const host = 'fcm.googleapis.com';
const projects = new WeakMap();
const paths = new WeakMap();
const invalid = text => new FirebaseMessagingError(codes.INVALID_ARGUMENT, text);

function capture(value) {
    return snapshotJson(value, 'Message payload must not contain cycles.');
}
function checkDryRun(value) {
    if (value !== undefined && typeof value !== 'boolean') throw invalid('dryRun must be a boolean');
}
function payload(message, dryRun) {
    validateMessage(message);
    return dryRun ? {message, validate_only: true} : {message};
}
function projectId(service) {
    let state = projects.get(service);
    if (!state) {state = {}; projects.set(service, state);}
    if (state.value) return Promise.resolve(state.value);
    if (!state.pending) state.pending = Promise.resolve().then(() => utils.findProjectId(service.app)).then(value => {
        if (typeof value !== 'string' || value.length === 0) throw invalid(
            'Failed to determine project ID for Messaging. Initialize the SDK with service account credentials or set project ID as an app option. Alternatively set the GOOGLE_CLOUD_PROJECT environment variable.');
        state.value = value;
        return value;
    }).finally(() => {state.pending = undefined;});
    return state.pending;
}
function urlPath(service) {
    const cached = paths.get(service);
    if (cached) return cached;
    const pending = service.getProjectId().then(project => {
        if (project === '.' || project === '..') throw invalid('Messaging project identifiers cannot be dot segments.');
        let encoded;
        try {encoded = encodeURIComponent(project);} catch {throw invalid('Messaging project identifiers must contain valid Unicode.');}
        return `/v1/projects/${encoded}/messages:send`;
    }).catch(error => {paths.delete(service); throw error;});
    paths.set(service, pending);
    return pending;
}
function send(service, input, dryRun) {
    const message = capture(input);
    validateMessage(message);
    checkDryRun(dryRun);
    const request = dryRun ? {message, validate_only: true} : {message};
    return service.getUrlPath().then(path => service.messagingRequestHandler.invokeRequestHandler(host, path, request))
        .then(response => response.name);
}
function sendEach(service, input, dryRun) {
    if (!Array.isArray(input) || input.length === 0) throw invalid('messages must be a non-empty array');
    const count = input.length;
    if (count > 500) throw invalid('messages list must not contain more than 500 items');
    checkDryRun(dryRun);
    // Copy each item separately: repeating the same message object must not
    // cause schema normalization for one recipient to mutate another's plan.
    const messages = new Array(count);
    for (let i = 0; i < count; i++) messages[i] = capture(input[i]);
    const legacy = service.useLegacyTransport;
    return runBatch(service, messages, dryRun, legacy);
}
async function runBatch(service, messages, dryRun, legacy) {
    const path = await service.getUrlPath();
    const plans = messages.map(message => {
        try {return payload(message, dryRun);} catch (error) {return {error};}
    });
    let session;
    try {
        // Discovery and local validation cannot leave an unused connection.
        if (!legacy && plans.some(plan => plan.message)) session = new Http2SessionHandler(`https://${host}`);
        const handler = service.messagingRequestHandler;
        const outcomes = await Promise.allSettled(plans.map(async plan => {
            if (!plan.message) throw plan.error;
            return session
                ? handler.invokeHttp2RequestHandlerForSendResponse(host, path, plan, session)
                : handler.invokeHttpRequestHandlerForSendResponse(host, path, plan);
        }));
        return collect(outcomes, session?.getErrors() || []);
    } finally {session?.close();}
}
function sessionError(reason, diagnostics) {
    const streamMessage = reason?.message || 'Unknown stream error';
    return new FirebaseMessagingError({
        code: codes.UNKNOWN_ERROR.code,
        message: `${streamMessage}. Session failures: ${diagnostics.map(error => error.message).join(', ')}`,
        cause: new AggregateError([reason, ...diagnostics], 'Stream failure and session failures occurred'),
    });
}
function collect(outcomes, diagnostics = []) {
    let successCount = 0;
    const responses = new Array(outcomes.length);
    for (let i = 0; i < outcomes.length; i++) {
        const outcome = outcomes[i];
        const response = outcome.status === 'fulfilled' ? outcome.value : {
            success: false, error: diagnostics.length ? sessionError(outcome.reason, diagnostics) : outcome.reason,
        };
        responses[i] = response;
        if (response.success) successCount++;
    }
    return {responses, successCount, failureCount: responses.length - successCount};
}
function multicast(service, input, dryRun) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('MulticastMessage must be a non-null object');
    const {tokens, fids, ...base} = capture(input);
    if (tokens !== undefined && !Array.isArray(tokens)) throw invalid('tokens must be a valid array');
    if (fids !== undefined && !Array.isArray(fids)) throw invalid('fids must be a valid array');
    const tokenCount = tokens?.length || 0, fidCount = fids?.length || 0;
    if (tokenCount + fidCount === 0) throw invalid('Either tokens or fids must be a non-empty array');
    if (tokenCount + fidCount > 500) throw invalid('The total number of tokens and fids must not exceed 500.');
    const messages = new Array(tokenCount + fidCount);
    for (let i = 0; i < tokenCount; i++) messages[i] = {...base, token: tokens[i]};
    for (let i = 0; i < fidCount; i++) messages[tokenCount + i] = {...base, fid: fids[i]};
    return service.sendEach(messages, dryRun);
}

Object.assign(exports, {send, sendEach, multicast, projectId, urlPath, collect, sessionError});
