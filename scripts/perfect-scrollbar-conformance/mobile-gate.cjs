'use strict';
const MobileDetect = require('mobile-detect');

// These two functions compare orders of evaluation for the app's scroll
// decision. Keeping them here makes the experiment reproducible on either VM.
function current(browser, isNative, Detector = MobileDetect) {
  if (!browser) return false;
  const detector = new Detector(browser.navigator.userAgent);
  const touch = 'ontouchstart' in browser || browser.navigator.maxTouchPoints > 0;
  const native = isNative();
  return Boolean(detector.mobile()) || touch || native;
}
function capabilityFirst(browser, isNative, Detector = MobileDetect) {
  if (!browser) return false;
  return 'ontouchstart' in browser || browser.navigator.maxTouchPoints > 0 ||
    isNative() || Boolean(new Detector(browser.navigator.userAgent).mobile());
}
module.exports = {current, capabilityFirst};
