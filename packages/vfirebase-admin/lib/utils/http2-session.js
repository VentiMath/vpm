'use strict';

const http2 = require('node:http2');
const {FirebaseAppError, AppErrorCode} = require('../app/error');

// Each generation owns its diagnostics. Late events from a closing connection
// cannot contaminate the next batch, and observing errors cannot erase them.
class Http2SessionHandler {
    #current;
    constructor(url) {this.createSession(url);}
    createSession(url) {
        if (this.#current && !this.isCurrentSessionClosed) return this.#current.session;
        const session = http2.connect(url, {peerMaxConcurrentStreams: 100, ALPNProtocols: ['h2']});
        const record = {session, errors: [], closing: false};
        session.on('goaway', (code, _lastStream, data) => {
            record.errors.push(new FirebaseAppError({code: AppErrorCode.NETWORK_ERROR,
                message: `Error while making requests: GOAWAY - ${data?.toString()}, Error code: ${code}`}));
        });
        session.on('error', cause => {
            const prefix = cause?.code ? `${cause.code} - ` : '';
            const aggregate = (cause instanceof AggregateError || cause?.name === 'AggregateError') && Array.isArray(cause.errors);
            const detail = aggregate ? `${cause.name}: [${cause.errors.map(error => error?.message ?? String(error)).join(', ')}]`
                : cause?.message || 'Unknown error';
            record.errors.push(new FirebaseAppError({code: AppErrorCode.NETWORK_ERROR,
                message: `Session error while making requests: ${prefix}${detail}`, cause}));
        });
        this.#current = record;
        return session;
    }
    get session() {return this.#current?.session;}
    get isCurrentSessionClosed() {
        const current = this.#current;
        return !!(current && (current.closing || current.session.closed || current.session.destroyed));
    }
    getErrors() {return this.#current ? this.#current.errors.slice() : [];}
    close() {
        const current = this.#current;
        if (!current || current.closing) return;
        current.closing = true;
        current.session.close();
    }
}

exports.Http2SessionHandler = Http2SessionHandler;
