'use strict';
const {warn} = require('../logger/index.js');
let registration;

function onInit(callback) {
  if (typeof callback !== 'function') throw new TypeError('onInit expects a function');
  if (registration) warn('Setting onInit callback more than once. Only the most recent callback will be called');
  // Each registration owns its completion. An older invocation finishing later
  // cannot accidentally mark a replacement callback initialized.
  registration = {callback, done: false, pending: undefined};
}

function withInit(handler) {
  return async function initializedHandler(...args) {
    const state = registration;
    if (state && !state.done) {
      state.pending ??= Promise.resolve().then(() => Reflect.apply(state.callback, undefined, [])).then(() => {
        state.done = true;
      }, error => {
        state.pending = undefined;
        throw error;
      });
      await state.pending;
    }
    return Reflect.apply(handler, this, args);
  };
}

exports.onInit = onInit;
exports.withInit = withInit;
