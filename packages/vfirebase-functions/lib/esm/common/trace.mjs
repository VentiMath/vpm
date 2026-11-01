// Share state and implementation with CommonJS consumers.
import implementation from '../../common/trace.js';
export const {traceContext, extractTraceContext} = implementation;
