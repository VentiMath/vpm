'use strict';

const {FirebaseMessagingError, messagingClientErrorCode: codes} = require('./error');
const {sessionError, encodeProject} = require('./message-send');
const nonempty = value => typeof value === 'string' && value.length > 0;
const invalid = message => new FirebaseMessagingError(codes.INVALID_ARGUMENT, message);
const unknown = message => FirebaseMessagingError.fromTopicManagementServerError('UNKNOWN_ERROR', message);
const topicDiagnostic = method => `Topic provided to ${method}() must be a string which matches the format "/topics/[a-zA-Z0-9-_.~%]+".`;

function capture(tokens, topic, method) {
  // Preserve synchronous type errors, then validate captured values asynchronously.
  if (!nonempty(tokens) && (!Array.isArray(tokens) || tokens.length === 0)) throw invalid(
    `Registration token(s) provided to ${method}() must be a non-empty string or a non-empty array.`);
  if (!nonempty(topic)) throw invalid(topicDiagnostic(method));
  // Bound the snapshot before allocating, even for oversized sparse arrays.
  const copied = typeof tokens === 'string' ? [tokens] : new Array(Math.min(tokens.length, 1001));
  if (Array.isArray(tokens)) for (let i = 0; i < copied.length; i++) copied[i] = Object.hasOwn(tokens, i) ? tokens[i] : undefined;
  return {tokens: copied, topic: topic.startsWith('/topics/') ? topic.slice(8) : topic, method};
}
function validate(plan) {
  const {tokens, topic, method} = plan;
  if (tokens.length > 1000) throw invalid(`Too many registration tokens provided in a single request to ${method}(). Batch your requests to contain no more than 1,000 registration tokens per request.`);
  for (let index = 0; index < tokens.length; index++) if (!nonempty(tokens[index])) throw invalid(
    `Registration token provided to ${method}() at index ${index} must be a non-empty string.`);
  if (!/^(?:private\/)?[a-zA-Z0-9_.~%-]+$/.test(topic)) throw invalid(topicDiagnostic(method));
}
function encodeToken(token, index) {
  if (token === '.' || token === '..') throw invalid(`Registration token at index ${index} cannot be a dot segment.`);
  try {return encodeURIComponent(token);} catch {throw invalid(`Registration token at index ${index} must contain valid Unicode.`);}
}

async function execute(service, plan, legacyTransport) {
  validate(plan);
  // Every path is checked before discovery or session allocation.
  const registrations = plan.tokens.map(encodeToken), topic = encodeURIComponent(plan.topic);
  const project = encodeProject(await service.getProjectId());
  service.assertActive();
  const subscribing = plan.method === 'subscribeToTopic';
  const paths = registrations.map(token => `/v1/projects/${project}/registrations/${token}/topicSubscriptions` +
    (subscribing ? `?topic_name=${topic}` : `/${topic}?allow_missing=true`));
  const outcomes = new Array(paths.length);
  const session = legacyTransport ? undefined : service.openSession();
  let next = 0;
  async function worker() {
    while (next < paths.length) {
      const index = next++;
      try {
        service.assertActive();
        const handler = service.messagingRequestHandler;
        const value = session
          ? await handler.invokeHttp2RequestHandlerForTopicSubscriptionResponse('fcm.googleapis.com', paths[index], plan.method, subscribing ? {} : undefined, session)
          : await handler.invokeHttpRequestHandlerForTopicSubscriptionResponse('fcm.googleapis.com', paths[index], plan.method, subscribing ? {} : undefined);
        outcomes[index] = {status: 'fulfilled', value};
      } catch (reason) {outcomes[index] = {status: 'rejected', reason};}
    }
  }
  try {
    await Promise.all(Array.from({length: Math.min(100, paths.length)}, worker));
    return collect(outcomes, session?.getErrors() || []);
  } finally {if (session) service.closeSession(session);}
}
function collect(outcomes, diagnostics = []) {
  const errors = [];
  for (let index = 0; index < outcomes.length; index++) {
    const result = outcomes[index];
    if (result.status === 'fulfilled' && result.value?.success === true) continue;
    const reason = result.status === 'rejected' ? result.reason : result.value?.error;
    const error = result.status === 'rejected' && diagnostics.length ? sessionError(reason, diagnostics)
      : reason instanceof FirebaseMessagingError ? reason
      : unknown(reason?.message || (reason == null ? 'Unknown error during topic management.' : String(reason)));
    errors.push({index, error});
  }
  return {successCount: outcomes.length - errors.length, failureCount: errors.length, errors};
}
function send(service, tokens, topic, method) {
  const plan = capture(tokens, topic, method), legacy = service.useLegacyTransport;
  // Type errors above stay synchronous; content errors stay rejected promises.
  return Promise.resolve().then(() => execute(service, plan, legacy));
}
function legacy(service, tokens, topic, method, add) {
  const plan = capture(tokens, topic, method);
  return Promise.resolve().then(() => {
    validate(plan); service.assertActive();
    return service.messagingRequestHandler.invokeRequestHandler('iid.googleapis.com', add ? '/iid/v1:batchAdd' : '/iid/v1:batchRemove',
      {to: '/topics/' + plan.topic, registration_tokens: plan.tokens});
  }).then(response => {
    // Retain the legacy empty-envelope contract: no reported outcomes.
    if (response && typeof response === 'object' && !Object.hasOwn(response, 'results')) return {successCount: 0, failureCount: 0, errors: []};
    // Sparse/extra results must not silently erase a recipient's outcome.
    if (!response || !Object.hasOwn(response, 'results') || !Array.isArray(response.results) || response.results.length !== plan.tokens.length) {
      throw unknown('Malformed topic management response: expected one result per registration token.');
    }
    const errors = [];
    for (let index = 0; index < response.results.length; index++) {
      const item = response.results[index];
      if (!Object.hasOwn(response.results, index) || !item || typeof item !== 'object' || Array.isArray(item)) throw unknown(`Malformed topic management result at index ${index}.`);
      if (Object.hasOwn(item, 'error')) errors.push({index,
        error: FirebaseMessagingError.fromTopicManagementServerError(typeof item.error === 'string' ? item.error : 'UNKNOWN_ERROR', undefined, item.error)});
    }
    return {successCount: plan.tokens.length - errors.length, failureCount: errors.length, errors};
  });
}
Object.assign(exports, {send, legacy, collect});
