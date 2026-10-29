'use strict';
// Copyright 2026 VentiMath. Apache-2.0; see ../LICENSE.
const bodyParser = require('vbody-parser');
const NON_ASCII = /[^\x00-\x7f]/;
const matched = () => true;

module.exports = function createBodyParser() {
    const options = {
        limit: '1024mb',
        verify(req, res, buffer) { req.rawBody = buffer; },
    };
    // These private parsers are reached only after an exact ASCII media-type
    // match below. Keep the reader's framing and full parameter/charset checks,
    // without repeating the same media-type classification through vtype-is.
    const json = bodyParser.json({ ...options, type: matched });
    const text = bodyParser.text({ ...options, type: matched });
    const form = bodyParser.urlencoded({ ...options, extended: true, type: matched });
    const raw = bodyParser.raw({ ...options, type: '*/*' });

    function select(type) {
        switch (type) {
            case 'application/json':
            case 'application/cloudevents+json': return json;
            case 'text/plain': return text;
            case 'application/x-www-form-urlencoded': return form;
        }
    }
    return function parseBody(req, res, next) {
        const header = Object.hasOwn(req.headers, 'content-type') ? req.headers['content-type'] : undefined;
        let parser = select(header);
        if (!parser && typeof header === 'string') {
            let end = header.indexOf(';');
            if (end === -1) end = header.length;
            let start = 0;
            // Only HTTP's ASCII optional whitespace is allowed. String.trim()
            // would also accept NBSP/BOM and weaken the original type checks.
            while (start < end && (header.charCodeAt(start) === 32 || header.charCodeAt(start) === 9)) start++;
            while (end > start && (header.charCodeAt(end - 1) === 32 || header.charCodeAt(end - 1) === 9)) end--;
            const type = header.slice(start, end);
            if (!NON_ASCII.test(type)) parser = select(type.toLowerCase());
        }
        // Unrecognized, absent or invalid types use the fully checked fallback.
        // The original header is never changed or replaced by its normalized span.
        return (parser || raw)(req, res, next);
    };
};
