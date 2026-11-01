// Share state and implementation with CommonJS consumers.
import implementation from '../../logger/index.js';
export const {write, debug, info, log, warn, error, logger, logger_exports} = implementation;
