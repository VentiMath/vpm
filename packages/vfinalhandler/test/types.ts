import finalhandler = require('vfinalhandler');
import defaultImport from 'vfinalhandler';
import { createServer } from 'node:http';
import { createServer as createHttp2Server } from 'node:http2';

createServer((req, res) => {
  finalhandler(req, res, { env: 'production', onerror(error, request, response) {
    const original: typeof req = request;
    const output: typeof res = response;
    const value: unknown = error;
    void [original, output, value];
  } })(new Error('failure'));
  defaultImport(req, res)();
  // @ts-expect-error onerror must be callable
  finalhandler(req, res, { onerror: true });
  // @ts-expect-error env must be a string
  finalhandler(req, res, { env: 1 });
});

createHttp2Server((req, res) => finalhandler(req, res)());
