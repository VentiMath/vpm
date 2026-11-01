'use strict';
const logger = require('../../logger/index.js');
const {withInit} = require('../../common/onInit.js');
const {wrapTraceContext} = require('../trace.js');
const {getGlobalOptions} = require('../options.js');
const {initV2ScheduleTrigger} = require('../../runtime/manifest.js');
const {FunctionDefinition} = require('../../runtime/definition.js');
const retryFields = ['retryCount', 'maxRetrySeconds', 'minBackoffSeconds', 'maxBackoffSeconds', 'maxDoublings'];

function getOpts(input) {
  if (typeof input === 'string') return {schedule: input, opts: {}};
  return {schedule: input.schedule, timeZone: input.timeZone,
    retryConfig: Object.fromEntries(retryFields.map(key => [key, input[key]])), opts: input};
}
function onSchedule(input, handler) {
  const config = getOpts(input);
  const definition = new FunctionDefinition(config.opts, 'scheduledOrTask');
  const scheduleTrigger = initV2ScheduleTrigger(config.schedule, getGlobalOptions(), config.opts);
  if (Object.hasOwn(config, 'timeZone')) scheduleTrigger.timeZone = config.timeZone;
  if (config.retryConfig) Object.assign(scheduleTrigger.retryConfig, config.retryConfig);
  const invoke = async (request, response) => {
    const event = {jobName: request.header('X-CloudScheduler-JobName') || undefined,
      scheduleTime: request.header('X-CloudScheduler-ScheduleTime') || new Date().toISOString()};
    const job = event.jobName || 'unknown-job';
    const context = {eventId: job, timestamp: event.scheduleTime, eventType: 'google.pubsub.topic.publish',
      resource: {service: 'pubsub.googleapis.com', name: `projects/${process.env.GCLOUD_PROJECT}/topics/${job}`}, params: {}};
    Object.defineProperty(event, 'context', {get: () => context});
    try {await handler(event); response.status(200).send();}
    catch (error) {logger.error(error.message); response.status(500).send();}
  };
  const fn = definition.attach(wrapTraceContext(withInit(invoke)), {scheduleTrigger});
  fn.run = handler;
  fn.__requiredAPIs = [{api: 'cloudscheduler.googleapis.com', reason: 'Needed for scheduled functions.'}];
  return fn;
}
exports.getOpts = getOpts;
exports.onSchedule = onSchedule;
exports.scheduler_exports = {getOpts, onSchedule};
