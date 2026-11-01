'use strict';
const cors = require('vcors');
const common = require('../../common/providers/https.js');
const {Expression} = require('../../params/types.js');
const debug = require('../../common/debug.js');
const {withInit} = require('../../common/onInit.js');
const {wrapTraceContext} = require('../trace.js');
const {getGlobalOptions} = require('../options.js');
const {FunctionDefinition} = require('../../runtime/definition.js');
const logger = require('../../logger/index.js');
const decorateInvocation = handler => wrapTraceContext(withInit(handler));
const resolved = value => value instanceof Expression ? value.value() : value;

function withCors(options, next) {
  return (request, response) => new Promise((resolve, reject) => {
    let settled = false;
    const settle = (complete, value) => {
      if (settled) return;
      settled = true;
      response.removeListener?.('finish', finished);
      complete(value);
    };
    const finished = () => settle(resolve);
    response.on('finish', finished);
    try {
      const middleware = cors({origin: common.resolveCorsOrigin(options.cors)});
      middleware(request, response, error => {
        if (error) return settle(reject, error);
        Promise.resolve(next(request, response)).then(value => settle(resolve, value), error => settle(reject, error));
      });
    } catch (error) {settle(reject, error);}
  });
}

function onRequest(options, handler) {
  if (arguments.length === 1) [options, handler] = [{}, options];
  const definition = new FunctionDefinition(options, 'https');
  let invoke = common.withErrorHandler(handler);
  if ('cors' in options || debug.isDebugFeatureEnabled('enableCors')) invoke = withCors(options, invoke);
  return definition.attach(decorateInvocation(invoke), {httpsTrigger: definition.httpTrigger()},
    () => definition.annotations({httpsTrigger: definition.httpTrigger(true)}));
}

function onCall(options, handler) {
  if (arguments.length === 1) [options, handler] = [{}, options];
  const definition = new FunctionDefinition(options, 'https');
  const invoke = common.onCallHandler({
    cors: {origin: 'cors' in options ? options.cors : true, methods: 'POST'},
    enforceAppCheck: resolved(options.enforceAppCheck ?? getGlobalOptions().enforceAppCheck),
    consumeAppCheckToken: resolved(options.consumeAppCheckToken),
    heartbeatSeconds: options.heartbeatSeconds, authPolicy: options.authPolicy,
  }, (request, response) => handler(request, response), 'gcfv2');
  const fn = definition.attach(decorateInvocation(invoke), {callableTrigger: {}},
    () => definition.annotations({httpsTrigger: {allowInsecure: false}}, {'deployment-callable': 'true'}));
  fn.run = withInit(handler);
  // Kept as the upstream placeholder rather than claiming a working stream API.
  fn.stream = () => ({stream: {next: () => Promise.reject('Coming soon')}, output: Promise.reject('Coming soon')});
  return fn;
}

function onCallGenkit(options, action) {
  if (arguments.length === 1) [options, action] = [{}, options];
  if (!options.secrets?.length) logger.debug(`Genkit function for ${action.__action.name} is not bound to any secret. This may mean that you are not storing API keys as a secret or that you are not binding your secret to this function. See https://firebase.google.com/docs/functions/config-env?gen=2nd#secret_parameters for more information.`);
  const fn = onCall(options, async (request, response) => {
    const context = {};
    for (const key of ['auth', 'app', 'instanceIdToken']) if (Object.hasOwn(request, key)) context[key] = request[key];
    if (!request.acceptsStreaming) return (await action.run(request.data, {context})).result;
    const {stream, output} = action.stream(request.data, {context});
    for await (const chunk of stream) await response.sendChunk(chunk);
    return output;
  });
  fn.__endpoint.callableTrigger.genkitAction = action.__action.name;
  return fn;
}

const api = {
  HttpsError: common.HttpsError, onCall, onRequest, onCallGenkit,
  isSignedIn: () => auth => !!auth,
  hasClaim: (claim, value) => auth => !!auth && claim in auth.token && (!value || auth.token[claim] === value),
};
Object.assign(exports, api, {https_exports: api});
