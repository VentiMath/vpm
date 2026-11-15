# Browser cookie compatibility

Pinned js-cookie 3.0.8 and app 3.0.5 are execution controls only. The implementation
is independently written from public API documentation and black-box behavior.
`probe.cjs` compares 903 name/value/attribute and malformed-cookie cases.
`browser.cjs` uses an isolated local Chrome profile and synthetic cookies, checks
native path/expiry/Unicode behavior and invokes unchanged Amplify Core 6.11.2
CookieStorage. No real account data or cookie jar is accessed.

```sh
npm ci --prefix scripts/js-cookie-conformance --ignore-scripts --no-audit --no-fund
node --test packages/vjs-cookie/test/*.test.cjs
bun test packages/vjs-cookie/test
node scripts/js-cookie-conformance/probe.cjs
node scripts/js-cookie-conformance/types.cjs
node scripts/js-cookie-conformance/browser.cjs
node scripts/js-cookie-conformance/archives.cjs
```

Archives are freshly installed with npm and Bun and then installed frozen;
Node/Bun ESM/CommonJS identity, encoding, strict TS7 and the installed browser
caller are checked. Isolated benchmarks use a memory-backed document property,
not native cookie I/O. No global/AMD namespace wrapper is claimed.
