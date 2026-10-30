'use strict';
const timers = require('@sinonjs/fake-timers');
module.exports = function clocked(fn) {
  const clock = timers.install({now:10000,loopLimit:10000,toFake:['Date','performance','setTimeout','clearTimeout']});
  try {
    const result = fn(clock);
    if (result && typeof result.then === 'function') return result.finally(()=>clock.uninstall());
    clock.uninstall(); return result;
  } catch (error) { clock.uninstall(); throw error; }
};
