'use strict';
const trace = require('../common/trace.js');
function wrapTraceContext(handler) {
  return function (...args) {
    const context = trace.extractTraceContext(args.length > 1 ? args[0]?.headers : args[0]);
    return context ? trace.traceContext.run(context, () => Reflect.apply(handler, this, args)) : Reflect.apply(handler, this, args);
  };
}
exports.wrapTraceContext = wrapTraceContext;
