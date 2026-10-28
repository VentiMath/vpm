import proxyaddr, { all, compile } from 'vproxy-addr';
import common = require('vproxy-addr');
const req: proxyaddr.Request = { headers: { 'x-forwarded-for': '198.51.100.1' }, socket: { remoteAddress: '127.0.0.1' } };
const req2: proxyaddr.Request = { headers: {}, connection: {} };
const rules = ['loopback', '10.0.0.0/8'] as const;
const compiled: proxyaddr.CompiledTrust = compile(rules);
const trusted: boolean = compiled(undefined);
const unknown: boolean = compiled({});
const client: string | undefined = proxyaddr(req, compiled);
const client2: string | undefined = common(req2, (address, index) => address === undefined ? false : index < 2);
const chain: proxyaddr.Addresses = all(req, rules);
const first: string | undefined = chain[0];
const opaque: unknown = ((address, index) => [address, index]) satisfies proxyaddr.TrustFunction;
all(req2, null);
all(req);
proxyaddr(req, 'uniquelocal');
// @ts-expect-error unavailable socket address may be returned
const definite: string = proxyaddr(req2, rules);
// @ts-expect-error trust is required for selection
proxyaddr(req);
// @ts-expect-error raw boolean settings belong to Express, not this API
proxyaddr(req, true);
// @ts-expect-error all does not treat false as omitted trust
all(req, false);
// @ts-expect-error compile accepts configuration, not callbacks
compile(() => true);
// @ts-expect-error every trust entry must be a string
compile(['loopback', 1]);
// @ts-expect-error callback must handle an unavailable socket address
proxyaddr(req2, (address: string) => address.length > 0);
// @ts-expect-error header must be a string
all({ headers: { 'x-forwarded-for': [] }, socket: {} });
void [trusted, unknown, client, client2, first, opaque, definite];
