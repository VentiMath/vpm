import cors from 'vcors';
import type { IncomingMessage, ServerResponse } from 'node:http';
import express from '../../vexpress';
declare const req: IncomingMessage, res: ServerResponse;
cors()(req, res, error => { void error; });
express().use(cors({ origin: ['https://ventimath.com', /\.example\.test$/g], credentials: true }));
const readonlyOptions = { origin: ['https://ventimath.com', [/example/]] as const, methods: ['GET', 'POST'] as const, allowedHeaders: [] as const, maxAge: 300 };
cors(readonlyOptions);
cors({ origin(origin, callback) { const value: string | undefined = origin; callback(null, value !== undefined); } });
cors<IncomingMessage>((request, callback) => { const method: string | undefined = request.method; callback(null, { origin: method === 'GET' }); });
// @ts-expect-error invalid origin policy
cors({ origin: 42 });
// @ts-expect-error invalid credential flag
cors({ credentials: 'true' });
// @ts-expect-error invalid headers
cors({ allowedHeaders: [false] });
// @ts-expect-error an origin callback cannot return another function as a policy
cors({ origin(_origin, callback) { callback(null, () => true); } });
