"use strict";
// A request plan owns wire bytes across attempts. Each attempt owns its streams
// and settles exactly once, including failures after response headers arrive.
const http = require('node:http');
const https = require('node:https');

class HttpRequestPlan {
  constructor(input) {
    const {method: requestedMethod, url: requestedUrl, headers: inputHeaders, data, timeout, httpAgent} = input;
    const method = (requestedMethod || 'GET').toUpperCase();
    if (typeof requestedUrl !== 'string') throw TypeError('Request URL must be a string');
    const address = /^https?:\/\//i.test(requestedUrl) ? requestedUrl : 'https://' + requestedUrl;
    const url = new URL(address);
    const headers = inputHeaders ? Object.create(null) : {};
    if (inputHeaders) for (const key of Object.keys(inputHeaders)) {
      const value = inputHeaders[key];
      headers[key.toLowerCase()] = Array.isArray(value) ? value.slice() : value;
    }
    let body;
    if (data) {
      if (method === 'GET' || method === 'HEAD') {
        if (typeof data !== 'object' || data === null || Array.isArray(data) || Buffer.isBuffer(data))
          throw Error(`${method} requests cannot have a body`);
        for (const [key, value] of Object.entries(data)) url.searchParams.append(key, value);
      } else {
        if (Buffer.isBuffer(data)) body = Buffer.from(data);
        else if (typeof data === 'string') body = Buffer.from(data);
        else if (typeof data === 'object' && !Array.isArray(data)) {
          body = Buffer.from(JSON.stringify(data));
          if (headers['content-type'] === undefined) headers['content-type'] = 'application/json;charset=utf-8';
        } else throw Error('Request data must be a string, a Buffer or a json serializable object');
        headers['content-length'] = String(body.length);
      }
    }
    this.method = method; this.url = url.href; this.headers = headers;
    this.data = body; this.timeout = timeout; this.httpAgent = httpAgent;
    this.options = {protocol: url.protocol, hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? '443' : '80'),
      path: url.pathname + url.search, method, agent: httpAgent, headers};
  }
  send() {
    return new Promise((resolve, reject) => {
      let request, response, stream, chunks, settled = false;
      const fail = (error, rawResponse, destroy = true) => {
        if (settled) return;
        settled = true;
        if (chunks) chunks.length = 0;
        Object.assign(error, {config: this, request, response: rawResponse});
        // Keep error listeners installed through destroy: teardown itself may
        // emit errors, which must not become an uncaught second failure.
        if (destroy) {stream?.destroy(); response?.destroy(); request?.destroy();}
        else request.setTimeout(0);
        reject(error);
      };
      const broken = () => fail(Object.assign(Error('aborted'), {code: 'ECONNRESET'}));
      try {
        const transport = this.options.protocol === 'https:' ? https : http;
        request = transport.request(this.options, incoming => {
          response = incoming;
          response.on('error', fail);
          response.once('aborted', broken);
          response.once('close', () => {if (response.complete === false) broken();});
          try {
            const status = response.statusCode;
            if (!status) throw Error('Expected a statusCode on the response from a ClientRequest');
            const headers = {...response.headers};
            const raw = {status, headers, request, config: this, data: undefined};
            const contentType = headers['content-type'] || '';
            if (/^multipart\//i.test(contentType) && /;\s*boundary\s*=\s*(?:"[^"]+"|[^;\s]+)/i.test(contentType)) {
              if (status >= 200 && status < 300) fail(Object.assign(Error('Received a multipart response, which no Firebase Admin API reads and vfirebase-admin does not parse'), {code: 'ERR_UNSUPPORTED_MULTIPART_RESPONSE'}));
              else fail(Error('Request failed with status code ' + status), raw);
              return;
            }
            const encoding = String(headers['content-encoding'] || '').trim().toLowerCase();
            const decoder = encoding === 'br' ? require('node:zlib').createBrotliDecompress() :
              ['gzip', 'compress', 'deflate'].includes(encoding) ? require('node:zlib').createUnzip() : undefined;
            stream = decoder || response;
            if (decoder) {delete headers['content-encoding']; decoder.on('error', fail); response.pipe(decoder);}
            chunks = []; let length = 0, ended = false;
            stream.on('data', chunk => {chunks.push(chunk); length += chunk.length;});
            if (decoder) stream.once('close', () => {if (!ended && !settled) broken();});
            stream.once('end', () => {
              ended = true;
              if (settled) return;
              raw.data = Buffer.concat(chunks, length).toString();
              chunks.length = 0;
              if (status < 200 || status >= 300) fail(Error('Request failed with status code ' + status), raw, false);
              else {settled = true; request.setTimeout(0); resolve(raw);}
            });
          } catch (error) {fail(error);}
        });
        request.on('error', fail);
        if (this.timeout) request.setTimeout(this.timeout, () => fail(Object.assign(Error(`timeout of ${this.timeout}ms exceeded`), {code: 'ETIMEDOUT'})));
        request.end(this.data);
      } catch (error) {fail(error);}
    });
  }
}
exports.HttpRequestPlan = HttpRequestPlan;
