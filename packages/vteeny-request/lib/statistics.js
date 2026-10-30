'use strict';
const states = new WeakMap();
class TeenyStatisticsWarning extends Error {
  static CONCURRENT_REQUESTS = 'ConcurrentRequestsExceededWarning';
  constructor(message) {super(message); this.name = 'TeenyStatisticsWarning'; this.threshold = 0; this.type = ''; this.value = 0;}
}
class TeenyStatistics {
  static DEFAULT_WARN_CONCURRENT_REQUESTS = 5000;
  constructor(options) {states.set(this, {options: TeenyStatistics._prepareOptions(options), count: 0, warned: false});}
  static _prepareOptions(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Statistics options must be an object');
    const configured = options.concurrentRequests, env = process.env.TEENY_REQUEST_WARN_CONCURRENT_REQUESTS;
    let value = configured ?? (env === undefined || env.trim() === '' ? 5000 : Number(env));
    if (!Number.isSafeInteger(value) || value < 0) {
      if (configured !== undefined) throw new RangeError('concurrentRequests must be a nonnegative safe integer');
      value = 5000;
    }
    return Object.freeze({concurrentRequests: value});
  }
  get _options() {return states.get(this).options;}
  getOptions() {return {...states.get(this).options};}
  setOptions(options) {const state = states.get(this), previous = state.options; state.options = TeenyStatistics._prepareOptions(options); return {...previous};}
  get counters() {return {concurrentRequests: states.get(this).count};}
  requestStarting() {
    const state = states.get(this), threshold = state.options.concurrentRequests;
    state.count++;
    if (threshold && state.count >= threshold && !state.warned) {
      state.warned = true;
      const warning = new TeenyStatisticsWarning('Possible excessive concurrent requests detected. Set TEENY_REQUEST_WARN_CONCURRENT_REQUESTS or concurrentRequests to change the threshold; 0 disables this warning.');
      warning.type = TeenyStatisticsWarning.CONCURRENT_REQUESTS; warning.value = state.count; warning.threshold = threshold;
      process.emitWarning(warning);
    }
  }
  requestFinished() {const state = states.get(this); if (state.count > 0) state.count--;}
}
module.exports = {TeenyStatistics, TeenyStatisticsWarning};
