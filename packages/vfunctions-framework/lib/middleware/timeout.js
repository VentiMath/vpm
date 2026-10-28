// Modified for VPM; see PROVENANCE.json for changes and upstream sources.
"use strict";
exports.timeoutMiddleware = timeoutMilliseconds => (req, res, next) => {
    if (timeoutMilliseconds > 0) {
        const controller = req.abortController = new AbortController();
        req.setTimeout(timeoutMilliseconds);
        const cleanup = () => {
            req.removeListener('aborted', onClose);
            res.removeListener('timeout', onTimeout);
            res.removeListener('finish', onFinish);
            res.removeListener('close', onClose);
            // Avoid carrying a request-specific idle timeout onto keep-alive reuse.
            req.setTimeout(0);
        };
        const onTimeout = () => { cleanup(); controller.abort('timeout'); };
        const onClose = () => { cleanup(); if (!res.writableFinished) controller.abort('request closed'); };
        const onFinish = () => { cleanup(); };
        req.on('aborted', onClose);
        res.on('timeout', onTimeout);
        res.on('finish', onFinish);
        res.on('close', onClose);
    }
    next();
};
