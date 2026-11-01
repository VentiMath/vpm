'use strict';

const {HttpRequestPlan} = require('./http-request');

// HTTP/2 uses the same captured URL, headers and payload bytes as HTTP/1.
// A session belongs to the batch; a failed attempt destroys only its stream.
class Http2RequestPlan {
    constructor(input) {
        const {method, url, headers, data, timeout, http2SessionHandler} = input;
        this.request = new HttpRequestPlan({method, url, headers, data, timeout});
        this.http2SessionHandler = http2SessionHandler;
        const options = this.request.options;
        // The plan already owns this record; no second copy is needed.
        this.headers = this.request.headers;
        this.headers[':method'] = options.method;
        this.headers[':scheme'] = options.protocol.slice(0, -1);
        this.headers[':path'] = options.path;
    }

    send() {
        return new Promise((resolve, reject) => {
            let stream, decoded, response, chunks, length = 0, wireLength = 0, expectedLength,
                rawEnded = false, decodedEnded = false, settled = false;
            const fail = (error, rawResponse, destroy = true) => {
                if (settled) return;
                settled = true;
                if (chunks) chunks.length = 0;
                Object.assign(error, {config: this, request: stream, response: rawResponse});
                // Keep listeners through destruction: it can emit another error.
                if (destroy) {decoded?.destroy(); stream?.destroy();}
                reject(error);
            };
            const broken = () => fail(Object.assign(Error('aborted'), {code: 'ECONNRESET'}));
            try {
                stream = this.http2SessionHandler.session.request(this.headers);
                stream.on('error', fail);
                stream.once('aborted', broken);
                stream.once('end', () => {
                    rawEnded = true;
                    if (!response || stream.rstCode || (expectedLength !== undefined && expectedLength !== wireLength)) broken();
                });
                stream.once('close', () => {if (!rawEnded || stream.rstCode) broken();});
                stream.once('response', incoming => {
                    if (settled) return;
                    try {
                        const status = incoming[':status'];
                        if (!status) throw Error('Expected a statusCode on the response from a ClientRequest');
                        const headers = {...incoming};
                        response = {status, headers, config: this, request: stream, data: undefined};
                        if (headers['content-length'] !== undefined && this.request.method !== 'HEAD' && status !== 204 && status !== 304) {
                            const size = String(headers['content-length']);
                            expectedLength = Number(size);
                            if (!/^\d+$/.test(size) || !Number.isSafeInteger(expectedLength)) throw Error('Invalid HTTP/2 response content-length');
                            stream.on('data', chunk => {wireLength += chunk.length; if (wireLength > expectedLength) broken();});
                        }
                        const type = headers['content-type'] || '';
                        if (/^multipart\//i.test(type) && /;\s*boundary\s*=\s*(?:"[^"]+"|[^;\s]+)/i.test(type)) {
                            if (status >= 200 && status < 300)
                                fail(Object.assign(Error('Received a multipart response, which no Firebase Admin API reads and vfirebase-admin does not parse'), {code: 'ERR_UNSUPPORTED_MULTIPART_RESPONSE'}));
                            else fail(Error('Request failed with status code ' + status), response);
                            return;
                        }
                        const encoding = String(headers['content-encoding'] || '').trim().toLowerCase();
                        const decoder = encoding === 'br' ? require('node:zlib').createBrotliDecompress() :
                            ['gzip', 'compress', 'deflate'].includes(encoding) ? require('node:zlib').createUnzip() : undefined;
                        decoded = decoder || stream;
                        if (decoder) {
                            delete headers['content-encoding'];
                            decoder.on('error', fail);
                            decoder.once('close', () => {if (!decodedEnded && !settled) broken();});
                            stream.pipe(decoder);
                        }
                        chunks = [];
                        decoded.on('data', chunk => {if (!settled) {chunks.push(chunk); length += chunk.length;}});
                        decoded.once('end', () => {
                            decodedEnded = true;
                            if (settled) return;
                            response.data = Buffer.concat(chunks, length).toString();
                            chunks.length = 0;
                            if (status < 200 || status >= 300) fail(Error('Request failed with status code ' + status), response, false);
                            else {settled = true; resolve(response);}
                        });
                    } catch (error) {fail(error);}
                });
                if (this.request.timeout) stream.setTimeout(this.request.timeout, () =>
                    fail(Object.assign(Error(`timeout of ${this.request.timeout}ms exceeded`), {code: 'ETIMEDOUT'})));
                stream.end(this.request.data);
            } catch (error) {fail(error);}
        });
    }
}

exports.Http2RequestPlan = Http2RequestPlan;
