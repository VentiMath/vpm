const scheduler = require('@scheduler-runtime');
const stats = globalThis.__schedulerStats = {scheduled:0,executed:0,priorities:[]};
module.exports = {...scheduler, unstable_scheduleCallback(priority, callback, options) {
  stats.scheduled++; stats.priorities.push(priority);
  return scheduler.unstable_scheduleCallback(priority, didTimeout => {stats.executed++;return callback(didTimeout);}, options);
}};
