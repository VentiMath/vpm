// Modified for VPM; see PROVENANCE.json for changes and upstream sources.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncLocalStorageMiddleware = asyncLocalStorageMiddleware;
exports.getCurrentContext = getCurrentContext;
let asyncLocalStorage;
function asyncLocalStorageMiddleware(req, res, next) {
    if (!asyncLocalStorage) {
        const asyncHooks = require('node:async_hooks');
        asyncLocalStorage = new asyncHooks.AsyncLocalStorage();
    }
    asyncLocalStorage.run({
        executionId: req.executionId,
        spanId: req.spanId,
    }, () => {
        next();
    });
}
function getCurrentContext() {
    if (!asyncLocalStorage) {
        return undefined;
    }
    return asyncLocalStorage.getStore();
}
