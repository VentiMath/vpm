'use strict';
// Copyright 2026 VentiMath. Apache-2.0; see ../LICENSE.
const bodyParser = require('vbody-parser');

module.exports = function createBodyParser() {
    const options = {
        limit: '1024mb',
        verify(req, res, buffer) { req.rawBody = buffer; },
    };
    const json = bodyParser.json({ ...options, type: ['application/json', 'application/cloudevents+json'] });
    const text = bodyParser.text(options);
    const form = bodyParser.urlencoded({ ...options, extended: true });
    const raw = bodyParser.raw({ ...options, type: '*/*' });

    return function parseBody(req, res, next) {
        let type = req.headers['content-type'];
        if (typeof type === 'string') {
            const end = type.indexOf(';');
            if (end !== -1) type = type.slice(0, end);
            type = type.trim().toLowerCase();
        }
        // This is only dispatch. The selected parser still validates the full
        // original header, framing, charset, encoding and size. Unknown types
        // retain the checked raw-parser fallback, including absent/invalid types.
        switch (type) {
            case 'application/json':
            case 'application/cloudevents+json': return json(req, res, next);
            case 'text/plain': return text(req, res, next);
            case 'application/x-www-form-urlencoded': return form(req, res, next);
            default: return raw(req, res, next);
        }
    };
};
