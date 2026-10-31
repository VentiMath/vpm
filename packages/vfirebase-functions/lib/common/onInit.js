const require_logger_index = require('../logger/index.js');

//#region src/common/onInit.ts
let initCallback = null;
let didInit = false;
let initPromise = null;
/**
* Registers a callback that should be run when in a production environment
* before executing any functions code.
* Calling this function more than once leads to undefined behavior.
* @param callback initialization callback to be run before any function executes.
*/
function onInit(callback) {
	if (initCallback) {
		require_logger_index.warn("Setting onInit callback more than once. Only the most recent callback will be called");
	}
	initCallback = callback;
	didInit = false;
	initPromise = null;
}
/** @internal */
function withInit(func) {
	return async (...args) => {
		if (!didInit) {
			if (initCallback) {
				// Upstream awaited the callback per invocation until it finished, so
				// concurrent first invocations each ran it. Share the run in flight;
				// a failed run is retried by the next invocation.
				const callback = initCallback;
				initPromise ??= Promise.resolve().then(() => callback()).catch((error) => {
					initPromise = null;
					throw error;
				});
				await initPromise;
			}
			didInit = true;
		}
		return func(...args);
	};
}

//#endregion
exports.onInit = onInit;
exports.withInit = withInit;