import forwarded from 'vforwarded';
import type { IncomingMessage } from 'node:http';
declare const request: IncomingMessage;
const addresses: forwarded.Addresses = forwarded(request);
const first: string | undefined = addresses[0];
const legacy = forwarded({ headers: { 'x-forwarded-for': '198.51.100.1' }, connection: {} });
forwarded(Object.freeze({ headers: Object.freeze({}), socket: Object.freeze({ remoteAddress: '::1' }) }));
forwarded({ headers: { 'set-cookie': ['a=b'], 'x-forwarded-for': '::1' }, socket: {} });
// @ts-expect-error transport is required
forwarded({ headers: {} });
// @ts-expect-error X-Forwarded-For must be a string
forwarded({ headers: { 'x-forwarded-for': ['::1'] }, socket: {} });
// @ts-expect-error address cannot be a number
forwarded({ headers: {}, socket: { remoteAddress: 1 } });
// @ts-expect-error socket address may be unavailable
const guaranteed: string = addresses[0];
void [first, legacy, guaranteed];
